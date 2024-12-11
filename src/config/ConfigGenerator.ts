import * as fs from "fs";
import * as path from "path";

export interface ConfigDefinition {
  key: string;
  type: "string" | "boolean" | "number";
  default?: any;
  description: string;
  enum?: readonly string[] | string[];
  enumDescriptions?: readonly string[] | string[];
  isSpecial?: boolean;
}

export class ConfigGenerator {
  private static CONFIG_FILES = {
    PACKAGE: "package.json",
    TYPES: "src/config/types.ts",
    SCHEMA: "src/config/config-schema.ts",
  };

  static async addConfig(config: ConfigDefinition) {
    await Promise.all([
      this.updatePackageJson(config),
      this.updateTypes(config),
      this.updateSchema(config),
    ]);
  }

  private static async updatePackageJson(config: ConfigDefinition) {
    const packagePath = path.join(process.cwd(), this.CONFIG_FILES.PACKAGE);
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));

    pkg.contributes.configuration.properties[`dish-ai-commit.${config.key}`] = {
      type: config.type,
      default: config.default,
      description: config.description,
      ...(config.enum ? { enum: config.enum } : {}),
      ...(config.enumDescriptions
        ? { enumDescriptions: config.enumDescriptions }
        : {}),
    };

    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
  }

  private static async updateTypes(config: ConfigDefinition) {
    const typesPath = path.join(process.cwd(), this.CONFIG_FILES.TYPES);
    let content = fs.readFileSync(typesPath, "utf8");

    // 处理嵌套配置
    const configKey = config.key.includes(".")
      ? `${config.key.split(".")[0]}: { ${config.key.split(".")[1]}: ${
          config.type
        }; }`
      : `${config.key}: ${config.type};`;

    if (content.includes(configKey)) {
      return; // 如果配置已存在，直接返回
    }

    // 添加到 ConfigKeys
    content = this.addToConfigKeys(content, config);

    // 添加到 ExtensionConfiguration
    content = this.addToExtensionConfiguration(content, config);

    fs.writeFileSync(typesPath, content);
  }

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

  private static addToExtensionConfiguration(
    content: string,
    config: ConfigDefinition
  ): string {
    const parts = config.key.split(".");

    // 根据现有的配置结构处理路径
    if (parts.length > 2) {
      // 处理两层以上的嵌套，如 features.diffSimplification.enabled
      const [section, category, property] = parts;
      const parentPath = `${section}.${category}`;

      if (!content.includes(`${section}: {`)) {
        // 如果主分类不存在，创建完整的嵌套结构
        content = content.replace(
          /(export interface ExtensionConfiguration {[\s\S]*?)(})/,
          `$1  ${section}: {\n    ${category}: {\n      ${property}: ${config.type};\n    };\n  };\n$2`
        );
      } else if (!content.includes(`${parentPath}: {`)) {
        // 如果主分类存在但子分类不存在
        content = content.replace(
          new RegExp(`(${section}: {[\\s\\S]*?)(}[\n\r\s]*};)`),
          `$1    ${category}: {\n      ${property}: ${config.type};\n    };\n  $2`
        );
      } else {
        // 如果主分类和子分类都存在，只添加属性
        content = content.replace(
          new RegExp(`(${parentPath}: {[\\s\\S]*?)(}[\n\r\s]*};)`),
          `$1      ${property}: ${config.type};\n    $2`
        );
      }
    } else if (parts.length === 2) {
      // 处理一层嵌套，如 base.language
      const [section, property] = parts;
      if (!content.includes(`${section}: {`)) {
        content = content.replace(
          /(export interface ExtensionConfiguration {[\s\S]*?)(})/,
          `$1  ${section}: {\n    ${property}: ${config.type};\n  };\n$2`
        );
      } else {
        content = content.replace(
          new RegExp(`(${section}: {[\\s\\S]*?)(}[\n\r\s]*};)`),
          `$1    ${property}: ${config.type};\n  $2`
        );
      }
    } else {
      // 处理顶层配置
      content = content.replace(
        /(export interface ExtensionConfiguration {[\s\S]*?)(})/,
        `$1  ${config.key}: ${config.type};\n$2`
      );
    }
    return content;
  }

  private static async updateSchema(config: ConfigDefinition) {
    // 如果需要更新schema文件的话
    const schemaPath = path.join(process.cwd(), this.CONFIG_FILES.SCHEMA);
    // 根据需要实现schema更新逻辑
  }
}
