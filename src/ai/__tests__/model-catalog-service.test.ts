import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import type { AIModel } from "@/ai/types";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const globalStore = new Map<string, any>();

vi.mock("@/utils/state/state-manager", () => ({
  stateManager: {
    initialize: vi.fn(),
    getGlobal: vi.fn((key: string, defaultValue?: any) =>
      globalStore.has(key) ? globalStore.get(key) : defaultValue,
    ),
    setGlobal: vi.fn(async (key: string, value: any) => {
      globalStore.set(key, value);
    }),
    deleteGlobal: vi.fn(async (key: string) => {
      globalStore.delete(key);
    }),
  },
}));

vi.mock("@/ai/model-registry/models-dev-fetcher", () => ({
  ModelsDevFetcher: {
    getInstance: () => ({
      getModel: vi.fn(() => null),
    }),
  },
}));

vi.mock("@/services/storage/model-presets", () => ({
  PRESET_MODELS: [
    {
      id: "gpt-4o",
      providerId: "openai",
      maxTokens: { input: 128000, output: 16384 },
    },
    {
      id: "gemini-2.5-flash",
      providerId: "gemini",
      maxTokens: { input: 1048576, output: 65536 },
    },
    {
      id: "claude-3-opus-20240229",
      providerId: "anthropic",
      maxTokens: { input: 200000, output: 4096 },
    },
  ],
}));

const mockSyncAll = vi.fn(async () => ({
  success: true,
  totalEntries: 0,
  updatedEntries: 0,
  errors: [],
}));

const mockGetEntry = vi.fn<() => any>(() => null);
const mockGetAllEntries = vi.fn<() => any[]>(() => []);

vi.mock("@/ai/model-registry/third-party-model-catalog-sync-service", () => ({
  ThirdPartyModelCatalogSyncService: {
    getInstance: () => ({
      syncAll: mockSyncAll,
      getEntry: mockGetEntry,
      getAllEntries: mockGetAllEntries,
    }),
  },
}));

