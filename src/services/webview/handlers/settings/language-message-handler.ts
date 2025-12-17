import { ProfileManagerService } from "@/services/profile-manager/profile-manager-service";
import { LanguageSettingsManager } from "@/services/settings/language-settings-manager";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import * as vscode from "vscode";

export class LanguageMessageHandler {
  private profileManager?: ProfileManagerService;

  constructor(private extensionContext: vscode.ExtensionContext) {}

  private async getProfileManager(): Promise<ProfileManagerService> {
    if (!this.profileManager) {
      this.profileManager = await ProfileManagerService.create(
        this.extensionContext
      );
    }
    return this.profileManager;
  }

  async handle(message: any, webview: vscode.Webview): Promise<void> {
    const profileManager = await this.getProfileManager();
    switch (message.command) {
      case UIRequest.LanguageLoadSettings:
        await this.handleLoadLanguageSettings(profileManager, webview);
        break;
      case UIRequest.LanguageSaveSettings:
        await this.handleSaveLanguageSettings(
          profileManager,
          message.data,
          webview
        );
        break;
    }
  }

  private async handleLoadLanguageSettings(
    profileManager: ProfileManagerService,
    webview: vscode.Webview
  ): Promise<void> {
    try {
      const profile = profileManager.getProfileForMode();
      const language = LanguageSettingsManager.getLanguage(profile);
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
    profileManager: ProfileManagerService,
    data: { language: string; target?: "user" | "workspace" },
    webview: vscode.Webview
  ): Promise<void> {
    try {
      const profile = profileManager.getProfileForMode();
      await LanguageSettingsManager.updateLanguage(
        profileManager,
        profile,
        data.language
      );

      // 保存成功后重新加载并通知前端
      await this.handleLoadLanguageSettings(profileManager, webview);
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
