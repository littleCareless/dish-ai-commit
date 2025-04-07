import type { ConfigurationChangeEvent } from "vscode";

/**
 * Main configuration schema defining all available settings for the extension
 * Contains categories: base, providers, and features
 * @const {Object}
 */
export const CONFIG_SCHEMA = {
  base: {
    // Basic configuration
    language: {
      type: "string",
      default: "Simplified Chinese",
      description: "Commit message language / 提交信息语言",
      enum: [
        "Simplified Chinese",
        "Traditional Chinese",
        "Japanese",
        "Korean",
        "Czech",
        "German",
        "French",
        "Italian",
        "Dutch",
        "Portuguese",
        "Vietnamese",
        "English",
        "Spanish",
        "Swedish",
        "Russian",
        "Bahasa",
        "Polish",
        "Turkish",
        "Thai",
      ],
      enumDescriptions: [
        "简体中文",
        "繁體中文",
        "にほんご",
        "한국어",
        "česky",
        "Deutsch",
        "française",
        "italiano",
        "Nederlands",
        "português",
        "tiếng Việt",
        "english",
        "español",
        "Svenska",
        "русский",
        "bahasa",
        "Polski",
        "Turkish",
        "ไทย",
      ],
    },
    systemPrompt: {
      type: "string",
      description: "Custom system prompt / 自定义系统提示语",
      default: "",
    },
    provider: {
      type: "string",
      default: "OpenAI",
      enum: [
        "OpenAI",
        "Ollama",
        "VS Code Provided",
        "Zhipu",
        "DashScope",
        "Doubao",
        "Gemini",
        "Deepseek",
        "Siliconflow",
        "OpenRouter",
      ],
      description: "AI provider / AI 提供商",
    },
    model: {
      type: "string",
      default: "gpt-3.5-turbo",
      description: "AI model / AI 模型",
      scope: "machine",
    },
  },
  providers: {
    // Configuration for all providers
    openai: {
      apiKey: {
        type: "string",
        default: "",
        description: "OpenAI API Key / OpenAI API 密钥",
      },
      baseUrl: {
        type: "string",
        default: "https://api.openai.com/v1",
        description: "OpenAI API Base URL / OpenAI API 基础地址",
      },
    },
    zhipu: {
      apiKey: {
        type: "string",
        default: "",
        description: "Zhipu AI API Key / 智谱 AI API 密钥",
      },
    },
    dashscope: {
      apiKey: {
        type: "string",
        default: "",
        description: "DashScope API Key / 灵积 API 密钥",
      },
    },
    doubao: {
      apiKey: {
        type: "string",
        default: "",
        description: "Doubao API Key / 豆包 API 密钥",
      },
    },
    ollama: {
      baseUrl: {
        type: "string",
        default: "http://localhost:11434",
        description: "Ollama API Base URL / Ollama API 基础地址",
      },
    },
    gemini: {
      apiKey: {
        type: "string",
        default: "",
        description: "Gemini AI API Key / Gemini AI API 密钥",
      },
    },
    deepseek: {
      apiKey: {
        type: "string",
        default: "",
        description: "Deepseek AI API Key / Deepseek AI API 密钥",
      },
    },
    siliconflow: {
      apiKey: {
        type: "string",
        default: "",
        description: "SiliconFlow AI API Key / SiliconFlow AI API 密钥",
      },
    },
    openrouter: {
      apiKey: {
        type: "string",
        default: "",
        description: "OpenRouter AI API Key / OpenRouter AI API 密钥",
      },
    },
  },
  features: {
    // Code analysis features
    codeAnalysis: {
      simplifyDiff: {
        type: "boolean",
        default: false,
        description:
          "Enable diff content simplification (Warning: Enabling this feature may result in less accurate commit messages) / 启用差异内容简化 (警告：启用此功能可能导致提交信息不够准确)",
      },
    },
    // Commit related features
    commitFormat: {
      enableMergeCommit: {
        type: "boolean",
        default: false,
        description:
          "Allow merging changes from multiple files into a single commit message / 允许将多个文件的更改合并为单个提交信息",
      },
      enableEmoji: {
        type: "boolean",
        default: true,
        description: "Use emoji in commit messages / 在提交信息中使用表情符号",
      },
    },
    // Weekly report generation features
    weeklyReport: {
      systemPrompt: {
        type: "string",
        description:
          "Custom system prompt for weekly report generation / 生成周报的自定义系统提示语",
        default: "",
      },
    },
    // Code review features
    codeReview: {
      systemPrompt: {
        type: "string",
        default: `Custom system prompt`,
        description:
          "Custom system prompt for code review / 代码审查的自定义系统提示语",
      },
    },
  },
} as const;

