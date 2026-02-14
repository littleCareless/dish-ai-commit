import {
  LanguageSettings,
  LanguageSettingsManager,
} from "@/services/settings/language-settings-manager";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import * as vscode from "vscode";

export class LanguageMessageHandler {
  constructor(private extensionContext: vscode.ExtensionContext) {}

  async handle(message: any, webview: vscode.Webview): Promise<void> {
    switch (message.command) {
      case UIRequest.LanguageLoadSettings:
        await this.handleLoadLanguageSettings(webview);
        break;
      case UIRequest.LanguageSaveSettings:
        await this.handleSaveLanguageSettings(message.data, webview);
        break;
    }
  }

  private async handleLoadLanguageSettings(
    webview: vscode.Webview
  ): Promise<void> {
    try {
      const language = LanguageSettingsManager.getLanguage();
      const scope = LanguageSettingsManager.getLanguageScope();

      await webview.postMessage({
        command: ExtensionResponse.LanguageSettingsUpdated,
        data: {
          language,
          scope, // 告诉前端当前设置的作用域
        },
      });
    } catch (error) {
      console.error("Failed to load language settings:", error);
      await webview.postMessage({
        command: ExtensionResponse.LanguageSettingsUpdated,
        data: {
          language: "Simplified Chinese",
          scope: "default",
        },
      });
    }
  }

  private async handleSaveLanguageSettings(
    data: LanguageSettings & { target?: "user" | "workspace" },
    webview: vscode.Webview
  ): Promise<void> {
    try {
      await LanguageSettingsManager.updateLanguage(data.language);

      // 保存成功后重新加载并通知前端
      await this.handleLoadLanguageSettings(webview);
    } catch (error) {
      console.error("Failed to save language settings:", error);
      await webview.postMessage({
        command: ExtensionResponse.LanguageSettingsSaveError,
        data: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }
}
