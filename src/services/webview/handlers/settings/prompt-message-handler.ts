import { PromptManagerService } from "@/services/core/prompt-manager-service";
import { notify } from "@/utils/notification/notification-manager";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import * as vscode from "vscode";

export class PromptMessageHandler {
  private _promptManager: PromptManagerService;

  constructor() {
    this._promptManager = PromptManagerService.getInstance();
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
        const { key, content, target } = message.payload;
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
        const { key, target } = message.payload;
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
        const { target } = message.payload;
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
        const { key, content, target } = message.payload;
        try {
          await this._promptManager.updatePrompt(key, content, target);
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
        const { key, target } = message.payload;
        try {
          await this._promptManager.deletePrompt(key, target);
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
