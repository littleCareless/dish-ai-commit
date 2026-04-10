import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { PromptKey, PromptCategory } from "@shared/types/prompts";

// ---------------------------------------------------------------------------
// Hoisted mock state -- must use vi.hoisted() so mock factories can reference
// them after vi.mock() hoisting.
// ---------------------------------------------------------------------------

const {
  mockGlobalStore,
  mockConfigStore,
  mockConfigInspectStore,
  mockWorkspaceFolders,
  mockFsFiles,
} = vi.hoisted(() => ({
  mockGlobalStore: new Map<string, unknown>(),
  mockConfigStore: new Map<string, unknown>(),
  mockConfigInspectStore: new Map<string, unknown>(),
  mockWorkspaceFolders: [] as Array<{
    uri: { fsPath: string; path: string; toString(): string };
    name: string;
    index: number;
  }>,
  mockFsFiles: new Map<string, string>(),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("vscode", () => ({
  workspace: {
    getConfiguration: (_section?: string) => ({
      get: (key: string, defaultValue?: unknown) =>
        mockConfigStore.has(key) ? mockConfigStore.get(key) : defaultValue,
      update: async (key: string, value: unknown) => {
        if (value === undefined) {
          mockConfigStore.delete(key);
        } else {
          mockConfigStore.set(key, value);
        }
      },
      has: (key: string) => mockConfigStore.has(key),
      inspect: (key: string) => ({
        workspaceValue: mockConfigInspectStore.get(key),
      }),
      keys: () => [...mockConfigStore.keys()],
    }),
    workspaceFolders: mockWorkspaceFolders,
    getWorkspaceFolder: () => mockWorkspaceFolders[0] ?? undefined,
    onDidChangeConfiguration: () => ({ dispose: () => {} }),
  },
  ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
  extensions: {
    getExtension: () => undefined,
    all: [],
  },
}));

vi.mock("@/utils/state/state-manager", () => ({
  stateManager: {
    getGlobal: <T>(key: string, defaultValue?: T): T => {
      if (mockGlobalStore.has(key)) {
        return mockGlobalStore.get(key) as T;
      }
      return defaultValue as T;
    },
    setGlobal: async (key: string, value: unknown) => {
      mockGlobalStore.set(key, value);
    },
    _context: { globalState: new Map() },
  },
}));

vi.mock("@/services/settings/active-prompt-store", () => ({
  ActivePromptStore: {
    getInstance: () => ({
      initialize: async () => {},
      getActivePrompts: async () => ({}),
      getActivePromptsBySubCategory: async () => ({}),
    }),
  },
}));

vi.mock("@/services/core/workspace-manager", () => ({
  workspaceManager: {
    getWorkspaceId: () => "test-workspace-id",
  },
}));

vi.mock("@/utils/logger", () => ({
  Logger: {
    getInstance: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      logOperationStart: vi.fn(),
      logOperationEnd: vi.fn(),
      logError: vi.fn(),
    }),
  },
}));

vi.mock("fs", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("fs");
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: (p: string) => mockFsFiles.has(p),
      promises: {
        readdir: async () => [],
        readFile: async (filePath: string) => {
          if (mockFsFiles.has(filePath)) {
            return mockFsFiles.get(filePath);
          }
          throw new Error(`ENOENT: no such file '${filePath}'`);
        },
      },
    },
    existsSync: (p: string) => mockFsFiles.has(p),
    promises: {
      readdir: async () => [],
      readFile: async (filePath: string) => {
        if (mockFsFiles.has(filePath)) {
          return mockFsFiles.get(filePath);
        }
        throw new Error(`ENOENT: no such file '${filePath}'`);
      },
    },
  };
});

// ---------------------------------------------------------------------------
// Import after mocks are set up
// ---------------------------------------------------------------------------

import { PromptManagerService } from "@/services/core/prompt-manager-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reset the singleton so each test gets a fresh instance with clean state.
 */
