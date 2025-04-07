import {
  CONFIG_SCHEMA,
  generateConfigKeys,
  generateConfigMetadata,
  type ConfigObject,
  type ConfigValueTypeString,
  type ConfigValueTypeBoolean,
  type ConfigValueTypeNumber,
} from "./config-schema";

/**
 * 从 CONFIG_SCHEMA 生成 AI 提供商枚举对象
 * @returns {Record<string, string>} 返回大写键名映射到小写值的提供商枚举对象
 */
function generateProviderEnum() {
  const providers = CONFIG_SCHEMA.base.provider.enum;
  // 校验 providers 是否存在
  if (!providers) {
    return {};
  }

  // 将每个提供商名转换为大写键并映射到小写值
  return providers.reduce((acc, provider) => {
    acc[provider.toUpperCase().replace(/\s+/g, "_")] = provider.toLowerCase();
    return acc;
  }, {} as Record<string, string>);
}

/** AI 提供商枚举常量 */
export const AIProvider = generateProviderEnum();

/**
 * 从配置值类型定义中提取实际类型
 * @template T 配置值类型定义
 */
type ExtractConfigValueType<T> = T extends ConfigValueTypeString
  ? string
  : T extends ConfigValueTypeBoolean
  ? boolean
  : T extends ConfigValueTypeNumber
  ? number
  : never;

/**
 * 递归生成配置对象的类型定义
 * @template T 配置模式对象
 */
type GenerateConfigType<T> = {
  [K in keyof T]: T[K] extends { type: string }
    ? ExtractConfigValueType<T[K]>
    : T[K] extends ConfigObject
    ? GenerateConfigType<T[K]>
    : never;
};

/** 扩展配置接口类型 */
export type ExtensionConfiguration = GenerateConfigType<typeof CONFIG_SCHEMA>;

/**
 * 递归生成配置路径类型
 * @template T 配置对象类型
 * @template P 当前路径前缀
 */
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

/** 配置路径类型 */
export type ConfigPath = RecursiveConfigPath<typeof CONFIG_SCHEMA>;

/** 配置键类型（大写形式） */
export type ConfigKey = Uppercase<ConfigPath>;

/** 配置值类型映射 */
export type ConfigurationValueType = {
  [K in ConfigPath as Uppercase<K>]: ExtractConfigValueType<
    GetSchemaType<typeof CONFIG_SCHEMA, K>
  >;
};

/**
 * 根据路径获取 schema 类型的辅助类型
 * @template T Schema 对象类型
 * @template P 路径字符串
 */
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

/**
 * 生成提供商必填字段映射
 * @returns {Record<string, "apiKey" | "baseUrl">} 提供商名称到必填字段的映射
 */
function generateProviderRequiredFields() {
  const providers = CONFIG_SCHEMA.providers;
  const result: Record<string, "apiKey" | "baseUrl"> = {};

  // 遍历每个提供商配置，确定其必填字段
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

/** 提供商必填字段映射常量 */
export const PROVIDER_REQUIRED_FIELDS = generateProviderRequiredFields();

// 导出配置相关常量
export const ConfigKeys = generateConfigKeys(CONFIG_SCHEMA);
export const CONFIG_METADATA = generateConfigMetadata(CONFIG_SCHEMA);

/** 配置父级类型（排除 base） */
export type ConfigParent = Exclude<keyof typeof CONFIG_SCHEMA, "base">;

/** 配置元数据接口 */
export interface ConfigMetadata {
  /** 配置键（大写） */
  key: ConfigKey;
  /** 默认值 */
  defaultValue?: any;
  /** 是否为嵌套配置 */
  nested?: boolean;
  /** 父级配置名称 */
  parent?: ConfigParent;
}
