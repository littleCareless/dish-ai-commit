import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestTooLargeError } from "@/utils/context-manager";
import { getMessage } from "@/utils/i18n";
import { notify } from "@/utils/notification/notification-manager";

const {
  getSystemPromptMock,
  detectStagedContentMock,
  selectDiffTargetMock,
  getDiffWithTargetMock,
  commitCacheGetMock,
  commitCacheSetMock,
  commitCacheGenerateKeyMock,
  contextInspectorStoreSnapshotMock,
  adaptiveGetLearnedInputLimitMock,
  adaptiveRecordLearnedInputLimitMock,
  modelCatalogResolveInputLimitMock,
  promptManagerGetActivePromptContentMock,
  contextBuilderBuildContextManagerMock,
  contextBuilderBuildLayeredSummaryContextManagerMock,
} = vi.hoisted(() => ({
  getSystemPromptMock: vi.fn(async () => "fallback-system-prompt"),
  detectStagedContentMock: vi.fn(),
  selectDiffTargetMock: vi.fn(),
  getDiffWithTargetMock: vi.fn(),
  commitCacheGetMock: vi.fn(),
  commitCacheSetMock: vi.fn(),
  commitCacheGenerateKeyMock: vi.fn(() => "cache-key"),
  contextInspectorStoreSnapshotMock: vi.fn(),
  adaptiveGetLearnedInputLimitMock: vi.fn(),
  adaptiveRecordLearnedInputLimitMock: vi.fn(async () => {}),
  modelCatalogResolveInputLimitMock: vi.fn(async () => undefined),
  promptManagerGetActivePromptContentMock: vi.fn(async () => "system: {{language}}"),
  contextBuilderBuildContextManagerMock: vi.fn(async () => ({
    buildMessages: () => [{ role: "system", content: "sys" }],
    getEstimatedRawTokenCount: () => 1000,
    setSystemPrompt: vi.fn(),
    getBlocks: () => [{ name: "system" }],
  })),
  contextBuilderBuildLayeredSummaryContextManagerMock: vi.fn(async () => ({
    buildMessages: () => [{ role: "system", content: "sys" }],
  })),
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

vi.mock("@/scm/staged-content-detector", () => ({
  stagedContentDetector: {
    detectStagedContent: detectStagedContentMock,
  },
}));

vi.mock("@/scm/smart-diff-selector", () => ({
  smartDiffSelector: {
    selectDiffTarget: selectDiffTargetMock,
    getDiffWithTarget: getDiffWithTargetMock,
  },
}));

vi.mock("@/services/cache/commit-cache-service", () => ({
  commitCacheService: {
    get: commitCacheGetMock,
    set: commitCacheSetMock,
    generateKey: commitCacheGenerateKeyMock,
  },
}));

vi.mock("@/services/context-inspector-service", () => ({
  ContextInspectorService: {
    getInstance: () => ({
      storeSnapshot: contextInspectorStoreSnapshotMock,
    }),
  },
}));

vi.mock("@/ai/model-registry/adaptive-model-limit-service", () => ({
  AdaptiveModelLimitService: {
    getInstance: () => ({
      getLearnedInputLimit: adaptiveGetLearnedInputLimitMock,
      recordLearnedInputLimit: adaptiveRecordLearnedInputLimitMock,
    }),
  },
}));

vi.mock("@/ai/model-registry/model-catalog-service", () => ({
  ModelCatalogService: {
    getInstance: () => ({
      resolveInputLimit: modelCatalogResolveInputLimitMock,
    }),
  },
}));

vi.mock("@/services/core/prompt-manager-service", () => ({
  PromptManagerService: {
    getInstance: () => ({
      getActivePromptContent: promptManagerGetActivePromptContentMock,
    }),
  },
}));

vi.mock("@/commands/generate-commit/builders/context-builder", () => ({
  CommitContextBuilder: class {
    buildContextManager = contextBuilderBuildContextManagerMock;
    buildLayeredSummaryContextManager = contextBuilderBuildLayeredSummaryContextManagerMock;
  },
}));

vi.mock("@/commands/generate-commit/handlers/layered-commit-handler", () => ({
  LayeredCommitHandler: class {
    handle = vi.fn();
  },
}));

vi.mock("@/commands/generate-commit/handlers/streaming-handler", () => ({
  StreamingHandler: class {
    handle = vi.fn(async () => "streamed message");
  },
}));

vi.mock("@/commands/generate-commit/handlers/function-calling-handler", () => ({
  FunctionCallingHandler: class {
    handle = vi.fn(async () => "function calling message");
  },
}));

vi.mock("@/utils/state/state-manager", () => ({
  stateManager: {
    getWorkspace: vi.fn(() => undefined),
  },
}));

vi.mock("@/ai/model-registry", () => ({
  getAccurateTokenLimits: vi.fn(async () => ({ input: 128000, output: 4096 })),
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("builds different system prompt hash when workspace root changes", () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const config = createConfiguration();
    const repoAHash = (helper as any).getSystemPromptHash(
      config,
      "git",
      "/repo/a",
    );
    const repoBHash = (helper as any).getSystemPromptHash(
      config,
      "git",
      "/repo/b",
    );

    expect(repoAHash).not.toBe(repoBHash);
  });

  it("builds different system prompt hash when active prompt fingerprint changes", () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const config = createConfiguration();
    const promptV1Hash = (helper as any).getSystemPromptHash(
      config,
      "git",
      "/repo/a",
      "prompt-fingerprint-v1",
    );
    const promptV2Hash = (helper as any).getSystemPromptHash(
      config,
      "git",
      "/repo/a",
      "prompt-fingerprint-v2",
    );

    expect(promptV1Hash).not.toBe(promptV2Hash);
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

    const combinedDiff = `<changes>
<original-code>
# FILE: a.txt
# ORIGINAL CODE:
\`\`\`txt
a-old
\`\`\`

# FILE: b.txt
# ORIGINAL CODE:
\`\`\`txt
b-old
\`\`\`
</original-code>
<code-changes>
# FILE: a.txt
# CODE CHANGES:
\`\`\`diff
+a-new
\`\`\`

# FILE: b.txt
# CODE CHANGES:
\`\`\`diff
+b-new
\`\`\`
</code-changes>
</changes>
`;

    const scmProvider = {
      type: "git",
      setCurrentFiles: vi.fn(),
      getDiff: vi.fn(async () => combinedDiff),
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

    const result = await (helper as any).prepareConfigurationAndDiff(
      progress,
      scmProvider,
      ["a.txt", "b.txt"],
      configuration,
    );

    expect(scmProvider.getDiff).toHaveBeenCalledTimes(1);
    expect(scmProvider.getDiff).toHaveBeenNthCalledWith(
      1,
      ["a.txt", "b.txt"],
      "staged",
    );
    expect(result.snapshot.fileDiffMap?.size).toBe(2);
    expect(result.snapshot.fileDiffMap?.get("a.txt")).toContain("# FILE: a.txt");
    expect(result.snapshot.fileDiffMap?.get("a.txt")).not.toContain(
      "# FILE: b.txt",
    );
    expect(result.snapshot.fileDiffMap?.get("b.txt")).toContain("# FILE: b.txt");
  });

  it("maps structured combined diff blocks back to absolute selected files", async () => {
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
      getDiff: vi.fn(
        async () => `<changes>
<code-changes>
# FILE: src/a.ts
# CODE CHANGES:
\`\`\`diff
+const a = 1;
\`\`\`

# FILE: src/nested/b.ts
# CODE CHANGES:
\`\`\`diff
+const b = 2;
\`\`\`
</code-changes>
</changes>
`,
      ),
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
          diffTarget: "all",
        },
      },
    };

    const result = await (helper as any).prepareConfigurationAndDiff(
      progress,
      scmProvider,
      ["/repo/src/a.ts", "/repo/src/nested/b.ts"],
      configuration,
    );

    expect(result.snapshot.fileDiffMap?.size).toBe(2);
    expect(result.snapshot.fileDiffMap?.get("/repo/src/a.ts")).toContain(
      "# FILE: src/a.ts",
    );
    expect(result.snapshot.fileDiffMap?.get("/repo/src/nested/b.ts")).toContain(
      "# FILE: src/nested/b.ts",
    );
  });

  it("respects fallbackToAll=false when auto detection throws", async () => {
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
      getDiff: vi.fn(async (_files: string[] | undefined, target: string) => `mock-${target}-diff`),
    } as any;

    const progress = {
      report: vi.fn(),
    } as any;

    detectStagedContentMock.mockRejectedValueOnce(new Error("auto detect failed"));

    const configuration = {
      ...createConfiguration(),
      features: {
        ...createConfiguration().features,
        codeAnalysis: {
          diffTarget: "auto",
          fallbackToAll: false,
        },
      },
    };

    const result = await (helper as any).prepareConfigurationAndDiff(
      progress,
      scmProvider,
      ["a.txt"],
      configuration,
      {
        repository: {
          path: "/repo",
          name: "repo",
          type: "git",
          isActive: true,
        },
      },
    );

    expect(scmProvider.getDiff).toHaveBeenCalledWith(["a.txt"], "staged");
    expect(result.snapshot.combinedDiff).toBe("mock-staged-diff");
    expect(result.snapshot.resolvedDiffTarget).toBe("staged");
    expect(selectDiffTargetMock).not.toHaveBeenCalled();
    expect(getDiffWithTargetMock).not.toHaveBeenCalled();
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

  it("handles unknown errors by creating a failed result with extracted message", async () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const result = await (helper as any).handleGenerationError(
      new Error("unexpected failure during streaming"),
      undefined,
      createConfiguration(),
      {
        requestId: "req-fail",
        provider: "openai",
        selectedModel: { id: "test-model" },
      },
      { repositoryPath: "/repo-fail" },
    );

    expect(result.status).toBe("failed");
    expect(result.applied).toBe(false);
    expect(result.error).toBe("unexpected failure during streaming");
    expect(result.requestId).toBe("req-fail");
  });

  it("generates a requestId via crypto when session is undefined for error result", async () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const result = await (helper as any).handleGenerationError(
      new Error("generic error"),
      undefined,
      createConfiguration(),
      undefined,
      undefined,
    );

    expect(result.status).toBe("failed");
    expect(result.requestId).toBeTruthy();
    expect(typeof result.requestId).toBe("string");
  });
});

