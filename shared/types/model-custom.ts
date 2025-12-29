/**
 * 自定义模型信息类型定义
 * 用于用户自定义模型参数，补充 API 无法获取的模型信息
 */

/**
 * 用户自定义的单个模型信息
 */
export interface CustomModelInfo {
  /** 模型ID (e.g., "gpt-4-custom") */
  id: string;

  /** 所属提供商ID */
  providerId: string;

  /** 显示名称 */
  modelName: string;

  /** Token限制 */
  maxTokens: {
    input: number; // 输入token上限
    output: number; // 输出token上限
  };

  /** 上下文窗口 (可选) */
  contextWindow?: number;

  /** 能力覆盖 (可选) */
  capabilities?: {
    streaming?: boolean;
    functionCalling?: boolean;
    vision?: boolean;
  };

  /** 价格信息 (可选) */
  pricing?: {
    input: number; // 每1M tokens
    output: number; // 每1M tokens
  };

  /** 是否废弃 */
  deprecated?: boolean;

  /** 备注 */
  notes?: string;

  /** 最后更新时间 */
  lastUpdated?: string;
}

/**
 * 自定义模型注册表
 */
export interface CustomModelRegistry {
  /** 模型映射表，key 为 providerId_modelId */
  models: Record<string, CustomModelInfo>;

  /** 数据版本 */
  version: string;

  /** 最后同步时间 */
  lastSync?: string;
}

/**
 * 提供商信息
 */
export interface ProviderInfo {
  /** 提供商ID */
  id: string;

  /** 提供商名称 */
  name: string;
}
