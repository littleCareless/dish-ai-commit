import { describe, expect, it, vi } from "vitest";
import { RequestTooLargeError } from "@/utils/context-manager";
import { getMessage } from "@/utils/i18n";
import { notify } from "@/utils/notification/notification-manager";

const { getSystemPromptMock } = vi.hoisted(() => ({
  getSystemPromptMock: vi.fn(async () => "fallback-system-prompt"),
}));

vi.mock("@/ai/utils/generate-helper", () => ({
  getSystemPrompt: getSystemPromptMock,
}));

vi.mock("@/utils/notification/notification-manager", () => ({
  notify: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { StreamingGenerationHelper } from "@/commands/generate-commit/utils/streaming-generation-helper";

function createConfiguration() {
  return {
    base: { language: "English" },
    features: {
      commitMessage: {
        rule: "conventional",
        largePromptAction: "useFallback",
      },
      commitFormat: {
        enableEmoji: true,
        enableBody: true,
        enableMergeCommit: false,
      },
      codeAnalysis: {
        diffTarget: "auto",
      },
      suppressNonCriticalWarnings: false,
    },
  } as any;
}

describe("StreamingGenerationHelper fallback prompt", () => {
  it("builds different system prompt hash when scm type changes", () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const config = createConfiguration();
    const gitHash = (helper as any).getSystemPromptHash(config, "git");
    const svnHash = (helper as any).getSystemPromptHash(config, "svn");

    expect(gitHash).not.toBe(svnHash);
  });

  it("uses current scm type when building fallback prompt", async () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const contextManager = {
      setSystemPrompt: vi.fn(),
    } as any;

    const model = {
      id: "test-model",
      provider: { id: "openai" },
      maxTokens: { input: 8192, output: 1024 },
    } as any;

    await (helper as any).applyFallbackSystemPrompt(
      contextManager,
      model,
      createConfiguration(),
      "svn",
    );

    expect(getSystemPromptMock).toHaveBeenCalled();
    const requestParams = (getSystemPromptMock as any).mock.calls[0][0];
    expect(requestParams.scm).toBe("svn");
    expect(contextManager.setSystemPrompt).toHaveBeenCalledWith(
      "fallback-system-prompt",
    );
  });

  it("uses resolved explicit diffTarget for combined diff and per-file snapshot", async () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const scmProvider = {
      type: "git",
      setCurrentFiles: vi.fn(),
      getDiff: vi.fn(async () => "mock-diff"),
    } as any;

    const progress = {
      report: vi.fn(),
    } as any;

    const configuration = {
      ...createConfiguration(),
      features: {
        ...createConfiguration().features,
        commitFormat: {
          ...createConfiguration().features.commitFormat,
          enableLayeredCommit: true,
        },
        codeAnalysis: {
          diffTarget: "staged",
        },
      },
    };

    await (helper as any).prepareConfigurationAndDiff(
      progress,
      scmProvider,
      ["a.txt", "b.txt"],
      configuration,
    );

    expect(scmProvider.getDiff).toHaveBeenNthCalledWith(1, ["a.txt", "b.txt"], "staged");
    expect(scmProvider.getDiff).toHaveBeenNthCalledWith(2, ["a.txt"], "staged");
    expect(scmProvider.getDiff).toHaveBeenNthCalledWith(3, ["b.txt"], "staged");
  });

  it("maps RequestTooLargeError to too_large result instead of throwing", async () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const result = await (helper as any).handleGenerationError(
      new RequestTooLargeError("request is too large"),
      {
        id: "test-model",
        provider: { id: "openai" },
        maxTokens: { input: 8192, output: 1024 },
      },
      createConfiguration(),
      {
        requestId: "req-1",
        provider: "openai",
        selectedModel: { id: "test-model" },
      },
      { repositoryPath: "/repo" },
    );

    expect(result.status).toBe("too_large");
    expect(result.requestId).toBe("req-1");
    expect((notify.error as any).mock.calls.length).toBeGreaterThan(0);
  });

  it("maps cancellation error to cancelled result", async () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);
    const cancelledMessage = getMessage("user.cancelled.operation.error");

    const result = await (helper as any).handleGenerationError(
      new Error(cancelledMessage),
      undefined,
      createConfiguration(),
      {
        requestId: "req-cancel",
        provider: "openai",
        selectedModel: { id: "test-model" },
      },
      { repositoryPath: "/repo-cancel" },
    );

    expect(result.status).toBe("cancelled");
    expect(result.requestId).toBe("req-cancel");
  });
});
