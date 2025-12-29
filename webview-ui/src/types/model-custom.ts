/**
 * Webview UI 自定义模型类型定义
 */

import type {
  CustomModelInfo,
  CustomModelRegistry,
  ProviderInfo,
} from "@shared/types/model-custom";

// 导出基础类型
export type { CustomModelInfo, CustomModelRegistry, ProviderInfo };

/**
 * 表单数据结构
 * 用于 ModelForm 组件的表单字段
 */
export interface ModelFormValues {
  /** 提供商ID */
  providerId: string;

  /** 模型ID */
  modelId: string;

  /** 模型名称 */
  modelName: string;

  /** 输入Token上限 */
  inputTokens: number;

  /** 输出Token上限 */
  outputTokens: number;

  /** 上下文窗口 (可选) */
  contextWindow?: number;

  /** 流式输出能力 */
  streaming?: boolean;

  /** 函数调用能力 */
  functionCalling?: boolean;

  /** 视觉能力 */
  vision?: boolean;

  /** 输入价格 (每1M tokens) */
  pricingInput?: number;

  /** 输出价格 (每1M tokens) */
  pricingOutput?: number;

  /** 是否废弃 */
  deprecated?: boolean;

  /** 备注 */
  notes?: string;
}
