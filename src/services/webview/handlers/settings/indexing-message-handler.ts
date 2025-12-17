import { AIProviderFactory } from "@/ai/ai-provider-factory";
import {
  EmbeddingService,
  EmbeddingServiceError,
} from "@/core/indexing/embedding-service";
import {
  EmbeddingServiceManager,
  RepositoryInfo,
} from "@/core/indexing/embedding-service-manager";
import { IndexingSettingsManager } from "@/services/settings/indexing-settings-manager";
import { notify } from "@/utils/notification/notification-manager";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import * as vscode from "vscode";

export class IndexingMessageHandler {
  private _settingsManager: IndexingSettingsManager;

  constructor(
    private _embeddingService: EmbeddingService | null,
    private readonly _extensionContext: vscode.ExtensionContext
  ) {
    this._settingsManager =
      IndexingSettingsManager.getInstance(_extensionContext);
    this._settingsManager.initialize(); // Ensure settings are loaded/migrated
  }

  public updateEmbeddingService(service: EmbeddingService | null) {
    this._embeddingService = service;
  }

  public async handle(message: any, webview: vscode.Webview): Promise<void> {
    switch (message.command) {
      case UIRequest.IndexingStart: {
        const { clearIndex } = message.data || {};
        console.log(
          `[IndexingMessageHandler] Received startIndexing message with clearIndex: ${clearIndex}`
        );
        this.startIndexing(0, webview, !!clearIndex);
        break;
      }
      case UIRequest.IndexingClear: {
        console.log("[IndexingMessageHandler] Handling clearIndex");
        await this.handleClearIndex(webview);
        break;
      }
      case UIRequest.IndexingGetSettings: {
        console.log("[IndexingMessageHandler] Handling getSettings");
        try {
          const settings = this._settingsManager.getSettings();

          // Pass settings directly, but ensure we don't expose sensitive internal state if any (though IndexingSettings is mostly config)
          // The frontend expects a structure matching IndexingFormValues.
          // We might need to ensure 'providers' is initialized.

          const config = {
            ...settings,
            providers: settings.providers || {},
          };

          // 获取索引状态
          let isIndexed = 0;
          let indexStatusError: string | null = null;
          let stats = { totalVectors: 0, indexedFiles: [] as string[] };

          if (this._embeddingService) {
            try {
              isIndexed = await this._embeddingService.isIndexed();
              stats = await this._embeddingService.getIndexingStats();
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
                command: ExtensionResponse.IndexingStatusError,
                error: indexStatusError,
              });
            }
          }

          // 获取多仓库状态
          const manager = EmbeddingServiceManager.getInstance();
          let repositories: Array<{
            repository: RepositoryInfo;
            isIndexed: number;
            lastIndexed?: Date;
          }> = [];

          try {
            repositories = await manager.getRepositoriesStatus();
          } catch (error) {
            console.warn(
              "[IndexingMessageHandler] Failed to get repositories status:",
              error
            );
          }

          // 异步加载模型，避免阻塞
          webview.postMessage({
            command: ExtensionResponse.IndexingSettingsLoaded,
            data: {
              config: config,
              isIndexed: isIndexed,
              indexStatusError: indexStatusError,
              embeddingModels: [], // Initially send an empty array
              stats: stats,
              repositories: repositories,
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
            command: ExtensionResponse.IndexingStatusError,
            error: `获取设置失败: ${errorMessage}`,
          });
        }
        break;
      }

      case UIRequest.IndexingSaveSettings: {
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
              ...(newSettingsData.providers || {}),
            },
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
          if (
            newSettingsData.qdrantUrl &&
            newSettingsData.qdrantUrl !== currentSettings.qdrantUrl
          ) {
            console.log(
              `Qdrant URL updated to "${newSettingsData.qdrantUrl}". Reinitializing EmbeddingService.`
            );
            this._embeddingService =
              (await EmbeddingServiceManager.getInstance().reinitialize()) ||
              null;
          }

          webview.postMessage({
            command: ExtensionResponse.IndexingSettingsSaved,
          });
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
            command: ExtensionResponse.IndexingSettingsError,
            error: `保存设置失败: ${errorMessage}`,
          });
        }
        break;
      }

      case UIRequest.IndexingFetchEmbeddingModels: {
        console.log("[IndexingMessageHandler] Handling fetchEmbeddingModels");
        try {
          const embeddingModels =
            await AIProviderFactory.getAllEmbeddingModels();
          webview.postMessage({
            command: ExtensionResponse.IndexingEmbeddingModelsLoaded,
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
            command: ExtensionResponse.IndexingEmbeddingModelsLoaded,
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

    const manager = EmbeddingServiceManager.getInstance();
    const settings = this._settingsManager.getSettings();
    let services: EmbeddingService[] = [];

    if (settings.enableMultiRepoIndexing) {
      const serviceMap = manager.getAllServices();
      services = Array.from(serviceMap.values());
      // 如果列表为空且启用了多仓库，可能是尚未初始化，尝试初始化一次
      if (services.length === 0) {
        await manager.initialize();
        services = Array.from(manager.getAllServices().values());
      }
    } else if (this._embeddingService) {
      services = [this._embeddingService];
    }

    if (services.length === 0) {
      const errorMessage = "EmbeddingService is not initialized.";
      console.error(`[IndexingMessageHandler] ${errorMessage}`);
      notify.error("embedding.service.not.initialized");
      return;
    }

    try {
      console.log("[IndexingMessageHandler] Clearing index...");
      for (const service of services) {
        await service.clearIndex();
      }
      console.log("[IndexingMessageHandler] Index cleared successfully.");
      notify.info("index.clear.success");
      webview.postMessage({
        command: ExtensionResponse.IndexingCleared,
        data: { isIndexed: 0 },
      });
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

    const manager = EmbeddingServiceManager.getInstance();
    const settings = this._settingsManager.getSettings();
    let services: EmbeddingService[] = [];

    if (settings.enableMultiRepoIndexing) {
      console.log("[IndexingMessageHandler] Multi-repo indexing enabled.");
      let serviceMap = manager.getAllServices();
      if (serviceMap.size === 0) {
        console.log(
          "[IndexingMessageHandler] No services found, attempting to initialize..."
        );
        await manager.initialize();
        serviceMap = manager.getAllServices();
      }
      services = Array.from(serviceMap.values());
      console.log(
        `[IndexingMessageHandler] Found ${services.length} repositories to index.`
      );
    } else if (this._embeddingService) {
      services = [this._embeddingService];
    }

    // 检查服务是否存在
    if (services.length === 0) {
      const errorMessage =
        "EmbeddingService 未初始化或未检测到仓库，无法执行索引操作。";
      console.error(`[IndexingMessageHandler] ${errorMessage}`);
      webview.postMessage({
        command: ExtensionResponse.IndexingFailed,
        data: { message: errorMessage },
      });
      return;
    }

    if (clearIndex) {
      try {
        console.log(
          "[IndexingMessageHandler] Clearing index before starting new indexing."
        );
        for (const service of services) {
          await service.clearIndex();
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[IndexingMessageHandler] Error during clearing index:`,
          error
        );
        webview.postMessage({
          command: ExtensionResponse.IndexingFailed,
          data: {
            message: `清除旧索引失败: ${errorMessage}`,
            source: "clearIndex",
          },
        });
        return;
      }
    }

    // 串行执行索引
    let failureCount = 0;
    let lastError: any = null;

    for (const service of services) {
      try {
        console.log(
          `[IndexingMessageHandler] Starting file scan for ${service.projectName}...`
        );
        // 发送进度消息通知 UI 正在处理哪个仓库
        webview.postMessage({
          command: ExtensionResponse.IndexingProgress,
          data: {
            message: `Starting indexing for ${service.projectName}...`,
            current: 0,
            total: 0,
          },
        });

        await service.scanProjectFiles(0, webview);
        console.log(
          `[IndexingMessageHandler] Finished indexing ${service.projectName}`
        );
      } catch (error) {
        console.error(
          `[IndexingMessageHandler] Error during indexing ${service.projectName}:`,
          error
        );
        failureCount++;
        lastError = error;

        // 如果是 EmbeddingServiceError，尝试发送详细错误
        if (error instanceof EmbeddingServiceError) {
          webview.postMessage({
            command: ExtensionResponse.IndexingFailed,
            data: {
              message: `索引 ${service.projectName} 失败: ${error.message}`,
              source: error.context.source,
              type: error.context.type,
              context: error.context,
            },
          });
        }
      }
    }

    // 汇总结果
    if (failureCount > 0 && failureCount === services.length) {
      // 全部失败
      const errorMessage =
        lastError instanceof Error ? lastError.message : String(lastError);
      webview.postMessage({
        command: ExtensionResponse.IndexingFailed,
        data: {
          message: `索引完全失败: ${errorMessage}`,
          source: "unknown",
        },
      });
    } else {
      // 至少部分成功，获取新的总统计
      try {
        const reposStatus = await manager.getRepositoriesStatus();
        const totalIndexed = reposStatus.reduce(
          (sum, item) => sum + item.isIndexed,
          0
        );

        webview.postMessage({
          command: ExtensionResponse.IndexingFinished,
          data: {
            isIndexed: totalIndexed,
            warning:
              failureCount > 0
                ? `索引完成，但有 ${failureCount} 个仓库失败。`
                : undefined,
          },
        });
      } catch (e) {
        console.warn("Failed to get final stats", e);
        webview.postMessage({
          command: ExtensionResponse.IndexingFinished,
          data: { isIndexed: 0 }, // Should ideally not happen
        });
      }
    }
  }
}
