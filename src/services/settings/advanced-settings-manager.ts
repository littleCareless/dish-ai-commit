import { DISH_CONFIG_PREFIX } from "@/config/constants";
import * as vscode from "vscode";

export interface AdvancedSettings {
  verbosity: number;
  rateLimitSeconds: number;
  timeout: number;
  retryAttempts: number;
}

export class AdvancedSettingsManager {
  private static instance: AdvancedSettingsManager;
  private static readonly STORAGE_KEY = `${DISH_CONFIG_PREFIX}_advanced_settings`;

  private _settings: AdvancedSettings = {
    verbosity: 1,
    rateLimitSeconds: 0,
    timeout: 30000,
    retryAttempts: 3,
  };

  private constructor(private context: vscode.ExtensionContext) {}

  public static getInstance(
    context: vscode.ExtensionContext
  ): AdvancedSettingsManager {
    if (!AdvancedSettingsManager.instance) {
      AdvancedSettingsManager.instance = new AdvancedSettingsManager(context);
    }
    return AdvancedSettingsManager.instance;
  }

  public async initialize(): Promise<void> {
    await this.loadSettings();
  }

  public getSettings(): AdvancedSettings {
    return { ...this._settings };
  }

  public async updateSettings(
    partialSettings: Partial<AdvancedSettings>
  ): Promise<void> {
    this._settings = { ...this._settings, ...partialSettings };
    await this.saveSettings();
  }

  private async loadSettings(): Promise<void> {
    const storedSettings = this.context.globalState.get<AdvancedSettings>(
      AdvancedSettingsManager.STORAGE_KEY
    );

    if (storedSettings) {
      this._settings = { ...this._settings, ...storedSettings };
    }
  }

  private async saveSettings(): Promise<void> {
    await this.context.globalState.update(
      AdvancedSettingsManager.STORAGE_KEY,
      this._settings
    );
  }
}
