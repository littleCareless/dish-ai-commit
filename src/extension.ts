// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import { ConfigurationManager } from "./config/configuration-manager";
import { registerCommands } from "./commands";
import { Logger } from "./utils/logger";
import { initializeLocalization } from "./utils/i18n";
import {
  notify,
  withProgress,
} from "./utils/notification/notification-manager";
import { stateManager } from "./utils/state/state-manager";
import { EmbeddingServiceManager } from "./core/indexing/embedding-service-manager";

import { SettingsViewProvider } from "./webview/settings-view-provider"; // 确保路径正确

/**
 * 在首次执行命令时激活扩展
 * @param {vscode.ExtensionContext} context - VS Code扩展上下文对象
 * @throws {Error} 如果扩展激活失败将抛出错误
 */
export async function activate(context: vscode.ExtensionContext) {
  // 将 activate 声明为 async
  try {
    // 初始化 Logger
    const logger = Logger.getInstance("Dish AI Commit Gen");
    logger.info("Activating extension...");
    logger.info(`Extension version: ${vscode.extensions.getExtension("littleCareless.dish-ai-commit")?.packageJSON.version}`);
    logger.info(`VSCode version: ${vscode.version}`);
    context.subscriptions.push(logger);

    // 初始化本地化管理器
    logger.info("Initializing localization...");
    initializeLocalization(context);

    // 初始化全局状态管理器
    logger.info("Initializing state manager...");
    stateManager.initialize(context);

    // 初始化配置管理器并注册到生命周期
    logger.info("Initializing configuration manager...");
    context.subscriptions.push(ConfigurationManager.getInstance());

    // 初始化 EmbeddingServiceManager
    logger.info("Initializing embedding service...");
    const embeddingService = EmbeddingServiceManager.getInstance().initialize();

    // 注册所有命令到VS Code
    logger.info("Registering commands...");
    registerCommands(context);

    // 注册 Settings Webview Provider
    const settingsProvider = new SettingsViewProvider(
      context.extensionUri,
      context.extension.id,
      context,
      embeddingService || null
    );
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        SettingsViewProvider.viewType,
        settingsProvider
      )
    );
  } catch (e) {
    Logger.getInstance("Dish AI Commit Gen").error(`Error activating extension: ${e}`);
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
export function deactivate() {
  Logger.getInstance("Dish AI Commit Gen").info(
    'Extension "dish-ai-commit-gen" has been deactivated.'
  );
}