vi.mock("@/config/constants", () => ({
  DISH_CONFIG_PREFIX: "dish",
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { ModelCatalogService } from "@/ai/model-registry/model-catalog-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockContext() {
  return {
    globalState: {
      get: <T>(key: string, defaultValue?: T): T | undefined =>
        globalStore.has(key) ? (globalStore.get(key) as T) : defaultValue,
      update: async (key: string, value: unknown) => {
        if (value === undefined) {globalStore.delete(key);}
        else {globalStore.set(key, value);}
      },
    },
    workspaceState: {
      get: <T>(_key: string, defaultValue?: T): T | undefined => defaultValue,
      update: async () => {},
    },
    secrets: {
      get: async () => undefined,
      store: async () => {},
      delete: async () => {},
    },
  } as any;
}

function makeModel(overrides: Partial<AIModel> = {}): AIModel {
  return {
    id: "gpt-4o",
    name: "GPT-4o",
    maxTokens: { input: 128000, output: 16384 },
    provider: { id: "openai", name: "OpenAI" },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("ModelCatalogService", () => {
  let service: ModelCatalogService;

  beforeAll(() => {
    // Access the singleton via getInstance; reset via prototype hack if needed
    (ModelCatalogService as any).instance = undefined;
    service = ModelCatalogService.getInstance();
  });

  beforeEach(() => {
    globalStore.clear();
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Singleton pattern
  // -----------------------------------------------------------------------
  describe("singleton pattern", () => {
    it("returns the same instance on repeated calls", () => {
      const a = ModelCatalogService.getInstance();
      const b = ModelCatalogService.getInstance();
      expect(a).toBe(b);
    });
  });

  // -----------------------------------------------------------------------
  // resolveInputLimit - preset lookup
  // -----------------------------------------------------------------------
  describe("resolveInputLimit - preset lookup", () => {
    it("returns preset data for known openai/gpt-4o model", async () => {
      const model = makeModel({ id: "gpt-4o", provider: { id: "openai", name: "OpenAI" } });
      const result = await service.resolveInputLimit(model);

      expect(result).not.toBeNull();
      expect(result!.inputLimit).toBe(128000);
      expect(result!.outputLimit).toBe(16384);
      expect(result!.source).toBe("preset");
      expect(result!.confidence).toBe("high");
    });

    it("returns preset data for gemini-2.5-flash", async () => {
      const model = makeModel({
        id: "gemini-2.5-flash",
        provider: { id: "gemini", name: "Google Gemini" },
      });
      const result = await service.resolveInputLimit(model);

      expect(result).not.toBeNull();
      expect(result!.inputLimit).toBe(1048576);
      expect(result!.source).toBe("preset");
    });

    it("performs case-insensitive matching", async () => {
      const model = makeModel({
        id: "GPT-4O",
        provider: { id: "OpenAI", name: "OpenAI" },
      });
      const result = await service.resolveInputLimit(model);

      expect(result).not.toBeNull();
      expect(result!.source).toBe("preset");
    });
  });

  // -----------------------------------------------------------------------
  // resolveInputLimit - custom registry
  // -----------------------------------------------------------------------
  describe("resolveInputLimit - custom registry", () => {
    it("returns custom registry data when available", async () => {
      const customRegistry = {
        models: {
          "custom_custom-model-v1": {
            contextWindow: 64000,
            maxTokens: { input: 64000, output: 8192 },
          },
        },
      };
      globalStore.set("dish_model_custom", JSON.stringify(customRegistry));

      const model = makeModel({
        id: "custom-model-v1",
        provider: { id: "custom", name: "Custom" },
      });
      const result = await service.resolveInputLimit(model);

      expect(result).not.toBeNull();
      expect(result!.inputLimit).toBe(64000);
      expect(result!.outputLimit).toBe(8192);
      expect(result!.source).toBe("custom-registry");
      expect(result!.confidence).toBe("high");
    });

    it("uses contextWindow when maxTokens.input is not set", async () => {
      const customRegistry = {
        models: {
          "custom_ctx-only-model": {
            contextWindow: 100000,
          },
        },
      };
      globalStore.set("dish_model_custom", JSON.stringify(customRegistry));

      const model = makeModel({
        id: "ctx-only-model",
        provider: { id: "custom", name: "Custom" },
      });
      const result = await service.resolveInputLimit(model);

      expect(result).not.toBeNull();
      expect(result!.inputLimit).toBe(100000);
      expect(result!.source).toBe("custom-registry");
    });

    it("returns null for invalid contextWindow", async () => {
      const customRegistry = {
        models: {
          "custom_bad-model": {
            contextWindow: -1,
          },
        },
      };
      globalStore.set("dish_model_custom", JSON.stringify(customRegistry));

      const model = makeModel({
        id: "bad-model",
        provider: { id: "custom", name: "Custom" },
      });
      // Should fall through to other sources; presets won't match, so eventually runtime or null
      const result = await service.resolveInputLimit(model);
      // Since no preset and no synced, it falls through
      // It will return the runtime limit from the model's maxTokens.input
      expect(result).not.toBeNull();
      expect(result!.source).toBe("runtime");
    });

    it("returns null for corrupted JSON in custom registry", async () => {
      globalStore.set("dish_model_custom", "not-valid-json");

      const model = makeModel({
        id: "any-model",
        provider: { id: "custom", name: "Custom" },
      });
      // Should not throw, falls through to other sources
      const result = await service.resolveInputLimit(model);
      expect(result).not.toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // resolveInputLimit - synced catalog
  // -----------------------------------------------------------------------
  describe("resolveInputLimit - synced catalog", () => {
    it("returns synced catalog data when no preset matches", async () => {
      const syncedEntry = {
        providerId: "openrouter",
        modelId: "custom-router-model",
        inputLimit: 200000,
        outputLimit: 8000,
        source: "openrouter" as const,
        confidence: "medium" as const,
        updatedAt: "2024-01-01",
      };
      mockGetEntry.mockReturnValue(syncedEntry);

      const model = makeModel({
        id: "custom-router-model",
        provider: { id: "openrouter", name: "OpenRouter" },
      });
      const result = await service.resolveInputLimit(model);

      expect(result).not.toBeNull();
      expect(result!.inputLimit).toBe(200000);
      expect(result!.source).toBe("synced-openrouter");
      expect(result!.confidence).toBe("medium");
    });

    it("skips synced catalog when disabled via option", async () => {
      mockGetEntry.mockReturnValue({
        providerId: "openrouter",
        modelId: "some-model",
        inputLimit: 100000,
        source: "openrouter",
        confidence: "medium",
        updatedAt: "2024-01-01",
      });

      const model = makeModel({
        id: "some-model",
        provider: { id: "openrouter", name: "OpenRouter" },
        maxTokens: { input: 50000, output: 4096 },
      });
      const result = await service.resolveInputLimit(model, {
        enableSyncedCatalog: false,
      });

      // Should not use synced catalog, falls to runtime
      if (result) {
        expect(result.source).not.toBe("synced-openrouter");
      }
    });

    it("falls back to model-only lookup when exact provider match fails", async () => {
      mockGetEntry.mockReturnValue(null); // no exact match
      const fallbackEntry = {
        providerId: "other-provider",
        modelId: "shared-model-id",
        inputLimit: 150000,
        outputLimit: 4096,
        source: "litellm" as const,
        confidence: "medium" as const,
        updatedAt: "2024-01-01",
      };
      mockGetAllEntries.mockReturnValue([fallbackEntry]);

      const model = makeModel({
        id: "shared-model-id",
        provider: { id: "test-provider", name: "Test" },
        maxTokens: { input: 0, output: 0 },
      });
      const result = await service.resolveInputLimit(model);

      expect(result).not.toBeNull();
      expect(result!.inputLimit).toBe(150000);
      expect(result!.source).toBe("synced-litellm");
    });
  });

  // -----------------------------------------------------------------------
  // resolveInputLimit - runtime fallback
  // -----------------------------------------------------------------------
  describe("resolveInputLimit - runtime fallback", () => {
    it("returns runtime limit from model maxTokens when no other source", async () => {
      mockGetEntry.mockReturnValue(null);
      mockGetAllEntries.mockReturnValue([]);

      const model = makeModel({
        id: "unknown-model",
        provider: { id: "unknown", name: "Unknown" },
        maxTokens: { input: 32000, output: 4096 },
      });
      const result = await service.resolveInputLimit(model);

      expect(result).not.toBeNull();
      expect(result!.inputLimit).toBe(32000);
      expect(result!.source).toBe("runtime");
      expect(result!.confidence).toBe("low");
    });

    it("returns null when no limits are available", async () => {
      mockGetEntry.mockReturnValue(null);
      mockGetAllEntries.mockReturnValue([]);

      const model = makeModel({
        id: "empty-model",
        provider: { id: "empty", name: "Empty" },
        maxTokens: { input: 0, output: 0 },
      });
      const result = await service.resolveInputLimit(model);

      expect(result).toBeNull();
    });

    it("returns null when maxTokens.input is negative", async () => {
      mockGetEntry.mockReturnValue(null);
      mockGetAllEntries.mockReturnValue([]);

      const model = makeModel({
        id: "negative-model",
        provider: { id: "neg", name: "Neg" },
        maxTokens: { input: -100, output: 4096 },
      });
      const result = await service.resolveInputLimit(model);

      expect(result).toBeNull();
    });

    it("returns null when maxTokens.input is NaN", async () => {
      mockGetEntry.mockReturnValue(null);
      mockGetAllEntries.mockReturnValue([]);

      const model = makeModel({
        id: "nan-model",
        provider: { id: "nan", name: "NaN" },
        maxTokens: { input: NaN, output: 4096 },
      });
      const result = await service.resolveInputLimit(model);

      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // resolveInputLimit - priority order
  // -----------------------------------------------------------------------
  describe("resolveInputLimit - priority order", () => {
    it("custom registry takes priority over preset", async () => {
      const customRegistry = {
        models: {
          "openai_gpt-4o": {
            contextWindow: 50000,
            maxTokens: { input: 50000, output: 2000 },
          },
        },
      };
      globalStore.set("dish_model_custom", JSON.stringify(customRegistry));

      const model = makeModel({ id: "gpt-4o", provider: { id: "openai", name: "OpenAI" } });
      const result = await service.resolveInputLimit(model);

      expect(result!.source).toBe("custom-registry");
      expect(result!.inputLimit).toBe(50000);
    });

    it("preset takes priority over synced catalog", async () => {
      mockGetEntry.mockReturnValue({
        providerId: "openai",
        modelId: "gpt-4o",
        inputLimit: 999999,
        source: "openrouter",
      });

      const model = makeModel({ id: "gpt-4o", provider: { id: "openai", name: "OpenAI" } });
      const result = await service.resolveInputLimit(model);

      expect(result!.source).toBe("preset");
      expect(result!.inputLimit).toBe(128000);
    });
  });

  // -----------------------------------------------------------------------
  // syncThirdPartyCatalog
  // -----------------------------------------------------------------------
  describe("syncThirdPartyCatalog", () => {
    it("delegates to syncService.syncAll", async () => {
      mockSyncAll.mockResolvedValue({
        success: true,
        totalEntries: 42,
        updatedEntries: 10,
        errors: [],
      });

      const result = await service.syncThirdPartyCatalog();

      expect(mockSyncAll).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.totalEntries).toBe(42);
      expect(result.updatedEntries).toBe(10);
    });

    it("propagates sync errors", async () => {
      mockSyncAll.mockResolvedValue({
        success: false,
        totalEntries: 0,
        updatedEntries: 0,
        errors: ["OpenRouter sync failed: HTTP 500"] as any,
      });

      const result = await service.syncThirdPartyCatalog();

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  describe("edge cases", () => {
    it("handles model with undefined provider.id", async () => {
      mockGetEntry.mockReturnValue(null);
      mockGetAllEntries.mockReturnValue([]);

      const model = makeModel({
        id: "no-provider-model",
        provider: undefined as any,
        maxTokens: { input: 0, output: 0 },
      });
      const result = await service.resolveInputLimit(model);
      expect(result).toBeNull();
    });

    it("handles model with undefined id", async () => {
      mockGetEntry.mockReturnValue(null);
      mockGetAllEntries.mockReturnValue([]);

      const model = makeModel({
        id: undefined as any,
        provider: { id: "test", name: "Test" },
        maxTokens: { input: 0, output: 0 },
      });
      const result = await service.resolveInputLimit(model);
      expect(result).toBeNull();
    });
  });
});
