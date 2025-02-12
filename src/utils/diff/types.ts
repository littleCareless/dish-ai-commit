import * as vscode from "vscode";

export interface DiffChunk {
  filename: string;
  content: string;
}

export interface DiffConfig {
  enabled: boolean;
  contextLines: number;
  maxLineLength: number;
}

/**
 * 从 VSCode 配置中获取差异简化的相关设置
 */
export function getDiffConfig(): DiffConfig {
  const config = vscode.workspace.getConfiguration("dish-ai-commit");
  return {
    enabled: config.get<boolean>("enableDiffSimplification") ?? false,
    contextLines: config.get<number>("diffSimplification.contextLines") ?? 3,
    maxLineLength:
      config.get<number>("diffSimplification.maxLineLength") ?? 120,
  };
}