describe("StreamingGenerationHelper prepareConfigurationAndDiff extended", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when providerConfig is missing", async () => {
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
    } as any;

    const progress = { report: vi.fn() } as any;

    await expect(
      (helper as any).prepareConfigurationAndDiff(
        progress,
        scmProvider,
        ["a.txt"],
        null,
      ),
    ).rejects.toThrow();
  });

  it("calls setCurrentFiles on scmProvider when available", async () => {
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

    const progress = { report: vi.fn() } as any;
    const configuration = createConfiguration();

    await (helper as any).prepareConfigurationAndDiff(
      progress,
      scmProvider,
      ["a.txt", "b.txt"],
      configuration,
    );

    expect(scmProvider.setCurrentFiles).toHaveBeenCalledWith(["a.txt", "b.txt"]);
  });

  it("uses explicit 'all' diffTarget when configured", async () => {
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
      getDiff: vi.fn(async (_files: string[], target: string) => `diff-for-${target}`),
    } as any;

    const progress = { report: vi.fn() } as any;
    const configuration = {
      ...createConfiguration(),
      features: {
        ...createConfiguration().features,
        codeAnalysis: { diffTarget: "all" },
      },
    };

    const result = await (helper as any).prepareConfigurationAndDiff(
      progress,
      scmProvider,
      ["a.txt"],
      configuration,
    );

    expect(scmProvider.getDiff).toHaveBeenCalledWith(["a.txt"], "all");
    expect(result.snapshot.combinedDiff).toBe("diff-for-all");
    expect(result.snapshot.resolvedDiffTarget).toBe("all");
  });

  it("uses fallback target 'all' when auto detection fails and fallbackToAll is true", async () => {
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
      getDiff: vi.fn(async (_files: string[], target: string) => `fallback-${target}`),
    } as any;

    const progress = { report: vi.fn() } as any;
    detectStagedContentMock.mockRejectedValueOnce(new Error("auto detect failed"));

    const configuration = {
      ...createConfiguration(),
      features: {
        ...createConfiguration().features,
        codeAnalysis: { diffTarget: "auto", fallbackToAll: true },
      },
    };

    const result = await (helper as any).prepareConfigurationAndDiff(
      progress,
      scmProvider,
      ["a.txt"],
      configuration,
      {
        repository: {
          path: "/repo",
          name: "repo",
          type: "git",
          isActive: true,
        },
      },
    );

    expect(scmProvider.getDiff).toHaveBeenCalledWith(["a.txt"], "all");
    expect(result.snapshot.combinedDiff).toBe("fallback-all");
    expect(result.snapshot.resolvedDiffTarget).toBe("all");
  });

  it("auto detects staged content successfully and returns staged diff", async () => {
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
    } as any;

    const progress = { report: vi.fn() } as any;

    detectStagedContentMock.mockResolvedValueOnce({ hasStaged: true });
    selectDiffTargetMock.mockResolvedValueOnce("staged");
    getDiffWithTargetMock.mockResolvedValueOnce({
      content: "auto-staged-diff",
      files: ["a.txt"],
    });

    const configuration = {
      ...createConfiguration(),
      features: {
        ...createConfiguration().features,
        codeAnalysis: { diffTarget: "auto", fallbackToAll: true },
      },
    };

    const result = await (helper as any).prepareConfigurationAndDiff(
      progress,
      scmProvider,
      ["a.txt"],
      configuration,
      {
        repository: {
          path: "/repo",
          name: "repo",
          type: "git",
          isActive: true,
        },
      },
    );

    expect(detectStagedContentMock).toHaveBeenCalled();
    expect(selectDiffTargetMock).toHaveBeenCalled();
    expect(result.snapshot.combinedDiff).toBe("auto-staged-diff");
    expect(result.snapshot.resolvedDiffTarget).toBe("staged");
  });

  it("skips fileDiffMap when layered commit is not enabled", async () => {
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
      getDiff: vi.fn(async () => "some-diff-content"),
    } as any;

    const progress = { report: vi.fn() } as any;
    const configuration = createConfiguration();

    const result = await (helper as any).prepareConfigurationAndDiff(
      progress,
      scmProvider,
      ["a.txt"],
      configuration,
    );

    expect(result.snapshot.fileDiffMap).toBeUndefined();
  });

  it("skips fileDiffMap when only one file is selected even with layered commit enabled", async () => {
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
      getDiff: vi.fn(async () => "single-file-diff"),
    } as any;

    const progress = { report: vi.fn() } as any;
    const configuration = {
      ...createConfiguration(),
      features: {
        ...createConfiguration().features,
        commitFormat: { enableLayeredCommit: true, enableEmoji: true },
        codeAnalysis: { diffTarget: "staged" },
      },
    };

    const result = await (helper as any).prepareConfigurationAndDiff(
      progress,
      scmProvider,
      ["a.txt"],
      configuration,
    );

    expect(result.snapshot.fileDiffMap).toBeUndefined();
  });
});

