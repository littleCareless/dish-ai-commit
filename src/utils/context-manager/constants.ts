/**
 * 定义需要强制保留的上下文区块名称
 * 这些区块在空间不足时不会被截断或移除。
 * 
 * 强制保留的区块说明：
 * - code-changes: 当前提交的代码变更内容，是生成提交信息的核心依据
 * - user-commits: 用户最近的提交历史，用于风格参考（用户主动开启）
 * - recent-commits: 仓库最近的提交历史，用于风格参考（用户主动开启）
 * - reminder: 系统提醒信息，包含语言要求等重要指导
 */
export const FORCE_RETAIN_BLOCKS: string[] = [
  "code-changes",      // 核心：当前提交的代码变更
  "user-commits",      // 用户主动开启：用户提交历史风格参考
  "recent-commits",    // 用户主动开启：仓库提交历史风格参考
  "reminder",          // 系统提醒：语言要求等指导信息
  // "custom-instructions", // 可选：用户自定义指令
];

/**
 * 上下文区块的最终排序顺序
 * 这个顺序决定了区块在最终输出中的排列顺序
 * 
 * 排序逻辑：
 * 1. 用户主动开启的功能优先显示
 * 2. 参考信息在前，核心变更在后
 * 3. 系统提醒和自定义指令在最后
 */
export const FINAL_BLOCK_ORDER: string[] = [
  "user-commits",      // 用户提交历史（风格参考）
  "recent-commits",    // 仓库提交历史（风格参考）
  "similar-code",      // 相似代码上下文（参考）
  "original-code",     // 原始代码（对比参考）
  "code-changes",      // 代码变更（核心内容）
  "reminder",          // 系统提醒（指导信息）
  "custom-instructions", // 自定义指令（用户要求）
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