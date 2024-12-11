import { ConfigGenerator, ConfigDefinition } from "./ConfigGenerator";

export const CONFIG_REGISTRY = {
  // 语言设置
  COMMIT_LANGUAGE: {
    key: "commitLanguage",
    type: "string",
    default: "Simplified Chinese",
    description: "Commit message language",
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

  // 系统提示词
  SYSTEM_PROMPT: {
    key: "systemPrompt",
    type: "string",
    default: "",
    description: "Custom system prompt for generating commit messages",
  },

  // AI提供商设置
  PROVIDER: {
    key: "provider",
    type: "string",
    default: "OpenAI",
    description: "默认的 AI 提供商",
    enum: ["OpenAI", "Ollama", "VS Code Provided"],
  },

  MODEL: {
    key: "model",
    type: "string",
    default: "gpt-3.5-turbo",
    description: "AI模型选择",
  },

  // OpenAI 设置
  OPENAI_API_KEY: {
    key: "openai.apiKey",
    type: "string",
    default: "",
    description: "OpenAI API 密钥",
  },

  OPENAI_BASE_URL: {
    key: "openai.baseUrl",
    type: "string",
    default: "https://api.openai.com/v1",
    description: "OpenAI API 基础 URL",
  },

  // 智谱AI设置
  ZHIPUAI_API_KEY: {
    key: "zhipuai.apiKey",
    type: "string",
    default: "",
    description: "智谱 AI API 密钥",
  },

  // DashScope设置
  DASHSCOPE_API_KEY: {
    key: "dashscope.apiKey",
    type: "string",
    default: "",
    description: "DashScope API 密钥",
  },

  // 豆包AI设置
  DOUBAO_API_KEY: {
    key: "doubao.apiKey",
    type: "string",
    default: "",
    description: "豆包 API 密钥",
  },

  // Ollama设置
  OLLAMA_BASE_URL: {
    key: "ollama.baseUrl",
    type: "string",
    default: "http://localhost:11434",
    description: "Ollama API 基础 URL",
  },

  // Diff简化设置
  ENABLE_DIFF_SIMPLIFICATION: {
    key: "enableDiffSimplification",
    type: "boolean",
    default: false,
    description:
      "启用 diff 内容简化功能（警告：启用此功能可能会导致生成的提交信息不够准确）",
  },

  DIFF_MAX_LINE_LENGTH: {
    key: "diffSimplification.maxLineLength",
    type: "number",
    default: 120,
    description: "简化后每行的最大长度",
  },

  DIFF_CONTEXT_LINES: {
    key: "diffSimplification.contextLines",
    type: "number",
    default: 3,
    description: "保留的上下文行数",
  },

  // 提交信息设置
  ALLOW_MERGE_COMMITS: {
    key: "allowMergeCommits",
    type: "boolean",
    default: false,
    description: "是否允许将多个文件的变更合并为一条提交信息",
  },

  USE_EMOJI: {
    key: "useEmoji",
    type: "boolean",
    default: true,
    description: "在提交信息中使用 emoji",
  },
} as const;

// 批量注册所有配置
export async function registerConfigs() {
  for (const [key, config] of Object.entries(CONFIG_REGISTRY)) {
    try {
      const configToRegister: ConfigDefinition = {
        key: config.key,
        type: config.type,
        default: config.default,
        description: config.description,
      };

      // 只有在存在这些可选属性时才添加它们
      if ("enum" in config) {
        configToRegister.enum = [...(config.enum as readonly string[])];
      }

      if ("enumDescriptions" in config) {
        configToRegister.enumDescriptions = [
          ...(config.enumDescriptions as readonly string[]),
        ];
      }

      await ConfigGenerator.addConfig(configToRegister);
      console.log(`Successfully registered config: ${key}`);
    } catch (error) {
      console.error(`Failed to register config ${key}:`, error);
    }
  }
}
