// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { ConfigurationManager } from "./config/ConfigurationManager";
import { registerCommands } from "./commands";
import { LocalizationManager } from "./utils/LocalizationManager";
import { NotificationHandler } from "./utils/NotificationHandler";
import { WeeklyReportPanel } from "./webview/WeeklyReportPanel";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  try {
    console.log('Extension "dish-ai-commit-gen" is now active!');

    // 初始化本地化管理器（移除重复的初始化）
    LocalizationManager.initialize(context);

    // 初始化配置管理器并添加到订阅列表
    context.subscriptions.push(ConfigurationManager.getInstance());
    console.log("注册命令");
    // 注册所有命令
    registerCommands(context);
  } catch (e) {
    console.error("Error activating extension:", e);
    // 添加用户可见的错误提示
    NotificationHandler.error(
      "extension.activation.failed",
      3000,
      e instanceof Error ? e.message : String(e)
    );
    throw e;
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
