import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { z, ZodError } from "zod";
import { AIProviderFactory } from "../../ai/ai-provider-factory";
import { AIProvider } from "../../ai/types";
import {
  EmbeddingService,
  EmbeddingServiceError,
} from "../../core/indexing/embedding-service";
import { EmbeddingServiceManager } from "../../core/indexing/embedding-service-manager";
import { ProfileManagerService } from "../../services/profile-manager-service";
import { ProviderStore } from "../../services/profile-manager/provider-store";
import { PromptManagerService } from "../../services/prompt-manager-service";
import { MessageType } from "../../types/messages";
import { formatMessage as t } from "../../utils/i18n/localization-manager";
import { notify } from "../../utils/notification/notification-manager";
import { NotificationSettingsManager } from "../../utils/notification/notification-settings-manager";
import { SoundPlayerService } from "../../utils/notification/sound-player";
import { systemNotifier } from "../../utils/notification/system-notification-service";
import { TextToSpeechService } from "../../utils/notification/text-to-speech";
import { safeWriteJson } from "../../utils/safe-write-json";

export class SettingsViewMessageHandler {
  private readonly _extensionId: string;
  private _profileManager: ProfileManagerService;
  private _providerStore: ProviderStore;

  private _promptManager: PromptManagerService;

  constructor(
    extensionId: string,
    private _embeddingService: EmbeddingService | null,
    private readonly _extensionContext: vscode.ExtensionContext // Receive // extensionContext here
  ) {
    console.log("[SettingsViewMessageHandler] Initializing...");
    this._extensionId = extensionId;
    this._profileManager = ProfileManagerService.getInstance();
    this._providerStore = ProviderStore.getInstance(_extensionContext);
    this._promptManager = PromptManagerService.getInstance();
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
    switch (message.command) {
      case "showInformationMessage": {
        console.log(
          "[SettingsViewMessageHandler] Handling showInformationMessage"
        );
        const { message: msg, options, callbackId } = message.data;
        vscode.window
          .showInformationMessage(msg, ...options)
          .then((selection) => {
            webview.postMessage({
              command: "showInformationMessageResponse",
              data: { callbackId, selection },
            });
          });
        break;
      }
      case "getPackageInfo": {
        console.log("[SettingsViewMessageHandler] Handling getPackageInfo");
        try {
          const packageJsonPath = path.join(
            this._extensionContext.extensionPath,
            "package.json"
          );
          const packageJsonContent = await fs.readFile(
            packageJsonPath,
            "utf-8"
          );
          const packageInfo = JSON.parse(packageJsonContent);
          webview.postMessage({
            command: "packageInfoLoaded",
            data: packageInfo,
          });
        } catch (error) {
          console.error(
            "[SettingsViewMessageHandler] Error in getPackageInfo:",
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: "error",
            data: { message: `Failed to load package.json: ${errorMessage}` },
          });
        }
        break;
      }
      // === 使用 globalState 进行持久化存储（替代旧的 workspace.getConfiguration） ===
      case "setGlobalState": {
        console.log(
          `[SettingsViewMessageHandler] Handling setGlobalState for key: ${message.key}`
        );
        try {
          const { key, value } = message;
          // 使用 globalState 进行持久化存储，不会写入 settings.json
          await this._extensionContext.globalState.update(key, value);
          webview.postMessage({
            command: "setGlobalStateResponse",
            key,
            success: true,
          });
        } catch (error) {
          console.error(
            `[SettingsViewMessageHandler] Error in setGlobalState for key: ${message.key}:`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: "setGlobalStateResponse",
            key: message?.key,
            success: false,
            error: errorMessage,
          });
        }
        break;
      }

