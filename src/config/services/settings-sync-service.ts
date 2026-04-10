/**
 * Settings Sync Service
 *
 * Bidirectional sync between VS Code settings.json and extension internal storage
 * (globalState / secrets).
 *
 * Strategy:
 * - globalState/secrets remain the runtime source of truth (no changes to read paths)
 * - settings.json acts as a "view" that stays in sync
 * - Only non-default values are written to settings.json to avoid pollution
 * - Anti-loop protection via _syncSource tracking
 *
 * Sync directions:
 * 1. settings.json → globalState/secrets (triggered by onDidChangeConfiguration)
 * 2. globalState/secrets → settings.json (triggered by SettingsManagers after save)
 */

import * as vscode from "vscode";
import { EXTENSION_NAME } from "@/constants";
import { FeaturesSettings } from "@/services/settings/features-settings-manager";
import { DEFAULT_FEATURE_SETTINGS } from "@/services/settings/features-settings-manager";
import { ProfileManagerService } from "@/services/profile-manager/profile-manager-service";
import { ProviderConfig } from "@/types/settings";

const SECTION = EXTENSION_NAME; // "dish-ai-commit"

// ---------------------------------------------------------------------------
// Core config classification (F-003)
// ---------------------------------------------------------------------------

/** Prefixes for core config keys that always sync regardless of toggle state */
export const CORE_CONFIG_PREFIXES = ["base.", "providers."];

/** Check if a settings.json dot-path refers to core config (always synced) */
export function isCoreConfigKey(dotPath: string): boolean {
  return CORE_CONFIG_PREFIXES.some((prefix) => dotPath.startsWith(prefix));
}

/** Check if a settings.json dot-path refers to feature config (toggle-gated) */
export function isFeatureConfigKey(dotPath: string): boolean {
  return dotPath.startsWith("features.");
}

// ---------------------------------------------------------------------------
// Provider config sync (providers.* in settings.json ↔ secrets)
// ---------------------------------------------------------------------------

/** Fields that can be synced for each provider */
const PROVIDER_SYNC_FIELDS = ["apiKey", "baseUrl", "endpoint", "defaultModel"] as const;

/** Parse "providers.openai.apiKey" → { providerId: "openai", field: "apiKey" } */
export function parseProviderKey(dotPath: string): { providerId: string; field: string } | null {
  const match = dotPath.match(/^providers\.([^.]+)\.(.+)$/);
  if (!match) return null;
  const [, providerId, field] = match;
  if (!PROVIDER_SYNC_FIELDS.includes(field as any)) return null;
  return { providerId, field };
}

// ---------------------------------------------------------------------------
// Key mapping tables
// ---------------------------------------------------------------------------

/** Maps settings.json dot-path (without prefix) → globalState FeaturesSettings key */
const FEATURE_KEY_MAP: Record<string, keyof FeaturesSettings> = {
  "features.codeAnalysis.diffTarget": "diffTarget",
  "features.codeAnalysis.autoDetectStaged": "autoDetectStaged",
  "features.codeAnalysis.fallbackToAll": "fallbackToAll",
  "features.codeAnalysis.simplifyDiff": "simplifyDiff",
  "features.commitFormat.enableEmoji": "enableEmoji",
  "features.commitFormat.enableBody": "enableBody",
  "features.commitFormat.enableMergeCommit": "enableMergeCommit",
  "features.commitFormat.enableLayeredCommit": "enableLayeredCommit",
  "features.commitFormat.enableSemanticGrouping": "enableSemanticGrouping",
  "features.commitFormat.enableGlobalContext": "enableGlobalContext",
  "features.commitMessage.largePromptAction": "largePromptAction",
  "features.enableThirdPartyModelCatalog": "enableThirdPartyModelCatalog",
  "features.enableAdaptiveInputLimitLearning": "enableAdaptiveInputLimitLearning",
  "features.weeklyReport": "weeklyReport",
  "features.codeReview": "codeReview",
  "features.generateBranchName": "generateBranchName",
  "features.generatePRSummary": "generatePRSummary",
  "features.branchName.postAction": "branchNamePostAction",
  "features.branchName.selectionMode": "branchNameSelectionMode",
  "features.branchName.createFailureAction": "branchCreationFailureAction",
  "features.suppressNonCriticalWarnings": "suppressNonCriticalWarnings",
};

