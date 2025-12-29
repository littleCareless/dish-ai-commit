import { PreferencesSettingsManager } from "@/services/settings/preferences-settings-manager"
import { ExtensionResponse, UIRequest } from "@shared/types/messages"
import * as vscode from "vscode"

export class PreferencesMessageHandler {
  private _settingsManager: PreferencesSettingsManager;

  constructor(context: vscode.ExtensionContext) {
    this._settingsManager = PreferencesSettingsManager.getInstance(context);
    this._settingsManager.initialize();
  }

  public async handle(message: any, webview: vscode.Webview): Promise<void> {
    console.log("[PreferencesMessageHandler] Received message:", message);
    switch (message.command) {
      case UIRequest.PreferencesLoadSettings:
        console.log("[PreferencesMessageHandler] Loading preferences");
        const settings = this._settingsManager.getSettings();
        console.log("[PreferencesMessageHandler] Loaded settings:", settings);
        await webview.postMessage({
          command: ExtensionResponse.PreferencesSettingsUpdated,
          settings,
        });
        console.log("[PreferencesMessageHandler] Sent settings to webview");
        break;

      case UIRequest.PreferencesSaveSettings:
        console.log("[PreferencesMessageHandler] Saving preferences, data:", message.data);
        if (message.data) {
          await this._settingsManager.updateSettings(message.data);
          console.log("[PreferencesMessageHandler] Settings updated in manager");
          // Send back updated settings to confirm save
          const updatedSettings = this._settingsManager.getSettings();
          console.log("[PreferencesMessageHandler] Sending updated settings:", updatedSettings);
          await webview.postMessage({
            command: ExtensionResponse.PreferencesSettingsUpdated,
            settings: updatedSettings,
          });
          console.log("[PreferencesMessageHandler] Sent updated settings to webview");
        } else {
          console.log("[PreferencesMessageHandler] No data provided for save");
        }
        break;
      default:
        console.log("[PreferencesMessageHandler] Unknown command:", message.command);
        break;
    }
  }
}
