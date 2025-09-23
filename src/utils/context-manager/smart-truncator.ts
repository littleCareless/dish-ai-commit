import { ContextBlock } from "./types";
import { TokenCalculator } from "./token-calculator";
import { FORCE_RETAIN_BLOCKS, MIN_BLOCK_SIZE_FOR_TRUNCATION, TRUNCATION_RATIO } from "./constants";
import { notify } from "../notification";
import { formatMessage } from "../i18n";

/**
 * 智能截断器
 */
export class SmartTruncator {
  private blocks: ContextBlock[];
  private tokenCalculator: TokenCalculator;
  private suppressNonCriticalWarnings: boolean;

  constructor(
    blocks: ContextBlock[],
    tokenCalculator: TokenCalculator,
    suppressNonCriticalWarnings: boolean = false
  ) {
    this.blocks = blocks;
    this.tokenCalculator = tokenCalculator;
    this.suppressNonCriticalWarnings = suppressNonCriticalWarnings;
  }

  /**
   * 尝试通过移除或截断优先级最低的块来智能地缩减上下文
   * @returns 如果成功缩减了上下文则返回 true，否则返回 false
   */
  smartTruncate(): boolean {
    const truncatableBlocks = this.getTruncatableBlocks();
    
    if (truncatableBlocks.length === 0) {
      return false;
    }

    const lowestPriorityBlock = truncatableBlocks[0];

    // 策略1: 截断该区块
    if (this.canTruncateBlock(lowestPriorityBlock)) {
      return this.truncateBlock(lowestPriorityBlock);
    }

    // 策略2: 移除该区块
    return this.removeBlock(lowestPriorityBlock);
  }

  /**
   * 获取可截断的区块列表
   * @returns 按优先级降序排序的可截断区块数组
   */
  private getTruncatableBlocks(): ContextBlock[] {
    return this.blocks
      .filter((b) => !FORCE_RETAIN_BLOCKS.includes(b.name))
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * 检查区块是否可以被截断
   * @param block 要检查的区块
   * @returns 如果可以截断返回 true
   */
  private canTruncateBlock(block: ContextBlock): boolean {
    return this.tokenCalculator.calculateContentTokens(block.content) > MIN_BLOCK_SIZE_FOR_TRUNCATION;
  }

  /**
   * 截断指定区块
   * @param block 要截断的区块
   * @returns 截断成功返回 true
   */
  private truncateBlock(block: ContextBlock): boolean {
    const tokens = this.tokenCalculator.encodeContent(block.content);
    const newLength = Math.floor(tokens.length * TRUNCATION_RATIO);
    const truncatedTokens = tokens.slice(0, newLength);
    
    block.content = this.tokenCalculator.decodeTokens(truncatedTokens);
    
    if (!this.suppressNonCriticalWarnings) {
      notify.warn(formatMessage("context.info.block.truncated", [block.name]));
    }
    
    return true;
  }

  /**
   * 移除指定区块
   * @param block 要移除的区块
   * @returns 移除成功返回 true
   */
  private removeBlock(block: ContextBlock): boolean {
    const blockIndex = this.blocks.findIndex((b) => b.name === block.name);
    
    if (blockIndex > -1) {
      const [removedBlock] = this.blocks.splice(blockIndex, 1);
      
      if (!this.suppressNonCriticalWarnings) {
        notify.warn(formatMessage("context.info.block.removed", [removedBlock.name]));
      }
      
      return true;
    }

    return false;
  }
}