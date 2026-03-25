import { LayeredCommitHandler } from "@/commands/generate-commit/handlers/layered-commit-handler";
import { describe, expect, it, vi } from "vitest";

function createConfig() {
  return {
    base: { language: "English" },
    features: {
      commitFormat: {
        enableMergeCommit: false,
        enableEmoji: true,
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
});
