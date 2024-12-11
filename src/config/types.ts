import {
  CONFIG_SCHEMA,
  generateConfigKeys,
  generateConfigMetadata,
  type ConfigObject,
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

// 重新设计类型生成逻辑
type ExtractConfigValueType<T> = T extends { type: "string" }
  ? string
  : T extends { type: "boolean" }
  ? boolean
  : T extends { type: "number" }
  ? number
  : never;

// 处理第一层配置
type FirstLevelConfig<T> = {
  [P in keyof T]: T[P] extends { type: string }
    ? ExtractConfigValueType<T[P]>
    : T[P] extends ConfigObject
    ? SecondLevelConfig<T[P], P>
    : never;
};

// 处理第二层配置
type SecondLevelConfig<T, P extends string | number | symbol> = {
  [K in keyof T]: T[K] extends { type: string }
    ? ExtractConfigValueType<T[K]>
    : T[K] extends ConfigObject
    ? ThirdLevelConfig<T[K], P, K>
    : never;
};

// 处理第三层配置
type ThirdLevelConfig<
  T,
  P extends string | number | symbol,
  K extends string | number | symbol
> = {
  [L in keyof T]: T[L] extends { type: string }
    ? ExtractConfigValueType<T[L]>
    : never;
};

// 生成所有配置路径的联合类型
type ConfigPaths<T> = {
  [P in keyof T]: T[P] extends { type: string }
    ? P
    : T[P] extends ConfigObject
    ?
        | P
        | `${P & string}.${keyof T[P] & string}`
        | `${P & string}.${keyof T[P] & string}.${keyof T[P][keyof T[P]] &
            string}`
    : never;
}[keyof T];

// 生成配置值类型映射
type GenerateValueType<T> = {
  [P in ConfigPaths<T>]: P extends keyof T
    ? T[P] extends { type: string }
      ? ExtractConfigValueType<T[P]>
      : never
    : P extends `${infer A}.${infer B}`
    ? A extends keyof T
      ? B extends keyof T[A]
        ? T[A][B] extends { type: string }
          ? ExtractConfigValueType<T[A][B]>
          : B extends `${infer C}.${infer D}`
          ? C extends keyof T[A]
            ? D extends keyof T[A][C]
              ? ExtractConfigValueType<T[A][C][D]>
              : never
            : never
          : never
        : never
      : never
    : never;
};

// 创建配置键的大写映射
type UppercaseConfigKey<T extends string> = T extends `${infer A}.${infer B}`
  ? `${Uppercase<A>}_${UppercaseConfigKey<B>}`
  : Uppercase<T>;

// 修改：添加一个辅助类型来过滤掉元数据键
type ExcludeMetadataKeys<T extends string> =
  T extends `${infer Base}_${infer Metadata}`
    ? Metadata extends
        | "DEFAULT"
        | "DESCRIPTION"
        | "TYPE"
        | "ENUM"
        | "ENUM_DESCRIPTIONS"
      ? never
      : T
    : T;

// 最终的配置值类型映射，过滤掉元数据键
export type ConfigurationValueType = {
  [K in ConfigPaths<typeof CONFIG_SCHEMA> as ExcludeMetadataKeys<
    UppercaseConfigKey<K>
  >]: GenerateValueType<typeof CONFIG_SCHEMA>[K];
};

// 修改ConfigKey类型为所有可能的配置键的联合类型
export type ConfigKey = keyof ConfigurationValueType;

// 添加类型辅助函数
export type GetConfigValue<K extends ConfigKey> = ConfigurationValueType[K];

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

// 修改 ExtensionConfiguration 以使用 ConfigurationValueType
export interface ExtensionConfiguration {
  base: {
    language: GetConfigValue<"BASE_LANGUAGE">;
    systemPrompt: GetConfigValue<"BASE_SYSTEMPROMPT">;
    provider: GetConfigValue<"BASE_PROVIDER">;
    model: GetConfigValue<"BASE_MODEL">;
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
