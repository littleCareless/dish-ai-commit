import * as vscode from "vscode";

export interface DiffChunk {
  filename: string;
  content: string;
}

export enum FilePathMode {
  AsAttribute = "AsAttribute",
  AsComment = "AsComment",
  None = "None",
}

export interface DiffConfig {
  enabled: boolean;
  contextLines: number;
  filePathMode: FilePathMode;
  lineNumberStyle: "legacy" | "default";
}

/**
 * 从 VSCode 配置中获取差异简化的相关设置
 */
export function getDiffConfig(): DiffConfig {
  const config = vscode.workspace.getConfiguration("dish-ai-commit");
  return {
    enabled: config.get<boolean>("features.codeAnalysis.simplifyDiff") ?? false,
    contextLines: config.get<number>("features.codeAnalysis.contextLines") ?? 3,
    filePathMode:
      config.get<FilePathMode>("features.codeAnalysis.filePathMode") ??
      FilePathMode.AsComment,
    lineNumberStyle:
      config.get<"legacy" | "default">(
        "features.codeAnalysis.lineNumberStyle"
      ) ?? "default",
  };
}
