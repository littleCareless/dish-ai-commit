import { DISH_CONFIG_PREFIX } from "@/config/constants";
import { FeaturesSettingsManager } from "@/services/settings/features-settings-manager";
import { ActivePromptStore } from "@/services/settings/active-prompt-store";
import { workspaceManager } from "@/services/core/workspace-manager";
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

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this._settingsManager = FeaturesSettingsManager.getInstance(context);
    void this._settingsManager.initialize();
    this.activePromptStore = ActivePromptStore.getInstance(context);
    void this.activePromptStore.initialize();
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
}
