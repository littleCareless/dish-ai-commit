import { ContextBlock, BlockPartitionResult, BlockProcessingResult } from "./types";
import { TokenCalculator } from "./token-calculator";
import { FORCE_RETAIN_BLOCKS, MIN_BLOCK_SIZE_FOR_TRUNCATION } from "./constants";
import { ContentTruncator } from "./content-truncator";
import { notify } from "../notification";
import { formatMessage } from "../i18n";

/**
 * 上下文区块处理器
 */
export class BlockProcessor {
  private tokenCalculator: TokenCalculator;
  private contentTruncator: ContentTruncator;
  private suppressNonCriticalWarnings: boolean;

  constructor(
    tokenCalculator: TokenCalculator, 
    contentTruncator: ContentTruncator,
    suppressNonCriticalWarnings: boolean = false
  ) {
    this.tokenCalculator = tokenCalculator;
    this.contentTruncator = contentTruncator;
    this.suppressNonCriticalWarnings = suppressNonCriticalWarnings;
  }

  /**
   * 将区块分区并排序
   * @param blocks 所有区块
   * @returns 包含强制保留区块和可处理区块的对象
   */
  partitionAndSortBlocks(blocks: ContextBlock[]): BlockPartitionResult {
    const forcedBlocks: ContextBlock[] = [];
    const processableBlocks: ContextBlock[] = [];
    
    for (const block of blocks) {
      if (FORCE_RETAIN_BLOCKS.includes(block.name)) {
        forcedBlocks.push(block);
      } else {
        processableBlocks.push(block);
      }
    }
    
    forcedBlocks.sort((a, b) => a.priority - b.priority);
    processableBlocks.sort((a, b) => b.priority - a.priority);
    
    return { forcedBlocks, processableBlocks };
  }

  /**
   * 处理强制保留的区块
   * @param blocks 强制保留的区块数组
   * @param availableTokens 可用的 token 数量
   * @returns 区块处理结果
   */
  processForcedBlocks(
    blocks: ContextBlock[],
    availableTokens: number
  ): BlockProcessingResult {
    const includedBlocks: ContextBlock[] = [];
    const includedBlockNames: string[] = [];
    const excludedBlockNames: string[] = [];
    let remainingTokens = availableTokens;

    for (const block of blocks) {
      const blockTokens = this.tokenCalculator.calculateContentTokens(block.content);
      
      if (remainingTokens >= blockTokens) {
        includedBlocks.push(block);
        remainingTokens -= blockTokens;
        includedBlockNames.push(block.name);
      } else {
        if (block.name === "code-changes") {
          const truncationResult = this.addTruncatedBlock(
            block,
            remainingTokens,
            includedBlocks,
            includedBlockNames
          );
          remainingTokens -= truncationResult;
        } else {
          excludedBlockNames.push(block.name);
        }
      }
    }

    return {
      includedBlocks,
      includedBlockNames,
      excludedBlockNames,
      remainingTokens
    };
  }

  /**
   * 处理可处理的区块
   * @param blocks 可处理的区块数组
   * @param availableTokens 可用的 token 数量
   * @returns 区块处理结果
   */
  processProcessableBlocks(
    blocks: ContextBlock[],
    availableTokens: number
  ): BlockProcessingResult {
    const includedBlocks: ContextBlock[] = [];
    const includedBlockNames: string[] = [];
    const excludedBlockNames: string[] = [];
    let remainingTokens = availableTokens;

    for (const block of blocks) {
      const blockTokens = this.tokenCalculator.calculateContentTokens(block.content);

      if (remainingTokens >= blockTokens) {
        includedBlocks.push(block);
        remainingTokens -= blockTokens;
        includedBlockNames.push(block.name);
      } else if (remainingTokens > MIN_BLOCK_SIZE_FOR_TRUNCATION) {
        const truncationResult = this.addTruncatedBlock(
          block,
          remainingTokens,
          includedBlocks,
          includedBlockNames
        );
        remainingTokens -= truncationResult;
        
        const currentIndex = blocks.indexOf(block);
        blocks
          .slice(currentIndex + 1)
          .forEach((b) => excludedBlockNames.push(b.name));
        break;
      } else {
        excludedBlockNames.push(block.name);
      }
    }

    return {
      includedBlocks,
      includedBlockNames,
      excludedBlockNames,
      remainingTokens
    };
  }

  /**
   * 添加一个被截断的区块到上下文中
   * @param block 要截断并添加的区块
   * @param maxTokens 可用于此区块的最大 token 数
   * @param includedBlocks 当前已包含的区块列表 (将被修改)
   * @param includedBlockNames 当前已包含的区块名称列表 (将被修改)
   * @returns 此截断区块所消耗的 token 数量
   */
  private addTruncatedBlock(
    block: ContextBlock,
    maxTokens: number,
    includedBlocks: ContextBlock[],
    includedBlockNames: string[]
  ): number {
    const truncatedContent = this.contentTruncator.truncate(block, maxTokens);
    const truncatedTokens = this.tokenCalculator.calculateContentTokens(truncatedContent);
    
    includedBlocks.push({ ...block, content: truncatedContent });
    includedBlockNames.push(`${block.name} (Truncated)`);
    
    if (!this.suppressNonCriticalWarnings) {
      notify.warn(formatMessage("context.truncated", [block.name]));
    }
    
    return truncatedTokens;
  }
}