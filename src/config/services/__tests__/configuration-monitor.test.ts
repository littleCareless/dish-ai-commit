import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks (must be at module level before vi.mock calls)
// ---------------------------------------------------------------------------

const hoisted = vi.hoisted(() => {
  const onDidChangeConfigurationListeners: Array<(e: any) => void> = [];
  let capturedDisposable: { dispose(): void } = { dispose: vi.fn() };

  return {
    // ConfigurationService mock
    refreshConfiguration: vi.fn(),

    // ConfigurationChangeHandler mock
    getChangedConfigurationKeys: vi.fn(),
    notifyHandlers: vi.fn(),

    // SettingsSyncService mock
    syncFromSettingsJson: vi.fn(async () => ({
      synced: 0,
      failed: [],
      skipped: 0,
    })),
    syncProvidersFromSettingsJson: vi.fn(async () => ({
      synced: 0,
      failed: [],
      skipped: 0,
    })),
    getInstance: vi.fn(),

    // Listener tracking
    onDidChangeConfigurationListeners,
    capturedDisposable,
    setCapturedDisposable: (d: { dispose(): void }) => {
      capturedDisposable = d;
    },
    getCapturedDisposable: () => capturedDisposable,
  };
});

// ---------------------------------------------------------------------------
// Override vscode.workspace.onDidChangeConfiguration with a mockable version
// ---------------------------------------------------------------------------

vi.mock("vscode", async (importOriginal) => {
  const original = await importOriginal<typeof import("vscode")>();
  return {
    ...original,
    workspace: {
      ...(original as any).workspace,
      onDidChangeConfiguration: vi.fn((cb: (e: any) => void) => {
        hoisted.onDidChangeConfigurationListeners.push(cb);
        const disposable = { dispose: vi.fn() };
        hoisted.setCapturedDisposable(disposable);
        return disposable;
      }),
    },
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/config/services/configuration-service", () => ({
  ConfigurationService: vi.fn(),
}));

vi.mock("@/config/services/configuration-change-handler", () => ({
  ConfigurationChangeHandler: vi.fn(),
}));

