import { DISH_CONFIG_PREFIX } from "@/config/constants";
import {
  DEFAULT_USER_PREFERENCES,
  UserPreferences,
} from "@/types/settings";
import * as vscode from "vscode";

const clonePreferences = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value));

export class PreferencesSettingsManager {
  private static instance: PreferencesSettingsManager;
  private static readonly STORAGE_KEY = `${DISH_CONFIG_PREFIX}_preferences_settings`;

  private _settings: UserPreferences = clonePreferences(
    DEFAULT_USER_PREFERENCES,
  );

  private constructor(private context: vscode.ExtensionContext) {}

  public static getInstance(
    context?: vscode.ExtensionContext
  ): PreferencesSettingsManager {
    if (!PreferencesSettingsManager.instance) {
      if (!context) {
        throw new Error(
          "PreferencesSettingsManager not initialized and no context provided"
        );
      }
      PreferencesSettingsManager.instance = new PreferencesSettingsManager(
        context
      );
    }
    return PreferencesSettingsManager.instance;
  }

  public async initialize(): Promise<void> {
    await this.loadSettings();
  }

  public getSettings(): UserPreferences {
    return clonePreferences(this._settings);
  }

  public async updateSettings(
    partialSettings: Partial<UserPreferences>
  ): Promise<void> {
    this._settings = { ...this._settings, ...partialSettings };
    await this.saveSettings();
  }

  private async loadSettings(): Promise<void> {
    const storedSettings = this.context.globalState.get<UserPreferences>(
      PreferencesSettingsManager.STORAGE_KEY
    );

    if (storedSettings) {
      this._settings = {
        ...clonePreferences(DEFAULT_USER_PREFERENCES),
        ...storedSettings,
        skipDiffFileExtensions:
          storedSettings.skipDiffFileExtensions ??
          DEFAULT_USER_PREFERENCES.skipDiffFileExtensions,
        skipDiffPathPatterns:
          storedSettings.skipDiffPathPatterns ??
          DEFAULT_USER_PREFERENCES.skipDiffPathPatterns,
        maxDiffFileSizeKB:
          storedSettings.maxDiffFileSizeKB ??
          DEFAULT_USER_PREFERENCES.maxDiffFileSizeKB,
        autoDetectBinaryFiles:
          storedSettings.autoDetectBinaryFiles ??
          DEFAULT_USER_PREFERENCES.autoDetectBinaryFiles,
        respectGitAttributes:
          storedSettings.respectGitAttributes ??
          DEFAULT_USER_PREFERENCES.respectGitAttributes,
      };
    } else {
      this._settings = clonePreferences(DEFAULT_USER_PREFERENCES);
    }
  }

  private async saveSettings(): Promise<void> {
    await this.context.globalState.update(
      PreferencesSettingsManager.STORAGE_KEY,
      this._settings
    );
  }
}
