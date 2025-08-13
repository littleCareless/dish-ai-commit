/**
 * 上下文管理器模块统一导出
 */

// 导出类型和枚举
export { 
  ContextBlock, 
  TruncationStrategy, 
  RequestTooLargeError,
  TokenCalculationResult,
  BlockPartitionResult,
  BlockProcessingResult,
  HunkInfo
} from './types';

// 导出常量
export { 
  FORCE_RETAIN_BLOCKS,
  FINAL_BLOCK_ORDER,
  DEFAULT_TOKEN_RESERVE,
  MIN_BLOCK_SIZE_FOR_TRUNCATION,
  TRUNCATION_RATIO
} from './constants';

// 导出工具类
export { TokenCalculator } from './token-calculator';
export { BlockProcessor } from './block-processor';
export { ContentTruncator } from './content-truncator';
export { ContentBuilder } from './content-builder';
export { SmartTruncator } from './smart-truncator';
export { ContextLogger } from './context-logger';