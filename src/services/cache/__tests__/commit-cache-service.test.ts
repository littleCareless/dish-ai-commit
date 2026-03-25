import { describe, expect, it } from "vitest";
import { commitCacheService } from "@/services/cache/commit-cache-service";

function createConfiguration(overrides: Record<string, unknown> = {}) {
  return {
    base: {
      language: "English",
    },
    features: {
      commitFormat: {
        enableEmoji: true,
        enableBody: true,
        enableMergeCommit: false,
        enableLayeredCommit: false,
      },
      commitMessage: {
        rule: "conventional",
        useRecentCommitsAsReference: true,
        largePromptAction: "prompt",
        diffTruncationStrategy: "smart",
        maxInputTokensPerRequest: 120000,
      },
      codeAnalysis: {
        diffTarget: "auto",
        autoDetectStaged: true,
        fallbackToAll: true,
        simplifyDiff: true,
      },
    },
    ...overrides,
  } as any;
}

describe("CommitCacheService.generateKey", () => {
  it("returns same key for same payload", () => {
    const config = createConfiguration();
    const keyA = commitCacheService.generateKey("diff-content", config, "model-a");
    const keyB = commitCacheService.generateKey("diff-content", config, "model-a");

    expect(keyA).toBe(keyB);
  });

  it("changes key when important commitMessage fields change", () => {
    const base = createConfiguration();
    const changed = createConfiguration({
      features: {
        ...base.features,
        commitMessage: {
          ...base.features.commitMessage,
          largePromptAction: "useFallback",
          useRecentCommitsAsReference: false,
        },
      },
    });

    const keyA = commitCacheService.generateKey("diff-content", base, "model-a");
    const keyB = commitCacheService.generateKey(
      "diff-content",
      changed,
      "model-a",
    );

    expect(keyA).not.toBe(keyB);
  });

  it("changes key when diff target changes", () => {
    const base = createConfiguration();
    const changed = createConfiguration({
      features: {
        ...base.features,
        codeAnalysis: {
          ...base.features.codeAnalysis,
          diffTarget: "staged",
        },
      },
    });

    const keyA = commitCacheService.generateKey("diff-content", base, "model-a");
    const keyB = commitCacheService.generateKey(
      "diff-content",
      changed,
      "model-a",
    );

    expect(keyA).not.toBe(keyB);
  });

  it("changes key when scm type changes", () => {
    const config = createConfiguration();

    const keyA = commitCacheService.generateKey(
      "diff-content",
      config,
      "model-a",
      "git",
    );
    const keyB = commitCacheService.generateKey(
      "diff-content",
      config,
      "model-a",
      "svn",
    );

    expect(keyA).not.toBe(keyB);
  });
});
