import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const hoisted = vi.hoisted(() => {
  // In-memory globalState store
  const globalStateStore = new Map<string, unknown>();

  return {
    globalStateStore,

    // SettingsSyncService mock methods
    syncFeaturesToSettingsJson: vi.fn(async () => ({
      synced: 0,
      failed: [],
      skipped: 0,
    })),
    getInstance: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/config/services/settings-sync-service", () => ({
  SettingsSyncService: {
    getInstance: hoisted.getInstance,
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import {
  FeaturesSettingsManager,
  DEFAULT_FEATURE_SETTINGS,
} from "@/services/settings/features-settings-manager";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FeaturesSettingsManager", () => {
  let mockContext: any;
  let manager: FeaturesSettingsManager;

  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.globalStateStore.clear();

    // Reset singleton
    (FeaturesSettingsManager as any).instance = undefined;

    // Default: SettingsSyncService instance does NOT exist
    hoisted.getInstance.mockReturnValue(undefined);

    mockContext = {
      globalState: {
        get: vi.fn(<T>(key: string, defaultValue?: T): T | undefined => {
          if (hoisted.globalStateStore.has(key)) {
            return hoisted.globalStateStore.get(key) as T;
          }
          return defaultValue;
        }),
        update: vi.fn(async (key: string, value: unknown) => {
          if (value === undefined) {
            hoisted.globalStateStore.delete(key);
          } else {
            hoisted.globalStateStore.set(key, value);
          }
        }),
        keys: vi.fn(() => [...hoisted.globalStateStore.keys()]),
      },
    };
  });

  afterEach(() => {
    (FeaturesSettingsManager as any).instance = undefined;
  });

  // ----- Missing key applies defaults -----

  describe("missing key applies defaults", () => {
    it("returns all default values when globalState has no stored settings", async () => {
      manager = FeaturesSettingsManager.getInstance(mockContext);
      await manager.initialize();

      const settings = manager.getSettings();

      // Should match DEFAULT_FEATURE_SETTINGS exactly
      expect(settings).toEqual(DEFAULT_FEATURE_SETTINGS);
    });

    it("returns a copy of settings (not the internal reference)", async () => {
      manager = FeaturesSettingsManager.getInstance(mockContext);
      await manager.initialize();

      const settings1 = manager.getSettings();
      const settings2 = manager.getSettings();

      expect(settings1).toEqual(settings2);
      expect(settings1).not.toBe(settings2); // different object references
    });
  });

  // ----- getSettings merges defaults + stored values -----

  describe("getSettings merges defaults with stored values", () => {
    it("merges stored partial settings over defaults", async () => {
      // Store partial settings: only override a few keys
      hoisted.globalStateStore.set("dish_config_features_settings", {
        enableEmoji: false,
        codeReview: false,
        weeklyReport: false,
      });

      manager = FeaturesSettingsManager.getInstance(mockContext);
      await manager.initialize();

      const settings = manager.getSettings();

      // Overridden values
      expect(settings.enableEmoji).toBe(false);
      expect(settings.codeReview).toBe(false);
      expect(settings.weeklyReport).toBe(false);

      // Remaining values should be defaults
      expect(settings.enableBody).toBe(DEFAULT_FEATURE_SETTINGS.enableBody);
      expect(settings.largePromptAction).toBe(
        DEFAULT_FEATURE_SETTINGS.largePromptAction,
      );
      expect(settings.autoDetectStaged).toBe(
        DEFAULT_FEATURE_SETTINGS.autoDetectStaged,
      );
    });

    it("preserves all stored values when all are provided", async () => {
      const fullSettings = {
        ...DEFAULT_FEATURE_SETTINGS,
        enableEmoji: false,
        enableMergeCommit: true,
        codeReview: false,
        diffTarget: "staged" as const,
      };

      hoisted.globalStateStore.set(
        "dish_config_features_settings",
        fullSettings,
      );

      manager = FeaturesSettingsManager.getInstance(mockContext);
      await manager.initialize();

      const settings = manager.getSettings();

      expect(settings.enableEmoji).toBe(false);
      expect(settings.enableMergeCommit).toBe(true);
      expect(settings.codeReview).toBe(false);
      expect(settings.diffTarget).toBe("staged");
    });

    it("strips legacy prompt fields from stored settings", async () => {
      hoisted.globalStateStore.set("dish_config_features_settings", {
        enableEmoji: false,
        // Legacy fields
        activePrompts: { default: "prompt1" },
        workspaceActivePrompts: {},
        activePromptsBySubCategory: {},
        workspaceActivePromptsBySubCategory: {},
        activePromptKey: "default",
      });

      manager = FeaturesSettingsManager.getInstance(mockContext);
      await manager.initialize();

      const settings = manager.getSettings() as any;

      // Feature settings preserved
      expect(settings.enableEmoji).toBe(false);
      // Legacy fields stripped
      expect(settings.activePrompts).toBeUndefined();
      expect(settings.workspaceActivePrompts).toBeUndefined();
      expect(settings.activePromptsBySubCategory).toBeUndefined();
      expect(settings.workspaceActivePromptsBySubCategory).toBeUndefined();
      expect(settings.activePromptKey).toBeUndefined();
    });
  });

  // ----- updateSettings persists and triggers sync -----

  describe("updateSettings persists and triggers sync", () => {
    beforeEach(() => {
      // Setup: SettingsSyncService instance exists
      hoisted.getInstance.mockReturnValue({
        syncFeaturesToSettingsJson: hoisted.syncFeaturesToSettingsJson,
      });
    });

    it("persists partial updates to globalState", async () => {
      manager = FeaturesSettingsManager.getInstance(mockContext);
      await manager.initialize();

      await manager.updateSettings({ enableEmoji: false, codeReview: false });

      // Verify globalState.update was called with merged settings
      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        "dish_config_features_settings",
        expect.objectContaining({
          enableEmoji: false,
          codeReview: false,
          // Other fields should retain their defaults
          enableBody: DEFAULT_FEATURE_SETTINGS.enableBody,
        }),
      );
    });

    it("triggers SettingsSyncService.syncFeaturesToSettingsJson", async () => {
      manager = FeaturesSettingsManager.getInstance(mockContext);
      await manager.initialize();

      hoisted.syncFeaturesToSettingsJson.mockResolvedValue({
        synced: 2,
        failed: [],
        skipped: 0,
      });

      const result = await manager.updateSettings({
        enableEmoji: false,
      });

      expect(hoisted.syncFeaturesToSettingsJson).toHaveBeenCalledWith(
        expect.objectContaining({ enableEmoji: false }),
        undefined, // dirtyKeys not provided
      );
      expect(result.synced).toBe(2);
    });

    it("passes dirtyKeys to sync service when provided", async () => {
      manager = FeaturesSettingsManager.getInstance(mockContext);
      await manager.initialize();

      await manager.updateSettings({ enableEmoji: false }, ["enableEmoji"]);

      expect(hoisted.syncFeaturesToSettingsJson).toHaveBeenCalledWith(
        expect.objectContaining({ enableEmoji: false }),
        ["enableEmoji"],
      );
    });

    it("gracefully handles missing sync service", async () => {
      hoisted.getInstance.mockReturnValue(undefined);

      manager = FeaturesSettingsManager.getInstance(mockContext);
      await manager.initialize();

      // Should not throw
      const result = await manager.updateSettings({ enableEmoji: false });

      expect(result).toEqual({ synced: 0, failed: [], skipped: 0 });
      // globalState should still be updated
      expect(mockContext.globalState.update).toHaveBeenCalled();
    });

    it("applies defaults to missing fields in partial update", async () => {
      manager = FeaturesSettingsManager.getInstance(mockContext);
      await manager.initialize();

      await manager.updateSettings({ diffTarget: "staged" });

      // The saved settings should have diffTarget overridden but all other
      // fields should be defaults
      const savedValue = hoisted.globalStateStore.get(
        "dish_config_features_settings",
      ) as any;
      expect(savedValue.diffTarget).toBe("staged");
      expect(savedValue.enableEmoji).toBe(DEFAULT_FEATURE_SETTINGS.enableEmoji);
      expect(savedValue.autoDetectStaged).toBe(
        DEFAULT_FEATURE_SETTINGS.autoDetectStaged,
      );
    });
  });

  // ----- Singleton -----

  describe("singleton pattern", () => {
    it("returns same instance for multiple getInstance calls", () => {
      const instance1 = FeaturesSettingsManager.getInstance(mockContext);
      const instance2 = FeaturesSettingsManager.getInstance(mockContext);
      expect(instance1).toBe(instance2);
    });

    it("different context on second call still returns same instance", () => {
      const instance1 = FeaturesSettingsManager.getInstance(mockContext);
      const otherContext = {
        globalState: {
          get: vi.fn(),
          update: vi.fn(),
          keys: vi.fn(() => []),
        },
      };
      const instance2 = FeaturesSettingsManager.getInstance(
        otherContext as any,
      );
      expect(instance1).toBe(instance2);
    });
  });
});
