import { ContextBlock } from "./types";
import { FINAL_BLOCK_ORDER } from "./constants";

/**
 * 内容构建器
 */
export class ContentBuilder {
  /**
   * 排序并构建用户内容
   * @param includedBlocks 已包含的区块数组
   * @param includedBlockNames 已包含的区块名称数组
   * @returns 构建好的用户内容字符串
   */
  sortAndBuildUserContent(
    includedBlocks: ContextBlock[],
    includedBlockNames: string[]
  ): string {
    const sortedBlocks = this.sortBlocksByOrder(includedBlocks);
    return this.buildContentFromBlocks(sortedBlocks, includedBlockNames);
  }

  /**
   * 按预定义顺序排序区块
   * @param blocks 区块数组
   * @returns 排序后的区块数组
   */
  private sortBlocksByOrder(blocks: ContextBlock[]): ContextBlock[] {
    return blocks.sort(
      (a, b) => FINAL_BLOCK_ORDER.indexOf(a.name) - FINAL_BLOCK_ORDER.indexOf(b.name)
    );
  }

  /**
   * 从区块构建内容字符串
   * @param blocks 区块数组
   * @param includedBlockNames 已包含的区块名称数组
   * @returns 构建的内容字符串
   */
  private buildContentFromBlocks(
    blocks: ContextBlock[],
    includedBlockNames: string[]
  ): string {
    return blocks
      .map((block) => {
        const tagName = this.generateTagName(block.name);
        const isTruncated = includedBlockNames.includes(`${block.name} (Truncated)`);
        const tag = isTruncated
          ? `<${tagName} truncated="true">`
          : `<${tagName}>`;
        return `${tag}\n${block.content}\n</${tagName}>`;
      })
      .join("\n\n");
  }

  /**
   * 生成标签名称
   * @param blockName 区块名称
   * @returns 标签名称
   */
  private generateTagName(blockName: string): string {
    return blockName.toLowerCase().replace(/\s+/g, "-");
  }

  /**
   * 构建原始用户内容（未截断）
   * @param blocks 所有区块
   * @returns 原始用户内容字符串
   */
  buildRawUserContent(blocks: ContextBlock[]): string {
    const sortedBlocks = this.sortBlocksByOrder([...blocks]);
    return sortedBlocks
      .map(block => {
        const tagName = this.generateTagName(block.name);
        return `<${tagName}>\n${block.content}\n</${tagName}>`;
      })
      .join("\n\n");
  }
}