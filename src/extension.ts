// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { ConfigurationManager } from "./config/configuration-manager";
import { registerCommands } from "./commands";
import { initializeLocalization } from "./utils/i18n";
import {
  notify,
  withProgress,
} from "./utils/notification/notification-manager";
import { stateManager } from "./utils/state/state-manager";
/**
 * 在首次执行命令时激活扩展
 * @param {vscode.ExtensionContext} context - VS Code扩展上下文对象
 * @throws {Error} 如果扩展激活失败将抛出错误
 */
export function activate(context: vscode.ExtensionContext) {
  try {
    // 日志输出表示扩展已激活
    console.log('Extension "dish-ai-commit-gen" is now active!');

    // 初始化本地化管理器
    initializeLocalization(context);

    // 初始化全局状态管理器
    stateManager.initialize(context);

    // 初始化配置管理器并注册到生命周期
    context.subscriptions.push(ConfigurationManager.getInstance());

    console.log("注册命令");
    // 注册所有命令到VS Code
    registerCommands(context);
  } catch (e) {
    console.error("Error activating extension:", e);
    // 向用户显示本地化的错误提示
    notify.error("extension.activation.failed", [
      e instanceof Error ? e.message : String(e),
    ]);
    throw e; // 重新抛出以便VS Code处理
  }
}

/**
 * VS Code停用扩展时调用此方法
 * 目前无需清理操作
 */
export function deactivate() {}