function resetSingleton(): void {
  // @ts-expect-error accessing private static for test reset
  PromptManagerService.instance = undefined;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PromptManagerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGlobalStore.clear();
    mockConfigStore.clear();
    mockConfigInspectStore.clear();
    mockWorkspaceFolders.length = 0;
    mockFsFiles.clear();
    resetSingleton();
  });

  afterEach(() => {
    resetSingleton();
  });

  // -------------------------------------------------------------------------
  // Singleton
  // -------------------------------------------------------------------------

  describe("getInstance", () => {
    it("returns a singleton instance", () => {
      const a = PromptManagerService.getInstance();
      const b = PromptManagerService.getInstance();
      expect(a).toBe(b);
    });
  });

  // -------------------------------------------------------------------------
  // getPromptDetail -- source priority
  // -------------------------------------------------------------------------

  describe("getPromptDetail -- source priority", () => {
    it("returns default source when no customizations exist", async () => {
      const svc = PromptManagerService.getInstance();
      // Wait for initialization
      await (svc as any).initializationPromise;

      const detail = svc.getPromptDetail(PromptKey.GenerateCommitSystem);
      expect(detail.source).toBe("default");
      expect(detail.isCustomized).toBe(false);
      // isNew is true because loadDefaultPrompts finds no prompt files in test env
      expect(detail.isNew).toBe(true);
    });

    it("returns global source when global customization exists", async () => {
      const svc = PromptManagerService.getInstance();
      await (svc as any).initializationPromise;

      // Set a global custom prompt
      const prompts: Record<string, string> = {};
      prompts[PromptKey.GenerateCommitSystem] = "custom global prompt";
      mockGlobalStore.set("dish_config_prompts", prompts);

      const detail = svc.getPromptDetail(PromptKey.GenerateCommitSystem);
      expect(detail.source).toBe("global");
      expect(detail.content).toBe("custom global prompt");
      expect(detail.isCustomized).toBe(true);
    });

    it("prefers workspace source over global source", async () => {
      const svc = PromptManagerService.getInstance();
      await (svc as any).initializationPromise;

      // Set global
      const globalPrompts: Record<string, string> = {};
      globalPrompts[PromptKey.GenerateCommitSystem] = "global prompt";
      mockGlobalStore.set("dish_config_prompts", globalPrompts);

      // Set workspace (higher priority)
      mockConfigInspectStore.set(
        PromptKey.GenerateCommitSystem,
        "workspace prompt",
      );

      const detail = svc.getPromptDetail(PromptKey.GenerateCommitSystem);
      expect(detail.source).toBe("workspace");
      expect(detail.content).toBe("workspace prompt");
    });

    it("marks key as new when not in default prompts", async () => {
      const svc = PromptManagerService.getInstance();
      await (svc as any).initializationPromise;

      const detail = svc.getPromptDetail("custom-unknown-key");
      expect(detail.isNew).toBe(true);
      expect(detail.content).toBe("");
    });

    it("provides correct category for known prompt keys", async () => {
      const svc = PromptManagerService.getInstance();
      await (svc as any).initializationPromise;

      const detail = svc.getPromptDetail(PromptKey.GenerateCommitSystem);
      expect(detail.category).toBe(PromptCategory.Commit);
    });

    it("provides correct category for code review keys", async () => {
      const svc = PromptManagerService.getInstance();
      await (svc as any).initializationPromise;

      const detail = svc.getPromptDetail(PromptKey.CodeReviewSystem);
      expect(detail.category).toBe(PromptCategory.CodeReview);
    });
  });

  // -------------------------------------------------------------------------
  // updatePrompt / deletePrompt / resetPrompt
  // -------------------------------------------------------------------------

  describe("updatePrompt", () => {
    it("stores prompt at global level in globalState", async () => {
      const svc = PromptManagerService.getInstance();
      await (svc as any).initializationPromise;

      await svc.updatePrompt(
        PromptKey.GenerateCommitSystem,
        "updated global content",
        1, // Global
      );

      const stored = mockGlobalStore.get("dish_config_prompts") as Record<
        string,
        string
      >;
      expect(stored[PromptKey.GenerateCommitSystem]).toBe(
        "updated global content",
      );
    });

    it("stores prompt at workspace level in workspace configuration", async () => {
      const svc = PromptManagerService.getInstance();
      await (svc as any).initializationPromise;

      // Workspace target uses vscode.workspace.getConfiguration().update()
      await svc.updatePrompt(
        PromptKey.GenerateCommitSystem,
        "workspace content",
        2, // Workspace
      );

      // The value should be stored in mockConfigStore via the mock getConfiguration
      expect(mockConfigStore.has(PromptKey.GenerateCommitSystem)).toBe(true);
      expect(mockConfigStore.get(PromptKey.GenerateCommitSystem)).toBe(
        "workspace content",
      );
    });
  });

  describe("deletePrompt", () => {
    it("removes prompt from global state", async () => {
      const svc = PromptManagerService.getInstance();
      await (svc as any).initializationPromise;

      // Set it first
      const prompts: Record<string, string> = {};
      prompts[PromptKey.GenerateCommitSystem] = "to be deleted";
      mockGlobalStore.set("dish_config_prompts", prompts);

      await svc.deletePrompt(PromptKey.GenerateCommitSystem, 1); // Global

      const stored = mockGlobalStore.get("dish_config_prompts") as Record<
        string,
        string
      >;
      expect(stored[PromptKey.GenerateCommitSystem]).toBeUndefined();
    });
  });

  describe("resetPrompt", () => {
    it("removes prompt from global state on reset", async () => {
      const svc = PromptManagerService.getInstance();
      await (svc as any).initializationPromise;

      const prompts: Record<string, string> = {};
      prompts[PromptKey.GenerateCommitSystem] = "custom";
      mockGlobalStore.set("dish_config_prompts", prompts);

      await svc.resetPrompt(PromptKey.GenerateCommitSystem, 1); // Global

      const stored = mockGlobalStore.get("dish_config_prompts") as Record<
        string,
        string
      >;
      expect(stored[PromptKey.GenerateCommitSystem]).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // resetAllPrompts
  // -------------------------------------------------------------------------

  describe("resetAllPrompts", () => {
    it("clears all global prompts", async () => {
      const svc = PromptManagerService.getInstance();
      await (svc as any).initializationPromise;

      const prompts: Record<string, string> = {
        key1: "value1",
        key2: "value2",
      };
      mockGlobalStore.set("dish_config_prompts", prompts);

      await svc.resetAllPrompts(1); // Global

      const stored = mockGlobalStore.get("dish_config_prompts") as Record<
        string,
        string
      >;
      expect(stored).toEqual({});
    });
  });

  // -------------------------------------------------------------------------
  // Prompt metadata
  // -------------------------------------------------------------------------

  describe("updatePromptMetadata / deletePromptMetadata", () => {
    it("stores and retrieves prompt category metadata", async () => {
      const svc = PromptManagerService.getInstance();
      await (svc as any).initializationPromise;

      await svc.updatePromptMetadata(
        "my-custom-prompt",
        PromptCategory.Commit,
      );

      const stored = mockGlobalStore.get(
        "dish_config_prompt_metadata",
      ) as Record<string, any>;
      expect(stored["my-custom-prompt"].category).toBe(PromptCategory.Commit);
    });

    it("stores subCategory and title metadata", async () => {
      const svc = PromptManagerService.getInstance();
      await (svc as any).initializationPromise;

      await svc.updatePromptMetadataWithSubCategory(
        "my-prompt",
        PromptCategory.Commit,
        "subTypeA" as any,
        "My Title",
      );

      const stored = mockGlobalStore.get(
        "dish_config_prompt_metadata",
      ) as Record<string, any>;
      expect(stored["my-prompt"]).toEqual({
        category: PromptCategory.Commit,
        subCategory: "subTypeA",
        title: "My Title",
      });
    });

    it("deletes prompt metadata", async () => {
      const svc = PromptManagerService.getInstance();
      await (svc as any).initializationPromise;

      mockGlobalStore.set("dish_config_prompt_metadata", {
        "my-prompt": { category: PromptCategory.Commit },
      });

      await svc.deletePromptMetadata("my-prompt");

      const stored = mockGlobalStore.get(
        "dish_config_prompt_metadata",
      ) as Record<string, any>;
      expect(stored["my-prompt"]).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // getAllPrompts
  // -------------------------------------------------------------------------

  describe("getAllPrompts", () => {
    it("returns all default PromptKey entries", async () => {
      const svc = PromptManagerService.getInstance();
      const all = await svc.getAllPrompts();

      const keys = Object.keys(all);
      // Should contain all enum values
      expect(keys).toContain(PromptKey.GenerateCommitSystem);
      expect(keys).toContain(PromptKey.GenerateCommitSimple);
      expect(keys).toContain(PromptKey.CodeReviewSystem);
      expect(keys).toContain(PromptKey.PRSummarySystem);
    });

    it("includes custom global prompts", async () => {
      const svc = PromptManagerService.getInstance();

      const prompts: Record<string, string> = {
        "my-custom": "custom content",
      };
      mockGlobalStore.set("dish_config_prompts", prompts);

      const all = await svc.getAllPrompts();
      expect(all["my-custom"]).toBeDefined();
      expect(all["my-custom"].content).toBe("custom content");
    });
  });

  // -------------------------------------------------------------------------
  // setExtensionContext (backward compatibility stub)
  // -------------------------------------------------------------------------

  describe("setExtensionContext", () => {
    it("does not throw when called", async () => {
      const svc = PromptManagerService.getInstance();
      await (svc as any).initializationPromise;

      expect(() =>
        svc.setExtensionContext({} as any),
      ).not.toThrow();
    });
  });
});
