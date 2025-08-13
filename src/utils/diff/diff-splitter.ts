import { DiffChunk } from "./types";

export class DiffSplitter {
  /**
   * 将 Git diff 输出拆分为独立的文件差异块
   * @param {string} diff - 完整的 Git diff 文本输出
   * @returns {DiffChunk[]} 包含各文件差异信息的数组
   */
  static splitGitDiff(diff: string): DiffChunk[] {
    const chunks: DiffChunk[] = [];
    // 使用正向先行断言，保留每个块内的 "diff --git" 行
    const parts = diff.split(/(?=^diff --git )/m);

    // 可能存在我们自定义的头部（例如：=== Renamed File: R100 old new ===）位于第一个 diff 块之前。
    // 同时，每个块末尾也可能带有下一块的头部，需转移到下一个块。
    let pendingHeader: string | null = null;

    for (const part of parts) {
      const text = part.trim();
      if (!text) {
        continue;
      }

      // 如果当前片段不是以 diff --git 开头，视为仅包含头部信息，缓存到 pendingHeader
      if (!/^diff --git\s/m.test(text)) {
        // 取最后一行的 === ... === 作为头
        const headerMatch = text.match(/=== [^\n]+ ===/);
        if (headerMatch) {
          pendingHeader = headerMatch[0];
        }
        continue;
      }

      // 将尾部可能出现的下一段头部提取出来，留给下一轮
      let nextHeader: string | null = null;
      const trailingHeaderMatch = text.match(/\n=== [^\n]+ ===\s*$/);
      let contentBody = text;
      if (trailingHeaderMatch) {
        nextHeader = trailingHeaderMatch[0].trim();
        contentBody = text.slice(0, trailingHeaderMatch.index).trimEnd();
      }

      // 解析文件名，优先取 b/ 路径（新路径），否则回退到 a/
      // 例如：diff --git a/old/path.png b/new/path.png
      const firstLine = contentBody.split(/\n/, 1)[0];
      let filename = "";
      let m = /^diff --git\s+a\/(.+?)\s+b\/(.+)$/.exec(firstLine);
      if (m) {
        filename = m[2];
      } else {
        // 回退到下一行的 "a/... b/..." 模式
        const abLineMatch = contentBody.match(/\ba\/(.+?)\s+b\/(.+)/);
        if (abLineMatch && abLineMatch[2]) {
          filename = abLineMatch[2];
        } else if (abLineMatch && abLineMatch[1]) {
          filename = abLineMatch[1];
        }
      }

      if (!filename) {
        // 再回退到 +++ b/xxx 行
        const plusLine = contentBody.match(/^\+\+\+\s+b\/(.+)$/m);
        if (plusLine) {
          filename = plusLine[1];
        }
      }

      if (!filename) {
        // 若仍无法解析文件名，则跳过该块
        pendingHeader = nextHeader; // 保持 header 不丢失
        continue;
      }

      // 将 pendingHeader（若有）前置到内容，确保例如重命名头部能保留下来
      const finalContent = pendingHeader
        ? `${pendingHeader}\n${contentBody}`
        : contentBody;

      chunks.push({
        filename,
        content: finalContent.trim(),
      });

      // 将尾部抽取到的下一段头部传递到下一轮
      pendingHeader = nextHeader;
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
    const files = diff.split("Index: ");

    for (const file of files) {
      if (!file.trim()) {
        continue;
      }

      // SVN diff 中文件名在第一行
      const lines = file.split("\n");
      const filename = lines[0].trim();

      chunks.push({
        filename,
        content: file.trim(),
      });
    }

    return chunks;
  }
}
