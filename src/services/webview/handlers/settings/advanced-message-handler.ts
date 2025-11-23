import * as vscode from "vscode";
import { AdvancedSettingsManager } from "../../../settings/advanced-settings-manager";

export class AdvancedMessageHandler {
    private _settingsManager: AdvancedSettingsManager;

    constructor(context: vscode.ExtensionContext) {
        this._settingsManager = AdvancedSettingsManager.getInstance(context);
        this._settingsManager.initialize();
    }

    public async handle(message: any, webview: vscode.Webview): Promise<void> {
        switch (message.command) {
            case "loadAdvancedSettings":
                const settings = this._settingsManager.getSettings();
                await webview.postMessage({
                    command: "updateAdvancedSettings",
                    settings,
                });
                break;

            case "saveAdvancedSettings":
                if (message.data) {
                    await this._settingsManager.updateSettings(message.data);
                    // Send back updated settings to confirm save
                    await webview.postMessage({
                        command: "updateAdvancedSettings",
                        settings: this._settingsManager.getSettings(),
                    });
                }
                break;
        }
    }
}
