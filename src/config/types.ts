export enum AIProvider {
  OPENAI = "openai",
  OLLAMA = "ollama",
  VSCODE = "vs code provided",
}

export const ConfigKeys = {
  // Language settings
  AI_COMMIT_LANGUAGE: "dish-ai-commit.AI_COMMIT_LANGUAGE",
  AI_COMMIT_SYSTEM_PROMPT: "dish-ai-commit.AI_COMMIT_SYSTEM_PROMPT",

  PROVIDER: "dish-ai-commit.provider",

  // Model settings
  MODEL: "dish-ai-commit.model",

  // OpenAI settings
  OPENAI_API_KEY: "dish-ai-commit.openai.apiKey",
  OPENAI_BASE_URL: "dish-ai-commit.openai.baseUrl",

  // Ollama settings
  OLLAMA_BASE_URL: "dish-ai-commit.ollama.baseUrl",
};

// 创建一个类型，包含所有可能的配置键
export type ConfigKey = keyof typeof ConfigKeys;

export interface ExtensionConfiguration {
  language: string;
  systemPrompt?: string;
  model: string;
  provider: string;
  openai: {
    apiKey?: string;
    baseUrl?: string;
  };
  ollama: {
    baseUrl: string;
  };
  azureApiVersion?: string;
  vscode?: {
    model?: string;
  };
}

export function getProviderModelConfig(
  config: ExtensionConfiguration,
  provider: string
): string {
  const providerConfig =
    config[provider.toLowerCase() as keyof ExtensionConfiguration];
  if (
    typeof providerConfig === "object" &&
    providerConfig !== null &&
    "model" in providerConfig
  ) {
    return (providerConfig as { model: string }).model;
  }
  return "";
}
