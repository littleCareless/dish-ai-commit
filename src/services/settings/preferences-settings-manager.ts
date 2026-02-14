import { PreferencesStorage } from "@/services/storage/preferences-storage";
import { DISH_CONFIG_PREFIX } from "@/config/constants";
import {
  DEFAULT_USER_PREFERENCES,
  UserPreferences,
} from "@/types/settings";
import * as vscode from "vscode";

const clonePreferences = <T extends object>(value: T): T =>
  JSON.parse(JSON.stringify(value));

export class PreferencesSettingsManager {
  private static instance: PreferencesSettingsManager;
  private readonly preferencesStorage: PreferencesStorage;
  private _settings: UserPreferences = clonePreferences(DEFAULT_USER_PREFERENCES);

  private constructor(private context: vscode.ExtensionContext) {
    this.preferencesStorage = PreferencesStorage.getInstance(context);
  }

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
    const legacyKey = `${DISH_CONFIG_PREFIX}_preferences_settings`;
    const legacySettings = this.context.globalState.get<UserPreferences>(
      legacyKey
    );

    if (legacySettings) {
      const merged = {
        ...clonePreferences(DEFAULT_USER_PREFERENCES),
        ...legacySettings,
        skipDiffFileExtensions:
          legacySettings.skipDiffFileExtensions ??
          DEFAULT_USER_PREFERENCES.skipDiffFileExtensions,
        skipDiffPathPatterns:
          legacySettings.skipDiffPathPatterns ??
          DEFAULT_USER_PREFERENCES.skipDiffPathPatterns,
        maxDiffFileSizeKB:
          legacySettings.maxDiffFileSizeKB ??
          DEFAULT_USER_PREFERENCES.maxDiffFileSizeKB,
        autoDetectBinaryFiles:
          legacySettings.autoDetectBinaryFiles ??
          DEFAULT_USER_PREFERENCES.autoDetectBinaryFiles,
        respectGitAttributes:
          legacySettings.respectGitAttributes ??
          DEFAULT_USER_PREFERENCES.respectGitAttributes,
      };

      await this.preferencesStorage.save(merged);
      await this.context.globalState.update(legacyKey, undefined);
      this._settings = clonePreferences(merged);
      return;
    }

    const storedSettings = await this.preferencesStorage.load();
    this._settings = clonePreferences(storedSettings);
  }

  private async saveSettings(): Promise<void> {
    await this.preferencesStorage.save(this._settings);
  }
}