      case "getGlobalState": {
        console.log(
          `[SettingsViewMessageHandler] Handling getGlobalState for key: ${message.key}`
        );
        try {
          const { key } = message;
          const value = this._extensionContext.globalState.get(key);
          webview.postMessage({
            command: "getGlobalStateResponse",
            key,
            value,
          });
        } catch (error) {
          console.error(
            `[SettingsViewMessageHandler] Error in getGlobalState for key: ${message.key}:`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: "getGlobalStateResponse",
            key: message?.key,
            value: null,
            error: errorMessage,
          });
        }
        break;
      }

      // === 使用 secrets API 进行敏感信息存储 ===
      case "setSecret": {
        console.log(
          `[SettingsViewMessageHandler] Handling setSecret for key: ${message.key}`
        );
        try {
          const { key, value } = message;
          await this._extensionContext.secrets.store(key, String(value ?? ""));
          webview.postMessage({
            command: "setSecretResponse",
            key,
            success: true,
          });
        } catch (error) {
          console.error(
            `[SettingsViewMessageHandler] Error in setSecret for key: ${message.key}:`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: "setSecretResponse",
            key: message?.key,
            success: false,
            error: errorMessage,
          });
        }
        break;
      }

      case "getSecret": {
        console.log(
          `[SettingsViewMessageHandler] Handling getSecret for key: ${message.key}`
        );
        try {
          const { key } = message;
          const value = await this._extensionContext.secrets.get(key);
          webview.postMessage({
            command: "getSecretResponse",
            key,
            value: value ?? null,
          });
        } catch (error) {
          console.error(
            `[SettingsViewMessageHandler] Error in getSecret for key: ${message.key}:`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: "getSecretResponse",
            key: message?.key,
            value: null,
            error: errorMessage,
          });
        }
        break;
      }

      case "deleteSecret": {
        console.log(
          `[SettingsViewMessageHandler] Handling deleteSecret for key: ${message.key}`
        );
        try {
          const { key } = message;
          await this._extensionContext.secrets.delete(key);
          // 可选：通知删除结果
          webview.postMessage({
            command: "deleteSecretResponse",
            key,
            success: true,
          });
        } catch (error) {
          console.error(
            `[SettingsViewMessageHandler] Error in deleteSecret for key: ${message.key}:`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: "deleteSecretResponse",
            key: message?.key,
            success: false,
            error: errorMessage,
          });
        }
        break;
      }

      case "getNotificationSettings": {
        console.log(
          "[SettingsViewMessageHandler] Handling getNotificationSettings"
        );
        try {
          const settingsManager = NotificationSettingsManager.getInstance();
          await settingsManager.loadSettings();
          const settings = settingsManager.getSettings();
          webview.postMessage({
            command: "getNotificationSettingsResponse",
            data: {
              success: true,
              settings,
            },
          });
        } catch (error) {
          console.error(
            "[SettingsViewMessageHandler] Error in getNotificationSettings:",
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: "getNotificationSettingsResponse",
            data: {
              success: false,
              error: errorMessage,
              settings: null,
            },
          });
        }
        break;
      }

      case "setNotificationSettings": {
        console.log(
          "[SettingsViewMessageHandler] Handling setNotificationSettings"
        );
        try {
          const { settings } = message.data;
          const settingsManager = NotificationSettingsManager.getInstance();
          await settingsManager.saveSettings(settings);

          // 更新 TTS 和音效服务的状态
          const ttsService = TextToSpeechService.getInstance();
          ttsService.setEnabled(settings.textToSpeech);

          const soundService = SoundPlayerService.getInstance();
          soundService.setEnabled(settings.soundNotifications);

          webview.postMessage({
            command: "setNotificationSettingsResponse",
            data: {
              success: true,
            },
          });
        } catch (error) {
          console.error(
            "[SettingsViewMessageHandler] Error in setNotificationSettings:",
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: "setNotificationSettingsResponse",
            data: {
              success: false,
              error: errorMessage,
            },
          });
        }
        break;
      }

      case "testSystemNotification": {
        console.log(
          "[SettingsViewMessageHandler] Handling testSystemNotification"
        );
        try {
          const { title, message: notificationMessage } = message.data;
          systemNotifier.notify({ title, message: notificationMessage });
        } catch (error) {
          console.error(
            "[SettingsViewMessageHandler] Error in testSystemNotification:",
            error
          );
        }
        break;
      }

      case "getOS": {
        console.log("[SettingsViewMessageHandler] Handling getOS");
        try {
          const osPlatform = os.platform();
          webview.postMessage({
            command: "getOSResponse",
            data: {
              os: osPlatform,
            },
          });
        } catch (error) {
          console.error("[SettingsViewMessageHandler] Error in getOS:", error);
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: "getOSResponse",
            data: {
              os: null,
              error: errorMessage,
            },
          });
        }
        break;
      }

      case "testConnection": {
        console.log(
          `[SettingsViewMessageHandler] Handling testConnection for service: ${message.data.service}`
        );
        const { service, url, key } = message.data;
        await this.handleTestConnection(service, url, key, webview);
        break;
      }
      case "startIndexing": {
        const { clearIndex } = message.data || {};
        console.log(
          `[SettingsViewMessageHandler] Received startIndexing message with clearIndex: ${clearIndex}`
        );
        this.startIndexing(0, webview, !!clearIndex);
        break;
      }
      case "clearIndex": {
        console.log("[SettingsViewMessageHandler] Handling clearIndex");
        await this.handleClearIndex(webview);
        break;
      }
      case "getSettings": {
        console.log("[SettingsViewMessageHandler] Handling getSettings");
        try {
          const detailedSettings: any[] = [];

          // 从 globalState 读取应用级配置
          const globalStateConfig =
            this._extensionContext.globalState.get("config") || {};

          // 将 globalState 中的配置转换为 settings 数组格式
          const processGlobalConfig = (
            obj: any,
            path: string,
            settings: any[]
          ) => {
            for (const [key, value] of Object.entries(obj)) {
              const currentPath = path ? `${path}.${key}` : key;
              if (
                typeof value === "object" &&
                value !== null &&
                !Array.isArray(value)
              ) {
                processGlobalConfig(value, currentPath, settings);
              } else {
                settings.push({
                  key: currentPath,
                  value: value,
                  fromPackageJSON: true, // globalState 对应全局配置
                  type: typeof value,
                });
              }
            }
          };

          processGlobalConfig(globalStateConfig, "", detailedSettings);

          // 从 workspaceState 读取工作区配置
          const workspaceSettings: any[] = [];
          const workspaceStateConfig =
            this._extensionContext.globalState.get("workspaceConfig") || {};

          const processWorkspaceConfig = (
            obj: any,
            path: string,
            settings: any[]
          ) => {
            for (const [key, value] of Object.entries(obj)) {
              const currentPath = path ? `${path}.${key}` : key;
              if (
                typeof value === "object" &&
                value !== null &&
                !Array.isArray(value)
              ) {
                processWorkspaceConfig(value, currentPath, settings);
              } else {
                settings.push({
                  key: currentPath,
                  value: value,
                  fromPackageJSON: false, // 工作区特定配置
                  type: typeof value,
                });
              }
            }
          };

          processWorkspaceConfig(workspaceStateConfig, "", workspaceSettings);

          // 获取索引状态
          let isIndexed = 0;
          let indexStatusError: string | null = null;
          if (this._embeddingService) {
            try {
              isIndexed = await this._embeddingService.isIndexed();
            } catch (error) {
              if (error instanceof EmbeddingServiceError) {
                indexStatusError = `${error.message}\n来源：${
                  error.context?.source ?? "未知"
                }，错误类型：${error.context?.type ?? "未知"}`;
              } else if (error instanceof Error) {
                indexStatusError = error.message;
              } else {
                indexStatusError = "无法获取索引状态（未知错误）";
              }
              webview.postMessage({
                command: "indexingStatusError",
                error: indexStatusError,
              });
            }
          }

          // 异步加载模型，避免阻塞
          webview.postMessage({
            command: "loadSettings",
            data: {
              schema: [...detailedSettings, ...workspaceSettings],
              isIndexed: isIndexed,
              indexStatusError: indexStatusError,
              embeddingModels: [], // Initially send an empty array
            },
          });
        } catch (error) {
          console.error(
            "[SettingsViewMessageHandler] Error in getSettings:",
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: "indexingStatusError",
            error: `获取设置失败: ${errorMessage}`,
          });
        }
        break;
      }

      case "saveSettings": {
        console.log(
          `[SettingsViewMessageHandler] Handling saveSettings with data: ${JSON.stringify(
            message.data,
            null,
            2
          )}`
        );
        try {
          const newSettings = message.data;
          const globalConfig: any =
            this._extensionContext.globalState.get("config") || {};
          const workspaceConfig: any =
            this._extensionContext.globalState.get("workspaceConfig") || {};

          // 遍历所有设置并根据 fromPackageJSON 标志分类保存
          for (const setting of newSettings) {
            if (setting.key && setting.value !== undefined) {
              const keys = setting.key.split(".");

              if (setting.fromPackageJSON) {
                // 保存到全局配置
                let current = globalConfig;
                for (let i = 0; i < keys.length - 1; i++) {
                  if (!current[keys[i]]) {
                    current[keys[i]] = {};
                  }
                  current = current[keys[i]];
                }
                current[keys[keys.length - 1]] = setting.value;
              } else {
                // 保存到工作区配置
                let current = workspaceConfig;
                for (let i = 0; i < keys.length - 1; i++) {
                  if (!current[keys[i]]) {
                    current[keys[i]] = {};
                  }
                  current = current[keys[i]];
                }
                current[keys[keys.length - 1]] = setting.value;

                // 特殊处理：如果是 Qdrant URL 变化，重新初始化 EmbeddingService
                if (setting.key === "experimental.codeIndex.qdrantUrl") {
                  const oldValue = this._extensionContext.globalState.get(
                    "workspaceConfig.experimental.codeIndex.qdrantUrl"
                  );
                  if (setting.value !== oldValue) {
                    console.log(
                      `Qdrant URL changed from "${oldValue}" to "${setting.value}". Reinitializing EmbeddingService.`
                    );
                    this._embeddingService =
                      EmbeddingServiceManager.getInstance().reinitialize() ||
                      null;
                  }
                }
              }
            }
          }

          // 一次性保存所有配置
          await this._extensionContext.globalState.update(
            "config",
            globalConfig
          );
          await this._extensionContext.globalState.update(
            "workspaceConfig",
            workspaceConfig
          );

          webview.postMessage({ command: "settingsSaved" });
          notify.info("settings.save.success");
        } catch (error) {
          console.error(
            "[SettingsViewMessageHandler] Error in saveSettings:",
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          notify.error("settings.save.failed", [errorMessage]);
          webview.postMessage({
            command: "saveSettingsError",
            error: `保存设置失败: ${errorMessage}`,
          });
        }
        break;
      }
      case "getModelsForProvider": {
        console.log(
          `[SettingsViewMessageHandler] Handling getModelsForProvider for provider: ${message.data.providerId}`
        );
        const { providerId, modelSettingKey, providerContextKey } =
          message.data;
        if (!providerId || !modelSettingKey || !providerContextKey) {
          console.error(
            "[SettingsViewMessageHandler] getModelsForProvider: Missing required parameters."
          );
          webview.postMessage({
            command: "getModelsForProviderError",
            data: {
              modelSettingKey,
              error:
                "Missing providerId, modelSettingKey, or providerContextKey in request.",
            },
          });
          return;
        }

        try {
          // 直接从 AIProviderFactory 获取提供商实例，不需要读取配置

          let providerInstance: AIProvider | undefined;

          providerInstance = AIProviderFactory.getProvider(providerId);

          if (!providerInstance) {
            throw new Error(
              `Unsupported or unknown provider ID: ${providerId}`
            );
          }

          if (typeof providerInstance.getModels !== "function") {
            webview.postMessage({
              command: "modelsForProviderLoaded",
              data: { modelSettingKey, models: [] },
            });
            return;
          }

          const models = await providerInstance.getModels();
          webview.postMessage({
            command: "modelsForProviderLoaded",
            data: { modelSettingKey, models: models || [] },
          });
        } catch (error) {
          console.error(
            `[SettingsViewMessageHandler] Error in getModelsForProvider for provider ${providerId}:`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: "getModelsForProviderError",
            data: { modelSettingKey, error: errorMessage },
          });
        }
        break;
      }

      // 动态获取模型列表（用户输入 API Key/Base URL 后触发）
      case "fetchProviderModels": {
        console.log(
          `[SettingsViewMessageHandler] Handling fetchProviderModels for provider: ${message.data.providerId}`
        );
        try {
          const { providerId, apiKey, baseUrl } = message.data;

          if (!providerId) {
            throw new Error("providerId is required");
          }

          // 所有提供商都需要保存配置
          const providerContextKey = `providers.${providerId}`;
          const currentSettings =
            this._extensionContext.globalState.get<any>(providerContextKey) ||
            {};

          // 如果提供了 API Key 或 Base URL，则更新
          if (apiKey) {
            currentSettings.apiKey = apiKey;
          }
          if (baseUrl) {
            currentSettings.baseUrl = baseUrl;
          }

          // 使用 globalState 保存配置
          await this._extensionContext.globalState.update(
            providerContextKey,
            currentSettings
          );

          // 清理提供者缓存，强制重新初始化
          AIProviderFactory.reinitializeProvider(providerId);

          // 获取更新后的提供者实例
          let providerInstance: AIProvider | undefined;
          providerInstance = AIProviderFactory.getProvider(providerId);

          if (!providerInstance) {
            throw new Error(
              `Unsupported or unknown provider ID: ${providerId}`
            );
          }

          if (typeof providerInstance.getModels !== "function") {
            webview.postMessage({
              command: "providerModelsFetched",
              data: { providerId, models: [], success: true },
            });
            return;
          }

          // 获取模型列表
          const models = await providerInstance.getModels();

          webview.postMessage({
            command: "providerModelsFetched",
            data: { providerId, models: models || [], success: true },
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(
            `[SettingsViewMessageHandler] Error fetching models:`,
            errorMessage
          );
          webview.postMessage({
            command: "providerModelsFetched",
            data: {
              providerId: message.data?.providerId,
              success: false,
              error: errorMessage,
              models: [],
            },
          });
        }
        break;
      }

      // New Profile Management Commands
      case "loadProfiles": {
        console.log("[SettingsViewMessageHandler] Handling loadProfiles");
        const { requestId } = message.data;
        try {
          const profiles = await this._profileManager.getAllProfiles();
          const activeProfileId =
            await this._profileManager.getActiveProfileId();
          console.log("profiles", profiles);
          console.log("activeProfileId", activeProfileId);
          webview.postMessage({
            command: "loadProfilesResponse",
            requestId,
            payload: { profiles, activeProfileId },
          });
        } catch (error) {
          console.error(
            "[SettingsViewMessageHandler] Error in loadProfiles:",
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: "loadProfilesResponse",
            requestId,
            error: `Failed to load profiles: ${errorMessage}`,
          });
        }
        break;
      }

      case "saveProfile": {
        const { requestId, profile } = message.data;
        console.log(
          `[SettingsViewMessageHandler] Handling saveProfile for profile: ${profile?.id}`
        );
        try {
          await this._profileManager.saveProfile(profile);
          webview.postMessage({
            command: "saveProfileResponse",
            requestId,
            payload: { success: true },
          });
        } catch (error) {
          console.error(
            `[SettingsViewMessageHandler] Error in saveProfile for profile ${profile?.id}:`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: "saveProfileResponse",
            requestId,
            error: errorMessage,
          });
        }
        break;
      }

      case "deleteProfile": {
        const { requestId, profileId } = message.data;
        console.log(
          `[SettingsViewMessageHandler] Handling deleteProfile for profileId: ${profileId}`
        );
        try {
          await this._profileManager.deleteProfile(profileId);
          webview.postMessage({
            command: "deleteProfileResponse",
            requestId,
            payload: { success: true },
          });
        } catch (error) {
          console.error(
            `[SettingsViewMessageHandler] Error in deleteProfile for profileId ${profileId}:`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: "deleteProfileResponse",
            requestId,
            error: errorMessage,
          });
        }
        break;
      }

      case "setActiveProfile": {
        const { requestId, profileId } = message.data;
        console.log(
          `[SettingsViewMessageHandler] Handling setActiveProfile for profileId: ${profileId}`
        );
        try {
          await this._profileManager.setActiveProfile(profileId);
          webview.postMessage({
            command: "setActiveProfileResponse",
            requestId,
            payload: { profileId },
          });
        } catch (error) {
          console.error(
            `[SettingsViewMessageHandler] Error in setActiveProfile for profileId ${profileId}:`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: "setActiveProfileResponse",
            requestId,
            error: `Failed to set active profile: ${errorMessage}`,
          });
        }
        break;
      }

      case "exportProfile": {
        const { profileId } = message.data;
        console.log(
          `[SettingsViewMessageHandler] Handling exportProfile for profileId: ${profileId}`
        );
        const uri = await vscode.window.showSaveDialog({
          filters: { JSON: ["json"] },
          defaultUri: vscode.Uri.file(
            path.join(os.homedir(), "Documents", "dish-ai-commit-profile.json")
          ),
          title: t("profile.export.title"),
        });

        if (!uri) {
          break;
        }

        try {
          const profiles = await this._providerStore.export();
          const packageInfo = JSON.parse(
            await fs.readFile(
              path.join(this._extensionContext.extensionPath, "package.json"),
              "utf-8"
            )
          );
          const exportData = {
            version: "2.0",
            profile: profiles,
            metadata: {
              exportedAt: new Date().toISOString(),
              exportedBy: "dish-ai-commit",
              extensionVersion: packageInfo.version,
            },
          };
          await safeWriteJson(uri.fsPath, exportData);
          vscode.window.showInformationMessage(t("profile.export.success"));
        } catch (e) {
          const error = e instanceof Error ? e.message : "Unknown error";
          vscode.window.showErrorMessage(`Failed to export profile: ${error}`);
        }
        break;
      }

      case "importProfile": {
        console.log("[SettingsViewMessageHandler] Handling importProfile");
        const uris = await vscode.window.showOpenDialog({
          filters: { JSON: ["json"] },
          canSelectMany: false,
          title: t("profile.import.title"),
        });

        if (!uris || uris.length === 0) {
          break;
        }

        try {
          const filePath = uris[0].fsPath;
          const fileContent = await fs.readFile(filePath, "utf-8");
          const jsonData = JSON.parse(fileContent);

          // The schema should validate the entire ProviderProfiles structure
          const importFileSchema = z.object({
            version: z.string(),
            profile: z.any(), // We'll have to trust the structure for now
            metadata: z.object({
              exportedAt: z.string().datetime(),
              exportedBy: z.string(),
              extensionVersion: z.string(),
            }),
          });

          const parsedData = importFileSchema.parse(jsonData);

          await this._providerStore.importProfile(parsedData.profile);

          // Since importProfile is void, we can't get the imported profile directly.
          // We'll just notify success and let the UI reload profiles.
          webview.postMessage({
            command: "profileImported",
            data: { success: true },
          });
          vscode.window.showInformationMessage(
            t("profile.import.success.general")
          );
        } catch (e) {
          let error = "Unknown error";
          if (e instanceof ZodError) {
            error = e.issues
              .map((issue) => `[${issue.path.join(".")}]: ${issue.message}`)
              .join("\n");
          } else if (e instanceof Error) {
            error = e.message;
          }
          webview.postMessage({
            command: "profileImported",
            data: { success: false, error: error },
          });
          vscode.window.showErrorMessage(t("profile.import.failed", [error]));
        }
        break;
      }

      case "getModels": {
        const { providerId } = message.data;
        console.log(
          `[SettingsViewMessageHandler] Handling getModels for provider: ${providerId}`
        );
        try {
          // TODO: Implement actual model loading with AIProviderFactory
          // For now, we'll return an empty list
          const models = [];
          webview.postMessage({
            command: "modelsLoaded",
            data: { modes: [] },
          });
        } catch (error) {
          console.error(
            `[SettingsViewMessageHandler] Error in getModels for provider ${providerId}:`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: "error",
            data: { message: `Failed to load models: ${errorMessage}` },
          });
        }
        break;
      }

      case "migrateSettings": {
        console.log("[SettingsViewMessageHandler] Handling migrateSettings");
        const { requestId } = message.data;
        try {
          const migratedProfile =
            await this._profileManager.migrateFromPackageJson();
          webview.postMessage({
            command: "migrateSettingsResponse",
            requestId,
            payload: { success: true, migratedProfile },
          });
        } catch (error) {
          console.error(
            "[SettingsViewMessageHandler] Error in migrateSettings:",
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: "migrateSettingsResponse",
            requestId,
            error: errorMessage,
          });
        }
        break;
      }

      case "resetToDefaults": {
        console.log("[SettingsViewMessageHandler] Handling resetToDefaults");
        const { requestId } = message.data;
        try {
          await this._profileManager.resetToDefaults();
          webview.postMessage({
            command: "resetToDefaultsResponse",
            requestId,
            payload: { success: true },
          });
        } catch (error) {
          console.error(
            "[SettingsViewMessageHandler] Error in resetToDefaults:",
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: "resetToDefaultsResponse",
            requestId,
            error: errorMessage,
          });
        }
        break;
      }

      case "getAllProviders": {
        console.log("[SettingsViewMessageHandler] Handling getAllProviders");
        const { requestId } = message.data;
        try {
          const providers = await this._profileManager.getAllProviders();
          console.log("providers", providers);
          webview.postMessage({
            command: "getAllProvidersResponse",
            requestId,
            payload: providers,
          });
        } catch (error) {
          console.error(
            "[SettingsViewMessageHandler] Error in getAllProviders:",
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: "getAllProvidersResponse",
            requestId,
            error: `Failed to get all providers: ${errorMessage}`,
          });
        }
        break;
      }
      case MessageType.GetAllPrompts: {
        console.log("[SettingsViewMessageHandler] Handling GetAllPrompts");
        try {
          const prompts = await this._promptManager.getAllPrompts();
          console.log("prompts", prompts);
          webview.postMessage({
            command: MessageType.AllPrompts,
            payload: prompts,
          });
        } catch (error) {
          console.error(
            "[SettingsViewMessageHandler] Error in GetAllPrompts:",
            error
          );
        }
        break;
      }

      case MessageType.UpdatePrompt: {
        console.log("[SettingsViewMessageHandler] Handling UpdatePrompt");
        const { key, content, target } = message.payload;
        try {
          await this._promptManager.updatePrompt(key, content, target);
          notify.info(`Prompt ${key} updated.`);
        } catch (error) {
          console.error(
            `[SettingsViewMessageHandler] Error in UpdatePrompt for key ${key}:`,
            error
          );
          notify.error(`Failed to update prompt ${key}.`);
        }
        break;
      }

      case MessageType.ResetPrompt: {
        console.log("[SettingsViewMessageHandler] Handling ResetPrompt");
        const { key, target } = message.payload;
        try {
          await this._promptManager.resetPrompt(key, target);
          notify.info(`Prompt ${key} has been reset.`);
        } catch (error) {
          console.error(
            `[SettingsViewMessageHandler] Error in ResetPrompt for key ${key}:`,
            error
          );
          notify.error(`Failed to reset prompt ${key}.`);
        }
        break;
      }

      case MessageType.ResetAllPrompts: {
        console.log("[SettingsViewMessageHandler] Handling ResetAllPrompts");
        const { target } = message.payload;
        try {
          await this._promptManager.resetAllPrompts(target);
          notify.info("All prompts have been reset.");
        } catch (error) {
          console.error(
            `[SettingsViewMessageHandler] Error in ResetAllPrompts:`,
            error
          );
          notify.error("Failed to reset all prompts.");
        }
        break;
      }
      case MessageType.CreatePrompt: {
        console.log("[SettingsViewMessageHandler] Handling CreatePrompt");
        const { key, content, target } = message.payload;
        try {
          await this._promptManager.updatePrompt(key, content, target);
          notify.info(`Prompt ${key} created.`);
          // Refresh the prompts in the webview
          const prompts = await this._promptManager.getAllPrompts();
          webview.postMessage({
            command: MessageType.AllPrompts,
            payload: prompts,
          });
        } catch (error) {
          console.error(
            `[SettingsViewMessageHandler] Error in CreatePrompt for key ${key}:`,
            error
          );
          notify.error(`Failed to create prompt ${key}.`);
        }
        break;
      }

      case MessageType.DeletePrompt: {
        console.log("[SettingsViewMessageHandler] Handling DeletePrompt");
        const { key, target } = message.payload;
        try {
          await this._promptManager.deletePrompt(key, target);
          notify.info(`Prompt ${key} has been deleted.`);
          // Refresh the prompts in the webview
          const prompts = await this._promptManager.getAllPrompts();
          webview.postMessage({
            command: MessageType.AllPrompts,
            payload: prompts,
          });
        } catch (error) {
          console.error(
            `[SettingsViewMessageHandler] Error in DeletePrompt for key ${key}:`,
            error
          );
          notify.error(`Failed to delete prompt ${key}.`);
        }
        break;
      }

      case MessageType.RenamePrompt: {
        console.log("[SettingsViewMessageHandler] Handling RenamePrompt");
        const { oldKey, newKey, target } = message.payload;
        try {
          const promptDetail = this._promptManager.getPromptDetail(oldKey);
          await this._promptManager.updatePrompt(
            newKey,
            promptDetail.content,
            target
          );
          await this._promptManager.deletePrompt(oldKey, target);
          notify.info(`Prompt ${oldKey} has been renamed to ${newKey}.`);
          // Refresh the prompts in the webview
          const prompts = await this._promptManager.getAllPrompts();
          webview.postMessage({
            command: MessageType.AllPrompts,
            payload: prompts,
          });
        } catch (error) {
          console.error(
            `[SettingsViewMessageHandler] Error in RenamePrompt for key ${oldKey}:`,
            error
          );
          notify.error(`Failed to rename prompt ${oldKey}.`);
        }
        break;
      }
      case "fetchEmbeddingModels": {
        console.log(
          "[SettingsViewMessageHandler] Handling fetchEmbeddingModels"
        );
        try {
          const embeddingModels =
            await AIProviderFactory.getAllEmbeddingModels();
          webview.postMessage({
            command: "embeddingModelsLoaded",
            data: {
              embeddingModels: embeddingModels,
            },
          });
        } catch (error) {
          console.error(
            "[SettingsViewMessageHandler] Error in fetchEmbeddingModels:",
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: "embeddingModelsLoaded",
            data: {
              embeddingModels: [],
              error: `Failed to load embedding models: ${errorMessage}`,
            },
          });
        }
        break;
      }
    }
  }

  private async handleClearIndex(webview: vscode.Webview): Promise<void> {
    console.log("[SettingsViewMessageHandler] handleClearIndex called.");
    if (!this._embeddingService) {
      const errorMessage = "EmbeddingService is not initialized.";
      console.error(`[SettingsViewMessageHandler] ${errorMessage}`);
      notify.error("embedding.service.not.initialized");
      return;
    }
    try {
      console.log("[SettingsViewMessageHandler] Clearing index...");
      await this._embeddingService.clearIndex();
      console.log("[SettingsViewMessageHandler] Index cleared successfully.");
      notify.info("index.clear.success");
      webview.postMessage({ command: "indexCleared", data: { isIndexed: 0 } });
    } catch (error) {
      console.error(
        "[SettingsViewMessageHandler] Error during handleClearIndex:",
        error
      );
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      notify.error("index.clear.failed", [errorMessage]);
    }
  }

  private async handleTestConnection(
    service: string,
    url: string,
    key: string,
    webview: vscode.Webview
  ): Promise<void> {
    console.log(
      `[SettingsViewMessageHandler] Testing connection for service: ${service}, URL: ${url}`
    );
    try {
      let testUrl = url;
      if (service === "ollama") {
        // For Ollama, we can check the version or a similar endpoint
        testUrl = new URL("/api/version", url).toString();
      } else if (service === "qdrant") {
        // For Qdrant, we can check the root endpoint which usually returns version info
        testUrl = new URL("/", url).toString();
      }
      console.log(`[SettingsViewMessageHandler] Using test URL: ${testUrl}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(testUrl, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        console.log(
          `[SettingsViewMessageHandler] Connection test successful for service: ${service}`
        );
        webview.postMessage({
          command: "testConnectionResult",
          data: { success: true, service, key },
        });
      } else {
        console.error(
          `[SettingsViewMessageHandler] Connection test failed for service: ${service}. Status: ${response.status}`
        );
        throw new Error(`Server returned status ${response.status}`);
      }
    } catch (error) {
      console.error(
        `[SettingsViewMessageHandler] Error during connection test for service ${service}:`,
        error
      );
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      webview.postMessage({
        command: "testConnectionResult",
        data: { success: false, error: errorMessage, service, key },
      });
    }
  }

  private async startIndexing(
    startIndex: number,
    webview: vscode.Webview,
    clearIndex: boolean = false
  ): Promise<void> {
    console.log(
      `[SettingsViewMessageHandler] startIndexing called with startIndex: ${startIndex}, clearIndex: ${clearIndex}`
    );
    // 检查 EmbeddingService 是否存在
    if (!this._embeddingService) {
      const errorMessage = "EmbeddingService 未初始化，无法执行索引操作。";
      console.error(`[SettingsViewMessageHandler] ${errorMessage}`);
      webview.postMessage({
        command: "indexingFailed",
        data: { message: errorMessage },
      });
      return;
    }

    if (clearIndex) {
      try {
        console.log(
          "[SettingsViewMessageHandler] Clearing index before starting new indexing."
        );
        await this._embeddingService.clearIndex(); // Assuming this method exists.
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[SettingsViewMessageHandler] Error during clearing index:`,
          error
        );
        webview.postMessage({
          command: "indexingFailed",
          data: {
            message: `清除旧索引失败: ${errorMessage}`,
            source: "clearIndex",
          },
        });
        return;
      }
    }

    // 调用 EmbeddingService 的方法，并将 startIndex 传递给它
    try {
      console.log("[SettingsViewMessageHandler] Starting file scan...");
      await this._embeddingService.scanProjectFiles(startIndex, webview);
      const isIndexed = await this._embeddingService.isIndexed();
      console.log(
        `[SettingsViewMessageHandler] Indexing finished. isIndexed: ${isIndexed}`
      );
      webview.postMessage({
        command: "indexingFinished",
        data: { message: "索引完成!", isIndexed },
      });
    } catch (error) {
      console.error(
        `[SettingsViewMessageHandler] Error during indexing:`,
        error
      );

      if (error instanceof EmbeddingServiceError) {
        // Forward the structured error to the webview
        webview.postMessage({
          command: "indexingFailed",
          data: {
            message: error.message,
            source: error.context.source,
            type: error.context.type,
            context: error.context, // Send the whole context
          },
        });
      } else {
        // Handle generic errors
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        webview.postMessage({
          command: "indexingFailed",
          data: {
            message: `索引失败: ${errorMessage}`,
            source: "unknown",
          },
        });
      }
    }
  }
}