/** Reverse map: globalState key → settings.json dot-path */
const REVERSE_FEATURE_MAP: Record<string, string> = {};
for (const [dotPath, stateKey] of Object.entries(FEATURE_KEY_MAP)) {
  REVERSE_FEATURE_MAP[stateKey] = dotPath;
}

// ---------------------------------------------------------------------------
// Sync source tracking (anti-loop)
// ---------------------------------------------------------------------------

type SyncSource = "settingsJson" | "globalState" | "none";

// ---------------------------------------------------------------------------
// Sync result type
// ---------------------------------------------------------------------------

export interface SyncResult {
  synced: number;
  failed: string[];
  skipped: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class SettingsSyncService {
  private static instance: SettingsSyncService;
  private _syncSource: SyncSource = "none";

  /** globalState key for the sync toggle (NOT stored in settings.json to avoid circular dependency) */
  static readonly SYNC_TOGGLE_KEY = "dish_config_sync_toggle";

  private constructor(private context: vscode.ExtensionContext) {}

  static getInstance(context?: vscode.ExtensionContext): SettingsSyncService | undefined {
    if (!SettingsSyncService.instance) {
      if (!context) {
        return undefined; // not yet initialized
      }
      SettingsSyncService.instance = new SettingsSyncService(context);
    }
    return SettingsSyncService.instance;
  }

  /** Force-initialize with context (called during extension activation) */
  static initialize(context: vscode.ExtensionContext): SettingsSyncService {
    if (!SettingsSyncService.instance) {
      SettingsSyncService.instance = new SettingsSyncService(context);
    }
    return SettingsSyncService.instance;
  }

  // -----------------------------------------------------------------------
  // Direction A: settings.json → globalState
  // -----------------------------------------------------------------------

  /**
   * Called by ConfigurationMonitor when settings.json changes.
   * Reads changed keys from settings.json and writes them to globalState
   * via FeaturesSettingsManager / PreferencesSettingsManager.
   */
  async syncFromSettingsJson(changedKeys: string[]): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, failed: [], skipped: 0 };

    if (this._syncSource === "globalState") {
      return result; // anti-loop: skip if we just wrote to settings.json
    }

    this._syncSource = "settingsJson";
    try {
      const config = vscode.workspace.getConfiguration(SECTION);
      const featureUpdates: Partial<FeaturesSettings> = {};

      for (const key of changedKeys) {
        const stateKey = FEATURE_KEY_MAP[key];
        if (!stateKey) {
          result.skipped++;
          continue;
        }
        try {
          const value = config.get(key);
          if (value !== undefined) {
            featureUpdates[stateKey] = value as any;
          } else {
            result.skipped++;
          }
        } catch (err) {
          result.failed.push(key);
          console.error(`[SettingsSyncService] Failed to read key "${key}":`, err);
        }
      }

      if (Object.keys(featureUpdates).length > 0) {
        try {
          const { FeaturesSettingsManager } = await import(
            "@/services/settings/features-settings-manager"
          );
          const manager = FeaturesSettingsManager.getInstance(this.context);
          await manager.updateSettings(featureUpdates);
          result.synced = Object.keys(featureUpdates).length;
        } catch (err) {
          result.failed.push(...Object.keys(featureUpdates));
          console.error("[SettingsSyncService] Failed to write feature updates to globalState:", err);
        }
      }
    } finally {
      this._syncSource = "none";
    }

