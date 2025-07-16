import * as vscode from "vscode";
import {
  EmbeddingService,
  EmbeddingServiceError,
} from "../../core/indexing/embedding-service";
import { EmbeddingServiceManager } from "../../core/indexing/embedding-service-manager";
import { AIProvider } from "../../ai/types";
import { AIProviderFactory } from "../../ai/ai-provider-factory";
import { stateManager } from "../../utils/state/state-manager";
import {
  WORKSPACE_CONFIG_SCHEMA,
  WORKSPACE_CONFIG_PATHS,
} from "../../config/workspace-config-schema";
import { CONFIG_SCHEMA } from "../../config/config-schema";
import { isConfigValue } from "../../config/utils/config-validation";

export class SettingsViewMessageHandler {
  private readonly _extensionId: string;

  constructor(
    extensionId: string,
    private _embeddingService: EmbeddingService | null,
    private readonly _extensionContext: vscode.ExtensionContext // Receive // extensionContext here
  ) {
    this._extensionId = extensionId;
  }

  public async handleMessage(
    message: any,
    webview: vscode.Webview
  ): Promise<void> {
    switch (message.command) {
      case "testConnection": {
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
        await this.handleClearIndex(webview);
        break;
      }
      case "getSettings": {
        const config = vscode.workspace.getConfiguration("dish-ai-commit");
        const detailedSettings: any[] = [];
        const processConfig = (schema: any, path: string, settings: any[]) => {
          for (const key in schema) {
            if (Object.prototype.hasOwnProperty.call(schema, key)) {
              const prop = schema[key];
              const currentPath = path ? `${path}.${key}` : key;

              if (isConfigValue(prop)) {
                const value = config.get(currentPath);

                const setting: any = {
                  key: currentPath,
                  type: prop.type,
                  default: prop.default,
                  description: prop.description || "",
                  value: value,
                  fromPackageJSON: true, // This indicates it's a global setting
                  // feature: prop.feature,
                };

                if ("enum" in prop) {
                  setting.enum = prop.enum;
                }

                settings.push(setting);
              } else if (typeof prop === "object" && prop !== null) {
                // If it's an object and not a config value, recurse into it
                processConfig(prop, currentPath, settings);
              }
            }
          }
        };

        processConfig(CONFIG_SCHEMA, "", detailedSettings);

        // Load settings from workspace state
        const workspaceSettings: any[] = [];
        const processWorkspaceConfig = (
          schema: any,
          path: string,
          settings: any[]
        ) => {
          for (const key in schema) {
            if (Object.prototype.hasOwnProperty.call(schema, key)) {
              const prop = schema[key];
              const currentPath = path ? `${path}.${key}` : key;

              if (isConfigValue(prop)) {
                const value = stateManager.getWorkspace<any>(
                  currentPath,
                  prop.default
                );

                const setting: any = {
                  key: currentPath,
                  type: prop.type,
                  default: prop.default,
                  description: prop.description || "",
                  value: value,
                  fromPackageJSON: false,
                  // feature: prop.feature,
                };

                if ("enum" in prop) {
                  setting.enum = prop.enum;
                }

                settings.push(setting);
              } else if (typeof prop === "object" && prop !== null) {
                // If it's an object and not a config value, recurse into it
                processWorkspaceConfig(prop, currentPath, settings);
              }
            }
          }
        };

        processWorkspaceConfig(WORKSPACE_CONFIG_SCHEMA, "", workspaceSettings);

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
            // We can still send this for toast notifications, but the main logic will use the one in loadSettings
            webview.postMessage({
              command: "indexingStatusError",
              error: indexStatusError,
            });
          }
        }

        const embeddingModels = await AIProviderFactory.getAllEmbeddingModels();

        webview.postMessage({
          command: "loadSettings",
          data: {
            schema: [...detailedSettings, ...workspaceSettings], // Merge settings from both sources
            isIndexed: isIndexed, // 将索引状态添加到消息中
            indexStatusError: indexStatusError,
            embeddingModels: embeddingModels, // 添加嵌入式模型
          },
        });
        break;
      }