describe("StreamingGenerationHelper getEffectiveInputTokenLimit", () => {
  function createHelperWithMockedAdaptive() {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);
    vi.spyOn((helper as any).adaptiveModelLimitService, "getLearnedInputLimit")
      .mockReturnValue(undefined);
    return helper;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("caps effective limit using provider-specific request limits for gemini", () => {
    const helper = createHelperWithMockedAdaptive();

    const model = {
      id: "gemini-2.0-flash",
      provider: { id: "google" },
      maxTokens: { input: 1000000, output: 8192 },
    } as any;

    const result = (helper as any).getEffectiveInputTokenLimit(model, 1000000);

    expect(result).toBeLessThan(1000000);
    expect(result).toBeGreaterThan(4096);
    // Math.min(modelInputLimit=1000000, modelSafety=880000, DEFAULT=120000, providerSafety=220000)
    // = 120000 (capped by DEFAULT_REQUEST_INPUT_TOKEN_LIMIT)
    expect(result).toBe(120000);
  });

  it("uses configured maxInputTokensPerRequest when set", () => {
    const helper = createHelperWithMockedAdaptive();

    const model = {
      id: "gpt-4",
      provider: { id: "openai" },
      maxTokens: { input: 128000, output: 4096 },
    } as any;

    const configuration = {
      features: {
        commitMessage: {
          maxInputTokensPerRequest: 50000,
        },
      },
    };

    const result = (helper as any).getEffectiveInputTokenLimit(
      model,
      128000,
      configuration,
    );

    expect(result).toBe(50000);
  });

  it("returns minimum 4096 even when all limits are very small", () => {
    const helper = createHelperWithMockedAdaptive();

    const model = {
      id: "tiny-model",
      provider: { id: "unknown" },
      maxTokens: { input: 2048, output: 1024 },
    } as any;

    const configuration = {
      features: {
        commitMessage: {
          maxInputTokensPerRequest: 100,
        },
      },
    };

    const result = (helper as any).getEffectiveInputTokenLimit(
      model,
      2048,
      configuration,
    );

    expect(result).toBe(4096);
  });

  it("uses model input limit when no provider or config overrides", () => {
    const helper = createHelperWithMockedAdaptive();

    const model = {
      id: "gpt-4",
      provider: { id: "openai" },
      maxTokens: { input: 128000, output: 4096 },
    } as any;

    const result = (helper as any).getEffectiveInputTokenLimit(model, 128000);

    // 128000 * 0.88 = 112640, capped by DEFAULT_REQUEST_INPUT_TOKEN_LIMIT = 120000
    const expected = Math.floor(128000 * 0.88);
    expect(result).toBe(Math.min(expected, 120000));
  });

  it("applies learned adaptive limit when available", () => {
    const helper = createHelperWithMockedAdaptive();
    (helper as any).adaptiveModelLimitService.getLearnedInputLimit
      .mockReturnValue(80000);

    const model = {
      id: "gpt-4",
      provider: { id: "openai" },
      maxTokens: { input: 128000, output: 4096 },
    } as any;

    const result = (helper as any).getEffectiveInputTokenLimit(model, 128000);

    // 80000 * 0.88 = 70400, which is less than 128000 * 0.88 = 112640
    expect(result).toBe(Math.floor(80000 * 0.88));
  });
});

