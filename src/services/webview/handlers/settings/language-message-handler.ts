import * as vscode from "vscode";
import { LanguageSettingsManager } from "@/services/settings/language-settings-manager";

export class LanguageMessageHandler {
    constructor(private extensionContext: vscode.ExtensionContext) { }

    async handle(message: any, webview: vscode.Webview): Promise<void> {
        switch (message.command) {
            case "loadLanguageSettings":
                await this.handleLoadLanguageSettings(webview);
                break;
            case "saveLanguageSettings":
                await this.handleSaveLanguageSettings(message.data, webview);
                break;
        }
    }

    private async handleLoadLanguageSettings(webview: vscode.Webview): Promise<void> {
        try {
            const language = await LanguageSettingsManager.getLanguage();
            const scope = LanguageSettingsManager.getLanguageScope();

            await webview.postMessage({
                command: "updateLanguageSettings",
                data: {
                    language,
                    scope, // 告诉前端当前设置的作用域
                },
            });
        } catch (error) {
            console.error("Failed to load language settings:", error);
            await webview.postMessage({
                command: "updateLanguageSettings",
                data: {
                    language: "Simplified Chinese",
                    scope: "default",
                },
            });
        }
    }

    private async handleSaveLanguageSettings(
        data: { language: string; target?: "user" | "workspace" },
        webview: vscode.Webview
    ): Promise<void> {
        try {
            const target =
                data.target === "workspace"
                    ? vscode.ConfigurationTarget.Workspace
                    : vscode.ConfigurationTarget.Global;

            await LanguageSettingsManager.updateLanguage(data.language, target);

            // 保存成功后重新加载并通知前端
            await this.handleLoadLanguageSettings(webview);
        } catch (error) {
            console.error("Failed to save language settings:", error);
            await webview.postMessage({
                command: "languageSettingsSaveError",
                data: {
                    error: error instanceof Error ? error.message : "Unknown error",
                },
            });
        }
    }
}
