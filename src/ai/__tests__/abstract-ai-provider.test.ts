import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  AIModel,
  AIRequestParams,
  AIResponse,
} from "@/ai/types";

// ---------------------------------------------------------------------------
// Hoisted mocks -- vi.hoisted ensures references are available during hoisting
// ---------------------------------------------------------------------------
const { mockTokenStatsService, mockGenerateHelper, mockTokenizerService, mockFormatMessage } =
  vi.hoisted(() => {
    const mockTokenStats = {
      getInstance: () => ({
        addTokens: vi.fn(async () => {}),
      }),
    };

    const mockGenHelper = {
      generateWithRetry: vi.fn(async (_params: any, executor: any) => executor("truncated")),
      getSystemPrompt: vi.fn(async () => "mock system prompt for commit"),
      getCodeReviewPrompt: vi.fn(async () => "mock code review prompt"),
      getBranchNameSystemPrompt: vi.fn(async () => "mock branch name system prompt"),
      getBranchNameUserPrompt: vi.fn(() => "mock branch name user prompt"),
      getWeeklyReportPrompt: vi.fn(async () => "mock weekly report prompt"),
      getGlobalSummaryPrompt: vi.fn(async () => "mock global summary prompt"),
      getFileDescriptionPrompt: vi.fn(async () => "mock file description prompt"),
      getPRSummaryPrompt: vi.fn(async () => "mock PR summary prompt"),
      extractModifiedFilePaths: vi.fn(() => ["src/main.ts", "src/utils.ts"]),
    };

    const mockTokenizer = {
      countTokens: vi.fn(() => 10),
    };

    const mockFormat = vi.fn((key: string, args?: string[]) => {
      if (args) {return `${key}: ${args.join(", ")}`;}
      return key;
    });

    return {
      mockTokenStatsService: mockTokenStats,
      mockGenerateHelper: mockGenHelper,
      mockTokenizerService: mockTokenizer,
      mockFormatMessage: mockFormat,
    };
  });

vi.mock("@/services/core/token-stats-service", () => ({
  TokenStatsService: mockTokenStatsService,
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
      isDevelopment: () => false,
    }),
  },
}));

vi.mock("@/services/settings/advanced-settings-runtime", () => ({
  AdvancedSettingsRuntime: {
    getInstance: () => ({
      getSettings: () => ({
        maxTokens: 4096,
        enableRateLimit: false,
        enableRetry: false,
        enableTimeout: false,
      }),
      executeWithControls: (_providerId: string, fn: () => Promise<any>) => fn(),
    }),
  },
}));

vi.mock("@/services/settings/preferences-settings-manager", () => ({
  PreferencesSettingsManager: {
    getInstance: () => ({
      getSettings: () => ({
        commitTemperature: 0.7,
        reviewTemperature: 0.5,
        branchNameTemperature: 0.3,
        weeklyReportTemperature: 0.5,
        language: "en",
      }),
    }),
  },
}));

vi.mock("@/services/core/prompt-manager-service", () => ({
  PromptManagerService: {
    getInstance: () => ({
      getActivePromptContent: vi.fn(async () => "test prompt content"),
      getPromptDetail: vi.fn(() => ({
        category: "test",
        source: "default",
      })),
    }),
  },
}));

vi.mock("@/ai/utils/generate-helper", () => mockGenerateHelper);

vi.mock("@/prompt/generate-commit", () => ({
  getCommitMessageTools: vi.fn(() => [
    {
      type: "function",
      function: {
        name: "generate_commit_message",
        parameters: { type: "object", properties: {} },
      },
    },
  ]),
}));

vi.mock("../../utils/commitlint", () => ({
  loadCommitlintConfig: vi.fn(async () => null),
}));

vi.mock("@/utils/tokenizer", () => ({
  tokenizerService: mockTokenizerService,
}));

vi.mock("@/utils/i18n/localization-manager", () => ({
  formatMessage: mockFormatMessage,
}));