describe("StreamingGenerationHelper buildFileDiffSnapshotFromCombinedDiff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty map when combinedDiff is empty string", () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const result = (helper as any).buildFileDiffSnapshotFromCombinedDiff(
      "",
      ["a.txt"],
    );

    expect(result.size).toBe(0);
  });

  it("returns empty map when combinedDiff is undefined", () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const result = (helper as any).buildFileDiffSnapshotFromCombinedDiff(
      undefined,
      ["a.txt"],
    );

    expect(result.size).toBe(0);
  });

  it("returns empty map when combinedDiff has no recognized file blocks", () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const result = (helper as any).buildFileDiffSnapshotFromCombinedDiff(
      "<changes><code-changes>random content without file markers</code-changes></changes>",
      ["a.txt"],
    );

    expect(result.size).toBe(0);
  });

  it("resolves diff files using path suffix matching", () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const combinedDiff = `<changes>
<original-code>
# FILE: src/utils/helper.ts
# ORIGINAL CODE:
\`\`\`ts
old code
\`\`\`
</original-code>
<code-changes>
# FILE: src/utils/helper.ts
# CODE CHANGES:
\`\`\`diff
+new code
\`\`\`
</code-changes>
</changes>`;

    const result = (helper as any).buildFileDiffSnapshotFromCombinedDiff(
      combinedDiff,
      ["/project/src/utils/helper.ts"],
    );

    expect(result.size).toBe(1);
    expect(result.has("/project/src/utils/helper.ts")).toBe(true);
    expect(result.get("/project/src/utils/helper.ts")).toContain("src/utils/helper.ts");
  });

  it("handles original-code section missing for a file", () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const combinedDiff = `<changes>
<code-changes>
# FILE: a.ts
# CODE CHANGES:
\`\`\`diff
+new code
\`\`\`
</code-changes>
</changes>`;

    const result = (helper as any).buildFileDiffSnapshotFromCombinedDiff(
      combinedDiff,
      ["a.ts"],
    );

    expect(result.size).toBe(1);
    expect(result.get("a.ts")).toContain("<code-changes>");
    expect(result.get("a.ts")).not.toContain("<original-code>");
  });
});

