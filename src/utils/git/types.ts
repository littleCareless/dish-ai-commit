import * as vscode from "vscode";
import { API, GitExtension, Ref } from "../../types/git";

/**
 * QuickPick 项目接口，用于显示 Git 引用选择
 */
export interface RefQuickPickItem extends vscode.QuickPickItem {
  ref: Ref;
}

/**
 * 重新导出 Git 相关类型，供其他模块使用
 */
export type { API, GitExtension, Ref, Repository } from "../../types/git";