// ---------------------------------------------------------------------------
// Stub provider -- minimal concrete implementation
// ---------------------------------------------------------------------------
import { AbstractAIProvider } from "@/ai/providers/abstract-ai-provider";

const DEFAULT_MODEL: AIModel = {
  id: "test-model",
  name: "Test Model",
  maxTokens: { input: 128000, output: 4096 },
  provider: { id: "test", name: "Test Provider" },
};

class StubAIProvider extends AbstractAIProvider {
  // @ts-ignore - mock fields for testing
  private _mockReq: any;
  // @ts-ignore - mock fields for testing
  private _mockStream: any;

  constructor(
    options: {
      executeResponse?: Partial<AIResponse & { tool_calls?: any[]; jsonContent?: any }>;
      streamChunks?: string[];
    } = {},
  ) {
    super();

    const defaultResponse = {
      content: "test response content",
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      ...options.executeResponse,
    };

    this._mockReq = vi.fn(async () => defaultResponse);

    const chunks = options.streamChunks ?? ["chunk1 ", "chunk2 ", "chunk3"];
    this._mockStream = vi.fn(async () => {
      async function* gen() {
        for (const c of chunks) {
          yield c;
        }
      }
      return gen();
    });
  }

  protected async executeAIRequest(
    params: AIRequestParams,
    options?: any,
  ): Promise<any> {
    return this._mockReq(params, options);
  }

  protected async buildProviderMessages(params: AIRequestParams): Promise<any> {
    return params.messages || [];
  }

  protected async executeAIStreamRequest(
    params: AIRequestParams,
    options?: any,
  ): Promise<AsyncIterable<string>> {
    return this._mockStream(params, options);
  }

  protected getDefaultModel(): AIModel {
    return DEFAULT_MODEL;
  }

  async getModels(): Promise<AIModel[]> {
    return [DEFAULT_MODEL];
  }