describe("StreamingGenerationHelper normalizeFilePathForDiffLookup", () => {
  it("normalizes backslashes to forward slashes", () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const result = (helper as any).normalizeFilePathForDiffLookup(
      "src\\utils\\file.ts",
    );
    expect(result).toBe("src/utils/file.ts");
  });

  it("strips leading ./ prefix", () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const result = (helper as any).normalizeFilePathForDiffLookup(
      "./src/file.ts",
    );
    expect(result).toBe("src/file.ts");
  });
});

describe("StreamingGenerationHelper createFailedResult", () => {
  it("includes errorCode when provided", () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const result = (helper as any).createFailedResult(
      { requestId: "req-1", provider: "openai", selectedModel: { id: "gpt" } },
      { repositoryPath: "/repo" },
      "something went wrong",
      "CUSTOM_ERROR_CODE",
    );

    expect(result.status).toBe("failed");
    expect(result.applied).toBe(false);
    expect(result.error).toBe("something went wrong");
    expect(result.errorCode).toBe("CUSTOM_ERROR_CODE");
  });

  it("generates a UUID requestId when session is undefined", () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const result = (helper as any).createFailedResult(
      undefined,
      undefined,
      "error without session",
    );

    expect(result.status).toBe("failed");
    expect(result.requestId).toBeTruthy();
    expect(typeof result.requestId).toBe("string");
  });
});

