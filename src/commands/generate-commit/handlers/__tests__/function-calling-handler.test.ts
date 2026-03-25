import { AIRequestParams } from "@/ai/types";
import { FunctionCallingHandler } from "@/commands/generate-commit/handlers/function-calling-handler";
import { ContextManager } from "@/utils/context-manager";
import { getMessage } from "@/utils/i18n";
import { applyCommitMessageToInput } from "@/commands/generate-commit/utils/commit-formatter";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/i18n", () => ({
  getMessage: vi.fn((key: string) => key),
}));

vi.mock("@/commands/generate-commit/utils/commit-formatter", () => ({
  applyCommitMessageToInput: vi.fn(async () => ({
    message: "feat: from-function-calling",
    applied: true,
  })),
}));

function createLoggerMock() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    logError: vi.fn(),
  } as any;
}

function createRequestParams(): AIRequestParams {
  return {
    diff: "mock-diff",
    additionalContext: "",
  };
}

describe("FunctionCallingHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses context manager retry pipeline for function calling", async () => {
    const handler = new FunctionCallingHandler(createLoggerMock());
    const requestParams = createRequestParams();
    const scmProvider = {} as any;
    const token = { isCancellationRequested: false } as any;
    const progress = { report: vi.fn() } as any;

    const aiProvider = {
      getId: vi.fn(() => "mock-provider"),
      generateCommitWithFunctionCalling: vi
        .fn()
        .mockResolvedValue({ content: "feat: generated" }),
    } as any;

    const contextManager = {
      executeWithRetry: vi.fn(async (params: AIRequestParams, executeRequest: any) =>
        executeRequest({ ...params, messages: [{ role: "user", content: "built" }] }),
      ),
    } as unknown as ContextManager;

    const message = await handler.handle(
      aiProvider,
      requestParams,
      scmProvider,
      token,
      progress,
      contextManager,
    );

    expect(getMessage).toHaveBeenCalledWith("progress.calling.ai.function");
    expect(progress.report).toHaveBeenCalledWith({
      message: "progress.calling.ai.function",
    });
    expect(contextManager.executeWithRetry).toHaveBeenCalledTimes(1);
    expect(aiProvider.generateCommitWithFunctionCalling).toHaveBeenCalledTimes(1);
    expect(applyCommitMessageToInput).toHaveBeenCalledWith(
      scmProvider,
      "feat: generated",
    );
    expect(message).toBe("feat: from-function-calling");
  });

  it("throws when provider does not support function calling", async () => {
    const handler = new FunctionCallingHandler(createLoggerMock());
    const contextManager = {
      executeWithRetry: vi.fn(),
    } as unknown as ContextManager;

    await expect(
      handler.handle(
        {
          getId: () => "mock-provider",
        } as any,
        createRequestParams(),
        {} as any,
        { isCancellationRequested: false } as any,
        { report: vi.fn() } as any,
        contextManager,
      ),
    ).rejects.toThrow("Provider mock-provider does not support function calling.");

    expect(contextManager.executeWithRetry).not.toHaveBeenCalled();
  });
});
