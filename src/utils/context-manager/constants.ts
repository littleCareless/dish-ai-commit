/**
 * 定义需要强制保留的上下文区块名称
 * 这些区块在空间不足时不会被截断或移除。
 */
export const FORCE_RETAIN_BLOCKS: string[] = [
  "code-changes",
  // "custom-instructions",
  "reminder",
];

/**
 * 上下文区块的最终排序顺序
 */
export const FINAL_BLOCK_ORDER: string[] = [
  "user-commits",
  "recent-commits",
  "similar-code",
  "original-code",
  "code-changes",
  "reminder",
  "custom-instructions",
];

/**
 * 默认的 token 预留量，用于响应和开销
 */
export const DEFAULT_TOKEN_RESERVE = 100;

/**
 * 智能截断时的最小区块大小
 */
export const MIN_BLOCK_SIZE_FOR_TRUNCATION = 100;

/**
 * 截断时保留的内容比例
 */
export const TRUNCATION_RATIO = 0.7;