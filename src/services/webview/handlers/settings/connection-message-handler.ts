import { AIProviderFactory } from "@/ai/ai-provider-factory";
import { IndexingSettingsManager } from "@/services/settings/indexing-settings-manager";
import { ExtensionResponse, UIRequest } from "@/types/messages";
import * as vscode from "vscode";

export class ConnectionMessageHandler {
  constructor(private readonly _extensionContext: vscode.ExtensionContext) {}

  public async handle(message: any, webview: vscode.Webview): Promise<void> {
    switch (message.command) {
      case UIRequest.ConnectionTest: {
        console.log(
          `[ConnectionMessageHandler] Handling testConnection for service: ${message.data.service}`
        );
        const { service, url, key } = message.data;
        try {
          const provider = AIProviderFactory.getProvider(service, {
            apiKey: key,
            baseUrl: url,
            providerId: service,
          });

          // Try to refresh models to validate connection
          // This ensures the API key and URL are correct by making a real request
          await provider.refreshModels();

          webview.postMessage({
            command: ExtensionResponse.ConnectionTestResult,
            data: {
              service,
              success: true,
            },
          });
        } catch (error) {
          console.error(
            `[ConnectionMessageHandler] Error in testConnection for ${service}:`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: ExtensionResponse.ConnectionTestResult,
            data: {
              service,
              success: false,
              error: errorMessage,
            },
          });
        }
        break;
      }

      case UIRequest.ConnectionGetModelsForProvider: {
        console.log(
          `[ConnectionMessageHandler] Handling getModelsForProvider for provider: ${message.data.providerId}`
        );
        const { providerId, modelSettingKey, providerContextKey } =
          message.data;
        if (!providerId || !modelSettingKey || !providerContextKey) {
          console.error(
            "[ConnectionMessageHandler] getModelsForProvider: Missing required parameters."
          );
          webview.postMessage({
            command: ExtensionResponse.ConnectionProviderModelsError,
            data: {
              modelSettingKey,
              error:
                "Missing providerId, modelSettingKey, or providerContextKey in request.",
            },
          });
          return;
        }

        try {
          // Use AIProviderFactory to get models
          // For getModelsForProvider, we might not have the full config (key/url) in the message sometimes?
          // But usually this is called when we want to list models for a selected provider.
          // If we don't have config, we might get a cached provider or default one.
          // However, the original code passed empty strings for key/url:
          // AISDKService.getInstance().getModels(providerId, "", "")

          // So we do the same: get provider without specific config (uses cached or default)
          // But wait, getProvider(providerId) might throw if no config and no cache?
          // AIProviderFactory.getProvider(type) uses cached if available.

          // If we want to support static list without key, we need to ensure the provider can return it.
          // Most providers return static list in getModels() if API call fails or not attempted.

          const provider = AIProviderFactory.getProvider(providerId);
          const models = await provider.getModels();

          webview.postMessage({
            command: ExtensionResponse.ConnectionProviderModelsLoaded,
            data: { modelSettingKey, models: models || [] },
          });
        } catch (error) {
          console.error(
            `[ConnectionMessageHandler] Error in getModelsForProvider for provider ${providerId}:`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: ExtensionResponse.ConnectionProviderModelsError,
            data: { modelSettingKey, error: errorMessage },
          });
        }
        break;
      }

      // 动态获取模型列表（用户输入 API Key/Base URL 后触发）
      case UIRequest.ConnectionFetchProviderModels: {
        const { providerId, apiKey, baseUrl } = message.data;
        console.log(
          `[ConnectionMessageHandler] Handling fetchProviderModels for provider: ${providerId}`,
          {
            hasApiKey: !!apiKey,
            hasBaseUrl: !!baseUrl,
            baseUrl: baseUrl,
          }
        );
        try {
          if (!providerId) {
            throw new Error("providerId is required");
          }

          // Update config object using IndexingSettingsManager
          const settingsManager = IndexingSettingsManager.getInstance(
            this._extensionContext
          );

          if (apiKey) {
            console.log(`[ConnectionMessageHandler] 更新 API Key 配置`);
            await settingsManager.updateProviderSetting(
              providerId,
              "apiKey",
              apiKey
            );
          }
          if (baseUrl) {
            console.log(
              `[ConnectionMessageHandler] 更新 Base URL 配置: ${baseUrl}`
            );
            await settingsManager.updateProviderSetting(
              providerId,
              "baseUrl",
              baseUrl
            );
          }

          // Validate connection first as requested by user
          // "judge whether apikey baseurl can connect"
          console.log(`[ConnectionMessageHandler] 创建 provider 实例`);
          const provider = AIProviderFactory.getProvider(providerId, {
            apiKey: apiKey,
            baseUrl: baseUrl,
            providerId: providerId,
          });

          // refreshModels will try to fetch from API
          console.log(`[ConnectionMessageHandler] 开始刷新模型列表...`);
          const startTime = Date.now();
          await provider.refreshModels();
          const refreshTime = Date.now() - startTime;
          console.log(
            `[ConnectionMessageHandler] 模型列表刷新完成，耗时: ${refreshTime}ms`
          );

          // Get models (which might be updated after refresh, or just return what we have)
          console.log(`[ConnectionMessageHandler] 获取模型列表...`);
          const models = await provider.getModels();
          const modelsCount = models?.length || 0;
          console.log(
            `[ConnectionMessageHandler] 成功获取 ${modelsCount} 个模型，准备发送响应`
          );

          webview.postMessage({
            command: ExtensionResponse.ConnectionAllModelsFetched,
            data: { providerId, models: models || [], success: true },
          });
          console.log(
            `[ConnectionMessageHandler] 成功发送模型列表响应 (${ExtensionResponse.ConnectionAllModelsFetched})`
          );
        } catch (error) {
          const endTime = Date.now();
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          console.error(
            `[ConnectionMessageHandler] 获取模型列表失败:`,
            errorMessage,
            {
              providerId: message.data?.providerId,
              stack: errorStack,
            }
          );

          // 确保即使出错也发送响应
          webview.postMessage({
            command: ExtensionResponse.ConnectionAllModelsFetched,
            data: {
              providerId: message.data?.providerId || providerId,
              success: false,
              error: errorMessage,
              models: [],
            },
          });
          console.log(
            `[ConnectionMessageHandler] 已发送错误响应 (${ExtensionResponse.ConnectionAllModelsFetched})`
          );
        }
        break;
      }

      case UIRequest.ConnectionGetAllModels: {
        const { providerId } = message.data;
        console.log(
          `[ConnectionMessageHandler] Handling getModels for provider: ${providerId}`
        );
        try {
          // TODO: Implement actual model loading with AIProviderFactory
          // For now, we'll return an empty list
          const models = [];
          webview.postMessage({
            command: ExtensionResponse.ConnectionAllModelsLoaded,
            data: { modes: [] },
          });
        } catch (error) {
          console.error(
            `[ConnectionMessageHandler] Error in getModels for provider ${providerId}:`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          webview.postMessage({
            command: ExtensionResponse.SystemError,
            data: { message: `Failed to load models: ${errorMessage}` },
          });
        }
        break;
      }
    }
  }
}
