import * as vscode from "vscode";

export class DiffSimplifier {
  private static getConfig() {
    const config = vscode.workspace.getConfiguration("dish-ai-commit");
    return {
      enabled: config.get<boolean>("enableDiffSimplification") || false,
      contextLines: config.get<number>("diffSimplification.contextLines") || 3,
      maxLineLength:
        config.get<number>("diffSimplification.maxLineLength") || 120,
    };
  }

  private static readonly CONTEXT_LINES = 3;
  private static readonly MAX_LINE_LENGTH = 120;

  static simplify(diff: string): string {
    const config = this.getConfig();

    if (!config.enabled) {
      return diff;
    }

    const lines = diff.split("\n");
    const simplified: string[] = [];
    let skipCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 保留diff头信息
      if (
        line.startsWith("Index:") ||
        line.startsWith("===") ||
        line.startsWith("---") ||
        line.startsWith("+++")
      ) {
        simplified.push(line);
        continue;
      }

      // 处理修改行
      if (line.startsWith("+") || line.startsWith("-")) {
        // 截断过长的行
        simplified.push(this.truncateLine(line, config.maxLineLength));
        skipCount = 0;
        continue;
      }

      // 处理上下文行
      if (skipCount < config.contextLines) {
        simplified.push(this.truncateLine(line, config.maxLineLength));
        skipCount++;
      } else if (skipCount === config.contextLines) {
        simplified.push("...");
        skipCount++;
      }
    }

    return simplified.join("\n");
  }

  private static truncateLine(line: string, maxLength: number): string {
    if (line.length <= maxLength) {
      return line;
    }
    return line.substring(0, maxLength - 3) + "...";
  }
}
