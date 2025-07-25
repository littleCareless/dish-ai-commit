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
        "PremAI",
        "Together",
        "Anthropic",
        "Mistral",
        "Baidu Qianfan",
        "Azure OpenAI",
        "Cloudflare",
        "GoogleAI",
        "VertexAI",
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
    baiduQianfan: {
      apiKey: {
        type: "string",
        default: "",
        description: "Baidu Qianfan API Key / 百度千帆 API 密钥",
      },
      secretKey: {
        type: "string",
        default: "",
        description: "Baidu Qianfan Secret Key / 百度千帆 Secret Key",
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
    perplexity: {
      apiKey: {
        type: "string",
        default: "",
        description: "Perplexity AI API Key / Perplexity AI API 密钥",
      },
    },
    premai: {
      apiKey: {
        type: "string",
        default: "",
        description: "PremAI API Key / PremAI API 密钥",
      },
      baseUrl: {
        type: "string",
        default: "https://api.premai.com/",
        description: "PremAI API Base URL / PremAI API 基础地址",
      },
    },
    together: {
      apiKey: {
        type: "string",
        default: "",
        description: "Together AI API Key / Together AI API 密钥",
      },
      baseUrl: {
        type: "string",
        default: "https://api.together.xyz/",
        description: "Together AI API Base URL / Together AI API 基础地址",
      },
    },
    xai: {
      apiKey: {
        type: "string",
        default: "",
        description: "xAI API Key / xAI API 密钥",
      },
    },
    anthropic: {
      apiKey: {
        type: "string",
        default: "",
        description: "Anthropic API Key / Anthropic API 密钥",
      },
    },
    mistral: {
      apiKey: {
        type: "string",
        default: "",
        description: "Mistral AI API Key / Mistral AI API 密钥",
      },
    },
    azureOpenai: {
      apiKey: {
        type: "string",
        default: "",
        description: "Azure OpenAI API Key / Azure OpenAI API 密钥",
      },
      endpoint: {
        type: "string",
        default: "",
        description: "Azure OpenAI Endpoint / Azure OpenAI 终结点",
      },
      apiVersion: {
        type: "string",
        default: "",
        description: "Azure OpenAI API Version / Azure OpenAI API 版本",
      },
      orgId: {
        type: "string",
        default: "",
        description: "Azure OpenAI Organization ID / Azure OpenAI 组织 ID",
      },
    },
    cloudflare: {
      apiKey: {
        type: "string",
        default: "",
        description: "Cloudflare API Key / Cloudflare API 密钥",
      },
      accountId: {
        type: "string",
        default: "",
        description: "Cloudflare Account ID / Cloudflare 账户 ID",
      },
    },
    vertexai: {
      projectId: {
        type: "string",
        default: "",
        description: "Vertex AI Project ID / Vertex AI 项目 ID",
      },
      location: {
        type: "string",
        default: "",
        description: "Vertex AI Location / Vertex AI 位置",
      },
      apiEndpoint: {
        type: "string",
        default: "",
        description:
          "Optional. The base Vertex AI endpoint to use for the request. / 可选。用于请求的 Vertex AI 端点。",
      },
      googleAuthOptions: {
        type: "string",
        default: "",
        description:
          "Optional. JSON string of GoogleAuthOptions for authentication. / 可选。用于身份验证的 GoogleAuthOptions 的 JSON 字符串。",
      },
    },
    groq: {
      apiKey: {
        type: "string",
        default: "",
        description: "Groq API Key / Groq API 密钥",
      },
    },
  },
  features: {
    // Code analysis features
    codeAnalysis: {
      diffTarget: {
        type: "string",
        default: "all",
        description:
          "Specify the target for git diff: 'staged' for staged changes, 'all' for all changes. / 指定 git diff 的目标：'staged' 表示暂存区的更改，'all' 表示所有更改。",
        enum: ["staged", "all"],
      },
      simplifyDiff: {
        type: "boolean",
        default: false,
        description:
          "Enable diff content simplification (Warning: Enabling this feature may result in less accurate commit messages) / 启用差异内容简化 (警告：启用此功能可能导致提交信息不够准确)",
      },
      // useEmbedding: {
      //   type: "boolean",
      //   default: false,
      //   description:
      //     "Enable embeddings for generating commit messages, code reviews, and other features. / 启用 embedding 以生成提交信息、代码审查和其他功能。",
      // },
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
      useRecentCommitsAsReference: {
        type: "boolean",
        default: false,
        description:
          "Use recent commits as a reference for generating commit messages / 使用最近的提交作为生成提交信息的参考",
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
        default: ``,
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
    prSummary: {
      baseBranch: {
        type: "string",
        default: "origin/main",
        description:
          "Base branch for comparing commits to generate PR summary / 用于比较提交以生成PR摘要的基础分支",
      },
      headBranch: {
        type: "string",
        default: "HEAD",
        description:
          "Head branch for comparing commits to generate PR summary / 用于比较提交以生成PR摘要的头部分支",
      },
      systemPrompt: {
        type: "string",
        default: "",
        description:
          "Custom system prompt for PR summary generation / PR摘要生成的自定义系统提示语",
      },
      commitLogLimit: {
        type: "number",
        default: 20,
        description:
          "The maximum number of commit logs to fetch for SVN when no specific range is provided. / 当未提供特定范围时，为 SVN 获取提交日志的最大数量。",
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
export type ConfigKey =
  | "BASE"
  | "PROVIDERS"
  | "FEATURES"
  | "BASE_LANGUAGE"
  | "BASE_PROVIDER"
  | "BASE_MODEL"
  | "PROVIDERS_ANTHROPIC"
  | "PROVIDERS_ANTHROPIC_APIKEY"
  | "PROVIDERS_OPENAI"
  | "PROVIDERS_OPENAI_APIKEY"
  | "PROVIDERS_ZHIPU"
  | "PROVIDERS_ZHIPU_APIKEY"
  | "PROVIDERS_DASHSCOPE"
  | "PROVIDERS_DASHSCOPE_APIKEY"
  | "PROVIDERS_DOUBAO"
  | "PROVIDERS_DOUBAO_APIKEY"
  | "PROVIDERS_GEMINI"
  | "PROVIDERS_GEMINI_APIKEY"
  | "PROVIDERS_BAIDU_QIANFAN"
  | "PROVIDERS_BAIDU_QIANFAN_APIKEY"
  | "PROVIDERS_BAIDU_QIANFAN_SECRETKEY"
  | "PROVIDERS_DEEPSEEK"
  | "PROVIDERS_DEEPSEEK_APIKEY"
  | "PROVIDERS_SILICONFLOW"
  | "PROVIDERS_SILICONFLOW_APIKEY"
  | "PROVIDERS_OPENROUTER"
  | "PROVIDERS_OPENROUTER_APIKEY"
  | "PROVIDERS_PERPLEXITY"
  | "PROVIDERS_PERPLEXITY_APIKEY"
  | "PROVIDERS_PREMAI"
  | "PROVIDERS_PREMAI_APIKEY"
  | "PROVIDERS_PREMAI_BASEURL"
  | "PROVIDERS_TOGETHER"
  | "PROVIDERS_TOGETHER_APIKEY"
  | "PROVIDERS_TOGETHER_BASEURL"
  | "PROVIDERS_XAI"
  | "PROVIDERS_XAI_APIKEY"
  | "PROVIDERS_MISTRAL"
  | "PROVIDERS_MISTRAL_APIKEY"
  | "PROVIDERS_AZURE_OPENAI"
  | "PROVIDERS_AZURE_OPENAI_APIKEY"
  | "PROVIDERS_AZURE_OPENAI_ENDPOINT"
  | "PROVIDERS_AZURE_OPENAI_APIVERSION"
  | "PROVIDERS_AZURE_OPENAI_ORGID"
  | "PROVIDERS_CLOUDFLARE"
  | "PROVIDERS_CLOUDFLARE_APIKEY"
  | "PROVIDERS_CLOUDFLARE_ACCOUNTID"
  | "PROVIDERS_VERTEXAI"
  | "PROVIDERS_VERTEXAI_PROJECTID"
  | "PROVIDERS_VERTEXAI_LOCATION"
  | "PROVIDERS_VERTEXAI_APIENDPOINT"
  | "PROVIDERS_VERTEXAI_GOOGLEAUTHOPTIONS"
  | "FEATURES_CODEANALYSIS"
  | "FEATURES_CODEANALYSIS_SIMPLIFYDIFF"
  | "FEATURES_COMMITFORMAT"
  | "FEATURES_COMMITFORMAT_ENABLEEMOJI"
  | "FEATURES_COMMITFORMAT_ENABLEMERGECOMMIT"
  | "FEATURES_COMMITFORMAT_ENABLEBODY"
  | "FEATURES_COMMITFORMAT_ENABLELAYEREDCOMMIT"
  | "FEATURES_COMMITMESSAGE"
  | "FEATURES_COMMITMESSAGE_SYSTEMPROMPT"
  | "FEATURES_COMMITMESSAGE_USERECENTCOMMITSASREFERENCE"
  | "FEATURES_WEEKLYREPORT"
  | "FEATURES_WEEKLYREPORT_SYSTEMPROMPT"
  | "FEATURES_CODEREVIEW"
  | "FEATURES_CODEREVIEW_SYSTEMPROMPT"
  | "FEATURES_BRANCHNAME"
  | "FEATURES_BRANCHNAME_SYSTEMPROMPT"
  | "FEATURES_PRSUMMARY"
  | "FEATURES_PRSUMMARY_BASEBRANCH"
  | "FEATURES_PRSUMMARY_HEADBRANCH"
  | "FEATURES_PRSUMMARY_SYSTEMPROMPT"
  | "FEATURES_PRSUMMARY_COMMITLOGLIMIT"
  | "PROVIDERS_GROQ"
  | "PROVIDERS_GROQ_APIKEY";

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
