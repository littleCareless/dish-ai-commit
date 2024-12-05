export enum AIProvider {
  OPENAI = "openai",
  OLLAMA = "ollama",
  VSCODE = "vs code provided",
}

export const ConfigKeys = {
  // Language settings
  AI_COMMIT_LANGUAGE: "dish-ai-commit.AI_COMMIT_LANGUAGE",
  AI_COMMIT_SYSTEM_PROMPT: "dish-ai-commit.AI_COMMIT_SYSTEM_PROMPT",

  // Provider settings
  DEFAULT_PROVIDER: "dish-ai-commit.defaultProvider",

  // OpenAI settings
  OPENAI_API_KEY: "dish-ai-commit.openai.apiKey",
  OPENAI_BASE_URL: "dish-ai-commit.openai.baseUrl",
  OPENAI_MODEL: "dish-ai-commit.openai.model",

  // Ollama settings
  OLLAMA_BASE_URL: "dish-ai-commit.ollama.baseUrl",
  OLLAMA_MODEL: "dish-ai-commit.ollama.model",
} as const;

// 创建一个类型，包含所有可能的配置键
export type ConfigKey = keyof typeof ConfigKeys;

export interface ExtensionConfiguration {
  language: string;
  systemPrompt?: string;
  defaultProvider: AIProvider;
  openai: {
    apiKey?: string;
    baseUrl?: string;
    model: string;
  };
  ollama: {
    baseUrl: string;
    model: string;
  };
  azureApiVersion?: string;
  vscode?: {
    model?: string;
  };
}
