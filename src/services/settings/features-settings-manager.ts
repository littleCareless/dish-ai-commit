import { DISH_CONFIG_PREFIX } from "@/config/constants";
import type { SyncResult } from "@/config/services/settings-sync-service";
import * as vscode from "vscode";

export interface FeaturesSettings {
  // Large Prompt Handling
  largePromptAction: "ask" | "useFallback" | "continue";
  branchNamePostAction: "ask" | "createAndCopy" | "copyOnly";
  branchNameSelectionMode: "autoFirst" | "quickPick";
  branchCreationFailureAction: "ask" | "copyOnly";

  // Commit Message Generation
  enableEmoji: boolean;
  enableMergeCommit: boolean;
  enableBody: boolean;
  enableLayeredCommit: boolean;
  enableSemanticGrouping: boolean;
  enableGlobalContext: boolean;
  useRecentCommitsAsReference: boolean;
  enableThirdPartyModelCatalog: boolean;
  enableAdaptiveInputLimitLearning: boolean;
  diffTruncationStrategy: "semantic" | "direct";
  maxInputTokensPerRequest: number;

  // Code Analysis
  simplifyDiff: boolean;
  autoDetectStaged: boolean;
  fallbackToAll: boolean;
  diffTarget: "staged" | "all" | "auto";

  // Other Features
  suppressNonCriticalWarnings: boolean;
  weeklyReport: boolean;
  codeReview: boolean;
  generateBranchName: boolean;
  generatePRSummary: boolean;
}

export const DEFAULT_FEATURE_SETTINGS: FeaturesSettings = {
  largePromptAction: "useFallback",
  branchNamePostAction: "createAndCopy",
  branchNameSelectionMode: "autoFirst",
  branchCreationFailureAction: "copyOnly",
  enableEmoji: true,
  enableMergeCommit: false,
  enableBody: true,
  enableLayeredCommit: false,
  enableSemanticGrouping: false,
  enableGlobalContext: true,
  useRecentCommitsAsReference: false,
  enableThirdPartyModelCatalog: true,
  enableAdaptiveInputLimitLearning: true,
  diffTruncationStrategy: "semantic",
  maxInputTokensPerRequest: 0,
  simplifyDiff: false,
  autoDetectStaged: true,
  fallbackToAll: true,
  diffTarget: "auto",
  suppressNonCriticalWarnings: true,
  weeklyReport: true,
  codeReview: true,
  generateBranchName: true,
  generatePRSummary: true,
};

type LegacyPromptFields = {
  activePrompts?: Record<string, string>;
  workspaceActivePrompts?: Record<string, Record<string, string>>;
  activePromptsBySubCategory?: Record<string, Record<string, string>>;
  workspaceActivePromptsBySubCategory?: Record<
    string,
    Record<string, Record<string, string>>
  >;
  activePromptKey?: string;
};

type LegacyFeaturesSettings = FeaturesSettings & LegacyPromptFields;

export class FeaturesSettingsManager {
  private static instance: FeaturesSettingsManager;
  private static readonly STORAGE_KEY = `${DISH_CONFIG_PREFIX}_features_settings`;

  private _settings: FeaturesSettings = { ...DEFAULT_FEATURE_SETTINGS };

  private constructor(private context: vscode.ExtensionContext) {}

  public static getInstance(
    context: vscode.ExtensionContext,
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
    partialSettings: Partial<FeaturesSettings>,
    dirtyKeys?: string[],
  ): Promise<SyncResult> {
    const merged = { ...this._settings, ...partialSettings };
    this._settings = this.applyDefaults(merged);
    return this.saveSettings(dirtyKeys);
  }

  private applyDefaults(
    settings?: Partial<FeaturesSettings>,
  ): FeaturesSettings {
    return { ...DEFAULT_FEATURE_SETTINGS, ...(settings || {}) };
  }

  private stripPromptFields(
    settings?: LegacyFeaturesSettings,
  ): { sanitized?: FeaturesSettings; changed: boolean } {
    if (!settings) {
      return { changed: false };
    }

    const {
      activePrompts,
      workspaceActivePrompts,
      activePromptsBySubCategory,
      workspaceActivePromptsBySubCategory,
      activePromptKey,
      ...featureOnly
    } = settings;

    const changed = Boolean(
      activePrompts ||
        workspaceActivePrompts ||
        activePromptsBySubCategory ||
        workspaceActivePromptsBySubCategory ||
        activePromptKey,
    );

    return {
      sanitized: featureOnly,
      changed,
    };
  }

  private async loadSettings(): Promise<void> {
    const stored = this.context.globalState.get<LegacyFeaturesSettings>(
      FeaturesSettingsManager.STORAGE_KEY,
    );

    let sanitized: FeaturesSettings | undefined;
    if (stored) {
      const result = this.stripPromptFields(stored);
      sanitized = result.sanitized;
      if (result.changed && result.sanitized) {
        await this.context.globalState.update(
          FeaturesSettingsManager.STORAGE_KEY,
          result.sanitized,
        );
      }
    }

    this._settings = this.applyDefaults(sanitized);
  }

  private async saveSettings(dirtyKeys?: string[]): Promise<SyncResult> {
    await this.context.globalState.update(
      FeaturesSettingsManager.STORAGE_KEY,
      this._settings,
    );

    // Sync to settings.json (best-effort, capture result)
    const { SettingsSyncService } = await import(
      "@/config/services/settings-sync-service"
    );
    const syncService = SettingsSyncService.getInstance();
    if (syncService) {
      try {
        return await syncService.syncFeaturesToSettingsJson(this._settings, dirtyKeys);
      } catch (err) {
        console.error("[FeaturesSettingsManager] Failed to sync to settings.json:", err);
        return { synced: 0, failed: ["__sync_error__"], skipped: 0 };
      }
    }
    return { synced: 0, failed: [], skipped: 0 };
  }
}