/**
 * Base type for all configuration values with common properties
 * @interface ConfigValueTypeBase
 * @property {string} description - Human readable description
 * @property {boolean} [isSpecial] - Optional special flag
 */
export type ConfigValueTypeBase = {
  description: string;
  isSpecial?: boolean;
};

/**
 * String configuration value type
 * @interface ConfigValueTypeString
 * @extends {ConfigValueTypeBase}
 */
export type ConfigValueTypeString = ConfigValueTypeBase & {
  type: "string";
  default: string;
  enum?: readonly string[];
  enumDescriptions?: readonly string[];
  scope?:
    | "machine"
    | "window"
    | "resource"
    | "application"
    | "language-overridable";
};

/**
 * Boolean configuration value type
 * @interface ConfigValueTypeBoolean
 * @extends {ConfigValueTypeBase}
 */
export type ConfigValueTypeBoolean = ConfigValueTypeBase & {
  type: "boolean";
  default: boolean;
};

/**
 * Number configuration value type
 * @interface ConfigValueTypeNumber
 * @extends {ConfigValueTypeBase}
 */
export type ConfigValueTypeNumber = ConfigValueTypeBase & {
  type: "number";
  default: number;
};

export type ConfigValueType =
  | ConfigValueTypeString
  | ConfigValueTypeBoolean
  | ConfigValueTypeNumber;

// Or directly use union type
export type ConfigValue =
  | ConfigValueTypeString
  | ConfigValueTypeBoolean
  | ConfigValueTypeNumber;

// Add interface definition for configuration values
export interface ConfigObject {
  [key: string]: ConfigValue | ConfigObject;
}

// Modify SchemaType definition
export type SchemaType = {
  [K in keyof typeof CONFIG_SCHEMA]: {
    [P in keyof (typeof CONFIG_SCHEMA)[K]]: ConfigValue | ConfigObject;
  };
};

// Generate type
export type ConfigPath = string; // e.g., "providers.openai.apiKey"

/**
 * Generates configuration keys from schema
 * @param {SchemaType} schema - Configuration schema
 * @param {string} [prefix=''] - Optional prefix for nested keys
 * @returns {Record<string, string>} Generated configuration keys
 */
export function generateConfigKeys(
  schema: SchemaType,
  prefix: string = ""
): Record<string, string> {
  const keys: Record<string, string> = {};

  /**
   * Recursively traverse the configuration object to generate keys
   * @param {ConfigObject} obj - Current configuration object being processed
   * @param {string} [path=''] - Current path in the configuration hierarchy
   */
  function traverse(obj: ConfigObject, path: string = "") {
    for (const [key, value] of Object.entries(obj)) {
      // Generate full path by combining current path and key
      const fullPath = path ? `${path}.${key}` : key;

      if (isConfigValue(value)) {
        // For configuration values, generate full configuration key
        const configKey = fullPath.replace(/\./g, "_").toUpperCase();
        keys[configKey] = `dish-ai-commit.${fullPath}`;
      } else {
        // For nested objects, generate intermediate key and continue traversal
        const intermediateKey = fullPath.replace(/\./g, "_").toUpperCase();
        keys[intermediateKey] = `dish-ai-commit.${fullPath}`;
        traverse(value as ConfigObject, fullPath);
      }
    }
  }

  traverse(schema as unknown as ConfigObject);
  return keys;
}

// Add metadata type definition
/**
 * Configuration metadata item interface
 * @interface ConfigMetadataItem
 */
export interface ConfigMetadataItem {
  key: string;
  defaultValue: any;
  nested: boolean;
  parent: string;
  description: string;
  type: string;
  enum?: readonly string[];
  enumDescriptions?: readonly string[];
  isSpecial?: boolean;
}

