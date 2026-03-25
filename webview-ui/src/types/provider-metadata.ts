/**
 * AI 提供商元数据类型定义
 * 支持动态渲染和验证的元数据驱动架构
 */

import React from "react";

// 字段类型枚举
export enum FieldType {
  TEXT = "text",
  PASSWORD = "password",
  NUMBER = "number",
  SELECT = "select",
  SLIDER = "slider",
  CHECKBOX = "checkbox",
  PATH = "path",
  URL = "url",
  TEXTAREA = "textarea",
  MULTISELECT = "multiselect",
  CUSTOM = "custom",
  INFO_BLOCK = "info_block",
  KEY_VALUE_LIST = "key_value_list",
}

// 认证模式
export enum AuthMode {
  API_KEY = "apiKey",
  CLI = "cli",
  OAUTH = "oauth",
  NONE = "none",
}

// 提供商类型
export enum ProviderType {
  FIRST_PARTY = "first-party",
  CLOUD = "cloud",
  AGGREGATOR = "aggregator",
  LOCAL = "local",
  OPENAI_COMPATIBLE = "openai-compatible",
}

// 验证规则类型
export enum ValidationRuleType {
  REQUIRED = "required",
  PATTERN = "pattern",
  MIN = "min",
  MAX = "max",
  CUSTOM = "custom",
  EMAIL = "email",
  URL = "url",
}

// 验证规则接口
export interface ValidationRule {
  type: ValidationRuleType;
  message: string;
  pattern?: RegExp;
  min?: number;
  max?: number;
  validator?: (value: unknown) => boolean | Promise<boolean>;
}

// 字段元数据接口
export interface FieldMetadata {
  key: string;
  type: FieldType;
  label: string;
  required: boolean;
  secure?: boolean; // 是否需要加密存储
  validation?: ValidationRule[];
  defaultValue?: unknown;
  placeholder?: string;
  helpText?: string;
  conditional?: { field: string; value: unknown }; // 条件显示
  options?: Array<{ value: string; label: string; disabled?: boolean }>; // 选择框选项
  min?: number; // 数值/滑块最小值
  max?: number; // 数值/滑块最大值
  step?: number; // 数值/滑块步长
  rows?: number; // 文本域行数
  disabled?: boolean; // 是否禁用
  customRenderer?: (props: FieldRendererProps) => React.ReactElement; // 自定义渲染器
}

// 字段配置类型别名（向后兼容）
export type FieldConfig = FieldMetadata;

// 提供商特性接口
export interface ProviderFeatures {
  streaming: boolean;
  functionCalling: boolean;
  vision: boolean;
  promptCache: boolean;
  embeddings: boolean;
  tools: boolean;
  jsonMode: boolean;
  parallelRequests?: boolean;
  customModels?: boolean;
}

// 模型元数据接口
export interface ModelMetadata {
  id: string;
  name: string;
  description?: string;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: string[];
  pricing?: {
    input: number; // 每1M tokens价格
    output: number; // 每1M tokens价格
    cacheWrite?: number; // 缓存写入价格
    cacheRead?: number; // 缓存读取价格
  };
  deprecated?: boolean;
  available?: boolean;
}

// 定价信息接口
export interface PricingInfo {
  input: number; // 每1M输入tokens价格（美元）
  output: number; // 每1M输出tokens价格（美元）
  cacheWrite?: number; // 缓存写入价格
  cacheRead?: number; // 缓存读取价格
  currency: string; // 货币单位
  lastUpdated?: string; // 最后更新时间
}

// 提供商元数据接口
export interface ProviderMetadata {
  id: string;
  name: string;
  description: string;
  icon?: string;
  website: string;
  type: ProviderType;
  authMode: AuthMode;
  fields: FieldMetadata[];
  features: ProviderFeatures;
  models: ModelMetadata[];
  pricing?: PricingInfo;
  documentation?: {
    setup: string;
    apiReference: string;
    examples: string;
  };
  regions?: string[]; // 支持的区域
  rateLimits?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

// 验证结果接口
export interface ValidationResult {
  field: string;
  valid: boolean;
  message?: string;
  errors: string[];
}

// 提供商配置接口（扩展原有的 ProviderConfig）
export interface ExtendedProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  isActive: boolean;

  // 通用字段
  apiKey?: string;
  baseURL?: string;
  organization?: string;
  region?: string;
  projectId?: string;

  // 自定义字段存储
  customFields?: Record<string, unknown>;

  // 模型配置
  models: ModelMetadata[];
  defaultModel?: string;

  // 高级设置
  customHeaders?: Record<string, string>;
  timeout?: number;
  retries?: number;
  temperature?: number;
  maxTokens?: number;
  enableReasoningEffort?: boolean;
  reasoningEffortLevel?: "low" | "medium" | "high" | string;
  enableSmoothStreaming?: boolean;
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stopSequences?: string;
  enableReasoningExtraction?: boolean;
  reasoningExtractionTagName?: string;
  featureOverrides?: string | Record<string, unknown>;

  // 时间戳
  createdAt?: Date;
  updatedAt?: Date;
}

// 表单状态接口
export interface FormState {
  values: Record<string, unknown>;
  errors: Record<string, string[]>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
}

// 提供商注册表类型
export type ProviderRegistry = Record<string, ProviderMetadata>;

// 字段渲染器属性接口
export interface FieldRendererProps {
  field: FieldMetadata;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}

// 动态表单属性接口
export interface DynamicProviderFormProps {
  metadata: ProviderMetadata;
  config: ExtendedProviderConfig;
  onChange: (key: string, value: unknown) => void;
  onValidate?: (field: string, value: unknown) => Promise<ValidationResult>;
  disabled?: boolean;
  showAdvanced?: boolean;
}
