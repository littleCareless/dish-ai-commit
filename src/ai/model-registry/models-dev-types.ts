/**
 * Models.dev API 数据类型定义
 * 基于 https://models.dev/api.json 的数据结构
 */

/**
 * 模态类型
 */
export type Modality = "text" | "image" | "audio" | "video" | "pdf";

/**
 * 模型能力标志
 */
export interface ModelCapabilities {
  /** 是否支持文件附件 */
  attachment?: boolean;
  /** 是否支持推理 */
  reasoning?: boolean;
  /** 是否支持工具调用 */
  tool_call?: boolean;
  /** 是否支持结构化输出 */
  structured_output?: boolean;
  /** 是否支持温度参数 */
  temperature?: boolean;
}

/**
 * 成本信息
 */
export interface ModelCost {
  /** 输入 token 成本（每百万 tokens） */
  input?: number;
  /** 输出 token 成本（每百万 tokens） */
  output?: number;
  /** 缓存读取成本 */
  cache_read?: number;
  /** 缓存写入成本 */
  cache_write?: number;
  /** 推理 token 成本 */
  reasoning?: number;
  /** 输入音频成本 */
  input_audio?: number;
  /** 输出音频成本 */
  output_audio?: number;
}

/**
 * 限制信息
 */
export interface ModelLimit {
  /** 上下文窗口大小 */
  context?: number;
  /** 最大输出 tokens */
  output?: number;
}

/**
 * 交错推理字段
 */
export interface ModelInterleaved {
  /** 字段名称 */
  field?: string;
}

/**
 * Models.dev 模型定义
 */
export interface ModelsDevModel {
  /** 模型 ID */
  id: string;
  /** 提供商 ID */
  provider: string;
  /** 模型名称 */
  name: string;
  /** 支持的输入模态 */
  modalities: {
    input: Modality[];
    output: Modality[];
  };
  /** 能力标志 */
  attachment?: boolean;
  reasoning?: boolean;
  tool_call?: boolean;
  structured_output?: boolean;
  temperature?: boolean;
  /** 知识截止日期 */
  knowledge?: string;
  /** 发布日期 */
  release_date?: string;
  /** 最近更新时间 */
  last_updated?: string;
  /** 权重是否公开 */
  open_weights?: boolean;
  /** 成本信息 */
  cost?: ModelCost;
  /** 限制信息 */
  limit?: ModelLimit;
  /** 交错推理字段 */
  interleaved?: ModelInterleaved;
  /** 模型家族 */
  family?: string;
}

/**
 * Provider 定义
 */
export interface ModelsDevProvider {
  /** Provider ID */
  id: string;
  /** Provider 名称 */
  name: string;
  /** AI SDK 包名 */
  npm?: string;
  /** API Key 环境变量 */
  env?: string[];
  /** 文档链接 */
  doc?: string;
  /** OpenAI 兼容 API 地址 */
  api?: string;
  /** Logo SVG URL */
  logo?: string;
}

/**
 * Models.dev API 响应
 */
export interface ModelsDevApiResponse {
  /** 模型列表 */
  models: ModelsDevModel[];
  /** Provider 映射 */
  providers: Record<string, {
    name: string;
    npm?: string;
    env?: string[];
    doc?: string;
    api?: string;
  }>;
}

/**
 * 缓存的模型数据
 */
export interface CachedModelData {
  /** 模型信息 */
  model: ModelsDevModel;
  /** Provider 信息 */
  provider: ModelsDevProvider;
  /** 缓存时间戳 */
  timestamp: number;
  /** 缓存 TTL（毫秒） */
  ttl: number;
}

/**
 * 缓存的 Provider 数据
 */
export interface CachedProviderData {
  /** Provider 信息 */
  provider: ModelsDevProvider;
  /** 缓存时间戳 */
  timestamp: number;
  /** 缓存 TTL（毫秒） */
  ttl: number;
}

/**
 * 拉取结果
 */
export interface FetchResult {
  /** 是否成功 */
  success: boolean;
  /** 拉取的模型数量 */
  modelCount: number;
  /** 拉取的 Provider 数量 */
  providerCount: number;
  /** 更新的模型列表 */
  updatedModels: string[];
  /** 新增的模型列表 */
  newModels: string[];
  /** 错误的模型列表 */
  errorModels: string[];
  /** 错误信息 */
  errors: string[];
  /** 拉取时间 */
  fetchTime: string;
}
