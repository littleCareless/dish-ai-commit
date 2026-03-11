import { DISH_CONFIG_PREFIX } from "@/config/constants";
import { FeaturesSettingsManager } from "@/services/settings/features-settings-manager";
import { ActivePromptStore } from "@/services/settings/active-prompt-store";
import { workspaceManager } from "@/services/core/workspace-manager";
import { COMMANDS } from "@/constants";
import { ThirdPartyModelCatalogSyncService } from "@/ai/model-registry/third-party-model-catalog-sync-service";
import { ModelCustomStorage } from "@/services/storage/model-custom-storage";
import {
  PromptCategory,
  PromptKey,
  PROMPT_CATEGORIES,
  StorageLevel,
} from "@shared/types/prompts";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import * as vscode from "vscode";

export class FeaturesMessageHandler {
  private _settingsManager: FeaturesSettingsManager;
  private activePromptStore: ActivePromptStore;
  private context: vscode.ExtensionContext;
  private static readonly ACTIVE_PROMPT_KEY = `${DISH_CONFIG_PREFIX}_active_prompt_key`;
  private readonly featureCommandMap: Record<string, string> = {
    generateCommit: COMMANDS.COMMIT.GENERATE,
    reviewCode: COMMANDS.CODE_REVIEW.REVIEW,
    generateBranchName: COMMANDS.BRANCH_NAME.GENERATE,
    generatePRSummary: COMMANDS.PR_SUMMARY.GENERATE,
    generateWeeklyReport: COMMANDS.WEEKLY_REPORT.GENERATE,
    syncModelCatalog: COMMANDS.MODEL_CATALOG.SYNC,
  };
  private static readonly QUICK_ACTION_STATS_KEY = `${DISH_CONFIG_PREFIX}_quick_action_stats`;
  private readonly catalogSyncService = ThirdPartyModelCatalogSyncService.getInstance();
  private readonly modelCustomStorage: ModelCustomStorage;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this._settingsManager = FeaturesSettingsManager.getInstance(context);
    void this._settingsManager.initialize();
    this.activePromptStore = ActivePromptStore.getInstance(context);
    void this.activePromptStore.initialize();
    this.modelCustomStorage = ModelCustomStorage.getInstance(context);
  }

  public async handle(message: any, webview: vscode.Webview): Promise<void> {
    switch (message.command) {
      case UIRequest.FeaturesLoadSettings:
        const settings = this._settingsManager.getSettings();
        await webview.postMessage({
          command: ExtensionResponse.FeaturesSettingsLoaded,
          data: {
            ...settings,
          },
        });
        break;

      case UIRequest.FeaturesSaveSettings:
        if (message.data) {
          await this._settingsManager.updateSettings(message.data);
          const settings = this._settingsManager.getSettings();
          await webview.postMessage({
            command: ExtensionResponse.FeaturesSettingsLoaded,
            data: {
              ...settings,
            },
          });
        }
        break;

      case UIRequest.FeaturesSetActivePrompt:
        console.log(
          "[FeaturesMessageHandler] FeaturesSetActivePrompt received:",
          message,
        );
        // 支持两种消息格式：{key, category, storageLevel, workspaceId} 或 {data: {key, category, storageLevel, workspaceId}}
        const key = message.key || message.data?.key;
        const category =
          message.category ||
          message.data?.category ||
          this.determineCategoryFromKey(key) ||
          PromptCategory.Commit;
        const storageLevel: StorageLevel =
          message.storageLevel || message.data?.storageLevel || "global";
        const workspaceId: string | undefined =
          message.workspaceId || message.data?.workspaceId;

        console.log("[FeaturesMessageHandler] Parsed data:", {
          key,
          category,
          storageLevel,
          workspaceId,
        });

        if (key) {
          console.log("[FeaturesMessageHandler] Processing:", {
            category,
            storageLevel,
            workspaceId,
            key,
          });

          try {
            await this.activePromptStore.setActivePrompt(
              category,
              key,
              storageLevel,
              workspaceId,
            );

            console.log("[FeaturesMessageHandler] setActivePrompt completed");

            // 向后兼容：更新 legacy key（仅全局级别）
            if (storageLevel === "global") {
              await this.context.globalState.update(
                FeaturesMessageHandler.ACTIVE_PROMPT_KEY,
                key,
              );
            }

            const activePrompts = await this.activePromptStore.getActivePrompts();
            const activePromptsBySubCategory =
              await this.activePromptStore.getActivePromptsBySubCategory();
            const activeSource = await this.activePromptStore.getPromptSource(
              key,
              workspaceId,
            );

            console.log("[FeaturesMessageHandler] Sending response:", {
              activePrompts,
              activePromptsBySubCategory,
              activePromptsKeys: activePrompts
                ? Object.keys(activePrompts)
                : "undefined",
              activeSource,
            });

            await webview.postMessage({
              command: ExtensionResponse.FeaturesActivePromptChanged,
              data: {
                activePrompts,
                activePromptsBySubCategory,
                currentActiveSource: activeSource,
              },
            });
            console.log("[FeaturesMessageHandler] Response sent");
          } catch (error) {
            console.error("Failed to set active prompt:", error);
            await webview.postMessage({
              command: ExtensionResponse.Error,
              data: {
                message: error instanceof Error ? error.message : String(error),
              },
            });
          }
        }
        break;

      // 新增：获取工作区信息
      case UIRequest.FeaturesGetWorkspaceInfo:
        const allWorkspaces = workspaceManager.getAllWorkspaces();
        const currentWorkspace = workspaceManager.getCurrentWorkspace();

        await webview.postMessage({
          command: ExtensionResponse.FeaturesWorkspaceInfo,
          data: {
            allWorkspaces,
            currentWorkspace,
          },
        });
        break;

      // 新增：获取所有工作区的活跃状态
      case UIRequest.FeaturesGetAllWorkspaceStates:
        const allStates =
          await this.activePromptStore.getAllWorkspaceActiveStates();

        await webview.postMessage({
          command: ExtensionResponse.FeaturesAllWorkspaceStates,
          data: allStates,
        });
        break;

      case UIRequest.FeaturesSyncModelCatalog:
        try {
          await vscode.commands.executeCommand(COMMANDS.MODEL_CATALOG.SYNC);
          const summary = this.catalogSyncService.getSummary();
          await webview.postMessage({
            command: ExtensionResponse.FeaturesModelCatalogSynced,
            data: { success: true, ...summary },
          });
        } catch (error) {
          await webview.postMessage({
            command: ExtensionResponse.FeaturesModelCatalogSynced,
            data: {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            },
          });
        }
        break;

      case UIRequest.FeaturesGetModelCatalog:
        try {
          const summary = this.catalogSyncService.getSummary();
          const entries = this.catalogSyncService.getAllEntries();
          const customRegistry = await this.modelCustomStorage.getAllModelInfo();
          const customEntries = Object.values(customRegistry.models)
            .map((model) => {
              const contextWindow = Number(model.contextWindow);
              const maxInput = Number(model.maxTokens?.input);
              const maxOutput = Number(model.maxTokens?.output);
              const inputLimit =
                Number.isFinite(contextWindow) && contextWindow > 0
                  ? Math.floor(contextWindow)
                  : Number.isFinite(maxInput) && maxInput > 0
                    ? Math.floor(maxInput)
                    : NaN;
              const outputLimit =
                Number.isFinite(maxOutput) && maxOutput > 0
                  ? Math.floor(maxOutput)
                  : undefined;

              return {
                providerId: model.providerId,
                modelId: model.id,
                inputLimit,
                outputLimit,
                source: "custom",
                confidence: "high",
                updatedAt: model.lastUpdated || customRegistry.lastSync,
              };
            })
            .filter((entry) => Number.isFinite(entry.inputLimit) && entry.inputLimit > 0);
          const mergedByKey = new Map<string, any>();
          for (const entry of entries) {
            mergedByKey.set(`${entry.providerId}:${entry.modelId}`, entry);
          }
          for (const entry of customEntries) {
            mergedByKey.set(`${entry.providerId}:${entry.modelId}`, entry);
          }

          await webview.postMessage({
            command: ExtensionResponse.FeaturesModelCatalogLoaded,
            data: {
              totalEntries: mergedByKey.size,
              lastSyncAt: summary.lastSyncAt || customRegistry.lastSync,
              entries: Array.from(mergedByKey.values()),
            },
          });
        } catch (error) {
          await webview.postMessage({
            command: ExtensionResponse.FeaturesModelCatalogLoaded,
            data: {
              totalEntries: 0,
              entries: [],
              error: error instanceof Error ? error.message : String(error),
            },
          });
        }
        break;

      case UIRequest.FeaturesExecuteCommand:
        try {
          const action = String(message.data?.action ?? "");
          const source = String(message.data?.source ?? "unknown");
          const commandId = this.featureCommandMap[action];
          if (!commandId) {
            throw new Error(`Unsupported action: ${action}`);
          }

          await this.recordQuickActionUsage(action, source);
          await vscode.commands.executeCommand(commandId);
          await webview.postMessage({
            command: ExtensionResponse.FeaturesCommandExecuted,
            data: { action, source, success: true },
          });
        } catch (error) {
          await webview.postMessage({
            command: ExtensionResponse.FeaturesCommandExecuted,
            data: {
              action: String(message.data?.action ?? ""),
              source: String(message.data?.source ?? "unknown"),
              success: false,
              error: error instanceof Error ? error.message : String(error),
            },
          });
        }
        break;
    }
  }

  private determineCategoryFromKey(key: string): PromptCategory | null {
    // First try to use the PROMPT_CATEGORIES mapping
    const promptKey = key as PromptKey;
    if (PROMPT_CATEGORIES[promptKey]) {
      return PROMPT_CATEGORIES[promptKey];
    }

    // Fallback to heuristic for custom prompts or unknown keys
    if (key.includes("commit") || key.includes("layered")) {
      return PromptCategory.Commit;
    }
    if (key.includes("review")) {
      return PromptCategory.CodeReview;
    }
    if (key.includes("pr") || key.includes("summary")) {
      return PromptCategory.PR;
    }
    if (key.includes("report")) {
      return PromptCategory.Report;
    }
    if (key.includes("branch")) {
      return PromptCategory.Git;
    }

    return null;
  }

  private async recordQuickActionUsage(
    action: string,
    source: string,
  ): Promise<void> {
    type QuickActionStats = {
      total: number;
      byAction: Record<string, number>;
      bySource: Record<string, number>;
      lastAction?: string;
      lastSource?: string;
      lastExecutedAt?: string;
    };

    const current = this.context.globalState.get<QuickActionStats>(
      FeaturesMessageHandler.QUICK_ACTION_STATS_KEY,
      {
        total: 0,
        byAction: {},
        bySource: {},
      },
    );

    const next: QuickActionStats = {
      total: (current?.total ?? 0) + 1,
      byAction: {
        ...(current?.byAction ?? {}),
        [action]: (current?.byAction?.[action] ?? 0) + 1,
      },
      bySource: {
        ...(current?.bySource ?? {}),
        [source]: (current?.bySource?.[source] ?? 0) + 1,
      },
      lastAction: action,
      lastSource: source,
      lastExecutedAt: new Date().toISOString(),
    };

    await this.context.globalState.update(
      FeaturesMessageHandler.QUICK_ACTION_STATS_KEY,
      next,
    );
  }
}
