import { PromptManagerService } from "@/services/core/prompt-manager-service";
import { notify } from "@/utils/notification/notification-manager";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import * as vscode from "vscode";

export class PromptMessageHandler {
  private _promptManager: PromptManagerService;

  constructor() {
    this._promptManager = PromptManagerService.getInstance();
  }

  /**
   * Extracts payload from message, supporting multiple formats
   * Handles: message.data, message.payload, or direct message
   */
  private extractPayload(message: any): any {
    return message.data || message.payload || message;
  }

  /**
   * Always returns Global configuration target
   * All prompts are stored globally, not per workspace
   */
  private resolveTarget(payload: any): vscode.ConfigurationTarget {
    return vscode.ConfigurationTarget.Global;
  }

  public async handle(message: any, webview: vscode.Webview): Promise<void> {
    switch (message.command) {
      case UIRequest.PromptGetAll: {
        console.log("[PromptMessageHandler] Handling GetAllPrompts");
        try {
          const prompts = await this._promptManager.getAllPrompts();
          console.log("prompts", prompts);
          webview.postMessage({
            command: ExtensionResponse.PromptAllLoaded,
            payload: prompts,
          });
        } catch (error) {
          console.error(
            "[PromptMessageHandler] Error in GetAllPrompts:",
            error
          );
        }
        break;
      }

      case UIRequest.PromptUpdate: {
        console.log("[PromptMessageHandler] Handling UpdatePrompt");
        const payload = this.extractPayload(message);
        const { key, content } = payload;
        const target = this.resolveTarget(payload);
        try {
          await this._promptManager.updatePrompt(key, content, target);
          notify.info(`Prompt ${key} updated.`);
        } catch (error) {
          console.error(
            `[PromptMessageHandler] Error in UpdatePrompt for key ${key}:`,
            error
          );
          notify.error(`Failed to update prompt ${key}.`);
        }
        break;
      }

      case UIRequest.PromptReset: {
        console.log("[PromptMessageHandler] Handling ResetPrompt");
        const payload = this.extractPayload(message);
        const { key } = payload;
        const target = this.resolveTarget(payload);
        try {
          await this._promptManager.resetPrompt(key, target);
          notify.info(`Prompt ${key} has been reset.`);
        } catch (error) {
          console.error(
            `[PromptMessageHandler] Error in ResetPrompt for key ${key}:`,
            error
          );
          notify.error(`Failed to reset prompt ${key}.`);
        }
        break;
      }

      case UIRequest.PromptResetAll: {
        console.log("[PromptMessageHandler] Handling ResetAllPrompts");
        const payload = this.extractPayload(message);
        const target = this.resolveTarget(payload);
        try {
          await this._promptManager.resetAllPrompts(target);
          notify.info("All prompts have been reset.");
        } catch (error) {
          console.error(
            `[PromptMessageHandler] Error in ResetAllPrompts:`,
            error
          );
          notify.error("Failed to reset all prompts.");
        }
        break;
      }

      case UIRequest.PromptCreate: {
        console.log("[PromptMessageHandler] Handling CreatePrompt");
        const payload = this.extractPayload(message);
        const { key, content, category } = payload;
        const target = this.resolveTarget(payload);
        try {
          await this._promptManager.updatePrompt(key, content, target);

          // 保存分类信息到元数据
          if (category) {
            await this._promptManager.updatePromptMetadata(key, category);
          }

          notify.info(`Prompt ${key} created.`);
          // Refresh the prompts in the webview
          const prompts = await this._promptManager.getAllPrompts();
          webview.postMessage({
            command: ExtensionResponse.PromptAllLoaded,
            payload: prompts,
          });
        } catch (error) {
          console.error(
            `[PromptMessageHandler] Error in CreatePrompt for key ${key}:`,
            error
          );
          notify.error(`Failed to create prompt ${key}.`);
        }
        break;
      }

      case UIRequest.PromptDelete: {
        console.log("[PromptMessageHandler] Handling DeletePrompt");
        const payload = this.extractPayload(message);
        const { key } = payload;
        const target = this.resolveTarget(payload);
        try {
          await this._promptManager.deletePrompt(key, target);
          // 同时删除元数据
          await this._promptManager.deletePromptMetadata(key);
          notify.info(`Prompt ${key} has been deleted.`);
          // Refresh the prompts in the webview
          const prompts = await this._promptManager.getAllPrompts();
          webview.postMessage({
            command: ExtensionResponse.PromptAllLoaded,
            payload: prompts,
          });
        } catch (error) {
          console.error(
            `[PromptMessageHandler] Error in DeletePrompt for key ${key}:`,
            error
          );
          notify.error(`Failed to delete prompt ${key}.`);
        }
        break;
      }

      case UIRequest.PromptRename: {
        console.log("[PromptMessageHandler] Handling RenamePrompt");
        const payload = this.extractPayload(message);
        const { oldKey, newKey } = payload;
        const target = this.resolveTarget(payload);
        try {
          const promptDetail = this._promptManager.getPromptDetail(oldKey);
          await this._promptManager.updatePrompt(
            newKey,
            promptDetail.content,
            target
          );
          await this._promptManager.deletePrompt(oldKey, target);

          // 同时迁移元数据（如果存在）
          if (promptDetail.category) {
            await this._promptManager.updatePromptMetadata(newKey, promptDetail.category);
            await this._promptManager.deletePromptMetadata(oldKey);
          }

          notify.info(`Prompt ${oldKey} has been renamed to ${newKey}.`);
          // Refresh the prompts in the webview
          const prompts = await this._promptManager.getAllPrompts();
          webview.postMessage({
            command: ExtensionResponse.PromptAllLoaded,
            payload: prompts,
          });
        } catch (error) {
          console.error(
            `[PromptMessageHandler] Error in RenamePrompt for key ${oldKey}:`,
            error
          );
          notify.error(`Failed to rename prompt ${oldKey}.`);
        }
        break;
      }
    }
  }
}
