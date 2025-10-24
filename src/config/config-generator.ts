import * as fs from "fs";
import * as path from "path";

/**
 * Interface defining the structure of a configuration definition
 * @interface ConfigDefinition
 * @property {string} key - The configuration key
 * @property {'string'|'boolean'|'number'} type - The type of the configuration value
 * @property {any} [default] - Optional default value
 * @property {string} description - Description of the configuration
 * @property {(readonly string[]|string[])} [enum] - Optional list of allowed values
 * @property {(readonly string[]|string[])} [enumDescriptions] - Optional descriptions for enum values
 * @property {boolean} [isSpecial] - Optional flag for special configurations
 */
export interface ConfigDefinition {
  key: string;
  type: "string" | "boolean" | "number";
  default?: any;
  description: string;
  enum?: readonly string[] | string[];
  enumDescriptions?: readonly string[] | string[];
  isSpecial?: boolean;
}

/**
 * Class responsible for generating and updating configuration related files
 * @class ConfigGenerator
 */
export class ConfigGenerator {
  /**
   * Constants for configuration file paths
   * @private
   * @readonly
   */
  private static CONFIG_FILES = {
    PACKAGE: "package.json",
    TYPES: "src/config/types.ts",
    SCHEMA: "src/config/config-schema.ts",
  };

  /**
   * Adds a new configuration by updating all necessary files
   * @param {ConfigDefinition} config - The configuration to add
   * @returns {Promise<void>}
   */
  static async addConfig(config: ConfigDefinition) {
    await Promise.all([
      this.updatePackageJson(config),
      this.updateTypes(config),
      this.updateSchema(config),
    ]);
  }

  /**
   * Updates package.json with new configuration
   * @private
   * @param {ConfigDefinition} config - The configuration to add
   * @returns {Promise<void>}
   */
  private static async updatePackageJson(config: ConfigDefinition) {
    // Read package.json
    const packagePath = path.join(process.cwd(), this.CONFIG_FILES.PACKAGE);
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));

    // Add new configuration
    pkg.contributes.configuration.properties[`dish-ai-commit.${config.key}`] = {
      type: config.type,
      default: config.default,
      description: config.description,
      ...(config.enum ? { enum: config.enum } : {}),
      ...(config.enumDescriptions
        ? { enumDescriptions: config.enumDescriptions }
        : {}),
    };

    // Write updated package.json
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
  }

  /**
   * Updates types.ts with new configuration
   * @private
   * @param {ConfigDefinition} config - The configuration to add
   * @returns {Promise<void>}
   */
  private static async updateTypes(config: ConfigDefinition) {
    const typesPath = path.join(process.cwd(), this.CONFIG_FILES.TYPES);
    let content = fs.readFileSync(typesPath, "utf8");

    // Generate config key based on nesting level
    const configKey = config.key.includes(".")
      ? `${config.key?.split(".")[0]}: { ${config.key?.split(".")[1]}: ${
          config.type
        }; }`
      : `${config.key}: ${config.type};`;

    // Skip if config already exists
    if (content.includes(configKey)) {
      return;
    }

    // Update content with new config
    content = this.addToConfigKeys(content, config);
    content = this.addToExtensionConfiguration(content, config);

    // Write updated content
    fs.writeFileSync(typesPath, content);
  }

  /**
   * Adds configuration to ConfigKeys section
   * @private
   * @param {string} content - Current file content
   * @param {ConfigDefinition} config - Configuration to add
   * @returns {string} Updated content
   */
  private static addToConfigKeys(
    content: string,
    config: ConfigDefinition
  ): string {
    const configKeyEntry = `  ${config.key
      .toUpperCase()
      .replace(".", "_")}: "dish-ai-commit.${config.key}",\n`;
    return content.replace(
      /(export const ConfigKeys = {[\s\S]*?)(};)/,
      `$1  ${configKeyEntry}$2`
    );
  }

  /**
   * Adds configuration to ExtensionConfiguration interface
   * @private
   * @param {string} content - Current file content
   * @param {ConfigDefinition} config - Configuration to add
   * @returns {string} Updated content
   */
  private static addToExtensionConfiguration(
    content: string,
    config: ConfigDefinition
  ): string {
    const parts = config.key?.split(".");

    // Handle different nesting levels
    if (parts.length > 2) {
      // Handle multi-level nesting (>2 levels)
      return this.handleMultiLevelNesting(content, parts, config.type);
    } else if (parts.length === 2) {
      // Handle single-level nesting
      return this.handleSingleLevelNesting(content, parts, config.type);
    } else {
      // Handle top-level config
      return content.replace(
        /(export interface ExtensionConfiguration {[\s\S]*?)(})/,
        `$1  ${config.key}: ${config.type};\n$2`
      );
    }
  }

  /**
   * Handles updating content for multi-level nested configurations
   * @private
   * @param {string} content - Current file content
   * @param {string[]} parts - Configuration key parts
   * @param {string} type - Configuration type
   * @returns {string} Updated content
   */
  private static handleMultiLevelNesting(
    content: string,
    parts: string[],
    type: string
  ): string {
    const [section, category, property] = parts;
    const parentPath = `${section}.${category}`;

    // Handle different cases based on existing structure
    if (!content.includes(`${section}: {`)) {
      // Create complete nested structure if main section doesn't exist
      return content.replace(
        /(export interface ExtensionConfiguration {[\s\S]*?)(})/,
        `$1  ${section}: {\n    ${category}: {\n      ${property}: ${type};\n    };\n  };\n$2`
      );
    } else if (!content.includes(`${parentPath}: {`)) {
      // Add category if main section exists but category doesn't
      return content.replace(
        new RegExp(`(${section}: {[\\s\\S]*?)(}[\n\r\s]*};)`),
        `$1    ${category}: {\n      ${property}: ${type};\n    };\n  $2`
      );
    } else {
      // Add property if both section and category exist
      return content.replace(
        new RegExp(`(${parentPath}: {[\\s\\S]*?)(}[\n\r\s]*};)`),
        `$1      ${property}: ${type};\n    $2`
      );
    }
  }

  /**
   * Handles updating content for single-level nested configurations
   * @private
   * @param {string} content - Current file content
   * @param {string[]} parts - Configuration key parts
   * @param {string} type - Configuration type
   * @returns {string} Updated content
   */
  private static handleSingleLevelNesting(
    content: string,
    parts: string[],
    type: string
  ): string {
    const [section, property] = parts;

    if (!content.includes(`${section}: {`)) {
      // Create new section if it doesn't exist
      return content.replace(
        /(export interface ExtensionConfiguration {[\s\S]*?)(})/,
        `$1  ${section}: {\n    ${property}: ${type};\n  };\n$2`
      );
    } else {
      // Add property to existing section
      return content.replace(
        new RegExp(`(${section}: {[\\s\\S]*?)(}[\n\r\s]*};)`),
        `$1    ${property}: ${type};\n  $2`
      );
    }
  }

  /**
   * Updates schema file with new configuration
   * @private
   * @param {ConfigDefinition} config - The configuration to add
   * @returns {Promise<void>}
   */
  private static async updateSchema(config: ConfigDefinition) {
    // TODO: Implement schema update logic if needed
    const schemaPath = path.join(process.cwd(), this.CONFIG_FILES.SCHEMA);
  }
}
