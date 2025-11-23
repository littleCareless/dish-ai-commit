import * as vscode from "vscode";
import { PreferencesSettingsManager } from "../../../settings/preferences-settings-manager";

export class PreferencesMessageHandler {
    private _settingsManager: PreferencesSettingsManager;

    constructor(context: vscode.ExtensionContext) {
        this._settingsManager = PreferencesSettingsManager.getInstance(context);
        this._settingsManager.initialize();
    }

    public async handle(message: any, webview: vscode.Webview): Promise<void> {
        switch (message.command) {
            case "loadPreferencesSettings":
                const settings = this._settingsManager.getSettings();
                await webview.postMessage({
                    command: "updatePreferencesSettings",
                    settings,
                });
                break;

            case "savePreferencesSettings":
                if (message.data) {
                    await this._settingsManager.updateSettings(message.data);
                    // Send back updated settings to confirm save
                    await webview.postMessage({
                        command: "updatePreferencesSettings",
                        settings: this._settingsManager.getSettings(),
                    });
                }
                break;
        }
    }
}
