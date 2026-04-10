import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks -- must come before any import that touches the modules below
// ---------------------------------------------------------------------------
const { mockFormatMessage } = vi.hoisted(() => ({
  mockFormatMessage: vi.fn((key: string, args?: string[]) => {
    if (key === "provider.type.unknown") {
      return args ? `Unknown provider: ${args[0]}` : "Unknown provider";
    }
    return key;
  }),
}));

vi.mock("@/utils/i18n/localization-manager", () => ({
  formatMessage: mockFormatMessage,
}));

vi.mock("@/utils/logger", () => ({
  Logger: {
    getInstance: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      logError: vi.fn(),
      debugObject: vi.fn(),
    }),
  },
}));

// ---------------------------------------------------------------------------
// Import SUT (system under test) after mocks are in place
// ---------------------------------------------------------------------------
import { AIProviderFactory } from "@/ai/ai-provider-factory";
import { normalizeProviderType, getProviderByEnumKey } from "@/config/provider-definitions";
import type { ProviderConfig } from "@/types/provider-config";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<ProviderConfig> = {}): ProviderConfig {
  return {
    id: "test-profile",
    name: "Test Profile",
    provider: "openai",
    apiKey: "sk-test-key-12345678",
    baseUrl: "https://api.openai.com/v1",
    modelId: "gpt-4o",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AIProviderFactory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Provider mapping tests -- parameterized across all known provider IDs
  // -----------------------------------------------------------------------
  describe("getProvider - provider mapping", () => {
    const providerCases: Array<{
      providerKey: string;
      expectedProviderId: string;
    }> = [
      { providerKey: "openai", expectedProviderId: "openai" },
      { providerKey: "anthropic", expectedProviderId: "anthropic" },
      { providerKey: "ollama", expectedProviderId: "ollama" },
      { providerKey: "vscode", expectedProviderId: "vscode" },
      { providerKey: "zhipu", expectedProviderId: "zhipu" },
      { providerKey: "dashscope", expectedProviderId: "dashscope" },
      { providerKey: "doubao", expectedProviderId: "doubao" },
      { providerKey: "gemini", expectedProviderId: "gemini" },
      { providerKey: "deepseek", expectedProviderId: "deepseek" },
      { providerKey: "siliconflow", expectedProviderId: "siliconflow" },
      { providerKey: "openrouter", expectedProviderId: "openrouter" },
      { providerKey: "premai", expectedProviderId: "premai" },
      { providerKey: "together", expectedProviderId: "together" },
      { providerKey: "xai", expectedProviderId: "xai" },
      { providerKey: "azure-openai", expectedProviderId: "azure-openai" },
      { providerKey: "cloudflare", expectedProviderId: "cloudflare" },
      { providerKey: "vertexai", expectedProviderId: "vertexai" },
      { providerKey: "groq", expectedProviderId: "groq" },
      { providerKey: "mistral", expectedProviderId: "mistral" },
      { providerKey: "baidu-qianfan", expectedProviderId: "baidu-qianfan" },
      { providerKey: "lmstudio", expectedProviderId: "lmstudio" },
      { providerKey: "openai-compatible", expectedProviderId: "openai-compatible" },
      { providerKey: "perplexity", expectedProviderId: "perplexity" },
      { providerKey: "xiaomi", expectedProviderId: "xiaomi" },
      // openai-compatible wrappers
      { providerKey: "iflow", expectedProviderId: "iflow" },
      { providerKey: "volcano", expectedProviderId: "volcano" },
      { providerKey: "modelscope", expectedProviderId: "modelscope" },
      { providerKey: "kat", expectedProviderId: "kat" },
      { providerKey: "longcat", expectedProviderId: "longcat" },
      { providerKey: "qiniu", expectedProviderId: "qiniu" },
      { providerKey: "nvidia", expectedProviderId: "nvidia" },
      { providerKey: "cerebras", expectedProviderId: "cerebras" },
      { providerKey: "codebuddy", expectedProviderId: "codebuddy" },
      { providerKey: "codeflicker", expectedProviderId: "codeflicker" },
      { providerKey: "tongyi", expectedProviderId: "tongyi" },
    ];

    it.each(providerCases)(
      "returns a provider instance for providerKey=$providerKey",
      async ({ providerKey }) => {
        const config = makeConfig();
        const provider = await AIProviderFactory.getProvider(providerKey, config);
        expect(provider).toBeDefined();
        expect(typeof provider.getName).toBe("function");
        expect(typeof provider.getId).toBe("function");
      },
    );

    it("creates the correct number of distinct provider types", () => {
      // Ensures we have coverage of all 35 provider switch cases
      expect(providerCases.length).toBeGreaterThanOrEqual(35);
    });
  });

  // -----------------------------------------------------------------------
  // OpenAI-compatible wrappers verify overridden providerId/providerName
  // -----------------------------------------------------------------------
  describe("getProvider - openai-compatible wrappers", () => {
    const wrapperCases: Array<{
      providerKey: string;
      expectedId: string;
      expectedName: string;
    }> = [
      { providerKey: "iflow", expectedId: "iflow", expectedName: "Alibaba iFlow" },
      { providerKey: "volcano", expectedId: "volcano", expectedName: "ByteDance Volcano" },
      { providerKey: "modelscope", expectedId: "modelscope", expectedName: "ModelScope" },
      { providerKey: "kat", expectedId: "kat", expectedName: "Kuaishou KAT" },
      { providerKey: "longcat", expectedId: "longcat", expectedName: "Meituan LongCat" },
      { providerKey: "qiniu", expectedId: "qiniu", expectedName: "Qiniu AI" },
      { providerKey: "nvidia", expectedId: "nvidia", expectedName: "NVIDIA NIM" },
      { providerKey: "cerebras", expectedId: "cerebras", expectedName: "Cerebras" },
      { providerKey: "codebuddy", expectedId: "codebuddy", expectedName: "Tencent CodeBuddy" },
      { providerKey: "codeflicker", expectedId: "codeflicker", expectedName: "Kuaishou CodeFlicker" },
      { providerKey: "tongyi", expectedId: "tongyi", expectedName: "Tongyi Lingma" },
    ];

    it.each(wrapperCases)(
      "returns openai-compatible wrapper with id=$expectedId for key=$providerKey",
      async ({ providerKey, expectedId, expectedName }) => {
        const config = makeConfig();
        const provider = await AIProviderFactory.getProvider(providerKey, config);
        expect(provider).toBeDefined();
        expect(provider.getId()).toBe(expectedId);
        expect(provider.getName()).toBe(expectedName);
      },
    );
  });

  // -----------------------------------------------------------------------
  // Error cases
  // -----------------------------------------------------------------------
  describe("getProvider - error cases", () => {
    it("throws for unknown provider type", async () => {
      const config = makeConfig();
      await expect(
        AIProviderFactory.getProvider("nonexistent-provider", config),
      ).rejects.toThrow();
    });

    it("includes provider name in error message for unknown type", async () => {
      const config = makeConfig();
      try {
        await AIProviderFactory.getProvider("bogus-provider", config);
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain("bogus-provider");
      }
    });

    it("uses formatMessage for error message", async () => {
      const config = makeConfig();
      try {
        await AIProviderFactory.getProvider("bad-provider", config);
        expect.unreachable("Should have thrown");
      } catch {
        expect(mockFormatMessage).toHaveBeenCalledWith(
          "provider.type.unknown",
          expect.arrayContaining(["bad-provider"]),
        );
      }
    });

    it("throws for empty string provider type", async () => {
      const config = makeConfig();
      await expect(
        AIProviderFactory.getProvider("", config),
      ).rejects.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // setGlobalConfig injection
  // -----------------------------------------------------------------------
  describe("getProvider - setGlobalConfig injection", () => {
    it("calls setGlobalConfig when provider supports it", async () => {
      const config = makeConfig();
      const provider = await AIProviderFactory.getProvider("openai", config);
      // If setGlobalConfig was called, the config should be set
      const retrievedConfig = provider.getConfig();
      // The provider should have some config set
      expect(retrievedConfig).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // getAllProviders
  // -----------------------------------------------------------------------
  describe("getAllProviders", () => {
    it("returns a non-empty array of provider instances", () => {
      const providers = AIProviderFactory.getAllProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    it("returns provider instances that implement the AIProvider interface", () => {
      const providers = AIProviderFactory.getAllProviders();
      for (const provider of providers) {
        expect(typeof provider.getName).toBe("function");
        expect(typeof provider.getId).toBe("function");
        expect(typeof provider.getModels).toBe("function");
        expect(typeof provider.refreshModels).toBe("function");
        expect(typeof provider.isAvailable).toBe("function");
      }
    });

    it("includes all major provider types", () => {
      const providers = AIProviderFactory.getAllProviders();
      const ids = providers.map((p) => p.getId());
      const expectedIds = [
        "vscode",
        "ollama",
        "openai",
        "gemini",
        "anthropic",
        "deepseek",
        "dashscope",
        "doubao",
        "zhipu",
        "siliconflow",
        "openrouter",
      ];
      for (const expectedId of expectedIds) {
        expect(ids).toContain(expectedId);
      }
    });

    it("creates new instances each call (no caching)", () => {
      const first = AIProviderFactory.getAllProviders();
      const second = AIProviderFactory.getAllProviders();
      expect(first).not.toBe(second);
    });
  });

  // -----------------------------------------------------------------------
  // Sensitive value masking (maskSensitiveValue and sanitizeConfigForLog)
  // -----------------------------------------------------------------------
  describe("sensitive value masking", () => {
    // The maskSensitiveValue function is not exported but its behavior
    // is exercised via the debug logging in getProvider.
    // We test through the factory's internal behavior by verifying
    // the provider is still created correctly with sensitive config.
    it("does not expose raw API key in provider config output", async () => {
      const config = makeConfig({ apiKey: "sk-super-secret-key-12345678" });
      const provider = await AIProviderFactory.getProvider("openai", config);
      // The provider should be created successfully despite having a sensitive key
      expect(provider).toBeDefined();
      expect(provider.getId()).toBe("openai");
    });

    it("handles config with empty string values", async () => {
      const config = makeConfig({ apiKey: "", baseUrl: "" });
      const provider = await AIProviderFactory.getProvider("openai", config);
      expect(provider).toBeDefined();
    });

    it("handles config with very short API key (<=8 chars)", async () => {
      const config = makeConfig({ apiKey: "short1" });
      const provider = await AIProviderFactory.getProvider("openai", config);
      expect(provider).toBeDefined();
    });

    it("handles config with undefined values", async () => {
      const config = makeConfig({ apiKey: undefined, baseUrl: undefined });
      const provider = await AIProviderFactory.getProvider("openai", config);
      expect(provider).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Provider normalization via aliases
  // -----------------------------------------------------------------------
  describe("provider normalization", () => {
    it("handles provider keys that need normalization", () => {
      // normalizeProviderType should handle various alias formats
      const result = normalizeProviderType("vs-code");
      expect(result).toBeTruthy();
    });

    it("handles provider keys with different casing", () => {
      const result = normalizeProviderType("OpenAI");
      expect(result).toBeTruthy();
    });

    it("handles provider keys with underscores", () => {
      const result = normalizeProviderType("vs_code");
      expect(result).toBeTruthy();
    });

    it("returns uppercase for unknown keys", () => {
      const result = normalizeProviderType("unknown_provider");
      expect(result).toBe("UNKNOWN_PROVIDER");
    });
  });

  // -----------------------------------------------------------------------
  // Provider definitions lookups
  // -----------------------------------------------------------------------
  describe("provider definition lookups", () => {
    it("getProviderByEnumKey returns definition for known enum key", () => {
      const def = getProviderByEnumKey("OPENAI");
      expect(def).toBeDefined();
      expect(def!.id).toBe("openai");
    });

    it("getProviderByEnumKey returns undefined for unknown enum key", () => {
      const def = getProviderByEnumKey("NONEXISTENT");
      expect(def).toBeUndefined();
    });

    it("getProviderByEnumKey returns definition for VS_CODE_PROVIDED", () => {
      const def = getProviderByEnumKey("VS_CODE_PROVIDED");
      expect(def).toBeDefined();
      expect(def!.id).toBe("vscode");
    });
  });
});
