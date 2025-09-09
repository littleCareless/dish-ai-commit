// {{CHENGQI:
// Action: Modified; Timestamp: 2025-09-09T02:28:33.871Z; Reason: Refactor to use cosmiconfig for robust config loading, as per commitlint docs.; Principle_Applied: Engineering Excellence;
// }}
// {{START MODIFICATIONS}}
import * as vscode from "vscode";
import { cosmiconfig, cosmiconfigSync } from "cosmiconfig";
import type { UserConfig } from "@commitlint/types";

export async function loadCommitlintConfig(
  workspaceRoot?: string
): Promise<UserConfig | null> {
  if (!workspaceRoot) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return null;
    }
    workspaceRoot = workspaceFolders[0].uri.fsPath;
  }

  const explorer = cosmiconfig("commitlint");

  try {
    const result = await explorer.search(workspaceRoot);

    if (result && !result.isEmpty) {
      return result.config as UserConfig;
    }

    return null;
  } catch (error) {
    console.error("Error loading commitlint configuration:", error);
    vscode.window.showErrorMessage(
      `Error loading commitlint configuration: ${
        error instanceof Error ? error.message : "An unknown error occurred"
      }`
    );
    return null;
  }
}
