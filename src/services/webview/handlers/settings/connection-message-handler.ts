import * as vscode from "vscode";
import { AISDKService } from "@/services/ai-sdk/ai-sdk-service";
import { IndexingSettingsManager } from "@/services/settings/indexing-settings-manager";

export class ConnectionMessageHandler {
    constructor(private readonly _extensionContext: vscode.ExtensionContext) { }

    public async handle(message: any, webview: vscode.Webview): Promise<void> {
        switch (message.command) {
            case "testConnection": {
                console.log(
                    `[ConnectionMessageHandler] Handling testConnection for service: ${message.data.service}`
                );
                const { service, url, key } = message.data;
                try {
                    const isValid = await AISDKService.getInstance().validateConnection(
                        service,
                        key,
                        url
                    );
                    webview.postMessage({
                        command: "testConnectionResponse",
                        data: {
                            service,
                            success: isValid,
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
                        command: "testConnectionResponse",
                        data: {
                            service,
                            success: false,
                            error: errorMessage,
                        },
                    });
                }
                break;
            }

            case "getModelsForProvider": {
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
                    // Use AISDKService to get models
                    const models = await AISDKService.getInstance().getModels(
                        providerId,
                        "",
                        ""
                    ); // API key/URL not needed for static list from library

                    webview.postMessage({
                        command: "modelsForProviderLoaded",
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
                        command: "getModelsForProviderError",
                        data: { modelSettingKey, error: errorMessage },
                    });
                }
                break;
            }

            // 动态获取模型列表（用户输入 API Key/Base URL 后触发）
            case "fetchProviderModels": {
                console.log(
                    `[ConnectionMessageHandler] Handling fetchProviderModels for provider: ${message.data.providerId}`
                );
                try {
                    const { providerId, apiKey, baseUrl } = message.data;

                    if (!providerId) {
                        throw new Error("providerId is required");
                    }

                    // Update config object using IndexingSettingsManager
                    const settingsManager = IndexingSettingsManager.getInstance(this._extensionContext);

                    if (apiKey) {
                        await settingsManager.updateProviderSetting(providerId, "apiKey", apiKey);
                    }
                    if (baseUrl) {
                        await settingsManager.updateProviderSetting(providerId, "baseUrl", baseUrl);
                    }

                    // Validate connection first as requested by user
                    // "judge whether apikey baseurl can connect"
                    await AISDKService.getInstance().validateConnection(
                        providerId,
                        apiKey || "",
                        baseUrl
                    );

                    // Use AISDKService to get models
                    const models = await AISDKService.getInstance().getModels(
                        providerId,
                        apiKey || "",
                        baseUrl
                    );

                    webview.postMessage({
                        command: "providerModelsFetched",
                        data: { providerId, models: models || [], success: true },
                    });
                } catch (error) {
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    console.error(
                        `[ConnectionMessageHandler] Error fetching models:`,
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

            case "getModels": {
                const { providerId } = message.data;
                console.log(
                    `[ConnectionMessageHandler] Handling getModels for provider: ${providerId}`
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
                        `[ConnectionMessageHandler] Error in getModels for provider ${providerId}:`,
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
        }
    }
}
