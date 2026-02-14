import { EmbeddingService } from "@/core/indexing/embedding-service";
import WebviewSessionManager from "@/services/webview/core/WebviewSessionManager";
import { ConnectionMessageHandler } from "@/services/webview/handlers/settings/connection-message-handler";
import { ContextMessageHandler } from "@/services/webview/handlers/settings/context-message-handler";
import { FeaturesMessageHandler } from "@/services/webview/handlers/settings/features-message-handler";
import { IndexingMessageHandler } from "@/services/webview/handlers/settings/indexing-message-handler";
import { ModelCustomMessageHandler } from "@/services/webview/handlers/settings/model-custom-message-handler";
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

const postMessage = (webview: vscode.Webview, command: string, data?: any) => {
  webview.postMessage({ command, data });
};

export class SettingsViewMessageHandler {
  private readonly _extensionId: string;
  private _sessionManager: WebviewSessionManager;

  // Sub-handlers
  private _notificationHandler: NotificationMessageHandler;
  private _promptHandler: PromptMessageHandler;
  private _indexingHandler: IndexingMessageHandler;
  private _profileHandler: ProfileMessageHandler;
  private _connectionHandler: ConnectionMessageHandler;
  private _systemHandler: SystemMessageHandler;
  private _featuresHandler: FeaturesMessageHandler;
  private _contextHandler: ContextMessageHandler;
  private _usageHandler: UsageMessageHandler;
  private _storageHandler: StorageMessageHandler;
  private _onboardingHandler: OnboardingMessageHandler;
  private _preferencesHandler: PreferencesMessageHandler;
  private _modelCustomHandler: ModelCustomMessageHandler;

  constructor(
    extensionId: string,
    private _embeddingService: EmbeddingService | null,
    private readonly _extensionContext: vscode.ExtensionContext,
  ) {
    console.log("[SettingsViewMessageHandler] Initializing...");
    this._extensionId = extensionId;
    this._sessionManager = WebviewSessionManager.getInstance();

    this._notificationHandler = new NotificationMessageHandler();
    this._promptHandler = new PromptMessageHandler();
    this._indexingHandler = new IndexingMessageHandler(
      _embeddingService,
      _extensionContext,
    );
    this._profileHandler = new ProfileMessageHandler(_extensionContext);
    this._connectionHandler = new ConnectionMessageHandler(_extensionContext);
    this._systemHandler = new SystemMessageHandler(_extensionContext);
    this._featuresHandler = new FeaturesMessageHandler(_extensionContext);
    this._contextHandler = new ContextMessageHandler(_extensionContext);
    this._usageHandler = new UsageMessageHandler(_extensionContext);
    this._storageHandler = new StorageMessageHandler(_extensionContext);
    this._onboardingHandler = new OnboardingMessageHandler(_extensionContext);
    this._preferencesHandler = new PreferencesMessageHandler(_extensionContext);
    this._modelCustomHandler = new ModelCustomMessageHandler(_extensionContext);
  }

