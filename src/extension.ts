// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { registerCommands } from "@/commands";
import { ProfileManagerService } from "@/services/profile-manager/profile-manager-service";
import { initializeLocalization } from "@/utils/i18n";
import { Logger } from "@/utils/logger";
import { notify } from "@/utils/notification/notification-manager";
import { stateManager } from "@/utils/state/state-manager";
import * as vscode from "vscode";

import { SettingsViewProvider } from "@/services/webview/settings-view-provider";
import { EmbeddingServiceManager } from "./core/indexing/embedding-service-manager";
import { getSettingsMigration } from "./services/core/settings-migration";
import { TokenStatsService } from "./services/core/token-stats-service";
import { NotificationService } from "./services/notification-service";
import { IndexingSettingsManager } from "./services/settings/indexing-settings-manager";
import { PreferencesSettingsManager } from "./services/settings/preferences-settings-manager";
import { NotificationSettingsManager } from "./utils/notification/notification-settings-manager";

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
    logger.info(
      `Extension version: ${vscode.extensions.getExtension("littleCareless.dish-ai-commit")?.packageJSON.version}`
    );
    logger.info(`VSCode version: ${vscode.version}`);
    context.subscriptions.push(logger);

    // 初始化本地化管理器
    logger.info("Initializing localization...");
    initializeLocalization(context);

    // 初始化全局状态管理器
    logger.info("Initializing state manager...");
    stateManager.initialize(context);

    // ConfigurationManager is deprecated - all configuration moved to Profile system

    // 初始化 ProfileManagerService
    logger.info("Initializing profile manager service...");
    const profileManager = await ProfileManagerService.create(context);

    // Initialize Notification Service
    logger.info("Initializing notification service...");
    const notificationService = NotificationService.initialize(context);

    // 自动迁移旧配置
    // 如果存在旧配置且没有 Profile，则自动迁移
    const settingsMigration = getSettingsMigration();
    const migrationDetection = await settingsMigration.detectOldConfiguration();
    const hasProfiles = await profileManager.hasProfiles();
    const hasAutoMigrated = await profileManager.hasAutoMigratedProfile();

    if (migrationDetection.hasOldConfig && (!hasProfiles || hasAutoMigrated)) {
      logger.info(
        "Detected old configuration and no user-created profiles. Performing automatic migration..."
      );
      try {
        const result = await settingsMigration.performMigration();
        if (result.success) {
          notify.info(
            "Dish AI Commit: Your settings have been automatically migrated to the new Profile system."
          );
          logger.info(
            `Migration successful. Created and activated profile: ${result.profileId}`
          );
        }
      } catch (error) {
        logger.error(`Automatic migration failed: ${error}`);
        // 不打断启动流程，只是记录错误
      }
    } else if (!hasProfiles) {
      // Fallback: Create default profile if no profiles exist
      logger.info(
        "No existing configuration or profiles found. Creating default profile..."
      );
      try {
        const result = await settingsMigration.ensureDefaultProfile();
        if (result.created) {
          logger.info(
            `Default profile created and activated: ${result.profileId}`
          );
        }
      } catch (error) {
        logger.error(`Failed to create default profile: ${error}`);
      }
    }

    // 初始化索引设置管理器（需要在 EmbeddingServiceManager 之前初始化）
    logger.info("Initializing indexing settings manager...");
    const indexingSettingsManager =
      IndexingSettingsManager.getInstance(context);
    await indexingSettingsManager.initialize();

    // 将 IndexingSettingsManager 传递给 EmbeddingServiceManager
    EmbeddingServiceManager.getInstance().setIndexingSettingsManager(
      indexingSettingsManager
    );

    // 初始化 EmbeddingServiceManager（现在是异步的，支持多仓库检测）
    logger.info("Initializing embedding service...");
    const embeddingService =
      await EmbeddingServiceManager.getInstance().initialize();

    // 初始化 TokenStatsService
    logger.info("Initializing token stats service...");
    TokenStatsService.initialize(context);

    // 初始化通知设置管理器
    logger.info("Initializing notification settings manager...");
    const notificationSettingsManager =
      NotificationSettingsManager.getInstance();
    await notificationSettingsManager.initialize(context);

    // 初始化偏好设置管理器
    logger.info("Initializing preferences settings manager...");
    const preferencesSettingsManager =
      PreferencesSettingsManager.getInstance(context);
    await preferencesSettingsManager.initialize();

    // 注册所有命令到VS Code
    logger.info("Registering commands...");
    registerCommands(context, profileManager);

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

    // Check and show migration notification (non-blocking)
    notificationService.checkAndShowMigrationNotification().catch((error) => {
      logger.error(`Failed to show migration notification: ${error}`);
    });
  } catch (e) {
    Logger.getInstance("Dish AI Commit Gen").error(
      `Error activating extension: ${e}`
    );
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
