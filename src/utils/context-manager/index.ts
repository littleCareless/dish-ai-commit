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
} from '@/utils/context-manager/types';

// 导出常量
export { 
  FORCE_RETAIN_BLOCKS,
  FINAL_BLOCK_ORDER,
  DEFAULT_TOKEN_RESERVE,
  MIN_BLOCK_SIZE_FOR_TRUNCATION,
  TRUNCATION_RATIO
} from '@/utils/context-manager/constants';

// 导出工具类
export { TokenCalculator } from '@/utils/context-manager/token-calculator';
export { BlockProcessor } from '@/utils/context-manager/block-processor';
export { ContentTruncator } from '@/utils/context-manager/content-truncator';
export { ContentBuilder } from '@/utils/context-manager/content-builder';
export { SmartTruncator } from '@/utils/context-manager/smart-truncator';
export { ContextLogger } from '@/utils/context-manager/context-logger';