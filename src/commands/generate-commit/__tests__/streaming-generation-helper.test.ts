import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestTooLargeError } from "@/utils/context-manager";
import { getMessage } from "@/utils/i18n";
import { notify } from "@/utils/notification/notification-manager";

const {
  getSystemPromptMock,
  detectStagedContentMock,
  selectDiffTargetMock,
  getDiffWithTargetMock,
} = vi.hoisted(() => ({
  getSystemPromptMock: vi.fn(async () => "fallback-system-prompt"),
  detectStagedContentMock: vi.fn(),
  selectDiffTargetMock: vi.fn(),
  getDiffWithTargetMock: vi.fn(),
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
});
