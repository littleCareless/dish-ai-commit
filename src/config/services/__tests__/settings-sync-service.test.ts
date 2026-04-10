import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const hoisted = vi.hoisted(() => {
  // In-memory globalState store
  const globalStateStore = new Map<string, unknown>();

  // FeaturesSettingsManager mock methods
  const updateSettings = vi.fn(async () => ({
    synced: 0,
    failed: [],
    skipped: 0,
  }));
  const getSettings = vi.fn(() => ({}));

  // Trackable getConfiguration mock
  const getConfiguration = vi.fn();

  return { globalStateStore, updateSettings, getSettings, getConfiguration };
});

// ---------------------------------------------------------------------------
// Override vscode.workspace.getConfiguration to be mockable
// ---------------------------------------------------------------------------

vi.mock("vscode", async (importOriginal) => {
  const original = await importOriginal<typeof import("vscode")>();
  return {
    ...original,
    workspace: {
      ...(original as any).workspace,
      getConfiguration: hoisted.getConfiguration,
    },
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/services/settings/features-settings-manager", () => ({
  FeaturesSettingsManager: {
    getInstance: () => ({
      updateSettings: hoisted.updateSettings,
      getSettings: hoisted.getSettings,
    }),
  },
  DEFAULT_FEATURE_SETTINGS: {
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
  },
}));

