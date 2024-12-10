export enum AIProvider {
  OPENAI = "openai",
  OLLAMA = "ollama",
  VSCODE = "vs code provided",
  ZHIPU = "zhipu",
  DASHSCOPE = "dashscope",
  DOUBAO = "doubao"
}

export const ConfigKeys = {
  // Language settings
  COMMIT_LANGUAGE: "dish-ai-commit.commitLanguage",
  SYSTEM_PROMPT: "dish-ai-commit.systemPrompt",

  PROVIDER: "dish-ai-commit.provider",

  // Model settings
  MODEL: "dish-ai-commit.model",

  // OpenAI settings
  OPENAI_API_KEY: "dish-ai-commit.openai.apiKey",
  OPENAI_BASE_URL: "dish-ai-commit.openai.baseUrl",

  // ZhipuAI settings
  ZHIPUAI_API_KEY: "dish-ai-commit.zhipuai.apiKey",

  // Ollama settings
  OLLAMA_BASE_URL: "dish-ai-commit.ollama.baseUrl",

  // DashScope settings
  DASHSCOPE_API_KEY: "dish-ai-commit.dashscope.apiKey",

  // 豆包 AI settings
  DOUBAO_API_KEY: "dish-ai-commit.doubao.apiKey",

  // Merge commits setting
  ALLOW_MERGE_COMMITS: "dish-ai-commit.allowMergeCommits",
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
  zhipuai: {
    apiKey?: string;
  };
  ollama: {
    baseUrl: string;
  };
  dashscope: {
    apiKey?: string;
  };
  doubao: {
    apiKey?: string;
  };
  azureApiVersion?: string;
  vscode?: {
    model?: string;
  };
  allowMergeCommits: boolean;
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
