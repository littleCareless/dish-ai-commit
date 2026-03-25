import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSystemPromptMock } = vi.hoisted(() => ({
  getSystemPromptMock: vi.fn(async () => "summary-system-prompt"),
}));

vi.mock("@/ai/utils/generate-helper", () => ({
  getSystemPrompt: getSystemPromptMock,
}));

import { LayeredCommitHandler } from "@/commands/generate-commit/handlers/layered-commit-handler";
import { PromptManagerService } from "@/services/core/prompt-manager-service";
import { RateLimiterService } from "@/services/core/rate-limiter-service";
import * as vscode from "vscode";

function createConfig() {
  return {
    base: { language: "English" },
    features: {
      commitFormat: {
        enableMergeCommit: false,
        enableEmoji: true,
        enableGlobalContext: true,
      },
      commitMessage: {},
      codeAnalysis: {},
    },
  } as any;
}

function createHandler() {
  return new LayeredCommitHandler({
    logOperationStart: vi.fn(),
    logOperationEnd: vi.fn(),
    logError: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  } as any);
}

function createHandleArgs() {
  return {
    aiProvider: { getId: () => "openai", generateCommit: vi.fn() } as any,
    requestParams: { model: { id: "test-model" } } as any,
    scmProvider: { type: "git" } as any,
    selectedFiles: ["a.ts", "b.ts"],
    token: { isCancellationRequested: false } as any,
    progress: { report: vi.fn() } as any,
    selectedModel: { id: "test-model" } as any,
    config: createConfig(),
    resultContext: {
      requestId: "req-1",
      repositoryPath: "/repo",
      provider: "openai",
      model: "test-model",
    },
    prefetchedDiffs: new Map([
      ["a.ts", "diff-a"],
      ["b.ts", "diff-b"],
    ]),
  };
}

