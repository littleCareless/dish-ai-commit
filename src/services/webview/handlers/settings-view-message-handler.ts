import { DISH_CONFIG_PREFIX } from "@/config/constants";
import { EmbeddingService } from "@/core/indexing/embedding-service";
import { ConnectionMessageHandler } from "@/services/webview/handlers/settings/connection-message-handler";
import { FeaturesMessageHandler } from "@/services/webview/handlers/settings/features-message-handler";
import { IndexingMessageHandler } from "@/services/webview/handlers/settings/indexing-message-handler";
import { NotificationMessageHandler } from "@/services/webview/handlers/settings/notification-message-handler";
import { ProfileMessageHandler } from "@/services/webview/handlers/settings/profile-message-handler";
import { PromptMessageHandler } from "@/services/webview/handlers/settings/prompt-message-handler";
import { SystemMessageHandler } from "@/services/webview/handlers/settings/system-message-handler";
import { UsageMessageHandler } from "@/services/webview/handlers/settings/usage-message-handler";
import { MessageType } from "@/types/messages";
import * as vscode from "vscode";

const KNOWN_SECRET_KEYS = [`${DISH_CONFIG_PREFIX}_api_config`];

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
    this._indexingHandler = new IndexingMessageHandler(
      _embeddingService,
      _extensionContext
    );
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
      case "setActivePrompt":
        await this._featuresHandler.handle(message, webview);
        break;

      // Usage
      case "getUsageStats":
      case "resetUsageStats":
      case "addTestUsageData":
        await this._usageHandler.handle(message, webview);
        break;

      case "getAllStorage": {
        const storageData: { [key: string]: any } = {};

        // 1. Global State
        const globalKeys = this._extensionContext.globalState.keys();
        for (const key of globalKeys) {
          storageData[`Global State: ${key}`] =
            this._extensionContext.globalState.get(key);
        }

        // 2. Workspace State
        const workspaceKeys = this._extensionContext.workspaceState.keys();
        for (const key of workspaceKeys) {
          storageData[`Workspace State: ${key}`] =
            this._extensionContext.workspaceState.get(key);
        }

        // 3. Secrets
        // Note: secrets API doesn't have a .keys() method for security.
        // We must explicitly list known keys.
        for (const key of KNOWN_SECRET_KEYS) {
          try {
            const secretValue = await this._extensionContext.secrets.get(key);
            if (secretValue) {
              try {
                // Try parsing as JSON for better readability
                storageData[`Secrets: ${key}`] = JSON.parse(secretValue);
              } catch (e) {
                storageData[`Secrets: ${key}`] = secretValue;
              }
            } else {
              storageData[`Secrets: ${key}`] = "[Not Set]";
            }
          } catch (error) {
            storageData[`Secrets: ${key}`] = `[Error reading secret: ${error}]`;
          }
        }

        webview.postMessage({
          command: "getAllStorageResponse",
          data: storageData,
        });
        break;
      }

      case "clearAllStorage": {
        try {
          // Define all known legacy and current keys to be cleared
          const keysToClear = {
            global: [
              // Legacy keys
              "confirm:dish:ai:tos",
              "totalTokens",
              "detailedTokenStats",
              `${DISH_CONFIG_PREFIX}_confirm_ai_tos`,
              `${DISH_CONFIG_PREFIX}_detailed_token_stats`,
              "profiles",
              "activeProfileId",
              "config",
              "dish.settings.indexing",
              "dish.settings.features",
              "notificationSettings",
              // Keys with provider prefixes
              "providers.mistral",
              "providers.vertexai",
              "providers.cloudflare-workersai",
              "providers.vscode",
              // New keys (prefixed)
              ...this._extensionContext.globalState
                .keys()
                .filter((k) => k.startsWith(DISH_CONFIG_PREFIX)),
            ],
            workspace: [
              // Clear any prefixed keys in workspace state
              ...this._extensionContext.workspaceState
                .keys()
                .filter((k) => k.startsWith(DISH_CONFIG_PREFIX)),
            ],
            secrets: KNOWN_SECRET_KEYS,
          };

          // 1. Clear Global State
          for (const key of keysToClear.global) {
            await this._extensionContext.globalState.update(key, undefined);
          }

          // 2. Clear Workspace State
          for (const key of keysToClear.workspace) {
            await this._extensionContext.workspaceState.update(key, undefined);
          }

          // 3. Clear Secrets
          for (const key of keysToClear.secrets) {
            await this._extensionContext.secrets.delete(key);
          }

          // 4. Respond to webview
          webview.postMessage({
            command: "clearAllStorageResponse",
            success: true,
          });

          // 5. Reload the webview or ask user to reload
          vscode.commands.executeCommand("workbench.action.reloadWindow");
        } catch (error) {
          webview.postMessage({
            command: "clearAllStorageResponse",
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        break;
      }

      default:
        console.warn(
          `[SettingsViewMessageHandler] Unknown command: ${message.command}`
        );
        break;
    }
  }
}