  public async handleMessage(
    message: any,
    webview: vscode.Webview,
  ): Promise<void> {
    if (message.command === "webview.handshake") {
      const { sessionId, timestamp } = message.data || {};
      if (!sessionId) {
        console.warn(
          "[SettingsViewMessageHandler] Handshake missing sessionId",
        );
        return;
      }

      const isNewSession = this._sessionManager.handleHandshake(sessionId);

      if (isNewSession) {
        this._sessionManager.markSessionReady();
        postMessage(webview, "webview.handshake.ack", {
          sessionId,
          timestamp: Date.now(),
          success: true,
        });
        console.log(
          `[SettingsViewMessageHandler] Handshake acknowledged for session ${sessionId}`,
        );

        await this._storageHandler.handle(
          { command: UIRequest.SystemGetAllStorage },
          webview,
        );
      } else {
        console.log(
          `[SettingsViewMessageHandler] Duplicate handshake, ignoring for session ${sessionId}`,
        );
      }
      return;
    }

    if (!this._sessionManager.hasActiveSession()) {
      console.warn(
        "[SettingsViewMessageHandler] No active session, ignoring message:",
        message.command,
      );
      return;
    }

    const messageId =
      message.messageId || `${message.command}_${JSON.stringify(message.data)}`;

    try {
      await this._sessionManager.withIdempotency(messageId, async () => {
        console.log(
          `[SettingsViewMessageHandler] Processing message: ${message.command}`,
        );

        switch (message.command) {
          case UIRequest.NotificationGetSettings:
          case UIRequest.NotificationUpdateSettings:
          case UIRequest.NotificationTest:
            await this._notificationHandler.handle(message, webview);
            break;

          case UIRequest.PromptGetAll:
          case UIRequest.PromptUpdate:
          case UIRequest.PromptReset:
          case UIRequest.PromptResetAll:
          case UIRequest.PromptCreate:
          case UIRequest.PromptDelete:
          case UIRequest.PromptRename:
            await this._promptHandler.handle(message, webview);
            break;

          case UIRequest.IndexingStart:
          case UIRequest.IndexingClear:
          case UIRequest.IndexingGetSettings:
          case UIRequest.IndexingSaveSettings:
          case UIRequest.IndexingFetchEmbeddingModels:
            await this._indexingHandler.handle(message, webview);
            break;

          case UIRequest.ProfileLoadAll:
          case UIRequest.ProfileSave:
          case UIRequest.ProfileDelete:
          case UIRequest.ProfileSetActive:
          case UIRequest.ProfileExport:
          case UIRequest.ProfileImport:
          case UIRequest.ProfileMigrateSettings:
          case UIRequest.ProfileResetDefaults:
          case UIRequest.ProfileGetAllProviders:
          case UIRequest.UpsertApiConfiguration:
            await this._profileHandler.handle(message, webview);
            break;

          case UIRequest.ConnectionTest:
          case UIRequest.ConnectionTestAndSave:
          case UIRequest.ConnectionGetModelsForProvider:
          case UIRequest.ConnectionFetchProviderModels:
          case UIRequest.ConnectionGetAllModels:
            await this._connectionHandler.handle(message, webview);
            break;

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

          case UIRequest.FeaturesLoadSettings:
          case UIRequest.FeaturesSaveSettings:
          case UIRequest.FeaturesSetActivePrompt:
          case UIRequest.FeaturesGetWorkspaceInfo:
          case UIRequest.FeaturesGetAllWorkspaceStates:
            await this._featuresHandler.handle(message, webview);
            break;

          case UIRequest.PreferencesLoadSettings:
          case UIRequest.PreferencesSaveSettings:
            await this._preferencesHandler.handle(message, webview);
            break;

          case UIRequest.UsageGetStats:
          case UIRequest.UsageResetStats:
          case UIRequest.UsageAddTestData:
            await this._usageHandler.handle(message, webview);
            break;

          case UIRequest.ContextGetLatest:
          case UIRequest.ContextRebuildPreview:
            await this._contextHandler.handle(message, webview);
            break;

          case UIRequest.SystemGetAllStorage:
          case UIRequest.SystemClearAllStorage:
            await this._storageHandler.handle(message, webview);
            break;

          case UIRequest.OnboardingDetectEnvironment:
          case UIRequest.OnboardingGetTemplates:
          case UIRequest.OnboardingApplyTemplate:
          case UIRequest.OnboardingValidateConfig:
          case UIRequest.OnboardingSetCompleted:
          case UIRequest.OnboardingGetStatus:
            await this._onboardingHandler.handle(message, webview);
            break;

          case UIRequest.ModelCustomGetAll:
          case UIRequest.ModelCustomSave:
          case UIRequest.ModelCustomDelete:
          case UIRequest.ModelCustomExport:
          case UIRequest.ModelCustomImport:
          case UIRequest.ModelCustomGetProviders:
            await this._modelCustomHandler.handle(message, webview);
            break;

          case "webviewDidLaunch":
            console.log(
              "[SettingsViewMessageHandler] Legacy webviewDidLaunch received, ignoring (handled by handshake)",
            );
            break;

          default:
            console.warn(
              `[SettingsViewMessageHandler] Unknown command: ${message.command}`,
            );
            break;
        }
      });
    } catch (error) {
      if ((error as Error).message !== "Message already processed") {
        console.error(
          `[SettingsViewMessageHandler] Error handling message ${message.command}:`,
          error,
        );
      }
    }
  }
}
