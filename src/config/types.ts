import {
  CONFIG_SCHEMA,
  generateConfigKeys,
  generateConfigMetadata,
  type ConfigObject,
  type ConfigValueTypeString,
  type ConfigValueTypeBoolean,
  type ConfigValueTypeNumber,
} from "./ConfigSchema";

// 从 CONFIG_SCHEMA 自动生成提供商枚举
function generateProviderEnum() {
  const providers = CONFIG_SCHEMA.base.provider.enum;
  if (!providers) {
    return {};
  }

  return providers.reduce((acc, provider) => {
    acc[provider.toUpperCase().replace(/\s+/g, "_")] = provider.toLowerCase();
    return acc;
  }, {} as Record<string, string>);
}

export const AIProvider = generateProviderEnum();

// 基础类型提取 - 保持不变
type ExtractConfigValueType<T> = T extends ConfigValueTypeString
  ? string
  : T extends ConfigValueTypeBoolean
  ? boolean
  : T extends ConfigValueTypeNumber
  ? number
  : never;

// 自动生成配置类型
type GenerateConfigType<T> = {
  [K in keyof T]: T[K] extends { type: string }
    ? ExtractConfigValueType<T[K]>
    : T[K] extends ConfigObject
    ? GenerateConfigType<T[K]>
    : never;
};

// 自动生成扩展配置接口
export type ExtensionConfiguration = GenerateConfigType<typeof CONFIG_SCHEMA>;

// 配置路径生成
type RecursiveConfigPath<T, P extends string = ""> = {
  [K in keyof T]: T[K] extends { type: string }
    ? P extends ""
      ? `${K & string}`
      : `${P}_${K & string}`
    : T[K] extends ConfigObject
    ? P extends ""
      ? `${K & string}` | RecursiveConfigPath<T[K], `${K & string}`>
      : `${P}_${K & string}` | RecursiveConfigPath<T[K], `${P}_${K & string}`>
    : never;
}[keyof T];

// 配置路径类型
export type ConfigPath = RecursiveConfigPath<typeof CONFIG_SCHEMA>;

// 配置键类型（大写）
export type ConfigKey = Uppercase<ConfigPath>;

// 自动生成配置值类型映射
export type ConfigurationValueType = {
  [K in ConfigPath as Uppercase<K>]: ExtractConfigValueType<
    GetSchemaType<typeof CONFIG_SCHEMA, K>
  >;
};

// 辅助类型：根据路径获取 schema 类型
type GetSchemaType<
  T,
  P extends string
> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? GetSchemaType<T[Head], Rest>
    : never
  : P extends keyof T
  ? T[P]
  : never;

// 自动生成必填字段映射
function generateProviderRequiredFields() {
  const providers = CONFIG_SCHEMA.providers;
  const result: Record<string, "apiKey" | "baseUrl"> = {};

  for (const [provider, config] of Object.entries(providers)) {
    const fields = Object.keys(config);
    if (fields.includes("apiKey")) {
      result[provider] = "apiKey";
    } else if (fields.includes("baseUrl")) {
      result[provider] = "baseUrl";
    }
  }

  return result;
}

export const PROVIDER_REQUIRED_FIELDS = generateProviderRequiredFields();

// 导出配置键和元数据
export const ConfigKeys = generateConfigKeys(CONFIG_SCHEMA);
export const CONFIG_METADATA = generateConfigMetadata(CONFIG_SCHEMA);

// 工具函数类型
export type ConfigParent = Exclude<keyof typeof CONFIG_SCHEMA, "base">;

export interface ConfigMetadata {
  key: ConfigKey;
  defaultValue?: any;
  nested?: boolean;
  parent?: ConfigParent;
}
