import { PreferencesSettingsManager } from "@/services/settings/preferences-settings-manager";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import * as vscode from "vscode";

export class PreferencesMessageHandler {
  private _settingsManager: PreferencesSettingsManager;

  constructor(context: vscode.ExtensionContext) {
    this._settingsManager = PreferencesSettingsManager.getInstance(context);
    this._settingsManager.initialize();
  }

  public async handle(message: any, webview: vscode.Webview): Promise<void> {
    switch (message.command) {
      case UIRequest.PreferencesLoadSettings:
        const settings = this._settingsManager.getSettings();
        await webview.postMessage({
          command: ExtensionResponse.PreferencesSettingsUpdated,
          settings,
        });
        break;

      case UIRequest.PreferencesSaveSettings:
        if (message.data) {
          await this._settingsManager.updateSettings(message.data);
          // Send back updated settings to confirm save
          await webview.postMessage({
            command: ExtensionResponse.PreferencesSettingsUpdated,
            settings: this._settingsManager.getSettings(),
          });
        }
        break;
    }
  }
}
