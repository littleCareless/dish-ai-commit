import { describe, expect, it, beforeEach } from "vitest";
import { CommitCacheService } from "@/services/cache/commit-cache-service";

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

/**
 * Create a fresh CommitCacheService instance for isolated tests.
 * The singleton is bypassed by constructing directly.
 */
function createFreshInstance(): CommitCacheService {
  return new (CommitCacheService as any)();
}

describe("CommitCacheService.generateKey", () => {
  it("returns same key for same payload", () => {
    const config = createConfiguration();
    const svc = createFreshInstance();
    const keyA = svc.generateKey("diff-content", config, "model-a");
    const keyB = svc.generateKey("diff-content", config, "model-a");

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
    const svc = createFreshInstance();

    const keyA = svc.generateKey("diff-content", base, "model-a");
    const keyB = svc.generateKey(
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
    const svc = createFreshInstance();

    const keyA = svc.generateKey("diff-content", base, "model-a");
    const keyB = svc.generateKey(
      "diff-content",
      changed,
      "model-a",
    );

    expect(keyA).not.toBe(keyB);
  });

  it("changes key when scm type changes", () => {
    const config = createConfiguration();
    const svc = createFreshInstance();

    const keyA = svc.generateKey(
      "diff-content",
      config,
      "model-a",
      "git",
    );
    const keyB = svc.generateKey(
      "diff-content",
      config,
      "model-a",
      "svn",
    );

    expect(keyA).not.toBe(keyB);
  });

  it("changes key when prompt fingerprint changes", () => {
    const config = createConfiguration();
    const svc = createFreshInstance();

    const keyA = svc.generateKey(
      "diff-content",
      config,
      "model-a",
      "git",
      "prompt-v1",
    );
    const keyB = svc.generateKey(
      "diff-content",
      config,
      "model-a",
      "git",
      "prompt-v2",
    );

    expect(keyA).not.toBe(keyB);
  });

  it("produces an MD5 hex string", () => {
    const config = createConfiguration();
    const svc = createFreshInstance();
    const key = svc.generateKey("diff-content", config, "model-a");
    expect(key).toMatch(/^[0-9a-f]{32}$/);
  });
});

// ---------------------------------------------------------------------------
// Cache invalidation
// ---------------------------------------------------------------------------

describe("CommitCacheService cache invalidation", () => {
  let svc: CommitCacheService;

  beforeEach(() => {
    svc = createFreshInstance();
  });

  it("returns undefined for non-existent key", () => {
    expect(svc.get("nonexistent")).toBeUndefined();
  });

  it("returns cached value after set", () => {
    svc.set("key-a", "commit message A");
    expect(svc.get("key-a")).toBe("commit message A");
  });

  it("overwrites existing value on re-set", () => {
    svc.set("key-a", "first");
    svc.set("key-a", "second");
    expect(svc.get("key-a")).toBe("second");
  });
});

// ---------------------------------------------------------------------------
// LRU eviction -- size limit enforcement
// ---------------------------------------------------------------------------

describe("CommitCacheService LRU eviction", () => {
  let svc: CommitCacheService;

  beforeEach(() => {
    svc = createFreshInstance();
  });

  it("evicts oldest entry when cache exceeds MAX_CACHE_SIZE", () => {
    // MAX_CACHE_SIZE = 50
    for (let i = 0; i < 50; i++) {
      svc.set(`key-${i}`, `value-${i}`);
    }

    // Cache is now full (50 items). Adding one more should evict key-0.
    svc.set("key-50", "value-50");

    expect(svc.get("key-0")).toBeUndefined(); // evicted
    expect(svc.get("key-50")).toBe("value-50");
    expect(svc.get("key-1")).toBe("value-1"); // still present
  });

  it("refreshes position on get (LRU behavior)", () => {
    // Fill cache to max
    for (let i = 0; i < 50; i++) {
      svc.set(`key-${i}`, `value-${i}`);
    }

    // Access key-0 to move it to the end (most recently used)
    svc.get("key-0");

    // Now adding a new entry should evict key-1 (the oldest un-accessed)
    svc.set("key-50", "value-50");

    expect(svc.get("key-0")).toBe("value-0"); // refreshed, still present
    expect(svc.get("key-1")).toBeUndefined(); // evicted instead
    expect(svc.get("key-50")).toBe("value-50");
  });

  it("re-setting existing key refreshes its position", () => {
    // Fill cache to max
    for (let i = 0; i < 50; i++) {
      svc.set(`key-${i}`, `value-${i}`);
    }

    // Re-set key-0 to refresh its position
    svc.set("key-0", "refreshed-value-0");

    // Adding a new entry should evict key-1 (oldest)
    svc.set("key-50", "value-50");

    expect(svc.get("key-0")).toBe("refreshed-value-0");
    expect(svc.get("key-1")).toBeUndefined(); // evicted
  });

  it("maintains correct size after multiple evictions", () => {
    for (let i = 0; i < 100; i++) {
      svc.set(`key-${i}`, `value-${i}`);
    }

    // Only the last 50 should remain
    expect(svc.get("key-49")).toBeUndefined();
    expect(svc.get("key-50")).toBe("value-50");
    expect(svc.get("key-99")).toBe("value-99");
  });
});

// ---------------------------------------------------------------------------
// Concurrent access safety
// ---------------------------------------------------------------------------

describe("CommitCacheService concurrent access safety", () => {
  let svc: CommitCacheService;

  beforeEach(() => {
    svc = createFreshInstance();
  });

  it("handles rapid sequential writes without data loss", () => {
    for (let i = 0; i < 200; i++) {
      svc.set(`rapid-${i}`, `msg-${i}`);
    }

    // Last 50 should exist
    for (let i = 150; i < 200; i++) {
      expect(svc.get(`rapid-${i}`)).toBe(`msg-${i}`);
    }

    // Earlier ones should be evicted
    expect(svc.get("rapid-0")).toBeUndefined();
    expect(svc.get("rapid-100")).toBeUndefined();
  });

  it("handles interleaved get and set operations", () => {
    svc.set("shared-key", "initial");

    // Read then overwrite
    const first = svc.get("shared-key");
    svc.set("shared-key", "updated");
    const second = svc.get("shared-key");

    expect(first).toBe("initial");
    expect(second).toBe("updated");
  });

  it("does not corrupt cache when overwriting during near-full state", () => {
    // Fill to 49 entries
    for (let i = 0; i < 49; i++) {
      svc.set(`key-${i}`, `value-${i}`);
    }

    // Overwrite an existing entry (should not increase size)
    svc.set("key-0", "updated-value-0");

    // Add one more new entry (should not trigger eviction since size is 49)
    svc.set("key-49", "value-49");

    expect(svc.get("key-0")).toBe("updated-value-0");
    expect(svc.get("key-1")).toBe("value-1");
    expect(svc.get("key-49")).toBe("value-49");
  });

  it("handles empty string values", () => {
    svc.set("empty-key", "");
    expect(svc.get("empty-key")).toBe("");
  });

  it("handles keys with special characters", () => {
    const specialKey = "key/with:special-chars_123";
    svc.set(specialKey, "special value");
    expect(svc.get(specialKey)).toBe("special value");
  });
});