describe("StreamingGenerationHelper extractErrorMessage", () => {
  it("extracts message from error object", () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const result = (helper as any).extractErrorMessage(
      new Error("test error message"),
    );
    expect(result).toBe("test error message");
  });

  it("falls back to response.data when error.message is empty", () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const result = (helper as any).extractErrorMessage({
      message: "",
      response: { data: "response body content" },
    });
    expect(result).toBe("response body content");
  });

  it("falls back to string conversion for non-standard errors", () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const result = (helper as any).extractErrorMessage(42);
    expect(result).toBe("42");
  });
});

describe("StreamingGenerationHelper extractInputLimitFromErrorMessage", () => {
  it("extracts 'at most N tokens' pattern", () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const result = (helper as any).extractInputLimitFromErrorMessage(
      "Request exceeds at most 30000 input tokens per request",
    );
    expect(result).toBe(30000);
  });

  it("extracts tokens per minute pattern", () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const result = (helper as any).extractInputLimitFromErrorMessage(
      "Rate limit: 100,000 tokens per minute exceeded",
    );
    expect(result).toBe(100000);
  });

  it("returns null for messages without recognizable patterns", () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const result = (helper as any).extractInputLimitFromErrorMessage(
      "Something went wrong with no token info",
    );
    expect(result).toBeNull();
  });

  it("returns null for empty message", () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const result = (helper as any).extractInputLimitFromErrorMessage("");
    expect(result).toBeNull();
  });
});