      case "saveSettings": {
        const newSettings = message.data;
        const config = vscode.workspace.getConfiguration("dish-ai-commit");
        try {
          const promises = newSettings.map(async (setting: any) => {
            if (setting.key && setting.value !== undefined) {
              const oldValue = stateManager.getWorkspace<any>(setting.key);
              const settingFromPackageJSON = newSettings.find(
                (s: any) => s.key === setting.key
              )?.fromPackageJSON;

              if (settingFromPackageJSON) {
                await config.update(
                  setting.key,
                  setting.value,
                  vscode.ConfigurationTarget.Global
                );
              } else {
                await stateManager.setWorkspace(setting.key, setting.value);
              }

              if (
                setting.key ===
                  WORKSPACE_CONFIG_PATHS.experimental.codeIndex.qdrantUrl &&
                setting.value !== oldValue
              ) {
                console.log(
                  `Qdrant URL changed from "${oldValue}" to "${setting.value}". Reinitializing EmbeddingService.`
                );
                this._embeddingService =
                  EmbeddingServiceManager.getInstance().reinitialize() || null;
              }
            }
          });
          await Promise.all(promises);
          webview.postMessage({ command: "settingsSaved" });
          vscode.window.showInformationMessage("设置已成功保存！");
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`保存设置失败: ${errorMessage}`);
          webview.postMessage({
            command: "saveSettingsError",
            error: `保存设置失败: ${errorMessage}`,
          });
        }
        break;
      }
      case "getModelsForProvider": {
        const { providerId, modelSettingKey, providerContextKey } =
          message.data;
        if (!providerId || !modelSettingKey || !providerContextKey) {
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
          // console.log(`[SettingsViewProvider] Received getModelsForProvider for providerId: ${providerId}, context: ${providerContextKey}`);

          // 获取特定 provider 的配置，因为 getModels 可能需要 API key 等
          // providerContextKey 应该是类似 "providers.openai" 这样的键
          const config = vscode.workspace.getConfiguration("dish-ai-commit");
          const providerSettings = config.get(providerContextKey);

          let providerInstance: AIProvider | undefined;

          providerInstance = AIProviderFactory.getProvider(providerId); // 只传递 providerId

          if (!providerInstance) {
            throw new Error(
              `Unsupported or unknown provider ID: ${providerId}`
            );
          }

          if (typeof providerInstance.getModels !== "function") {
            // console.warn(`[SettingsViewProvider] Provider ${providerId} does not implement getModels(). Sending empty list.`);
            webview.postMessage({
              command: "modelsForProviderLoaded",
              data: { modelSettingKey, models: [] },
            });
            return;
          }

          const models = await providerInstance.getModels(); // 移除参数
          // console.log(`[SettingsViewProvider] Models for ${providerId} (${modelSettingKey}):`, models);
          webview.postMessage({
            command: "modelsForProviderLoaded",
            data: { modelSettingKey, models: models || [] },
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          // console.error(`[SettingsViewProvider] Error getting models for ${providerId} (${modelSettingKey}):`, errorMessage);
          webview.postMessage({
            command: "getModelsForProviderError",
            data: { modelSettingKey, error: errorMessage },
          });
        }
        break;
      }
    }
  }

  private async handleClearIndex(webview: vscode.Webview): Promise<void> {
    if (!this._embeddingService) {
      const errorMessage = "EmbeddingService is not initialized.";
      vscode.window.showErrorMessage(errorMessage);
      return;
    }
    try {
      await this._embeddingService.clearIndex();
      vscode.window.showInformationMessage("Index cleared successfully.");
      webview.postMessage({ command: "indexCleared", data: { isIndexed: 0 } });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to clear index: ${errorMessage}`);
    }
  }

  private async handleTestConnection(
    service: string,
    url: string,
    key: string,
    webview: vscode.Webview
  ): Promise<void> {
    try {
      let testUrl = url;
      if (service === "ollama") {
        // For Ollama, we can check the version or a similar endpoint
        testUrl = new URL("/api/version", url).toString();
      } else if (service === "qdrant") {
        // For Qdrant, we can check the root endpoint which usually returns version info
        testUrl = new URL("/", url).toString();
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(testUrl, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        webview.postMessage({
          command: "testConnectionResult",
          data: { success: true, service, key },
        });
      } else {
        console.log("error", response);
        throw new Error(`Server returned status ${response.status}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      console.log("error", error);
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
      await this._embeddingService.scanProjectFiles(startIndex, webview);
      const isIndexed = await this._embeddingService.isIndexed();
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
