import { AIModel } from "../../ai/types";

/**
 * 定义上下文区块的截断策略
 */
export enum TruncationStrategy {
  /**
   * 从尾部移除内容
   */
  TruncateTail,
  /**
   * 从头部移除内容
   */
  TruncateHead,
  /**
   * 按 diff hunk 智能移除
   */
  SmartTruncateDiff,
}

/**
 * 定义上下文区块的接口
 */
export interface ContextBlock {
  /**
   * 区块内容
   */
  content: string;
  /**
   * 优先级 (数字越小，优先级越高)
   */
  priority: number;
  /**
   * 截断策略
   */
  strategy: TruncationStrategy;
  /**
   * 区块名称，用于日志和调试
   */
  name: string;
}

/**
 * Token 计算相关的接口
 */
export interface TokenCalculationResult {
  maxTokens: number;
  systemPromptTokens: number;
}

/**
 * 区块分区结果接口
 */
export interface BlockPartitionResult {
  forcedBlocks: ContextBlock[];
  processableBlocks: ContextBlock[];
}

/**
 * 区块处理结果接口
 */
export interface BlockProcessingResult {
  includedBlocks: ContextBlock[];
  includedBlockNames: string[];
  excludedBlockNames: string[];
  remainingTokens: number;
}

/**
 * Hunk 信息接口
 */
export interface HunkInfo {
  content: string;
  tokens: number;
}

/**
 * 自定义错误类型，当上下文过大且无法再缩减时抛出
 */
export class RequestTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestTooLargeError";
  }
}