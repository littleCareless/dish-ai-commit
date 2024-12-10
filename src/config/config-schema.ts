export const CONFIG_SCHEMA = {
  providers: {
    openai: {
      settings: ["apiKey", "baseUrl"],
    },
    zhipuai: {
      settings: ["apiKey"],
    },
    dashscope: {
      settings: ["apiKey"],
    },
    doubao: {
      settings: ["apiKey"],
    },
    ollama: {
      settings: ["baseUrl"],
    },
    vscode: {
      settings: ["model"],
    },
  },
};

// 自动生成配置接口
export type GenerateConfigInterface<T> = {
  [K in keyof T]: T[K] extends { settings: string[] }
    ? { [S in T[K]["settings"][number]]?: string }
    : never;
};

export type ExtensionConfiguration = {
  language: string;
  systemPrompt?: string;
  model: string;
  provider: string;
} & GenerateConfigInterface<(typeof CONFIG_SCHEMA)["providers"]> & {
    allowMergeCommits: boolean;
  };
