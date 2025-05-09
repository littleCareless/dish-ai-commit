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
      enableEmoji: {
        type: "boolean",
        default: true,
        description: "Use emoji in commit messages / 在提交信息中使用表情符号",
      },
      enableMergeCommit: {
        type: "boolean",
        default: false,
        description:
          "Allow merging changes from multiple files into a single commit message / 允许将多个文件的更改合并为单个提交信息",
      },
      enableBody: {
        type: "boolean",
        default: true,
        description:
          "Include body content in commit messages (if disabled, only the subject line will be generated) / 在提交信息中包含主体内容（如果禁用，将仅生成标题行）",
      },
      enableLayeredCommit: {
        type: "boolean",
        default: false,
        description:
          "Generate layered commit messages with global summary and per-file details / 生成分层提交信息，包含全局摘要和每个文件的详细描述",
      },
    },
    // Generate commit message features
    commitMessage: {
      systemPrompt: {
        type: "string",
        default: ``,
        description:
          "Custom system prompt for commit message generation / 提交信息生成的自定义系统提示语",
      },
    },
    // Weekly report generation features
    weeklyReport: {
      systemPrompt: {
        type: "string",
        default: ``,
        description:
          "Custom system prompt for weekly report generation / 生成周报的自定义系统提示语",
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
    // Branch name generation features
    branchName: {
      systemPrompt: {
        type: "string",
        default: ``,
        description:
          "Custom system prompt for branch name generation / 分支名称生成的自定义系统提示语",
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

// Re-export utility functions from new modules
export { generateConfigKeys } from "./utils/config-keys-generator";
export {
  generateConfigMetadata,
  type ConfigMetadataItem,
} from "./utils/config-metadata-generator";
export { isConfigValue } from "./utils/config-validation";
export {
  generateConfiguration,
  getAllConfigPaths,
  getCategoryConfigPaths,
} from "./utils/config-builder";
