import { ContextBlock, TruncationStrategy, HunkInfo } from "./types";
import { TokenCalculator } from "./token-calculator";
import { TRUNCATION_RATIO } from "./constants";

/**
 * 内容截断器
 */
export class ContentTruncator {
  private tokenCalculator: TokenCalculator;

  constructor(tokenCalculator: TokenCalculator) {
    this.tokenCalculator = tokenCalculator;
  }

  /**
   * 根据策略截断内容
   * @param block 要截断的区块
   * @param maxTokens 最大 token 数
   * @returns 截断后的内容
   */
  truncate(block: ContextBlock, maxTokens: number): string {
    const tokens = this.tokenCalculator.encodeContent(block.content);
    if (tokens.length <= maxTokens) {
      return block.content;
    }

    let truncatedTokens: Uint32Array;

    switch (block.strategy) {
      case TruncationStrategy.TruncateHead:
        truncatedTokens = tokens.slice(-maxTokens);
        break;
      case TruncationStrategy.SmartTruncateDiff:
        return this.smartTruncateDiff(block.content, maxTokens);
      case TruncationStrategy.TruncateTail:
      default:
        truncatedTokens = tokens.slice(0, maxTokens);
        break;
    }

    return this.tokenCalculator.decodeTokens(truncatedTokens);
  }

  /**
   * 智能截断 diff 内容，优先保留文件头和尾部，并按 hunk 移除
   * @param diff diff 内容
   * @param maxTokens 最大 token 数
   * @returns 截断后的 diff 内容
   */
  private smartTruncateDiff(diff: string, maxTokens: number): string {
    const totalTokens = this.tokenCalculator.calculateContentTokens(diff);
    if (totalTokens <= maxTokens) {
      return diff;
    }

    const hunks = this.parseDiffHunks(diff);
    if (hunks.length <= 1) {
      return this.truncateMiddle(diff, maxTokens);
    }

    return this.truncateByHunks(hunks, maxTokens);
  }

  /**
   * 解析 diff 内容为 hunk 数组
   * @param diff diff 内容
   * @returns hunk 信息数组
   */
  private parseDiffHunks(diff: string): HunkInfo[] {
    return diff
      ?.split(/^diff --git/m)
      .filter(Boolean)
      .map((h) => `diff --git${h}`)
      .map((hunk) => ({
        content: hunk,
        tokens: this.tokenCalculator.calculateContentTokens(hunk),
      }));
  }

  /**
   * 从中间截断内容
   * @param content 内容
   * @param maxTokens 最大 token 数
   * @returns 截断后的内容
   */
  private truncateMiddle(content: string, maxTokens: number): string {
    const tokens = this.tokenCalculator.encodeContent(content);
    const headTokens = tokens.slice(0, Math.floor(maxTokens / 2));
    const tailTokens = tokens.slice(-Math.floor(maxTokens / 2));
    const head = this.tokenCalculator.decodeTokens(headTokens);
    const tail = this.tokenCalculator.decodeTokens(tailTokens);
    return `${head}\n\n... (diff truncated) ...\n\n${tail}`;
  }

  /**
   * 按 hunk 截断内容
   * @param hunks hunk 信息数组
   * @param maxTokens 最大 token 数
   * @returns 截断后的内容
   */
  private truncateByHunks(hunks: HunkInfo[], maxTokens: number): string {
    const firstHunk = hunks.shift()!;
    const lastHunk = hunks.pop();
    let middleHunks = hunks;

    let currentTokens = firstHunk.tokens + (lastHunk?.tokens ?? 0);
    middleHunks.forEach((h) => (currentTokens += h.tokens));

    let removedHunks = false;
    // 从中间移除 hunk 直到 token 数量在限制内
    while (currentTokens > maxTokens && middleHunks.length > 0) {
      const removedHunk = middleHunks.splice(
        Math.floor(middleHunks.length / 2),
        1
      )[0];
      currentTokens -= removedHunk.tokens;
      removedHunks = true;
    }

    let finalHunks = [firstHunk.content];
    finalHunks.push(...middleHunks.map((h) => h.content));
    if (lastHunk) {
      finalHunks.push(lastHunk.content);
    }

    let finalContent = finalHunks.join("\n");

    if (removedHunks) {
      finalContent = this.insertTruncationMessage(finalContent);
    }

    // 最终检查确保在 token 限制内
    if (this.tokenCalculator.calculateContentTokens(finalContent) > maxTokens) {
      const finalTokens = this.tokenCalculator.encodeContent(finalContent);
      const truncatedFinalTokens = finalTokens.slice(0, maxTokens);
      finalContent = this.tokenCalculator.decodeTokens(truncatedFinalTokens);
    }

    return finalContent;
  }

  /**
   * 在适当位置插入截断消息
   * @param content 内容
   * @returns 插入截断消息后的内容
   */
  private insertTruncationMessage(content: string): string {
    const lastHunkIndex = content.lastIndexOf("diff --git");
    if (lastHunkIndex > 0) {
      return (
        content.substring(0, lastHunkIndex) +
        "... (some file diffs truncated) ...\n\n" +
        content.substring(lastHunkIndex)
      );
    } else {
      return content + "\n\n... (some file diffs truncated) ...\n\n";
    }
  }
}
