import { ContextBlock, TruncationStrategy, HunkInfo } from "@/utils/context-manager/types";
import { TokenCalculator } from "@/utils/context-manager/token-calculator";
import { TRUNCATION_RATIO } from "@/utils/context-manager/constants";

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
      .map((hunk, index) => {
        const filePath = this.extractDiffFilePath(hunk);
        return {
          content: hunk,
          tokens: this.tokenCalculator.calculateContentTokens(hunk),
          filePath,
          order: index,
          semanticScore: this.calculateSemanticScore(hunk, filePath),
        };
      });
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
    const sortedByPriority = [...hunks].sort((a, b) => {
      const scoreA = (a.semanticScore ?? 0) / Math.max(a.tokens, 1);
      const scoreB = (b.semanticScore ?? 0) / Math.max(b.tokens, 1);
      return scoreB - scoreA;
    });

    const selected: HunkInfo[] = [];
    const removed: HunkInfo[] = [];
    let usedTokens = 0;

    for (const hunk of sortedByPriority) {
      if (usedTokens + hunk.tokens <= maxTokens) {
        selected.push(hunk);
        usedTokens += hunk.tokens;
      } else {
        removed.push(hunk);
      }
    }

    // Ensure at least one high-signal file is kept
    if (selected.length === 0 && sortedByPriority.length > 0) {
      selected.push(sortedByPriority[0]);
      removed.splice(removed.indexOf(sortedByPriority[0]), 1);
    }

    const finalHunks = selected.sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
    let finalContent = finalHunks.map((h) => h.content).join("\n");

    if (removed.length > 0) {
      finalContent = this.insertTruncationMessage(finalContent, removed);
    }

    // 最终检查确保在 token 限制内
    if (this.tokenCalculator.calculateContentTokens(finalContent) > maxTokens) {
      const finalTokens = this.tokenCalculator.encodeContent(finalContent);
      const truncatedFinalTokens = finalTokens.slice(0, maxTokens);
      finalContent = this.tokenCalculator.decodeTokens(truncatedFinalTokens);
    }

    return finalContent;
  }

  private insertTruncationMessage(content: string, removedHunks: HunkInfo[]): string {
    const removedFiles = removedHunks
      .map((h) => h.filePath)
      .filter((v): v is string => !!v);
    const removedPreview =
      removedFiles.length > 0
        ? `\nRemoved files: ${removedFiles.slice(0, 8).join(", ")}${removedFiles.length > 8 ? ", ..." : ""}\n`
        : "\n";
    const lastHunkIndex = content.lastIndexOf("diff --git");
    if (lastHunkIndex > 0) {
      return (
        content.substring(0, lastHunkIndex) +
        `... (some file diffs truncated) ...${removedPreview}\n` +
        content.substring(lastHunkIndex)
      );
    } else {
      return content + `\n\n... (some file diffs truncated) ...${removedPreview}\n`;
    }
  }

  private extractDiffFilePath(hunk: string): string | undefined {
    const match = hunk.match(/^diff --git a\/(.+?) b\/(.+)$/m);
    return match?.[2];
  }

  private calculateSemanticScore(hunk: string, filePath?: string): number {
    let score = 0;
    const changedLines = hunk.match(/^[+-](?!\+\+\+|---).+/gm)?.length ?? 0;
    score += Math.min(changedLines, 200);

    const structureSignals = hunk.match(
      /^[+-]\s*(export\s+)?(async\s+)?(function|class|interface|type|enum)\b/gm,
    )?.length ?? 0;
    score += structureSignals * 24;

    const importSignals = hunk.match(
      /^[+-]\s*(import|from\s+['"]|const\s+.+\s*=\s*require\()/gm,
    )?.length ?? 0;
    score += importSignals * 8;

    if (/new file mode|deleted file mode|rename from|rename to/.test(hunk)) {
      score += 40;
    }

    if (filePath && /\.(lock|snap)$/.test(filePath)) {
      score -= 60;
    }

    return score;
  }
}