  async refreshModels(): Promise<string[]> {
    return ["test-model"];
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getName(): string {
    return "Stub Provider";
  }

  getId(): string {
    return "stub";
  }

  // Expose for test assertions
  get mockExecute(): any {
    return this._mockReq;
  }
  get mockStream(): any {
    return this._mockStream;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeParams(overrides: Partial<AIRequestParams> = {}): AIRequestParams {
  return {
    diff: "diff --git a/file.ts b/file.ts\n+added line\n-removed line",
    additionalContext: "",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("AbstractAIProvider (StubAIProvider)", () => {
  let provider: StubAIProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new StubAIProvider();
    provider.setGlobalConfig({
      preferences: {
        commitTemperature: 0.7,
        reviewTemperature: 0.5,
        branchNameTemperature: 0.3,
        weeklyReportTemperature: 0.5,
        language: "en",
      },
    });
  });

  // -----------------------------------------------------------------------
  // Provider identification
  // -----------------------------------------------------------------------
  describe("provider identification", () => {
    it("getId returns the stub provider id", () => {
      expect(provider.getId()).toBe("stub");
    });

    it("getName returns the stub provider name", () => {
      expect(provider.getName()).toBe("Stub Provider");
    });

    it("getConfig returns the merged config after setGlobalConfig", () => {
      const config = provider.getConfig();
      expect(config).toBeDefined();
      expect(config.preferences).toBeDefined();
      expect(config.preferences.language).toBe("en");
    });
  });

  // -----------------------------------------------------------------------
  // setGlobalConfig
  // -----------------------------------------------------------------------
  describe("setGlobalConfig", () => {
    it("merges config with existing config", () => {
      provider.setGlobalConfig({ extraKey: "extraValue" });
      const config = provider.getConfig();
      expect(config.extraKey).toBe("extraValue");
      expect(config.preferences).toBeDefined();
    });

    it("preserves important properties like baseUrl through merge", () => {
      provider.setGlobalConfig({ baseUrl: "https://original.example.com" });
      provider.setGlobalConfig({ extraKey: "value" });
      const config = provider.getConfig();
      expect(config.baseUrl).toBe("https://original.example.com");
      expect(config.extraKey).toBe("value");
    });

    it("initializes config when none exists", () => {
      const fresh = new StubAIProvider();
      fresh.setGlobalConfig({ apiKey: "test-key" });
      expect(fresh.getConfig().apiKey).toBe("test-key");
    });
  });

  // -----------------------------------------------------------------------
  // generateCommit
  // -----------------------------------------------------------------------
  describe("generateCommit", () => {
    it("returns content and usage from executeAIRequest", async () => {
      const params = makeParams();
      const result = await provider.generateCommit(params);

      expect(result.content).toBe("test response content");
      expect(result.usage).toBeDefined();
      expect(result.usage!.totalTokens).toBe(150);
    });

    it("builds messages from diff when params.messages is undefined", async () => {
      const params = makeParams();
      delete (params as any).messages;
      await provider.generateCommit(params);

      expect(provider.mockExecute).toHaveBeenCalled();
      const callArgs = provider.mockExecute.mock.calls[0][0] as AIRequestParams;
      expect(callArgs.messages).toBeDefined();
      expect(callArgs.messages!.length).toBeGreaterThanOrEqual(2);
    });

    it("uses existing messages when provided", async () => {
      const params = makeParams({
        messages: [
          { role: "system", content: "custom system prompt" },
          { role: "user", content: "custom user prompt" },
        ],
      });
      await provider.generateCommit(params);

      const callArgs = provider.mockExecute.mock.calls[0][0] as AIRequestParams;
      expect(callArgs.messages).toHaveLength(2);
      expect(callArgs.messages![0].content).toBe("custom system prompt");
    });

    it("throws wrapped error on failure", async () => {
      const failingProvider = new StubAIProvider();
      (failingProvider as any)._mockReq = vi.fn(async () => {
        throw new Error("API connection failed");
      });
      failingProvider.setGlobalConfig({
        preferences: { commitTemperature: 0.7, language: "en" },
      });

      await expect(
        failingProvider.generateCommit(makeParams()),
      ).rejects.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // generateCommitStream
  // -----------------------------------------------------------------------
  describe("generateCommitStream", () => {
    it("returns an async iterable from executeAIStreamRequest", async () => {
      const params = makeParams();
      const stream = await provider.generateCommitStream(params);
      const chunks: string[] = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(["chunk1 ", "chunk2 ", "chunk3"]);
    });

    it("builds messages when params.messages is undefined", async () => {
      const params = makeParams();
      delete (params as any).messages;
      await provider.generateCommitStream(params);

      expect(provider.mockStream).toHaveBeenCalled();
    });

    it("uses pre-built messages when provided", async () => {
      const params = makeParams({
        messages: [
          { role: "system", content: "stream system" },
          { role: "user", content: "stream user" },
        ],
      });
      await provider.generateCommitStream(params);

      expect(provider.mockStream).toHaveBeenCalled();
    });

    it("throws wrapped error on stream failure", async () => {
      const failingProvider = new StubAIProvider();
      (failingProvider as any)._mockStream = vi.fn(async () => {
        throw new Error("Stream connection failed");
      });
      failingProvider.setGlobalConfig({
        preferences: { commitTemperature: 0.7, language: "en" },
      });

      await expect(
        failingProvider.generateCommitStream(makeParams()),
      ).rejects.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // generateCommitWithFunctionCalling
  // -----------------------------------------------------------------------
  describe("generateCommitWithFunctionCalling", () => {
    it("returns content and usage when function call is made", async () => {
      const funcProvider = new StubAIProvider({
        executeResponse: {
          content: "",
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          tool_calls: [
            {
              function: {
                name: "generate_commit_message",
                arguments: JSON.stringify({
                  type: "feat",
                  subject: "add new feature",
                  scope: "core",
                }),
              },
            },
          ],
        },
      });
      funcProvider.setGlobalConfig({
        preferences: { commitTemperature: 0.7, language: "en" },
        features: { commitFormat: { enableBody: false, enableEmoji: false } },
      });

      const result = await funcProvider.generateCommitWithFunctionCalling(makeParams());
      expect(result.content).toContain("feat(core): add new feature");
      expect(result.usage).toBeDefined();
    });

    it("falls back to content when no tool_calls in response", async () => {
      const fallbackProvider = new StubAIProvider({
        executeResponse: {
          content: "feat: fallback commit message",
          usage: { promptTokens: 80, completionTokens: 30, totalTokens: 110 },
          tool_calls: [],
        },
      });
      fallbackProvider.setGlobalConfig({
        preferences: { commitTemperature: 0.7, language: "en" },
      });

      const result = await fallbackProvider.generateCommitWithFunctionCalling(makeParams());
      expect(result.content).toBe("feat: fallback commit message");
    });

    it("throws when no content and no tool_calls", async () => {
      const emptyProvider = new StubAIProvider({
        executeResponse: {
          content: "",
          usage: {},
          tool_calls: [],
        },
      });
      emptyProvider.setGlobalConfig({
        preferences: { commitTemperature: 0.7, language: "en" },
      });

      await expect(
        emptyProvider.generateCommitWithFunctionCalling(makeParams()),
      ).rejects.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // generateCodeReview
  // -----------------------------------------------------------------------
  describe("generateCodeReview", () => {
    it("returns review content and usage", async () => {
      const params = makeParams();
      const result = await provider.generateCodeReview(params);

      expect(result.content).toBe("test response content");
      expect(result.usage).toBeDefined();
    });

    it("builds messages with code review system prompt", async () => {
      const params = makeParams();
      await provider.generateCodeReview(params);

      expect(provider.mockExecute).toHaveBeenCalled();
    });

    it("throws wrapped error on failure", async () => {
      const failingProvider = new StubAIProvider();
      (failingProvider as any)._mockReq = vi.fn(async () => {
        throw new Error("Review failed");
      });
      failingProvider.setGlobalConfig({
        preferences: { reviewTemperature: 0.5, language: "en" },
      });

      await expect(
        failingProvider.generateCodeReview(makeParams()),
      ).rejects.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // generateBranchName
  // -----------------------------------------------------------------------
  describe("generateBranchName", () => {
    it("returns branch name content and usage", async () => {
      const params = makeParams();
      const result = await provider.generateBranchName(params);

      expect(result.content).toBeDefined();
      expect(result.usage).toBeDefined();
    });

    it("builds messages with branch name prompts", async () => {
      const params = makeParams();
      await provider.generateBranchName(params);

      expect(provider.mockExecute).toHaveBeenCalled();
    });

    it("throws wrapped error on failure", async () => {
      const failingProvider = new StubAIProvider();
      (failingProvider as any)._mockReq = vi.fn(async () => {
        throw new Error("Branch name failed");
      });
      failingProvider.setGlobalConfig({
        preferences: { branchNameTemperature: 0.3, language: "en" },
      });

      await expect(
        failingProvider.generateBranchName(makeParams()),
      ).rejects.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // generateWeeklyReport
  // -----------------------------------------------------------------------
  describe("generateWeeklyReport", () => {
    it("returns weekly report content and usage", async () => {
      const result = await provider.generateWeeklyReport(
        ["commit 1", "commit 2"],
        { startDate: "2024-01-01", endDate: "2024-01-07" },
      );

      expect(result.content).toBe("test response content");
      expect(result.usage).toBeDefined();
    });

    it("accepts optional model parameter", async () => {
      const customModel: AIModel = {
        id: "custom-model",
        name: "Custom Model",
        maxTokens: { input: 100000, output: 4096 },
        provider: { id: "test", name: "Test Provider" },
      };

      const result = await provider.generateWeeklyReport(
        ["commit 1"],
        { startDate: "2024-01-01", endDate: "2024-01-07" },
        customModel,
      );

      expect(result).toBeDefined();
    });

    it("accepts optional users parameter", async () => {
      const result = await provider.generateWeeklyReport(
        ["commit 1"],
        { startDate: "2024-01-01", endDate: "2024-01-07" },
        undefined,
        ["user1", "user2"],
      );

      expect(result).toBeDefined();
    });

    it("throws wrapped error on failure", async () => {
      const failingProvider = new StubAIProvider();
      (failingProvider as any)._mockReq = vi.fn(async () => {
        throw new Error("Report generation failed");
      });
      failingProvider.setGlobalConfig({
        preferences: { weeklyReportTemperature: 0.5, language: "en" },
      });

      await expect(
        failingProvider.generateWeeklyReport(
          ["commit 1"],
          { startDate: "2024-01-01", endDate: "2024-01-07" },
        ),
      ).rejects.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // generateLayeredCommit
  // -----------------------------------------------------------------------
  describe("generateLayeredCommit", () => {
    it("returns summary and file changes", async () => {
      const result = await provider.generateLayeredCommit(makeParams());

      expect(result.summary).toBeDefined();
      expect(result.fileChanges).toBeDefined();
      expect(Array.isArray(result.fileChanges)).toBe(true);
    });

    it("processes each modified file from diff", async () => {
      // The diff must contain actual diff --git headers matching the file paths
      // returned by extractModifiedFilePaths (mocked to return ["src/main.ts", "src/utils.ts"])
      const diff =
        "diff --git a/src/main.ts b/src/main.ts\n" +
        "+added line in main\n" +
        "diff --git a/src/utils.ts b/src/utils.ts\n" +
        "+added line in utils";
      const result = await provider.generateLayeredCommit(makeParams({ diff }));

      // Both files should have descriptions generated
      expect(result.fileChanges.length).toBe(2);
      expect(result.fileChanges[0].filePath).toBe("src/main.ts");
      expect(result.fileChanges[1].filePath).toBe("src/utils.ts");
    });

    it("throws wrapped error on failure", async () => {
      const failingProvider = new StubAIProvider();
      (failingProvider as any)._mockReq = vi.fn(async () => {
        throw new Error("Layered commit failed");
      });
      failingProvider.setGlobalConfig({
        preferences: { commitTemperature: 0.7, language: "en" },
      });

      await expect(
        failingProvider.generateLayeredCommit(makeParams()),
      ).rejects.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // generatePRSummary
  // -----------------------------------------------------------------------
  describe("generatePRSummary", () => {
    it("returns PR summary content and usage", async () => {
      const params = makeParams();
      const result = await provider.generatePRSummary(params, ["fix: bug 1", "feat: feature 2"]);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // isAvailable / getModels / refreshModels
  // -----------------------------------------------------------------------
  describe("provider capability methods", () => {
    it("isAvailable returns boolean", async () => {
      const result = await provider.isAvailable();
      expect(typeof result).toBe("boolean");
      expect(result).toBe(true);
    });

    it("getModels returns an array of AIModel", async () => {
      const models = await provider.getModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(models[0].id).toBe("test-model");
    });

    it("refreshModels returns an array of model IDs", async () => {
      const modelIds = await provider.refreshModels();
      expect(Array.isArray(modelIds)).toBe(true);
      expect(modelIds).toContain("test-model");
    });
  });

  // -----------------------------------------------------------------------
  // countTokens
  // -----------------------------------------------------------------------
  describe("countTokens", () => {
    it("returns totalTokens for messages", async () => {
      const params = makeParams({
        messages: [
          { role: "system", content: "You are helpful" },
          { role: "user", content: "Hello" },
        ],
      });
      const result = await provider.countTokens(params);
      expect(result).toBeDefined();
      expect(typeof result.totalTokens).toBe("number");
    });

    it("returns 0 for empty messages", async () => {
      const params = makeParams({ messages: [] });
      const result = await provider.countTokens(params);
      expect(result.totalTokens).toBe(0);
    });

    it("returns 0 when messages is undefined", async () => {
      const params = makeParams();
      delete (params as any).messages;
      const result = await provider.countTokens(params);
      expect(result.totalTokens).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // getEmbeddingModels default
  // -----------------------------------------------------------------------
  describe("getEmbeddingModels", () => {
    it("returns empty array by default", async () => {
      const models = await provider.getEmbeddingModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models).toHaveLength(0);
    });
  });
});
