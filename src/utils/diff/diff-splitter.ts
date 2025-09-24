import { DiffChunk } from "./types";

export class DiffSplitter {
  /**
   * 将 Git diff 输出拆分为独立的文件差异块
   * @param {string} diff - 完整的 Git diff 文本输出
   * @returns {DiffChunk[]} 包含各文件差异信息的数组
   */
  static splitGitDiff(diff: string): DiffChunk[] {
    const chunks: DiffChunk[] = [];
    // 按 Git diff 文件头部分割
    const files = diff?.split("diff --git");

    for (const file of files) {
      if (!file?.trim()) {
        continue;
      }

      // 使用正则表达式提取文件名(格式: "a/path/to/file b/path/to/file")
      const fileNameMatch = file.match(/a\/(.+?) b\//);
      if (!fileNameMatch) {
        continue;
      }

      chunks.push({
        filename: fileNameMatch[1],
        content: file?.trim(),
      });
    }

    return chunks;
  }

  /**
   * 将 SVN diff 输出拆分为独立的文件差异块
   * @param {string} diff - 完整的 SVN diff 文本输出
   * @returns {DiffChunk[]} 包含各文件差异信息的数组
   */
  static splitSvnDiff(diff: string): DiffChunk[] {
    const chunks: DiffChunk[] = [];
    // 按 SVN diff 文件索引标记分割
    const files = diff?.split("Index: ");

    for (const file of files) {
      if (!file?.trim()) {
        continue;
      }

      // SVN diff 中文件名在第一行
      const lines = file?.split("\n");
      const filename = lines[0]?.trim();

      chunks.push({
        filename,
        content: file?.trim(),
      });
    }

    return chunks;
  }
}