describe("LayeredCommitHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns failed result when no file descriptions are generated", async () => {
    const handler = createHandler();
    const args = createHandleArgs();

    vi.spyOn(
      (handler as any).globalContextExtractor,
      "extractGlobalContext",
    ).mockResolvedValue("");
    vi.spyOn(handler as any, "processFilesInBatches").mockResolvedValue([]);

    const result = await handler.handle(
      args.aiProvider,
      args.requestParams,
      args.scmProvider,
      args.selectedFiles,
      args.token,
      args.progress,
      args.selectedModel,
      args.config,
      args.resultContext,
      args.prefetchedDiffs,
    );

    expect(result.status).toBe("failed");
    expect(result.applied).toBe(false);
    expect(result.errorCode).toBe("LAYERED_NO_FILE_DESCRIPTIONS");
  });

  it("returns failed result when only part of selected files have descriptions", async () => {
    const handler = createHandler();
    const args = createHandleArgs();

    vi.spyOn(
      (handler as any).globalContextExtractor,
      "extractGlobalContext",
    ).mockResolvedValue("");
    vi.spyOn(handler as any, "processFilesInBatches").mockResolvedValue([
      { filePath: "a.ts", description: "Update A" },
    ]);
    const generateSummarySpy = vi.spyOn(
      handler as any,
      "generateAndApplyLayeredSummary",
    );

    const result = await handler.handle(
      args.aiProvider,
      args.requestParams,
      args.scmProvider,
      args.selectedFiles,
      args.token,
      args.progress,
      args.selectedModel,
      args.config,
      args.resultContext,
      args.prefetchedDiffs,
    );

    expect(result.status).toBe("failed");
    expect(result.applied).toBe(false);
    expect(result.errorCode).toBe("LAYERED_PARTIAL_FILE_DESCRIPTIONS");
    expect(generateSummarySpy).not.toHaveBeenCalled();
  });

  it("normalizes descriptions and proceeds when all selected files are covered", async () => {
    const handler = createHandler();
    const args = createHandleArgs();

    vi.spyOn(
      (handler as any).globalContextExtractor,
      "extractGlobalContext",
    ).mockResolvedValue("");
    vi.spyOn(handler as any, "processFilesInBatches").mockResolvedValue([
      { filePath: "b.ts", description: "Update B" },
      { filePath: "a.ts", description: "Update A (old)" },
      { filePath: "a.ts", description: "Update A (latest)" },
    ]);
    const generateSummarySpy = vi
      .spyOn(handler as any, "generateAndApplyLayeredSummary")
      .mockResolvedValue({
        status: "success",
        applied: true,
        message: "feat: normalize coverage",
        ...args.resultContext,
      });

    const result = await handler.handle(
      args.aiProvider,
      args.requestParams,
      args.scmProvider,
      args.selectedFiles,
      args.token,
      args.progress,
      args.selectedModel,
      args.config,
      args.resultContext,
      args.prefetchedDiffs,
    );

    expect(result.status).toBe("success");
    expect(result.applied).toBe(true);
    expect(generateSummarySpy).toHaveBeenCalledWith(
      args.aiProvider,
      args.requestParams,
      args.selectedModel,
      args.scmProvider,
      [
        { filePath: "a.ts", description: "Update A (latest)" },
        { filePath: "b.ts", description: "Update B" },
      ],
      args.token,
      args.progress,
      args.config,
      args.resultContext,
    );
  });

  it("uses selectedModel for layered summary context and generation request", async () => {
    const handler = createHandler();
    const requestModel = {
      id: "test-model",
      provider: { id: "openai", name: "OpenAI" },
      maxTokens: { input: 300000, output: 8192 },
    } as any;
    const safeContextModel = {
      ...requestModel,
      maxTokens: { input: 120000, output: 8192 },
    } as any;

    const requestParams = {
      model: requestModel,
      workspaceRoot: "/repo",
      diff: "",
      additionalContext: "",
    } as any;
    const scmProvider = {
      type: "git",
      startStreamingInput: vi.fn(),
    } as any;
    const aiProvider = {
      getId: () => "openai",
      generateCommit: vi.fn(async () => ({ content: "feat: layered summary" })),
    } as any;
    const progress = { report: vi.fn() } as any;
    const token = { isCancellationRequested: false } as any;
    const resultContext = {
      requestId: "req-1",
      repositoryPath: "/repo",
      provider: "openai",
      model: "test-model",
    };

    const buildSummaryContextSpy = vi
      .spyOn(
        (handler as any).contextBuilder,
        "buildLayeredSummaryContextManager",
      )
      .mockResolvedValue({
        buildMessages: () => [
          { role: "system", content: "system" },
          { role: "user", content: "user" },
        ],
      } as any);

    const result = await (handler as any).generateAndApplyLayeredSummary(
      aiProvider,
      requestParams,
      safeContextModel,
      scmProvider,
      [{ filePath: "a.ts", description: "update a.ts" }],
      token,
      progress,
      createConfig(),
      resultContext,
    );

    expect(result.status).toBe("success");
    expect(getSystemPromptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: safeContextModel,
      }),
    );
    expect(buildSummaryContextSpy).toHaveBeenCalledWith(
      safeContextModel,
      "summary-system-prompt",
      scmProvider,
      expect.stringContaining("File: a.ts"),
      expect.any(Object),
    );
    expect(aiProvider.generateCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        model: safeContextModel,
        diff: "",
      }),
    );
  });

  it("skips global context extraction when enableGlobalContext is false", async () => {
    const handler = createHandler();
    const args = createHandleArgs();
    args.config.features.commitFormat.enableGlobalContext = false;

    const extractGlobalContextSpy = vi
      .spyOn((handler as any).globalContextExtractor, "extractGlobalContext")
      .mockResolvedValue("should-not-be-used");
    const processFilesInBatchesSpy = vi
      .spyOn(handler as any, "processFilesInBatches")
      .mockResolvedValue([]);

    const result = await handler.handle(
      args.aiProvider,
      args.requestParams,
      args.scmProvider,
      args.selectedFiles,
      args.token,
      args.progress,
      args.selectedModel,
      args.config,
      args.resultContext,
      args.prefetchedDiffs,
    );

    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("LAYERED_NO_FILE_DESCRIPTIONS");
    expect(extractGlobalContextSpy).not.toHaveBeenCalled();
    expect(processFilesInBatchesSpy).toHaveBeenCalledWith(
      args.selectedFiles,
      args.scmProvider,
      args.aiProvider,
      args.requestParams,
      args.config,
      "",
      args.token,
      args.progress,
      args.selectedModel,
      args.prefetchedDiffs,
    );
  });

  it("uses profile-derived rate limit config for layered batch processing", async () => {
    const handler = createHandler();
    const acquireMock = vi.fn(async () => {});
    vi.spyOn(RateLimiterService, "getInstance").mockReturnValue({
      acquire: acquireMock,
    } as any);

    const getConfigurationSpy = vi.spyOn(vscode.workspace, "getConfiguration");
    vi.spyOn(PromptManagerService, "getInstance").mockReturnValue({
      getActivePromptContent: vi.fn(async () => "System: {{language}}"),
    } as any);

    vi.spyOn((handler as any).contextBuilder, "buildContextManager").mockResolvedValue({
      buildMessages: () => [{ role: "system", content: "sys" }],
    } as any);

    const aiProvider = {
      getId: () => "openai",
      generateCommit: vi.fn(async () => ({
        content: '[{"filePath":"a.ts","description":"desc a"}]',
      })),
    } as any;

    const config = createConfig();
    config.rateLimitEnabled = true;
    config.rateLimitMax = 3;
    config.rateLimitWindow = 11;

    const results = await (handler as any).processFilesInBatches(
      ["a.ts"],
      { type: "git" } as any,
      aiProvider,
      {} as any,
      config,
      "",
      { isCancellationRequested: false } as any,
      { report: vi.fn() } as any,
      { id: "test-model" } as any,
      new Map([["a.ts", "diff-a"]]),
    );

    expect(results).toEqual([{ filePath: "a.ts", description: "desc a" }]);
    expect(acquireMock).toHaveBeenCalledWith(
      "openai",
      3,
      11,
      expect.any(Function),
    );
    expect(getConfigurationSpy).not.toHaveBeenCalledWith(
      "dish-ai-commit.providers",
    );
  });

  it("does not fallback to workspace provider rate limits when unified config disables it", async () => {
    const handler = createHandler();
    const acquireMock = vi.fn(async () => {});
    vi.spyOn(RateLimiterService, "getInstance").mockReturnValue({
      acquire: acquireMock,
    } as any);

    vi.spyOn(vscode.workspace, "getConfiguration").mockReturnValue({
      get: vi.fn(() => ({
        rateLimitEnabled: true,
        rateLimitMax: 99,
        rateLimitWindow: 88,
      })),
      update: vi.fn(),
    } as any);

    vi.spyOn(PromptManagerService, "getInstance").mockReturnValue({
      getActivePromptContent: vi.fn(async () => "System"),
    } as any);
    vi.spyOn((handler as any).contextBuilder, "buildContextManager").mockResolvedValue({
      buildMessages: () => [{ role: "system", content: "sys" }],
    } as any);

    const aiProvider = {
      getId: () => "openai",
      generateCommit: vi.fn(async () => ({
        content: '[{"filePath":"a.ts","description":"desc a"}]',
      })),
    } as any;

    const config = createConfig();
    config.rateLimitEnabled = false;

    const results = await (handler as any).processFilesInBatches(
      ["a.ts"],
      { type: "git" } as any,
      aiProvider,
      {} as any,
      config,
      "",
      { isCancellationRequested: false } as any,
      { report: vi.fn() } as any,
      { id: "test-model" } as any,
      new Map([["a.ts", "diff-a"]]),
    );

    expect(results).toEqual([{ filePath: "a.ts", description: "desc a" }]);
    expect(acquireMock).not.toHaveBeenCalled();
  });
});