vi.mock("@/config/services/settings-sync-service", () => ({
  SettingsSyncService: {
    getInstance: hoisted.getInstance,
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { ConfigurationMonitor } from "@/config/services/configuration-monitor";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simulate VS Code firing onDidChangeConfiguration by calling
 * the registered listener with the given changed keys.
 */
function fireConfigChange(changedKeys: string[]) {
  hoisted.getChangedConfigurationKeys.mockReturnValue(changedKeys);
  for (const listener of hoisted.onDidChangeConfigurationListeners) {
    listener({});
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ConfigurationMonitor", () => {
  let monitor: ConfigurationMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.onDidChangeConfigurationListeners.length = 0;

    // Default: SettingsSyncService instance exists
    hoisted.getInstance.mockReturnValue({
      syncFromSettingsJson: hoisted.syncFromSettingsJson,
      syncProvidersFromSettingsJson: hoisted.syncProvidersFromSettingsJson,
    });

    const configService = { refreshConfiguration: hoisted.refreshConfiguration };
    const changeHandler = {
      getChangedConfigurationKeys: hoisted.getChangedConfigurationKeys,
      notifyHandlers: hoisted.notifyHandlers,
    };

    monitor = new ConfigurationMonitor(configService as any, changeHandler as any);
  });

  // ----- Provider key routing -----

  describe("provider key routing", () => {
    it("triggers provider sync when providers.* keys change", () => {
      monitor.handleConfigurationChange(["providers.openai.apiKey"]);

      expect(hoisted.notifyHandlers).toHaveBeenCalledWith([
        "providers.openai.apiKey",
      ]);
      expect(hoisted.syncProvidersFromSettingsJson).toHaveBeenCalledWith([
        "providers.openai.apiKey",
      ]);
    });

    it("triggers provider sync for multiple provider keys", () => {
      monitor.handleConfigurationChange([
        "providers.openai.apiKey",
        "providers.openai.baseUrl",
      ]);

      expect(hoisted.syncProvidersFromSettingsJson).toHaveBeenCalledWith([
        "providers.openai.apiKey",
        "providers.openai.baseUrl",
      ]);
    });
  });

  // ----- Base config routing -----

  describe("base config routing", () => {
    it("triggers base sync when base.* keys change", () => {
      monitor.handleConfigurationChange(["base.language"]);

      expect(hoisted.notifyHandlers).toHaveBeenCalledWith(["base.language"]);
      expect(hoisted.syncFromSettingsJson).toHaveBeenCalledWith([
        "base.language",
      ]);
    });
  });

  // ----- Features routing -----

  describe("features routing", () => {
    it("triggers features sync when features.* keys change", () => {
      const callback = vi.fn();
      monitor.onExternalFeaturesChange = callback;

      monitor.handleConfigurationChange(["features.codeAnalysis.diffTarget"]);

      expect(hoisted.notifyHandlers).toHaveBeenCalledWith([
        "features.codeAnalysis.diffTarget",
      ]);
      // onExternalFeaturesChange is called with feature keys only
      expect(callback).toHaveBeenCalledWith([
        "features.codeAnalysis.diffTarget",
      ]);
      // syncFromSettingsJson is also called
      expect(hoisted.syncFromSettingsJson).toHaveBeenCalledWith([
        "features.codeAnalysis.diffTarget",
      ]);
    });

    it("filters only features.* keys for onExternalFeaturesChange callback", () => {
      const callback = vi.fn();
      monitor.onExternalFeaturesChange = callback;

      monitor.handleConfigurationChange([
        "base.language",
        "features.enableEmoji",
        "features.codeReview",
      ]);

      expect(callback).toHaveBeenCalledWith([
        "features.enableEmoji",
        "features.codeReview",
      ]);
    });
  });

  // ----- Mixed key handling -----

  describe("mixed key handling", () => {
    it("triggers multiple handlers for mixed key types", () => {
      const callback = vi.fn();
      monitor.onExternalFeaturesChange = callback;

      const changedKeys = [
        "providers.openai.apiKey",
        "base.language",
        "features.codeReview",
      ];

      monitor.handleConfigurationChange(changedKeys);

      // All handlers notified
      expect(hoisted.notifyHandlers).toHaveBeenCalledWith(changedKeys);
      // Provider sync triggered
      expect(hoisted.syncProvidersFromSettingsJson).toHaveBeenCalledWith([
        "providers.openai.apiKey",
      ]);
      // Base/Features sync triggered
      expect(hoisted.syncFromSettingsJson).toHaveBeenCalledWith(changedKeys);
      // Features callback triggered with only feature keys
      expect(callback).toHaveBeenCalledWith(["features.codeReview"]);
    });
  });

  // ----- Unknown key filtering -----

  describe("unknown key filtering", () => {
    it("does not trigger provider/base/features sync for unknown keys", () => {
      const callback = vi.fn();
      monitor.onExternalFeaturesChange = callback;

      monitor.handleConfigurationChange(["unknown.key", "another.random"]);

      // notifyHandlers is always called (generic dispatch)
      expect(hoisted.notifyHandlers).toHaveBeenCalledWith([
        "unknown.key",
        "another.random",
      ]);
      // But no specific handler fires
      expect(hoisted.syncProvidersFromSettingsJson).not.toHaveBeenCalled();
      expect(hoisted.syncFromSettingsJson).not.toHaveBeenCalled();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  // ----- Dispose -----

  describe("dispose", () => {
    it("cleans all listeners on dispose", () => {
      const disposable = hoisted.getCapturedDisposable();
      monitor.dispose();

      // The disposable registered in constructor should have dispose called
      expect(disposable.dispose).toHaveBeenCalled();
    });
  });

  // ----- Constructor listener registration -----

  describe("constructor", () => {
    it("registers onDidChangeConfiguration listener during construction", () => {
      expect(hoisted.onDidChangeConfigurationListeners.length).toBe(1);
    });

    it("refreshes configuration and handles changes when keys change", () => {
      fireConfigChange(["base.language"]);

      expect(hoisted.refreshConfiguration).toHaveBeenCalled();
      expect(hoisted.notifyHandlers).toHaveBeenCalledWith(["base.language"]);
    });

    it("does nothing when no keys changed", () => {
      fireConfigChange([]);

      // refreshConfiguration should NOT be called because changedKeys.length === 0
      // skips the body in the constructor listener
      expect(hoisted.refreshConfiguration).not.toHaveBeenCalled();
      expect(hoisted.notifyHandlers).not.toHaveBeenCalled();
    });
  });
});
