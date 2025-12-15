import { DISH_CONFIG_PREFIX } from "@/config/constants";
import * as vscode from "vscode";

export interface FeaturesSettings {
  // Commit Message Generation
  enableEmoji: boolean;
  enableMergeCommit: boolean;
  enableBody: boolean;
  enableLayeredCommit: boolean;
  enableGlobalContext: boolean;
  useRecentCommitsAsReference: boolean;

  // Code Analysis
  simplifyDiff: boolean;
  autoDetectStaged: boolean;
  fallbackToAll: boolean;

  // Other Features
  weeklyReport: boolean;
  codeReview: boolean;
  generateBranchName: boolean;
  generatePRSummary: boolean;
}

export class FeaturesSettingsManager {
  private static instance: FeaturesSettingsManager;
  private static readonly STORAGE_KEY = `${DISH_CONFIG_PREFIX}_features_settings`;

  private _settings: FeaturesSettings = {
    // Commit Message Generation
    enableEmoji: true,
    enableMergeCommit: false,
    enableBody: true,
    enableLayeredCommit: false,
    enableGlobalContext: true,
    useRecentCommitsAsReference: false,

    // Code Analysis
    simplifyDiff: false,
    autoDetectStaged: true,
    fallbackToAll: true,

    // Other Features
    weeklyReport: true,
    codeReview: true,
    generateBranchName: true,
    generatePRSummary: true,
  };

  private constructor(private context: vscode.ExtensionContext) {}

  public static getInstance(
    context: vscode.ExtensionContext
  ): FeaturesSettingsManager {
    if (!FeaturesSettingsManager.instance) {
      FeaturesSettingsManager.instance = new FeaturesSettingsManager(context);
    }
    return FeaturesSettingsManager.instance;
  }

  public async initialize(): Promise<void> {
    await this.loadSettings();
  }

  public getSettings(): FeaturesSettings {
    return { ...this._settings };
  }

  public async updateSettings(
    partialSettings: Partial<FeaturesSettings>
  ): Promise<void> {
    this._settings = { ...this._settings, ...partialSettings };
    await this.saveSettings();
  }

  private async loadSettings(): Promise<void> {
    const storedSettings = this.context.globalState.get<FeaturesSettings>(
      FeaturesSettingsManager.STORAGE_KEY
    );

    if (storedSettings) {
      this._settings = { ...this._settings, ...storedSettings };
    }
  }

  private async saveSettings(): Promise<void> {
    await this.context.globalState.update(
      FeaturesSettingsManager.STORAGE_KEY,
      this._settings
    );
  }
}
