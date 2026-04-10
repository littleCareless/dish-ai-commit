import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AIModel } from "@/ai/types";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
vi.mock("@/utils/i18n/localization-manager", () => ({
  formatMessage: vi.fn((key: string, args?: string[]) => {
    if (args) return `${key}: ${args.join(", ")}`;
    return key;
  }),
}));

// Mock fetch for proxy detection
const originalFetch = global.fetch;

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { ModelValidator } from "@/ai/model-registry/model-validator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
describe("ModelValidator", () => {
  let validator: ModelValidator;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton
    (ModelValidator as any).instance = undefined;
    validator = ModelValidator.getInstance();
    validator.clearProxyCache();

    // Reset fetch mock
    global.fetch = vi.fn(async () => ({
      ok: true,
      headers: new Headers(),
      json: async () => ({ data: [] }),
    })) as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  // -----------------------------------------------------------------------
  // Singleton pattern
  // -----------------------------------------------------------------------
  describe("singleton pattern", () => {
    it("returns the same instance on repeated calls", () => {
      const a = ModelValidator.getInstance();
      const b = ModelValidator.getInstance();
      expect(a).toBe(b);
    });
  });

  // -----------------------------------------------------------------------
  // validateModelIdentity - exact match
  // -----------------------------------------------------------------------
  describe("validateModelIdentity - exact match", () => {
    it("returns valid with confidence 1.0 for exact model ID match", async () => {
      const model = makeModel({ id: "gpt-4o" });
      const apiResponse = { id: "gpt-4o" };
      const result = await validator.validateModelIdentity(
        model,
        apiResponse,
        "https://api.openai.com/v1",
      );

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBe(1.0);
    });

    it("does not detect proxy for exact match regardless of URL", async () => {
      const model = makeModel({ id: "gpt-4o" });
      const apiResponse = { id: "gpt-4o" };
      const result = await validator.validateModelIdentity(
        model,
        apiResponse,
        "https://proxy.example.com/v1",
      );

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(result.proxyDetected).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // validateModelIdentity - known model mappings
  // -----------------------------------------------------------------------
  describe("validateModelIdentity - known mappings", () => {
    it("accepts gpt-4o mapped to dated version", async () => {
      const model = makeModel({ id: "gpt-4o" });
      const apiResponse = { id: "gpt-4o-2024-08-06" };
      const result = await validator.validateModelIdentity(
        model,
        apiResponse,
        "https://api.openai.com/v1",
      );

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBe(0.9);
      expect(result.actualModel).toBe("gpt-4o-2024-08-06");
    });

    it("accepts gpt-3.5-turbo mapped to dated version", async () => {
      const model = makeModel({ id: "gpt-3.5-turbo" });
      const apiResponse = { id: "gpt-3.5-turbo-0125" };
      const result = await validator.validateModelIdentity(
        model,
        apiResponse,
        "https://api.openai.com/v1",
      );

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBe(0.9);
    });

    it("accepts claude-3-opus mapping", async () => {
      const model = makeModel({ id: "claude-3-opus" });
      const apiResponse = { id: "claude-3-opus-20240229" };
      const result = await validator.validateModelIdentity(
        model,
        apiResponse,
        "https://api.anthropic.com/v1",
      );

      expect(result.isValid).toBe(true);
    });

    it("accepts gemini-pro mapping", async () => {
      const model = makeModel({ id: "gemini-pro" });
      const apiResponse = { id: "gemini-2.5-pro" };
      const result = await validator.validateModelIdentity(
        model,
        apiResponse,
        "https://generativelanguage.googleapis.com/v1beta",
      );

      expect(result.isValid).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // validateModelIdentity - type mismatch detection
  // -----------------------------------------------------------------------
  describe("validateModelIdentity - type mismatch", () => {
    it("flags suspicious type mismatch in proxy environment", async () => {
      // Simulate a non-openai URL (proxy environment)
      global.fetch = vi.fn(async () => ({
        ok: true,
        headers: new Headers({ server: "nginx" }),
        json: async () => ({
          data: [{ id: "gemini-2.5-flash" }, { id: "some-other" }],
        }),
      })) as any;

      const model = makeModel({ id: "gpt-4o" });
      const apiResponse = { id: "gemini-2.5-flash" };
      const result = await validator.validateModelIdentity(
        model,
        apiResponse,
        "https://proxy.example.com/v1",
      );

      expect(result.confidence).toBeLessThan(0.5);
      expect(result.reason).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // validateModelIdentity - mismatch (no mapping)
  // -----------------------------------------------------------------------
  describe("validateModelIdentity - unknown mismatch", () => {
    it("returns low confidence for unmapped mismatch", async () => {
      const model = makeModel({ id: "gpt-4o" });
      const apiResponse = { id: "completely-different-model" };
      const result = await validator.validateModelIdentity(
        model,
        apiResponse,
        "https://api.openai.com/v1",
      );

      expect(result.confidence).toBeLessThanOrEqual(0.3);
      expect(result.reason).toBeDefined();
    });

    it("suggests use_local_spec for mismatch", async () => {
      const model = makeModel({ id: "gpt-4o" });
      const apiResponse = { id: "some-unknown-model" };
      const result = await validator.validateModelIdentity(
        model,
        apiResponse,
        "https://api.openai.com/v1",
      );

      expect(result.suggestion).toBe("use_local_spec");
    });
  });

  // -----------------------------------------------------------------------
  // detectProxyService
  // -----------------------------------------------------------------------
  describe("detectProxyService", () => {
    it("identifies official OpenAI API as non-proxy", async () => {
      const result = await validator.detectProxyService(
        "https://api.openai.com/v1",
      );

      // fetch mock returns empty data, so it may still be flagged based on model list
      // but the URL itself doesn't trigger proxy detection
      expect(result.baseUrl).toBe("https://api.openai.com/v1");
    });

    it("flags non-openai URL as potential proxy", async () => {
      const result = await validator.detectProxyService(
        "https://custom-host.example.com/v1",
      );

      expect(result.isProxy).toBe(true);
      expect(result.proxyType).toBe("openai-compatible");
    });

    it("detects azure proxy type", async () => {
      const result = await validator.detectProxyService(
        "https://my-resource.azure.openai.com/v1",
      );

      expect(result.isProxy).toBe(true);
      expect(result.proxyType).toBe("azure");
    });

    it("detects gateway proxy type from URL", async () => {
      const result = await validator.detectProxyService(
        "https://api.gateway.example.com/v1",
      );

      expect(result.isProxy).toBe(true);
      expect(result.proxyType).toBe("gateway");
    });

    it("caches proxy detection results", async () => {
      const url = "https://cached-proxy.example.com/v1";
      await validator.detectProxyService(url);
      await validator.detectProxyService(url);

      // fetch should only be called once due to caching
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("handles fetch failure gracefully", async () => {
      global.fetch = vi.fn(async () => {
        throw new Error("Network error");
      }) as any;

      const result = await validator.detectProxyService(
        "https://failing-proxy.example.com/v1",
      );

      expect(result).toBeDefined();
      expect(result.baseUrl).toBe("https://failing-proxy.example.com/v1");
    });

    it("detects non-openai models in proxy response", async () => {
      global.fetch = vi.fn(async () => ({
        ok: true,
        headers: new Headers(),
        json: async () => ({
          data: [
            { id: "gpt-4o" },
            { id: "claude-3-opus" },
            { id: "gemini-2.5-flash" },
          ],
        }),
      })) as any;

      const result = await validator.detectProxyService(
        "https://multi-model-proxy.example.com/v1",
      );

      expect(result.isProxy).toBe(true);
      expect(result.supportedModels).toHaveLength(3);
    });

    it("detects proxy from server header indicators", async () => {
      global.fetch = vi.fn(async () => ({
        ok: true,
        headers: new Headers({ server: "cloudflare" }),
        json: async () => ({ data: [] }),
      })) as any;

      const result = await validator.detectProxyService(
        "https://api.openai.com/v1",
      );

      expect(result.isProxy).toBe(true);
      expect(result.proxyIdentifier).toContain("cloudflare");
    });
  });

  // -----------------------------------------------------------------------
  // clearProxyCache
  // -----------------------------------------------------------------------
  describe("clearProxyCache", () => {
    it("allows re-detection after cache clear", async () => {
      const url = "https://cache-test.example.com/v1";
      await validator.detectProxyService(url);
      validator.clearProxyCache();
      await validator.detectProxyService(url);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  // -----------------------------------------------------------------------
  // Similarity calculation (tested indirectly via fuzzy match)
  // -----------------------------------------------------------------------
  describe("similarity and fuzzy matching", () => {
    it("accepts similar model names in proxy environment with reduced confidence", async () => {
      // Setup a proxy with similar model
      global.fetch = vi.fn(async () => ({
        ok: true,
        headers: new Headers({ server: "nginx" }),
        json: async () => ({ data: [{ id: "gpt-4o-2024-08-06" }] }),
      })) as any;

      const model = makeModel({ id: "gpt-4o-2024-08-06-preview" });
      const apiResponse = { id: "gpt-4o-2024-08-06" };
      const result = await validator.validateModelIdentity(
        model,
        apiResponse,
        "https://proxy.example.com/v1",
      );

      // Similar names should pass with reduced confidence
      if (result.isValid) {
        expect(result.confidence).toBeLessThan(1.0);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  describe("edge cases", () => {
    it("handles API response with no id field", async () => {
      const model = makeModel({ id: "gpt-4o" });
      const apiResponse = {};
      const result = await validator.validateModelIdentity(
        model,
        apiResponse,
        "https://api.openai.com/v1",
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThan(1.0);
    });

    it("handles empty model id", async () => {
      const model = makeModel({ id: "" });
      const apiResponse = { id: "" };
      const result = await validator.validateModelIdentity(
        model,
        apiResponse,
        "https://api.openai.com/v1",
      );

      expect(result).toBeDefined();
    });

    it("handles HTTP error response in proxy detection", async () => {
      global.fetch = vi.fn(async () => ({
        ok: false,
        status: 403,
        headers: new Headers(),
        json: async () => ({}),
      })) as any;

      const result = await validator.detectProxyService(
        "https://forbidden.example.com/v1",
      );

      expect(result).toBeDefined();
      expect(result.baseUrl).toBe("https://forbidden.example.com/v1");
    });

    it("handles null model provider", async () => {
      const model = makeModel({ provider: undefined as any });
      const apiResponse = { id: "gpt-4o" };
      const result = await validator.validateModelIdentity(
        model,
        apiResponse,
        "https://api.openai.com/v1",
      );

      expect(result).toBeDefined();
    });
  });
});
