import { FeaturesSettingsManager } from "@/services/settings/features-settings-manager";
import * as vscode from "vscode";

export class FeaturesMessageHandler {
    private _settingsManager: FeaturesSettingsManager;

    constructor(context: vscode.ExtensionContext) {
        this._settingsManager = FeaturesSettingsManager.getInstance(context);
        this._settingsManager.initialize();
    }

    public async handle(message: any, webview: vscode.Webview): Promise<void> {
        switch (message.command) {
            case "loadFeaturesSettings":
                const settings = this._settingsManager.getSettings();
                await webview.postMessage({
                    command: "updateFeaturesSettings",
                    settings,
                });
                break;

            case "saveFeaturesSettings":
                if (message.data) {
                    await this._settingsManager.updateSettings(message.data);
                    // Send back updated settings to confirm save
                    await webview.postMessage({
                        command: "updateFeaturesSettings",
                        settings: this._settingsManager.getSettings(),
                    });
                }
                break;

            case "setActivePrompt":
                if (message.key) {
                    // Update the active prompt key in configuration
                    const config = vscode.workspace.getConfiguration("dish-ai-commit.features.commitMessage");
                    await config.update("activePromptKey", message.key, vscode.ConfigurationTarget.Workspace);

                    // Refresh settings to UI
                    const settings = this._settingsManager.getSettings();
                    await webview.postMessage({
                        command: "updateFeaturesSettings",
                        settings,
                    });
                }
                break;
        }
    }
}
