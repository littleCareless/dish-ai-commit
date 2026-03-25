import { AIProviderFactory } from "@/ai/ai-provider-factory";
import { ProfileManagerService } from "@/services/profile-manager/profile-manager-service";
import { IndexingSettingsManager } from "@/services/settings/indexing-settings-manager";
import {
  ExtensionResponse,
  UIRequest,
  UIRequestMessage,
} from "@shared/types/messages";
import * as vscode from "vscode";
import { BaseMessageHandler } from "./base-message-handler";

export class ConnectionMessageHandler extends BaseMessageHandler {
  public async handle(
    message: UIRequestMessage,
    webview: vscode.Webview
  ): Promise<void> {
    switch (message.command) {
      case UIRequest.ConnectionTest:
        await this.testConnection(message, webview);
        break;
      case UIRequest.ConnectionTestAndSave:
        await this.testAndSaveConnection(message, webview);
        break;
      case UIRequest.ConnectionFetchProviderModels:
        await this.fetchProviderModels(message, webview);
        break;
      case UIRequest.ConnectionGetModelsForProvider:
      case UIRequest.ConnectionGetAllModels: {
        const normalizedMessage = {
          ...message,
          data: {
            ...(message.data || {}),
            providerId:
              message.data?.providerId ||
              message.data?.provider ||
              message.data?.service,
          },
        } as UIRequestMessage;
        await this.fetchProviderModels(normalizedMessage, webview);
        break;
      }
    }
  }

  private async testConnection(
    message: UIRequestMessage,
    webview: vscode.Webview
  ) {
    const { service, apiKey, baseUrl } = message.data;
    try {
      const provider = await AIProviderFactory.getProvider(service, {
        id: "test-connection",
        name: "Test Connection",
        provider: service,
        apiKey,
        baseUrl,
      });
      const models = await provider.getModels();
      webview.postMessage({
        command: ExtensionResponse.ConnectionTestResult,
        data: { success: true, models },
      });
    } catch (error) {
      webview.postMessage({
        command: ExtensionResponse.ConnectionTestResult,
        data: {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  private async testAndSaveConnection(
    message: UIRequestMessage,
    webview: vscode.Webview
  ) {
    const {
      profileId,
      provider: providerId,
      apiKey,
      baseUrl,
      model,
    } = message.data;
    const profileManager = ProfileManagerService.getInstance();

    try {
      // Get the full profile object (new schema) instead of the legacy flat structure
      const targetProfileId = profileId || profileManager.getActiveProfileId();
      if (!targetProfileId) {
        throw new Error("No profile ID provided and no active profile found.");
      }

      const fullProfile = profileManager.getProfileById(targetProfileId);
      if (!fullProfile) {
        throw new Error(`Profile with ID '${targetProfileId}' not found.`);
      }

      // Ensure providers object exists
      if (!fullProfile.providers) {
        fullProfile.providers = {};
      }

      // Ensure the specific provider config exists
      if (!fullProfile.providers[providerId]) {
        // Look up default config for this provider if possible, or create minimal
        const { ALL_PROVIDERS } = require("@/config/provider-definitions");
        const defaultProviderConfig = ALL_PROVIDERS.find(
          (p: any) => p.id === providerId
        );

        fullProfile.providers[providerId] = {
          id: providerId,
          name: defaultProviderConfig?.name || providerId,
          type: defaultProviderConfig?.type || "openai-compatible",
          ...defaultProviderConfig,
        };
      }

      // Update the provider configuration
      const providerConfig = fullProfile.providers[providerId];
      if (apiKey) {
        providerConfig.apiKey = apiKey;
      }
      if (baseUrl) {
        providerConfig.baseUrl = baseUrl;
      }
      if (model) {
        providerConfig.defaultModel = model;
      }
      providerConfig.updatedAt = new Date();

      // Save the updated FULL profile
      await profileManager.saveProfile(fullProfile);

      // Now create a temporary config object for testing the connection
      // This mimics what getProfileForMode returns but with our updates
      const testConfig = {
        id: providerConfig.id,
        name: providerConfig.name,
        provider: providerConfig.id,
        apiKey: providerConfig.apiKey,
        baseUrl: providerConfig.baseUrl,
        modelId: providerConfig.defaultModel,
      };

      const provider = await AIProviderFactory.getProvider(
        providerId,
        testConfig
      );
      const models = await provider.getModels();

      webview.postMessage({
        command: ExtensionResponse.ConnectionAndSaveResult,
        data: { success: true, models },
      });
    } catch (error) {
      webview.postMessage({
        command: ExtensionResponse.ConnectionAndSaveResult,
        data: {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  private async fetchProviderModels(
    message: UIRequestMessage,
    webview: vscode.Webview
  ) {
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

      const settingsManager = IndexingSettingsManager.getInstance(
        this.extensionContext
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

      console.log(`[ConnectionMessageHandler] 创建 provider 实例`);
      const provider = await AIProviderFactory.getProvider(providerId, {
        id: "test-and-save-connection",
        name: "Test and Save Connection",
        provider: providerId,
        apiKey,
        baseUrl,
      });

      console.log(`[ConnectionMessageHandler] 开始刷新模型列表...`);
      const startTime = Date.now();
      await provider.refreshModels();
      const refreshTime = Date.now() - startTime;
      console.log(
        `[ConnectionMessageHandler] 模型列表刷新完成，耗时: ${refreshTime}ms`
      );

      console.log(`[ConnectionMessageHandler] 获取模型列表...`);
      const models = await provider.getModels();
      const modelsCount = models?.length || 0;
      console.log(
        `[ConnectionMessageHandler] 成功获取 ${modelsCount} 个模型，准备发送响应`
      );

      const responsePayload = {
        providerId,
        models: models || [],
        success: true,
      };
      this.postAllModelsResponses(webview, responsePayload);
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

      const responsePayload = {
        providerId,
        models: [],
        success: false,
        error: errorMessage,
      };
      this.postAllModelsResponses(webview, responsePayload);
    }
  }

  private postAllModelsResponses(
    webview: vscode.Webview,
    payload: {
      providerId: string;
      models: unknown[];
      success: boolean;
      error?: string;
    }
  ): void {
    webview.postMessage({
      command: ExtensionResponse.ConnectionAllModelsFetched,
      data: payload,
    });

    // 兼容旧 UI 监听逻辑（ConnectionAllModelsLoaded）
    webview.postMessage({
      command: ExtensionResponse.ConnectionAllModelsLoaded,
      data: payload.models,
    });
  }
}
