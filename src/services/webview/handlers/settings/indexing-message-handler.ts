import * as vscode from "vscode";
import { AIProviderFactory } from "@/ai/ai-provider-factory";
import {
    EmbeddingService,
    EmbeddingServiceError,
} from "@/core/indexing/embedding-service";
import { EmbeddingServiceManager } from "@/core/indexing/embedding-service-manager";
import { notify } from "@/utils/notification/notification-manager";
import { IndexingSettingsManager } from "@/services/settings/indexing-settings-manager";

export class IndexingMessageHandler {
    private _settingsManager: IndexingSettingsManager;

    constructor(
        private _embeddingService: EmbeddingService | null,
        private readonly _extensionContext: vscode.ExtensionContext
    ) {
        this._settingsManager = IndexingSettingsManager.getInstance(_extensionContext);
        this._settingsManager.initialize(); // Ensure settings are loaded/migrated
    }

    public updateEmbeddingService(service: EmbeddingService | null) {
        this._embeddingService = service;
    }

    public async handle(message: any, webview: vscode.Webview): Promise<void> {
        switch (message.command) {
            case "startIndexing": {
                const { clearIndex } = message.data || {};
                console.log(
                    `[IndexingMessageHandler] Received startIndexing message with clearIndex: ${clearIndex}`
                );
                this.startIndexing(0, webview, !!clearIndex);
                break;
            }
            case "clearIndex": {
                console.log("[IndexingMessageHandler] Handling clearIndex");
                await this.handleClearIndex(webview);
                break;
            }
            case "getSettings": {
                console.log("[IndexingMessageHandler] Handling getSettings");
                try {
                    const settings = this._settingsManager.getSettings();

                    // Pass settings directly, but ensure we don't expose sensitive internal state if any (though IndexingSettings is mostly config)
                    // The frontend expects a structure matching IndexingFormValues.
                    // We might need to ensure 'providers' is initialized.

                    const config = {
                        ...settings,
                        providers: settings.providers || {}
                    };

                    // 获取索引状态
                    let isIndexed = 0;
                    let indexStatusError: string | null = null;
                    if (this._embeddingService) {
                        try {
                            isIndexed = await this._embeddingService.isIndexed();
                        } catch (error) {
                            if (error instanceof EmbeddingServiceError) {
                                indexStatusError = `${error.message}\n来源：${error.context?.source ?? "未知"
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
                        command: "loadIndexingSettings",
                        data: {
                            config: config,
                            isIndexed: isIndexed,
                            indexStatusError: indexStatusError,
                            embeddingModels: [], // Initially send an empty array
                        },
                    });
                } catch (error) {
                    console.error(
                        "[IndexingMessageHandler] Error in getSettings:",
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
                    `[IndexingMessageHandler] Handling saveSettings with data: ${JSON.stringify(
                        message.data,
                        null,
                        2
                    )}`
                );
                try {
                    const newSettingsData = message.data;

                    if (typeof newSettingsData !== "object" || newSettingsData === null) {
                        throw new Error("Invalid settings format received.");
                    }

                    const currentSettings = this._settingsManager.getSettings();

                    // Merge new settings. Since the structure now matches, we can merge more directly.
                    // However, we should be careful not to overwrite everything blindly if partial updates were supported,
                    // but here the form sends the whole state.

                    const updatedSettings: any = {
                        ...currentSettings,
                        ...newSettingsData,
                        providers: {
                            ...currentSettings.providers,
                            ...(newSettingsData.providers || {})
                        }
                    };

                    // Determine active embedding model based on the selected provider's model
                    // This logic is still useful to ensure 'embeddingModel' (the active one) is set correctly
                    // based on the provider selection.
                    const provider = updatedSettings.provider;
                    const providerConfig = updatedSettings.providers[provider];

                    if (providerConfig && providerConfig.model) {
                        updatedSettings.embeddingModel = providerConfig.model;
                    }

                    // Save
                    await this._settingsManager.updateSettings(updatedSettings);

                    // Check for Qdrant URL change
                    if (newSettingsData.qdrantUrl && newSettingsData.qdrantUrl !== currentSettings.qdrantUrl) {
                        console.log(`Qdrant URL updated to "${newSettingsData.qdrantUrl}". Reinitializing EmbeddingService.`);
                        this._embeddingService = EmbeddingServiceManager.getInstance().reinitialize() || null;
                    }

                    webview.postMessage({ command: "settingsSaved" });
                    notify.info("settings.save.success");
                } catch (error) {
                    console.error(
                        "[IndexingMessageHandler] Error in saveSettings:",
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

            case "fetchEmbeddingModels": {
                console.log(
                    "[IndexingMessageHandler] Handling fetchEmbeddingModels"
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
                        "[IndexingMessageHandler] Error in fetchEmbeddingModels:",
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
        console.log("[IndexingMessageHandler] handleClearIndex called.");
        if (!this._embeddingService) {
            const errorMessage = "EmbeddingService is not initialized.";
            console.error(`[IndexingMessageHandler] ${errorMessage}`);
            notify.error("embedding.service.not.initialized");
            return;
        }
        try {
            console.log("[IndexingMessageHandler] Clearing index...");
            await this._embeddingService.clearIndex();
            console.log("[IndexingMessageHandler] Index cleared successfully.");
            notify.info("index.clear.success");
            webview.postMessage({ command: "indexCleared", data: { isIndexed: 0 } });
        } catch (error) {
            console.error(
                "[IndexingMessageHandler] Error during handleClearIndex:",
                error
            );
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            notify.error("index.clear.failed", [errorMessage]);
        }
    }

    private async startIndexing(
        startIndex: number,
        webview: vscode.Webview,
        clearIndex: boolean = false
    ): Promise<void> {
        console.log(
            `[IndexingMessageHandler] startIndexing called with startIndex: ${startIndex}, clearIndex: ${clearIndex}`
        );
        // 检查 EmbeddingService 是否存在
        if (!this._embeddingService) {
            const errorMessage = "EmbeddingService 未初始化，无法执行索引操作。";
            console.error(`[IndexingMessageHandler] ${errorMessage}`);
            webview.postMessage({
                command: "indexingFailed",
                data: { message: errorMessage },
            });
            return;
        }

        if (clearIndex) {
            try {
                console.log(
                    "[IndexingMessageHandler] Clearing index before starting new indexing."
                );
                await this._embeddingService.clearIndex(); // Assuming this method exists.
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                console.error(
                    `[IndexingMessageHandler] Error during clearing index:`,
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
            console.log("[IndexingMessageHandler] Starting file scan...");
            await this._embeddingService.scanProjectFiles(startIndex, webview);
            const isIndexed = await this._embeddingService.isIndexed();
            console.log(
                `[IndexingMessageHandler] Indexing finished. isIndexed: ${isIndexed}`
            );
            webview.postMessage({
                command: "indexingFinished",
                data: { isIndexed },
            });
        } catch (error) {
            console.error(
                `[IndexingMessageHandler] Error during indexing:`,
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
