import { EmbeddingService } from "@/core/indexing/embedding-service";
import { ConnectionMessageHandler } from "@/services/webview/handlers/settings/connection-message-handler";
import { FeaturesMessageHandler } from "@/services/webview/handlers/settings/features-message-handler";
import { IndexingMessageHandler } from "@/services/webview/handlers/settings/indexing-message-handler";
import { NotificationMessageHandler } from "@/services/webview/handlers/settings/notification-message-handler";
import { OnboardingMessageHandler } from "@/services/webview/handlers/settings/onboarding-message-handler";
import { PreferencesMessageHandler } from "@/services/webview/handlers/settings/preferences-message-handler";
import { ProfileMessageHandler } from "@/services/webview/handlers/settings/profile-message-handler";
import { PromptMessageHandler } from "@/services/webview/handlers/settings/prompt-message-handler";
import { StorageMessageHandler } from "@/services/webview/handlers/settings/storage-message-handler";
import { SystemMessageHandler } from "@/services/webview/handlers/settings/system-message-handler";
import { UsageMessageHandler } from "@/services/webview/handlers/settings/usage-message-handler";
import { UIRequest } from "@shared/types/messages";
import * as vscode from "vscode";

export class SettingsViewMessageHandler {
  private readonly _extensionId: string;
  private _lastMessage: any = null;
  private _lastMessageTime = 0;

  // Sub-handlers
  private _notificationHandler: NotificationMessageHandler;
  private _promptHandler: PromptMessageHandler;
  private _indexingHandler: IndexingMessageHandler;
  private _profileHandler: ProfileMessageHandler;
  private _connectionHandler: ConnectionMessageHandler;
  private _systemHandler: SystemMessageHandler;
  private _featuresHandler: FeaturesMessageHandler;
  private _usageHandler: UsageMessageHandler;
  private _storageHandler: StorageMessageHandler;
  private _onboardingHandler: OnboardingMessageHandler;
  private _preferencesHandler: PreferencesMessageHandler;

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
    this._storageHandler = new StorageMessageHandler(_extensionContext);
    this._onboardingHandler = new OnboardingMessageHandler(_extensionContext);
    this._preferencesHandler = new PreferencesMessageHandler(_extensionContext);
  }

  public async handleMessage(
    message: any,
    webview: vscode.Webview
  ): Promise<void> {
    const now = Date.now();
    if (
      this._lastMessage &&
      now - this._lastMessageTime < 1000 && // 1秒内防抖
      this._lastMessage.command === message.command &&
      JSON.stringify(this._lastMessage.data) === JSON.stringify(message.data)
    ) {
      console.log(
        `[SettingsViewMessageHandler] Duplicate message blocked: ${JSON.stringify(
          message
        )}`
      );
      return;
    }

    this._lastMessage = message;
    this._lastMessageTime = now;

    console.log(
      `[SettingsViewMessageHandler] Received message: ${JSON.stringify(
        message,
        null,
        2
      )}`
    );

    // Dispatch to appropriate handler based on command
    switch (message.command) {
      // ===== Notification Module =====
      case UIRequest.NotificationGetSettings:
      case UIRequest.NotificationUpdateSettings:
      case UIRequest.NotificationTest:
        await this._notificationHandler.handle(message, webview);
        break;

      // ===== Prompt Module =====
      case UIRequest.PromptGetAll:
      case UIRequest.PromptUpdate:
      case UIRequest.PromptReset:
      case UIRequest.PromptResetAll:
      case UIRequest.PromptCreate:
      case UIRequest.PromptDelete:
      case UIRequest.PromptRename:
        await this._promptHandler.handle(message, webview);
        break;

      // ===== Indexing Module =====
      case UIRequest.IndexingStart:
      case UIRequest.IndexingClear:
      case UIRequest.IndexingGetSettings:
      case UIRequest.IndexingSaveSettings:
      case UIRequest.IndexingFetchEmbeddingModels:
        await this._indexingHandler.handle(message, webview);
        break;

      // ===== Profile Module =====
      case UIRequest.ProfileLoadAll:
      case UIRequest.ProfileSave:
      case UIRequest.ProfileDelete:
      case UIRequest.ProfileSetActive:
      case UIRequest.ProfileExport:
      case UIRequest.ProfileImport:
      case UIRequest.ProfileMigrateSettings:
      case UIRequest.ProfileResetDefaults:
      case UIRequest.ProfileGetAllProviders:
        await this._profileHandler.handle(message, webview);
        break;

      // ===== Connection Module =====
      case UIRequest.ConnectionTest:
      case UIRequest.ConnectionTestAndSave:
      case UIRequest.ConnectionGetModelsForProvider:
      case UIRequest.ConnectionFetchProviderModels:
      case UIRequest.ConnectionGetAllModels:
        await this._connectionHandler.handle(message, webview);
        break;

      // ===== System Module =====
      case UIRequest.SystemShowMessage:
      case UIRequest.SystemGetPackageInfo:
      case UIRequest.SystemGetOS:
      case UIRequest.SystemSetGlobalState:
      case UIRequest.SystemGetGlobalState:
      case UIRequest.SystemSetSecret:
      case UIRequest.SystemGetSecret:
      case UIRequest.SystemDeleteSecret:
        await this._systemHandler.handle(message, webview);
        break;

      // ===== Features Module =====
      case UIRequest.FeaturesLoadSettings:
      case UIRequest.FeaturesSaveSettings:
      case UIRequest.FeaturesSetActivePrompt:
        await this._featuresHandler.handle(message, webview);
        break;

      // ===== Preferences Module =====
      case UIRequest.PreferencesLoadSettings:
      case UIRequest.PreferencesSaveSettings:
        console.log(
          "[SettingsViewMessageHandler] Routing Preferences message:",
          message.command
        );
        await this._preferencesHandler.handle(message, webview);
        break;

      // ===== Usage Module =====
      case UIRequest.UsageGetStats:
      case UIRequest.UsageResetStats:
      case UIRequest.UsageAddTestData:
        await this._usageHandler.handle(message, webview);
        break;

      // ===== Storage Module =====
      case UIRequest.SystemGetAllStorage:
      case UIRequest.SystemClearAllStorage:
        await this._storageHandler.handle(message, webview);
        break;

      // ===== Onboarding Module =====
      case UIRequest.OnboardingDetectEnvironment:
      case UIRequest.OnboardingGetTemplates:
      case UIRequest.OnboardingApplyTemplate:
      case UIRequest.OnboardingValidateConfig:
      case UIRequest.OnboardingSetCompleted:
      case UIRequest.OnboardingGetStatus:
        await this._onboardingHandler.handle(message, webview);
        break;

      // ===== System Lifecycle Messages =====
      case "webviewDidLaunch":
        // Webview 启动通知，静默处理
        console.log(
          "[SettingsViewMessageHandler] Webview launched successfully"
        );
        // 立即发送所有存储状态，以解除前端 RouteGuard 的阻塞
        await this._storageHandler.handle(
          { command: UIRequest.SystemGetAllStorage },
          webview
        );
        break;

      default:
        console.warn(
          `[SettingsViewMessageHandler] Unknown command: ${message.command}`
        );
        break;
    }
  }
}
