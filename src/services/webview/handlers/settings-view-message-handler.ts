import * as vscode from "vscode";
import { EmbeddingService } from "@/core/indexing/embedding-service";
import { MessageType } from "@/types/messages";
import { ConnectionMessageHandler } from "@/services/webview/handlers/settings/connection-message-handler";
import { FeaturesMessageHandler } from "@/services/webview/handlers/settings/features-message-handler";
import { IndexingMessageHandler } from "@/services/webview/handlers/settings/indexing-message-handler";
import { NotificationMessageHandler } from "@/services/webview/handlers/settings/notification-message-handler";
import { ProfileMessageHandler } from "@/services/webview/handlers/settings/profile-message-handler";
import { PromptMessageHandler } from "@/services/webview/handlers/settings/prompt-message-handler";
import { SystemMessageHandler } from "@/services/webview/handlers/settings/system-message-handler";
import { UsageMessageHandler } from "@/services/webview/handlers/settings/usage-message-handler";

export class SettingsViewMessageHandler {
  private readonly _extensionId: string;

  // Sub-handlers
  private _notificationHandler: NotificationMessageHandler;
  private _promptHandler: PromptMessageHandler;
  private _indexingHandler: IndexingMessageHandler;
  private _profileHandler: ProfileMessageHandler;
  private _connectionHandler: ConnectionMessageHandler;
  private _systemHandler: SystemMessageHandler;
  private _featuresHandler: FeaturesMessageHandler;
  private _usageHandler: UsageMessageHandler;

  constructor(
    extensionId: string,
    private _embeddingService: EmbeddingService | null,
    private readonly _extensionContext: vscode.ExtensionContext
  ) {
    console.log("[SettingsViewMessageHandler] Initializing...");
    this._extensionId = extensionId;

    // Initialize sub-handlers
    this._notificationHandler = new NotificationMessageHandler();
    this._promptHandler = new PromptMessageHandler();
    this._indexingHandler = new IndexingMessageHandler(_embeddingService, _extensionContext);
    this._profileHandler = new ProfileMessageHandler(_extensionContext);
    this._connectionHandler = new ConnectionMessageHandler(_extensionContext);
    this._systemHandler = new SystemMessageHandler(_extensionContext);
    this._featuresHandler = new FeaturesMessageHandler(_extensionContext);
    this._usageHandler = new UsageMessageHandler(_extensionContext);
  }

  public async handleMessage(
    message: any,
    webview: vscode.Webview
  ): Promise<void> {
    console.log(
      `[SettingsViewMessageHandler] Received message: ${JSON.stringify(
        message,
        null,
        2
      )}`
    );

    // Dispatch to appropriate handler based on command
    // We can check if a handler handles the command, or just try them sequentially/based on known commands.
    // A switch statement here is still cleaner than trying to guess.

    switch (message.command) {
      // Notification
      case "getNotificationSettings":
      case "setNotificationSettings":
      case "testSystemNotification":
        await this._notificationHandler.handle(message, webview);
        break;

      // Prompt
      case MessageType.GetAllPrompts:
      case MessageType.UpdatePrompt:
      case MessageType.ResetPrompt:
      case MessageType.ResetAllPrompts:
      case MessageType.CreatePrompt:
      case MessageType.DeletePrompt:
      case MessageType.RenamePrompt:
        await this._promptHandler.handle(message, webview);
        break;

      // Indexing
      case "startIndexing":
      case "clearIndex":
      case "getSettings":
      case "saveSettings":
      case "fetchEmbeddingModels":
        await this._indexingHandler.handle(message, webview);
        break;

      // Profile
      case "loadProfiles":
      case "saveProfile":
      case "deleteProfile":
      case "setActiveProfile":
      case "exportProfile":
      case "importProfile":
      case "migrateSettings":
      case "resetToDefaults":
      case "getAllProviders":
        await this._profileHandler.handle(message, webview);
        break;

      // Connection
      case "testConnection":
      case "getModelsForProvider":
      case "fetchProviderModels":
      case "getModels":
        await this._connectionHandler.handle(message, webview);
        break;

      // System
      case "showInformationMessage":
      case "getPackageInfo":
      case "getOS":
      case "setGlobalState":
      case "getGlobalState":
      case "setSecret":
      case "getSecret":
      case "deleteSecret":
        await this._systemHandler.handle(message, webview);
        break;

      // Features
      case "loadFeaturesSettings":
      case "saveFeaturesSettings":
        await this._featuresHandler.handle(message, webview);
        break;

      // Usage
      case "getUsageStats":
      case "resetUsageStats":
        await this._usageHandler.handle(message, webview);
        break;

      default:
        console.warn(
          `[SettingsViewMessageHandler] Unknown command: ${message.command}`
        );
        break;
    }
  }
}
