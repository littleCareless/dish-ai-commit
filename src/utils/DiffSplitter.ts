export interface DiffChunk {
  filename: string;
  content: string;
}

export class DiffSplitter {
  static splitGitDiff(diff: string): DiffChunk[] {
    const chunks: DiffChunk[] = [];
    const files = diff.split("diff --git");

    for (const file of files) {
      if (!file.trim()) {
        continue;
      }

      // 提取文件名
      const fileNameMatch = file.match(/a\/(.+?) b\//);
      if (!fileNameMatch) {
        continue;
      }

      chunks.push({
        filename: fileNameMatch[1],
        content: file.trim(),
      });
    }

    return chunks;
  }

  static splitSvnDiff(diff: string): DiffChunk[] {
    const chunks: DiffChunk[] = [];
    const files = diff.split("Index: ");

    for (const file of files) {
      if (!file.trim()) {
        continue;
      }

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