describe("StreamingGenerationHelper performStreamingGeneration pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    commitCacheGetMock.mockReturnValue(undefined);
    commitCacheGenerateKeyMock.mockReturnValue("cache-key");
    adaptiveGetLearnedInputLimitMock.mockReturnValue(undefined);
    modelCatalogResolveInputLimitMock.mockResolvedValue(undefined);
    promptManagerGetActivePromptContentMock.mockResolvedValue("system prompt template");
  });

  function createSession(overrides: Record<string, any> = {}) {
    const config = createConfiguration();
    config.features.codeAnalysis.diffTarget = "staged";
    return {
      requestId: "session-req-1",
      provider: "openai",
      model: "gpt-4",
      providerConfig: config,
      aiProvider: {
        getId: () => "openai",
        getName: () => "OpenAI",
        generateCommitStream: vi.fn(async () => "feat: streamed commit"),
      } as any,
      selectedModel: {
        id: "gpt-4",
        provider: { id: "openai", name: "OpenAI" },
        maxTokens: { input: 128000, output: 4096 },
      } as any,
      ...overrides,
    };
  }

  function createTarget(overrides: Record<string, any> = {}) {
    return {
      repositoryPath: "/repo",
      scmProvider: {
        type: "git",
        setCurrentFiles: vi.fn(),
        getDiff: vi.fn(async () => "diff content for pipeline"),
        startStreamingInput: vi.fn(async () => {}),
      } as any,
      selectedFiles: ["a.ts"],
      repositoryContext: {
        repository: {
          path: "/repo",
          name: "repo",
          type: "git",
          isActive: true,
        },
      },
      ...overrides,
    };
  }

  it("returns failed result when scmProvider is missing", async () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const progress = { report: vi.fn() } as any;
    const token = { isCancellationRequested: false } as any;
    const target = createTarget({ scmProvider: undefined, detectionError: "no provider" });
    const session = createSession();

    const result = await helper.performStreamingGeneration(
      progress,
      token,
      session,
      target,
    );

    expect(result.status).toBe("failed");
    expect(result.error).toContain("no provider");
  });

  it("returns failed result when diff content is empty", async () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const target = createTarget({
      scmProvider: {
        type: "git",
        setCurrentFiles: vi.fn(),
        getDiff: vi.fn(async () => ""),
      },
    });

    const progress = { report: vi.fn() } as any;
    const token = { isCancellationRequested: false } as any;
    const session = createSession();

    const result = await helper.performStreamingGeneration(
      progress,
      token,
      session,
      target,
    );

    expect(result.status).toBe("failed");
    expect(result.error).toContain("No diff content");
  });

  it("returns cached commit message on cache hit", async () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    commitCacheGetMock.mockReturnValue("cached: feat: fix bug");

    const target = createTarget();
    const progress = { report: vi.fn() } as any;
    const token = { isCancellationRequested: false } as any;
    const session = createSession();

    const result = await helper.performStreamingGeneration(
      progress,
      token,
      session,
      target,
    );

    expect(result.status).toBe("success");
    expect(result.message).toBe("cached: feat: fix bug");
    expect(result.fromCache).toBe(true);
    expect(target.scmProvider.startStreamingInput).toHaveBeenCalledWith("cached: feat: fix bug");
  });

  it("generates commit via streaming and caches the result", async () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const target = createTarget();
    const progress = { report: vi.fn() } as any;
    const token = { isCancellationRequested: false } as any;
    const session = createSession();

    const result = await helper.performStreamingGeneration(
      progress,
      token,
      session,
      target,
    );

    expect(result.status).toBe("success");
    expect(result.applied).toBe(true);
    expect(result.message).toBe("streamed message");
    expect(commitCacheSetMock).toHaveBeenCalledWith(
      "cache-key",
      "streamed message",
    );
  });

  it("returns failed result when generated message is empty", async () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    // Override the streaming handler to return empty
    const StreamingHandler = (await import("@/commands/generate-commit/handlers/streaming-handler")).StreamingHandler;
    const streamingInstance = new StreamingHandler();
    streamingInstance.handle = vi.fn(async () => "   ");

    // Create a new helper so it picks up the mock
    const helperEmpty = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const target = createTarget();
    const progress = { report: vi.fn() } as any;
    const token = { isCancellationRequested: false } as any;
    const session = createSession();

    // Spy on the streamingHandler instance to return whitespace
    (helperEmpty as any).streamingHandler.handle = vi.fn(async () => "   ");

    const result = await helperEmpty.performStreamingGeneration(
      progress,
      token,
      session,
      target,
    );

    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("EMPTY_GENERATED_MESSAGE");
  });

  it("returns too_large result when RequestTooLargeError occurs in pipeline", async () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    // Force the pipeline to throw RequestTooLargeError
    contextBuilderBuildContextManagerMock.mockRejectedValueOnce(
      new RequestTooLargeError("request too large"),
    );

    const target = createTarget();
    const progress = { report: vi.fn() } as any;
    const token = { isCancellationRequested: false } as any;
    const session = createSession();

    const result = await helper.performStreamingGeneration(
      progress,
      token,
      session,
      target,
    );

    expect(result.status).toBe("too_large");
    expect(result.applied).toBe(false);
  });

  it("returns cancelled result when cancellation error occurs in pipeline", async () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const cancelMessage = getMessage("user.cancelled.operation.error");
    contextBuilderBuildContextManagerMock.mockRejectedValueOnce(
      new Error(cancelMessage),
    );

    const target = createTarget();
    const progress = { report: vi.fn() } as any;
    const token = { isCancellationRequested: false } as any;
    const session = createSession();

    const result = await helper.performStreamingGeneration(
      progress,
      token,
      session,
      target,
    );

    expect(result.status).toBe("cancelled");
    expect(result.applied).toBe(false);
  });

  it("returns failed result with notification suppressed when suppressSuccessNotification is set", async () => {
    const helper = new StreamingGenerationHelper({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    } as any);

    const target = createTarget();
    const progress = { report: vi.fn() } as any;
    const token = { isCancellationRequested: false } as any;
    const session = createSession();

    const result = await helper.performStreamingGeneration(
      progress,
      token,
      session,
      target,
      { suppressSuccessNotification: true },
    );

    expect(result.status).toBe("success");
    expect(result.notification).toBeUndefined();
  });
});
