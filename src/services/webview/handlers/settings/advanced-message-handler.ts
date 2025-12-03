import * as vscode from "vscode";
import { UIRequest, ExtensionResponse } from "@/types/messages";
import { AdvancedSettingsManager } from "@/services/settings/advanced-settings-manager";

export class AdvancedMessageHandler {
    private _settingsManager: AdvancedSettingsManager;

    constructor(context: vscode.ExtensionContext) {
        this._settingsManager = AdvancedSettingsManager.getInstance(context);
        this._settingsManager.initialize();
    }

    public async handle(message: any, webview: vscode.Webview): Promise<void> {
        switch (message.command) {
            case UIRequest.AdvancedLoadSettings:
                const settings = this._settingsManager.getSettings();
                await webview.postMessage({
                    command: ExtensionResponse.AdvancedSettingsUpdated,
                    settings,
                });
                break;

            case UIRequest.AdvancedSaveSettings:
                if (message.data) {
                    await this._settingsManager.updateSettings(message.data);
                    // Send back updated settings to confirm save
                    await webview.postMessage({
                        command: ExtensionResponse.AdvancedSettingsUpdated,
                        settings: this._settingsManager.getSettings(),
                    });
                }
                break;
        }
    }
}