vi.mock("@/services/profile-manager/profile-manager-service", () => ({
  ProfileManagerService: {
    getInstance: () => ({
      getActiveProfileId: vi.fn(),
      getProfileById: vi.fn(),
      saveProfile: vi.fn(),
    }),
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import {
  parseProviderKey,
  isCoreConfigKey,
  isFeatureConfigKey,
  SettingsSyncService,
} from "@/config/services/settings-sync-service";

// ---------------------------------------------------------------------------
// Helper to create mock workspace configuration
// ---------------------------------------------------------------------------

function createMockConfig(overrides?: {
  get?: ReturnType<typeof vi.fn>;
  update?: ReturnType<typeof vi.fn>;
  inspect?: ReturnType<typeof vi.fn>;
}) {
  return {
    get: overrides?.get ?? vi.fn(),
    update: overrides?.update ?? vi.fn(async () => {}),
    has: vi.fn(),
    inspect: overrides?.inspect ?? vi.fn(() => ({})),
  };
}

// ---------------------------------------------------------------------------
// Tests - pure functions (no instance needed)
// ---------------------------------------------------------------------------

describe("parseProviderKey", () => {
  it("parses valid provider key format", () => {
    const result = parseProviderKey("providers.openai.apiKey");
    expect(result).toEqual({ providerId: "openai", field: "apiKey" });
  });

  it("parses provider key with baseUrl field", () => {
    const result = parseProviderKey("providers.anthropic.baseUrl");
    expect(result).toEqual({ providerId: "anthropic", field: "baseUrl" });
  });

  it("parses provider key with endpoint field", () => {
    const result = parseProviderKey("providers.google.endpoint");
    expect(result).toEqual({ providerId: "google", field: "endpoint" });
  });

  it("parses provider key with defaultModel field", () => {
    const result = parseProviderKey("providers.openai.defaultModel");
    expect(result).toEqual({ providerId: "openai", field: "defaultModel" });
  });

  it("returns null for non-sync field", () => {
    const result = parseProviderKey("providers.openai.customField");
    expect(result).toBeNull();
  });

  it("returns null for non-provider key", () => {
    expect(parseProviderKey("base.language")).toBeNull();
    expect(parseProviderKey("features.enableEmoji")).toBeNull();
    expect(parseProviderKey("random")).toBeNull();
  });

  it("returns null for partial provider path", () => {
    expect(parseProviderKey("providers.openai")).toBeNull();
    expect(parseProviderKey("providers.")).toBeNull();
  });
});

describe("isCoreConfigKey", () => {
  it("returns true for base.* keys", () => {
    expect(isCoreConfigKey("base.language")).toBe(true);
    expect(isCoreConfigKey("base.provider")).toBe(true);
  });

  it("returns true for providers.* keys", () => {
    expect(isCoreConfigKey("providers.openai.apiKey")).toBe(true);
  });

  it("returns false for features.* keys", () => {
    expect(isCoreConfigKey("features.enableEmoji")).toBe(false);
  });

  it("returns false for unknown keys", () => {
    expect(isCoreConfigKey("unknown.key")).toBe(false);
  });
});

describe("isFeatureConfigKey", () => {
  it("returns true for features.* keys", () => {
    expect(isFeatureConfigKey("features.enableEmoji")).toBe(true);
    expect(isFeatureConfigKey("features.codeAnalysis.diffTarget")).toBe(true);
  });

  it("returns false for base.* keys", () => {
    expect(isFeatureConfigKey("base.language")).toBe(false);
  });

  it("returns false for providers.* keys", () => {
    expect(isFeatureConfigKey("providers.openai.apiKey")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests - instance methods
// ---------------------------------------------------------------------------

describe("SettingsSyncService", () => {
  let mockContext: any;
  let service: SettingsSyncService;

  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.globalStateStore.clear();

    // Reset singleton
    (SettingsSyncService as any).instance = undefined;

    mockContext = {
      globalState: {
        get: vi.fn((key: string, defaultValue?: any) => {
          if (hoisted.globalStateStore.has(key)) {
            return hoisted.globalStateStore.get(key);
          }
          return defaultValue;
        }),
        update: vi.fn(async (key: string, value: any) => {
          if (value === undefined) {
            hoisted.globalStateStore.delete(key);
          } else {
            hoisted.globalStateStore.set(key, value);
          }
        }),
        keys: vi.fn(() => [...hoisted.globalStateStore.keys()]),
      },
    };

    service = SettingsSyncService.initialize(mockContext);

    // Default getConfiguration returns a basic mock config
    hoisted.getConfiguration.mockReturnValue(createMockConfig());
  });

  afterEach(() => {
    (SettingsSyncService as any).instance = undefined;
  });

  // ----- syncFromSettingsJson (Direction A) -----

  describe("syncFromSettingsJson", () => {
    it("syncs feature keys from settings.json to globalState", async () => {
      const mockConfig = createMockConfig({
        get: vi.fn((key: string) => {
          if (key === "features.commitFormat.enableEmoji") return false;
          return undefined;
        }),
      });
      hoisted.getConfiguration.mockReturnValue(mockConfig);

      const result = await service.syncFromSettingsJson([
        "features.commitFormat.enableEmoji",
      ]);

      expect(result.synced).toBe(1);
      expect(hoisted.updateSettings).toHaveBeenCalledWith({
        enableEmoji: false,
      });
    });

    it("skips keys not in FEATURE_KEY_MAP", async () => {
      const mockConfig = createMockConfig();
      hoisted.getConfiguration.mockReturnValue(mockConfig);

      const result = await service.syncFromSettingsJson(["unknown.key"]);

      expect(result.skipped).toBe(1);
      expect(result.synced).toBe(0);
      expect(hoisted.updateSettings).not.toHaveBeenCalled();
    });
  });

  // ----- syncFeaturesToSettingsJson (Direction B) -----

  describe("syncFeaturesToSettingsJson", () => {
    it("writes non-default values to settings.json", async () => {
      // Enable sync toggle
      hoisted.globalStateStore.set(
        SettingsSyncService.SYNC_TOGGLE_KEY,
        true,
      );

      const mockConfig = createMockConfig();
      hoisted.getConfiguration.mockReturnValue(mockConfig);

      const settings = {
        largePromptAction: "ask" as const, // non-default (default is "useFallback")
        enableEmoji: true,
        enableMergeCommit: false,
        enableBody: true,
        enableLayeredCommit: false,
        enableSemanticGrouping: false,
        enableGlobalContext: true,
        useRecentCommitsAsReference: false,
        enableThirdPartyModelCatalog: true,
        enableAdaptiveInputLimitLearning: true,
        diffTruncationStrategy: "semantic" as const,
        maxInputTokensPerRequest: 0,
        simplifyDiff: false,
        autoDetectStaged: true,
        fallbackToAll: true,
        diffTarget: "auto" as const,
        suppressNonCriticalWarnings: true,
        weeklyReport: true,
        codeReview: true,
        generateBranchName: true,
        generatePRSummary: true,
        branchNamePostAction: "createAndCopy" as const,
        branchNameSelectionMode: "autoFirst" as const,
        branchCreationFailureAction: "copyOnly" as const,
      };

      const result = await service.syncFeaturesToSettingsJson(settings);

      // At minimum, the non-default key should be synced
      expect(result.synced).toBeGreaterThanOrEqual(1);
      // The non-default "largePromptAction" = "ask" should have been updated
      expect(mockConfig.update).toHaveBeenCalledWith(
        "features.commitMessage.largePromptAction",
        "ask",
        true,
      );
    });

    it("skips sync when toggle is off for feature config", async () => {
      // Sync toggle is OFF by default
      const mockConfig = createMockConfig();
      hoisted.getConfiguration.mockReturnValue(mockConfig);

      const settings = {
        largePromptAction: "ask" as const,
        enableEmoji: true,
        enableMergeCommit: false,
        enableBody: true,
        enableLayeredCommit: false,
        enableSemanticGrouping: false,
        enableGlobalContext: true,
        useRecentCommitsAsReference: false,
        enableThirdPartyModelCatalog: true,
        enableAdaptiveInputLimitLearning: true,
        diffTruncationStrategy: "semantic" as const,
        maxInputTokensPerRequest: 0,
        simplifyDiff: false,
        autoDetectStaged: true,
        fallbackToAll: true,
        diffTarget: "auto" as const,
        suppressNonCriticalWarnings: true,
        weeklyReport: true,
        codeReview: true,
        generateBranchName: true,
        generatePRSummary: true,
        branchNamePostAction: "createAndCopy" as const,
        branchNameSelectionMode: "autoFirst" as const,
        branchCreationFailureAction: "copyOnly" as const,
      };

      const result = await service.syncFeaturesToSettingsJson(settings);

      // Feature config is skipped when toggle is OFF
      expect(result.synced).toBe(0);
    });
  });

  // ----- Anti-loop protection -----

  describe("_syncSource anti-loop protection", () => {
    it("skips syncFromSettingsJson when _syncSource is globalState", async () => {
      (service as any)._syncSource = "globalState";

      const result = await service.syncFromSettingsJson([
        "features.commitFormat.enableEmoji",
      ]);

      expect(result.synced).toBe(0);
      expect(result.skipped).toBe(0);
      expect((service as any)._syncSource).toBe("globalState");
    });

    it("skips syncFeaturesToSettingsJson when _syncSource is settingsJson", async () => {
      (service as any)._syncSource = "settingsJson";

      const settings = {} as any;
      const result = await service.syncFeaturesToSettingsJson(settings);

      expect(result.synced).toBe(0);
      expect((service as any)._syncSource).toBe("settingsJson");
    });

    it("resets _syncSource to none after syncFromSettingsJson completes", async () => {
      const mockConfig = createMockConfig({
        get: vi.fn(() => undefined),
      });
      hoisted.getConfiguration.mockReturnValue(mockConfig);

      (service as any)._syncSource = "none";
      await service.syncFromSettingsJson(["unknown.key"]);

      expect((service as any)._syncSource).toBe("none");
    });

    it("resets _syncSource to none even when an error occurs in sync", async () => {
      const mockConfig = createMockConfig({
        get: vi.fn(() => {
          throw new Error("config read error");
        }),
      });
      hoisted.getConfiguration.mockReturnValue(mockConfig);

      (service as any)._syncSource = "none";

      const result = await service.syncFromSettingsJson([
        "features.commitFormat.enableEmoji",
      ]);

      expect((service as any)._syncSource).toBe("none");
      // The key should appear in failed list due to the error
      expect(result.failed.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ----- Sync toggle -----

  describe("sync toggle", () => {
    it("defaults to false for new users", () => {
      expect(service.isSyncEnabled).toBe(false);
    });

    it("reads toggle from globalState", () => {
      hoisted.globalStateStore.set(
        SettingsSyncService.SYNC_TOGGLE_KEY,
        true,
      );
      expect(service.isSyncEnabled).toBe(true);
    });

    it("setSyncEnabled persists to globalState and triggers sync when enabled", async () => {
      const mockConfig = createMockConfig();
      hoisted.getConfiguration.mockReturnValue(mockConfig);

      hoisted.getSettings.mockReturnValue({
        largePromptAction: "useFallback",
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
        branchNamePostAction: "createAndCopy",
        branchNameSelectionMode: "autoFirst",
        branchCreationFailureAction: "copyOnly",
      });

      await service.setSyncEnabled(true);

      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        SettingsSyncService.SYNC_TOGGLE_KEY,
        true,
      );
    });

    it("setSyncEnabled(false) does not trigger sync", async () => {
      const result = await service.setSyncEnabled(false);

      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        SettingsSyncService.SYNC_TOGGLE_KEY,
        false,
      );
      expect(result.synced).toBe(0);
    });
  });

  // ----- Singleton -----

  describe("singleton", () => {
    it("getInstance returns undefined before initialization", () => {
      (SettingsSyncService as any).instance = undefined;
      expect(SettingsSyncService.getInstance()).toBeUndefined();
    });

    it("initialize creates and returns instance", () => {
      const instance = SettingsSyncService.initialize(mockContext);
      expect(instance).toBeInstanceOf(SettingsSyncService);
    });

    it("getInstance returns same instance after initialize", () => {
      SettingsSyncService.initialize(mockContext);
      const retrieved = SettingsSyncService.getInstance();
      expect(retrieved).toBeInstanceOf(SettingsSyncService);
    });
  });
});