    return result;
  }

  // -----------------------------------------------------------------------
  // Direction B: globalState → settings.json
  // -----------------------------------------------------------------------

  /**
   * Called by FeaturesSettingsManager after saving to globalState.
   * Writes only changed non-default values to settings.json.
   *
   * Sync behavior:
   * - Core config (base.*, providers.*) always syncs regardless of toggle
   * - Feature config (features.*) only syncs when toggle is ON
   *
   * @param settings Full feature settings (runtime source of truth)
   * @param dirtyKeys Optional set of state keys that actually changed.
   *                  When provided, only those keys are synced (targeted sync).
   *                  When absent, all keys are synced (backward compatible).
   * @returns SyncResult with counts of synced/failed/skipped keys.
   */
  async syncFeaturesToSettingsJson(
    settings: FeaturesSettings,
    dirtyKeys?: string[]
  ): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, failed: [], skipped: 0 };

    if (this._syncSource === "settingsJson") {
      return result; // anti-loop
    }

    // Build the set of keys to sync: only dirty keys, or all if not specified
    const keysToSync = dirtyKeys
      ? new Set(dirtyKeys)
      : new Set(Object.keys(REVERSE_FEATURE_MAP));

    this._syncSource = "globalState";
    try {
      const config = vscode.workspace.getConfiguration(SECTION);
      const syncEnabled = this.isSyncEnabled;

      for (const [stateKey, dotPath] of Object.entries(REVERSE_FEATURE_MAP)) {
        if (!keysToSync.has(stateKey)) {
          result.skipped++;
          continue;
        }

        // Core config always syncs; feature config requires toggle ON
        if (isCoreConfigKey(dotPath)) {
          // Core config: always sync
        } else if (isFeatureConfigKey(dotPath)) {
          // Feature config: check toggle
          if (!syncEnabled) {
            result.skipped++;
            continue;
          }
        }

        const current = settings[stateKey as keyof FeaturesSettings];
        const defaultValue =
          DEFAULT_FEATURE_SETTINGS[stateKey as keyof FeaturesSettings];

        try {
          if (current === defaultValue) {
            // Clear from settings.json if it matches default
            const inspect = config.inspect(dotPath);
            if (
              inspect?.globalValue !== undefined ||
              inspect?.workspaceValue !== undefined
            ) {
              await config.update(dotPath, undefined, true);
            }
          } else {
            await config.update(dotPath, current, true);
          }
          result.synced++;
        } catch (err) {
          result.failed.push(stateKey);
          console.error(
            `[SettingsSyncService] Failed to sync key "${stateKey}":`,
            err
          );
        }
      }
    } finally {
      this._syncSource = "none";
    }

    return result;
  }

  // -----------------------------------------------------------------------
  // Sync toggle (F-002)
  // -----------------------------------------------------------------------

  /** Read toggle state from globalState. Default: false (new users). */
  get isSyncEnabled(): boolean {
    return this.context.globalState.get<boolean>(
      SettingsSyncService.SYNC_TOGGLE_KEY,
      false
    );
  }

  /**
   * Update toggle state in globalState.
   * When enabled, triggers immediate full sync of non-default feature config.
   * When disabled, stops future syncs but does NOT delete existing settings.json entries.
   */
  async setSyncEnabled(enabled: boolean): Promise<SyncResult> {
    await this.context.globalState.update(
      SettingsSyncService.SYNC_TOGGLE_KEY,
      enabled
    );

    if (enabled) {
      // Immediate sync of all non-default feature config to settings.json
      const { FeaturesSettingsManager } = await import(
        "@/services/settings/features-settings-manager"
      );
      const manager = FeaturesSettingsManager.getInstance(this.context);
      const settings = manager.getSettings();
      return this.syncFeaturesToSettingsJson(settings);
    }

    return { synced: 0, failed: [], skipped: 0 };
  }

  /**
   * Initialize toggle for existing users.
   * If the user already has feature data in globalState (existing user),
   * default the toggle to ON so they keep their sync behavior.
   * New users (no globalState data) default to OFF.
   */
  async initializeToggle(): Promise<void> {
    const toggleSet =
      this.context.globalState.get(SettingsSyncService.SYNC_TOGGLE_KEY) !==
      undefined;
    if (toggleSet) {
      return; // Toggle already explicitly set, do not override
    }

    // Detect existing user: has feature settings in globalState
    const existingFeatures = this.context.globalState.get(
      "dish_config_features_settings"
    );
    if (existingFeatures) {
      await this.context.globalState.update(
        SettingsSyncService.SYNC_TOGGLE_KEY,
        true
      );
      console.log(
        "[SettingsSyncService] Existing user detected, toggle defaulted to ON"
      );
    }
  }

  // -----------------------------------------------------------------------
  // Initial sync (migration from old settings.json → globalState)
  // -----------------------------------------------------------------------

  /**
   * Called during extension activation.
   * If globalState has no feature data but settings.json does,
   * migrates settings.json values into globalState.
   */
  async initialSync(): Promise<void> {
    const { FeaturesSettingsManager } = await import(
      "@/services/settings/features-settings-manager"
    );
    const manager = FeaturesSettingsManager.getInstance(this.context);
    const existing = this.context.globalState.get(
      "dish_config_features_settings"
    );

    if (existing) {
      return; // globalState already initialized, skip
    }

    // Check if settings.json has any non-default feature values
    const config = vscode.workspace.getConfiguration(SECTION);
    const updates: Partial<FeaturesSettings> = {};

    for (const [dotPath, stateKey] of Object.entries(FEATURE_KEY_MAP)) {
      const inspect = config.inspect(dotPath);
      if (
        inspect?.globalValue !== undefined ||
        inspect?.workspaceValue !== undefined
      ) {
        updates[stateKey] = config.get(dotPath) as any;
      }
    }

    if (Object.keys(updates).length > 0) {
      await manager.updateSettings(updates);
      console.log(
        "[SettingsSyncService] Migrated settings.json → globalState:",
        Object.keys(updates)
      );
    }
  }

  // -----------------------------------------------------------------------
  // Provider config sync: settings.json ↔ secrets
  // -----------------------------------------------------------------------

  /**
   * Direction A: settings.json → secrets (active profile)
   *
   * Called by ConfigurationMonitor when providers.* keys change in settings.json.
   * Reads changed provider keys and updates the active profile in secrets storage.
   */
  async syncProvidersFromSettingsJson(changedKeys: string[]): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, failed: [], skipped: 0 };

    if (this._syncSource === "globalState") {
      return result; // anti-loop: skip if we just wrote to settings.json
    }

    // Filter to provider keys only
    const providerKeys = changedKeys.filter((key) => key.startsWith("providers."));
    if (providerKeys.length === 0) {
      return result;
    }

    this._syncSource = "settingsJson";
    try {
      const config = vscode.workspace.getConfiguration(SECTION);

      // Get active profile
      const { ProfileManagerService: PM } = await import(
        "@/services/profile-manager/profile-manager-service"
      );
      const profileManager = PM.getInstance();
      const activeProfileId = profileManager.getActiveProfileId();
      if (!activeProfileId) {
        console.warn("[SettingsSyncService] No active profile, skipping provider sync");
        return result;
      }

      const profile = profileManager.getProfileById(activeProfileId);
      if (!profile || !profile.providers) {
        console.warn("[SettingsSyncService] Active profile not found or has no providers");
        return result;
      }

      let profileChanged = false;

      for (const key of providerKeys) {
        const parsed = parseProviderKey(key);
        if (!parsed) {
          result.skipped++;
          continue;
        }

        const { providerId, field } = parsed;
        const value = config.get<string>(key);

        // Ensure provider entry exists in profile
        if (!profile.providers[providerId]) {
          profile.providers[providerId] = {
            id: providerId,
            name: providerId,
            type: "openai-compatible" as any,
          } as ProviderConfig;
        }

        const provider = profile.providers[providerId];
        if (value !== undefined && String(value).trim().length > 0) {
          (provider as any)[field] = value;
          profileChanged = true;
          result.synced++;
        } else if ((provider as any)[field]) {
          // Value cleared in settings.json → remove from profile
          delete (provider as any)[field];
          profileChanged = true;
          result.synced++;
        } else {
          result.skipped++;
        }
      }

      if (profileChanged) {
        profile.updatedAt = new Date();
        await profileManager.saveProfile(profile);
        console.log(
          "[SettingsSyncService] Synced provider config from settings.json → secrets:",
          Object.fromEntries(
            providerKeys.map((k) => [k, config.get(k)])
          )
        );
      }
    } catch (err) {
      result.failed.push(...providerKeys);
      console.error("[SettingsSyncService] Failed to sync provider config from settings.json:", err);
    } finally {
      this._syncSource = "none";
    }

    return result;
  }

  /**
   * Direction B: secrets (active profile) → settings.json
   *
   * Called after profile save to write provider config to settings.json.
   * Only writes non-empty values for providers that exist in the profile.
   */
  async syncProvidersToSettingsJson(profile: any): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, failed: [], skipped: 0 };

    if (this._syncSource === "settingsJson") {
      return result; // anti-loop
    }

    if (!profile?.providers) {
      return result;
    }

    this._syncSource = "globalState";
    try {
      const config = vscode.workspace.getConfiguration(SECTION);
      const providers = profile.providers as Record<string, ProviderConfig>;

      for (const [providerId, providerConfig] of Object.entries(providers)) {
        for (const field of PROVIDER_SYNC_FIELDS) {
          const dotPath = `providers.${providerId}.${field}`;
          const value = (providerConfig as any)[field];

          try {
            if (value !== undefined && String(value).trim().length > 0) {
              await config.update(dotPath, value, true);
              result.synced++;
            } else {
              // Clear from settings.json if profile has no value
              const inspect = config.inspect(dotPath);
              if (
                inspect?.globalValue !== undefined ||
                inspect?.workspaceValue !== undefined
              ) {
                await config.update(dotPath, undefined, true);
              }
              result.skipped++;
            }
          } catch (err) {
            result.failed.push(dotPath);
            console.error(
              `[SettingsSyncService] Failed to sync provider key "${dotPath}":`,
              err
            );
          }
        }
      }
    } finally {
      this._syncSource = "none";
    }

    return result;
  }

  /**
   * Initial provider sync: settings.json → secrets
   *
   * Called during extension activation. If the active profile has empty
   * apiKey/baseUrl but settings.json has values, sync them into secrets.
   */
  async initialProviderSync(): Promise<void> {
    try {
      const { ProfileManagerService: PM } = await import(
        "@/services/profile-manager/profile-manager-service"
      );
      const profileManager = PM.getInstance();
      const activeProfileId = profileManager.getActiveProfileId();
      if (!activeProfileId) return;

      const profile = profileManager.getProfileById(activeProfileId);
      if (!profile?.providers) return;

      const config = vscode.workspace.getConfiguration(SECTION);
      let profileChanged = false;

      for (const [providerId, providerConfig] of Object.entries(profile.providers)) {
        for (const field of PROVIDER_SYNC_FIELDS) {
          // If profile already has the value, skip
          if ((providerConfig as any)[field]) continue;

          const dotPath = `providers.${providerId}.${field}`;
          const inspect = config.inspect(dotPath);
          // Only sync if user has explicitly set the value in settings.json
          if (
            inspect?.globalValue !== undefined ||
            inspect?.workspaceValue !== undefined
          ) {
            const value = config.get<string>(dotPath);
            if (value && String(value).trim().length > 0) {
              (providerConfig as any)[field] = value;
              profileChanged = true;
            }
          }
        }
      }

      if (profileChanged) {
        profile.updatedAt = new Date();
        await profileManager.saveProfile(profile);
        console.log("[SettingsSyncService] Initial provider sync completed from settings.json → secrets");
      }
    } catch (err) {
      console.error("[SettingsSyncService] Initial provider sync failed:", err);
    }
  }

  // -----------------------------------------------------------------------
  // Profile switch sync
  // -----------------------------------------------------------------------

  /**
   * Called when the active profile changes.
   * Performs a full settings.json replacement so that VS Code Settings UI
   * reflects the new profile's configuration.
   *
   * Two-phase strategy:
   * - Phase 1 (Clear): Remove all feature entries from settings.json so the
   *   new profile starts from a clean slate (no stale values from old profile).
   * - Phase 2 (Write): Write non-default values from the new profile, respecting
   *   the sync toggle for feature config.
   */
  async syncOnProfileSwitch(settings: FeaturesSettings): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, failed: [], skipped: 0 };

    this._syncSource = "globalState";
    try {
      const config = vscode.workspace.getConfiguration(SECTION);

      // Phase 1 (Clear): Remove all feature entries from settings.json
      for (const dotPath of Object.values(REVERSE_FEATURE_MAP)) {
        const inspect = config.inspect(dotPath);
        if (
          inspect?.globalValue !== undefined ||
          inspect?.workspaceValue !== undefined
        ) {
          try {
            await config.update(dotPath, undefined, true);
          } catch (err) {
            const stateKey = FEATURE_KEY_MAP[dotPath];
            result.failed.push(stateKey ?? dotPath);
            console.error(
              `[SettingsSyncService] Phase 1: failed to clear "${dotPath}":`,
              err
            );
          }
        }
      }

      // Phase 2 (Write): Write non-default values for the new profile
      const syncEnabled = this.isSyncEnabled;

      for (const [stateKey, dotPath] of Object.entries(REVERSE_FEATURE_MAP)) {
        const value = settings[stateKey as keyof FeaturesSettings];
        const defaultValue =
          DEFAULT_FEATURE_SETTINGS[stateKey as keyof FeaturesSettings];

        // Core config always syncs; feature config requires toggle ON
        if (isCoreConfigKey(dotPath)) {
          // Core config: always sync
        } else if (isFeatureConfigKey(dotPath)) {
          if (!syncEnabled) {
            result.skipped++;
            continue;
          }
        }

        try {
          if (value !== defaultValue) {
            await config.update(dotPath, value, true);
            result.synced++;
          }
        } catch (err) {
          result.failed.push(stateKey);
          console.error(
            `[SettingsSyncService] Phase 2: failed to write "${stateKey}":`,
            err
          );
        }
      }
    } finally {
      this._syncSource = "none";
    }

    return result;
  }
}
