import { DISH_CONFIG_PREFIX } from "@/config/constants";
import { FeaturesSettingsManager } from "@/services/settings/features-settings-manager";
import { UIRequest, ExtensionResponse } from "@shared/types/messages";
import * as vscode from "vscode";

export class FeaturesMessageHandler {
    private _settingsManager: FeaturesSettingsManager;
    private context: vscode.ExtensionContext;
    private static readonly ACTIVE_PROMPT_KEY = `${DISH_CONFIG_PREFIX}_active_prompt_key`;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this._settingsManager = FeaturesSettingsManager.getInstance(context);
        this._settingsManager.initialize();
    }

    public async handle(message: any, webview: vscode.Webview): Promise<void> {
        switch (message.command) {
            case UIRequest.FeaturesLoadSettings:
                const settings = this._settingsManager.getSettings();
                await webview.postMessage({
                    command: ExtensionResponse.FeaturesSettingsLoaded,
                    settings,
                });
                break;

            case UIRequest.FeaturesSaveSettings:
                if (message.data) {
                    await this._settingsManager.updateSettings(message.data);
                    // Send back updated settings to confirm save
                    await webview.postMessage({
                        command: ExtensionResponse.FeaturesSettingsLoaded,
                        settings: this._settingsManager.getSettings(),
                    });
                }
                break;

            case UIRequest.FeaturesSetActivePrompt:
                if (message.key) {
                    // Store active prompt key in globalState (migrated from vscode config)
                    await this.context.globalState.update(
                        FeaturesMessageHandler.ACTIVE_PROMPT_KEY,
                        message.key
                    );

                    // Refresh settings to UI
                    const settings = this._settingsManager.getSettings();
                    await webview.postMessage({
                        command: ExtensionResponse.FeaturesSettingsLoaded,
                        settings,
                    });
                }
                break;
        }
    }
}
