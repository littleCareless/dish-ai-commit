import {
  CONFIG_SCHEMA,
  generateConfigKeys,
  generateConfigMetadata,
} from "./ConfigSchema";

// 自动生成 ConfigKeys
export const ConfigKeys = generateConfigKeys(CONFIG_SCHEMA);

// 自动生成 CONFIG_METADATA
export const CONFIG_METADATA = generateConfigMetadata(CONFIG_SCHEMA);

export enum AIProvider {
  OPENAI = "openai",
  OLLAMA = "ollama",
  VSCODE = "vs code provided",
  ZHIPU = "zhipu",
  DASHSCOPE = "dashscope",
  DOUBAO = "doubao",
}

// 创建一个类型，包含所有可能的配置键
export type ConfigKey = keyof typeof ConfigKeys;

// 添加嵌套配置的父级类型定义
export type ConfigParent = keyof Omit<
  ExtensionConfiguration,
  | "language"
  | "systemPrompt"
  | "provider"
  | "model"
  | "enableDiffSimplification"
  | "allowMergeCommits"
  | "useEmoji"
>;

// 修改 ConfigMetadata 接口
export interface ConfigMetadata {
  key: ConfigKey;
  defaultValue?: any;
  nested?: boolean;
  parent?: ConfigParent; // 使用更严格的类型
}

// 定义配置项的元数据
// export const CONFIG_METADATA: ConfigMetadata[] = [
//   { key: 'COMMIT_LANGUAGE', defaultValue: 'Simplified Chinese' },
//   { key: 'SYSTEM_PROMPT' },
//   { key: 'PROVIDER', defaultValue: 'openai' },
//   { key: 'MODEL', defaultValue: 'gpt-3.5-turbo' },
//   { key: 'OPENAI_API_KEY', nested: true, parent: 'openai' },
//   { key: 'OPENAI_BASE_URL', nested: true, parent: 'openai', defaultValue: 'https://api.openai.com/v1' },
//   { key: 'ZHIPUAI_API_KEY', nested: true, parent: 'zhipuai' },
//   { key: 'DASHSCOPE_API_KEY', nested: true, parent: 'dashscope' },
//   { key: 'DOUBAO_API_KEY', nested: true, parent: 'doubao' },
//   { key: 'OLLAMA_BASE_URL', nested: true, parent: 'ollama', defaultValue: 'http://localhost:11434' },
//   { key: 'ENABLE_DIFF_SIMPLIFICATION', defaultValue: false },
//   { key: 'DIFF_MAX_LINE_LENGTH', nested: true, parent: 'diffSimplification', defaultValue: 120 },
//   { key: 'DIFF_CONTEXT_LINES', nested: true, parent: 'diffSimplification', defaultValue: 3 },
//   { key: 'ALLOW_MERGE_COMMITS', defaultValue: false },
//   { key: 'USE_EMOJI', defaultValue: true },
// ];

export interface ExtensionConfiguration {
  base: {
    language: string;
    systemPrompt: string;
    provider: string;
    model: string;
  };
  providers: {
    openai: {
      apiKey: string;
      baseUrl: string;
    };
    zhipuai: {
      apiKey: string;
    };
    dashscope: {
      apiKey: string;
    };
    doubao: {
      apiKey: string;
    };
    ollama: {
      baseUrl: string;
    };
  };
  features: {
    diffSimplification: {
      enabled: boolean;
      maxLineLength: number;
      contextLines: number;
    };
    commitOptions: {
      allowMergeCommits: boolean;
      useEmoji: boolean;
    };
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