/**
 * Generates configuration metadata from schema
 * @param {SchemaType} schema - Configuration schema
 * @returns {ConfigMetadataItem[]} Array of metadata items
 */
export function generateConfigMetadata(
  schema: SchemaType
): ConfigMetadataItem[] {
  const metadata: ConfigMetadataItem[] = [];

  /**
   * Recursively traverse the configuration object to generate metadata
   * @param {ConfigObject} obj - Current configuration object being processed
   * @param {string} [path=''] - Current path in the configuration hierarchy
   */
  function traverse(obj: ConfigObject, path: string = "") {
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;
      if (isConfigValue(value)) {
        const metadataItem: ConfigMetadataItem = {
          key: fullPath.replace(/\./g, "_").toUpperCase(),
          defaultValue: value.default,
          nested: fullPath.includes("."),
          parent: fullPath.split(".")[0],
          description: value.description,
          type: value.type,
          isSpecial: value.isSpecial,
        };

        // Only add enum and enumDescriptions if the value is of type ConfigValueTypeString
        if (value.type === "string" && "enum" in value) {
          metadataItem.enum = value.enum;
          metadataItem.enumDescriptions = value.enumDescriptions;
        }

        metadata.push(metadataItem);
      } else if (typeof value === "object") {
        // Handle nested objects
        traverse(value as ConfigObject, fullPath);
      }
    }
  }

  traverse(schema as unknown as ConfigObject);
  return metadata;
}

// Add type checking helper function
/**
 * Type guard for configuration values
 * @param {unknown} value - Value to check
 * @returns {boolean} Whether value is a ConfigValue
 */
export function isConfigValue(value: unknown): value is ConfigValue {
  return (
    value !== null &&
    typeof value === "object" &&
    "type" in value &&
    "description" in value
  );
}

/**
 * Generates configuration object from schema
 * @param {typeof CONFIG_SCHEMA} schema - Configuration schema
 * @param {(key: string) => any} getConfig - Function to retrieve config values
 * @returns {any} Generated configuration object
 */
export function generateConfiguration(
  schema: typeof CONFIG_SCHEMA,
  getConfig: (key: string) => any
) {
  const result: any = {};

  /**
   * Recursively traverses schema to build configuration
   * @param {ConfigObject} obj - Current configuration object
   * @param {string} currentPath - Current path in configuration
   */
  function traverse(obj: ConfigObject, currentPath: string = "") {
    for (const [key, value] of Object.entries(obj)) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;

      if (isConfigValue(value)) {
        // Get config value or use default
        const configValue = getConfig(newPath) ?? value.default;

        // Handle nested path
        const pathParts = newPath.split(".");
        let current = result;

        // Build nested object structure
        for (let i = 0; i < pathParts.length - 1; i++) {
          if (!(pathParts[i] in current)) {
            current[pathParts[i]] = {};
          }
          current = current[pathParts[i]];
        }

        // Set final value
        current[pathParts[pathParts.length - 1]] = configValue;
      } else {
        // Continue traversing nested objects
        traverse(value as ConfigObject, newPath);
      }
    }
  }

  traverse(schema as unknown as ConfigObject);
  return result;
}

/**
 * Gets all configuration paths from schema
 * @param {typeof CONFIG_SCHEMA} schema - Configuration schema
 * @returns {string[]} Array of all configuration paths
 */
export function getAllConfigPaths(schema: typeof CONFIG_SCHEMA): string[] {
  const paths: string[] = [];

  function traverse(obj: ConfigObject, currentPath: string = ""): void {
    for (const [key, value] of Object.entries(obj)) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      if (isConfigValue(value)) {
        paths.push(newPath);
      } else {
        traverse(value as ConfigObject, newPath);
      }
    }
  }

  traverse(schema as unknown as ConfigObject);
  return paths;
}

/**
 * Gets configuration paths for a specific category
 * @param {typeof CONFIG_SCHEMA} schema - Configuration schema
 * @param {keyof typeof CONFIG_SCHEMA} category - Category to get paths for
 * @returns {string[]} Array of category configuration paths
 */
export function getCategoryConfigPaths(
  schema: typeof CONFIG_SCHEMA,
  category: keyof typeof CONFIG_SCHEMA
): string[] {
  return getAllConfigPaths(schema).filter((path) => path.startsWith(category));
}
