import * as vscode from "vscode";

// 类型定义
export interface DiffChunk {
  filename: string;
  content: string;
}

export interface DiffConfig {
  enabled: boolean;
  contextLines: number;
  maxLineLength: number;
}

// 配置相关函数
export function getDiffConfig(): DiffConfig {
  const config = vscode.workspace.getConfiguration("dish-ai-commit");
  return {
    enabled: config.get<boolean>("enableDiffSimplification") ?? false,
    contextLines: config.get<number>("diffSimplification.contextLines") ?? 3,
    maxLineLength:
      config.get<number>("diffSimplification.maxLineLength") ?? 120,
  };
}

// 文件分块相关函数
export function splitGitDiff(diff: string): DiffChunk[] {
  if (!diff.trim()) {
    return [];
  }

  return diff
    .split("diff --git")
    .filter((chunk) => chunk.trim())
    .map((chunk) => {
      const fileNameMatch = chunk.match(/a\/(.+?) b\//);
      return fileNameMatch
        ? {
            filename: fileNameMatch[1],
            content: chunk.trim(),
          }
        : null;
    })
    .filter((chunk): chunk is DiffChunk => chunk !== null);
}

export function splitSvnDiff(diff: string): DiffChunk[] {
  if (!diff.trim()) {
    return [];
  }

  return diff
    .split("Index: ")
    .filter((chunk) => chunk.trim())
    .map((chunk) => {
      const lines = chunk.split("\n");
      return {
        filename: lines[0].trim(),
        content: chunk.trim(),
      };
    });
}

// Diff 简化相关函数
export function simplifyDiff(diff: string, config: DiffConfig): string {
  if (!config.enabled) {
    return diff;
  }

  const lines = diff.split("\n");
  const simplified: string[] = [];
  let skipCount = 0;

  for (const line of lines) {
    if (isHeaderLine(line)) {
      simplified.push(line);
      continue;
    }

    if (isChangeLine(line)) {
      simplified.push(truncateLine(line, config.maxLineLength));
      skipCount = 0;
      continue;
    }

    if (skipCount < config.contextLines) {
      simplified.push(truncateLine(line, config.maxLineLength));
      skipCount++;
    } else if (skipCount === config.contextLines) {
      simplified.push("...");
      skipCount++;
    }
  }

  return simplified.join("\n");
}

// 辅助函数
export function isHeaderLine(line: string): boolean {
  return (
    line.startsWith("Index:") ||
    line.startsWith("===") ||
    line.startsWith("---") ||
    line.startsWith("+++")
  );
}

export function isChangeLine(line: string): boolean {
  return line.startsWith("+") || line.startsWith("-");
}

export function truncateLine(line: string, maxLength: number): string {
  if (!line || line.length <= maxLength) {
    return line;
  }
  return `${line.substring(0, maxLength - 3)}...`;
}
