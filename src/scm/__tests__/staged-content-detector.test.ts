import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiffTarget, DetectionErrorType } from "@/scm/staged-detector-types";

// -- Shared mocks ----------------------------------------------------------

// Use vi.hoisted to create a controllable mock that persists across tests
const { mockExec } = vi.hoisted(() => {
  const mockExec = vi.fn();
  return { mockExec };
});

vi.mock("child_process", () => ({
  exec: mockExec,
}));

vi.mock("util", async () => {
  const actual = await vi.importActual("util");
  return {
    ...actual,
    // Make promisify return a function that calls our mock exec and wraps it in a promise
    promisify: (fn: any) => {
      return (...args: any[]) => {
        return new Promise((resolve, reject) => {
          fn(...args, (err: any, result: any) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        });
      };
    },
  };
});

vi.mock("@/utils/logger", () => ({
  Logger: {
    getInstance: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    }),
  },
}));

const mockFeatureSettings = {
  autoDetectStaged: true,
  fallbackToAll: true,
  diffTarget: "auto",
};

vi.mock("@/services/profile-manager/profile-manager-service", () => ({
  ProfileManagerService: {
    getInstance: () => ({
      getFeatureSettings: () => ({ ...mockFeatureSettings }),
    }),
  },
}));

import { StagedContentDetector } from "@/scm/staged-content-detector";

// -- Helpers ---------------------------------------------------------------

/**
 * Create a minimal repository context object matching DetectionOptions.repository
 */
function createRepositoryContext(repoPath = "/workspace/repo") {
  return {
    repository: {
      path: repoPath,
      name: "repo",
      type: "git" as const,
      isActive: true,
      repository: {
        path: repoPath,
        name: "repo",
        type: "git" as const,
        isActive: true,
        rootUri: { fsPath: repoPath },
      },
    },
  };
}

/**
 * Configure mock exec to respond based on command patterns.
 * exec signature from promisify: (cmd, opts) => Promise<{stdout, stderr}>
 * But our promisify mock wraps callback-style, so exec receives (cmd, opts, callback)
 */
function setupExecResponses(
  responses: Array<{ pattern: string; stdout: string; stderr?: string; error?: boolean }>,
) {
  mockExec.mockImplementation(
    (cmd: string, _opts: any, callback: any) => {
      if (typeof _opts === "function") {
        callback = _opts;
      }
      for (const resp of responses) {
        if (cmd.includes(resp.pattern)) {
          if (resp.error) {
            const err: any = new Error(resp.stderr || "command failed");
            err.stderr = resp.stderr || "";
            callback(err, { stdout: resp.stdout || "", stderr: resp.stderr || "" });
          } else {
            callback(null, { stdout: resp.stdout, stderr: resp.stderr || "" });
          }
          return;
        }
      }
      callback(null, { stdout: "", stderr: "" });
    },
  );
}

// -- Tests -----------------------------------------------------------------

describe("StagedContentDetector", () => {
  let detector: StagedContentDetector;

  beforeEach(() => {
    mockExec.mockReset();
    detector = new StagedContentDetector();
    mockFeatureSettings.fallbackToAll = true;
  });

  // -----------------------------------------------------------------------
  // 1. Single-file staged content detection
  // -----------------------------------------------------------------------
  describe("single-file staged detection", () => {
    it("detects a single staged file", async () => {
      setupExecResponses([
        { pattern: "rev-parse", stdout: ".git\n" },
        { pattern: "diff --cached --name-only", stdout: "src/utils/helper.ts\n" },
      ]);

      const result = await detector.detectStagedContent({
        ...createRepositoryContext(),
        useCache: false,
      });

      expect(result.hasStagedContent).toBe(true);
      expect(result.stagedFileCount).toBe(1);
      expect(result.stagedFiles.length).toBe(1);
      expect(result.stagedFiles[0]).toContain("helper.ts");
    });
  });

  // -----------------------------------------------------------------------
  // 2. Multi-file staged content detection
  // -----------------------------------------------------------------------
  describe("multi-file staged detection", () => {
    it("detects multiple staged files", async () => {
      setupExecResponses([
        { pattern: "rev-parse", stdout: ".git\n" },
        {
          pattern: "diff --cached --name-only",
          stdout: "src/config.ts\nsrc/main.ts\nsrc/utils.ts\n",
        },
      ]);

      const result = await detector.detectStagedContent({
        ...createRepositoryContext(),
        useCache: false,
      });

      expect(result.hasStagedContent).toBe(true);
      expect(result.stagedFileCount).toBe(3);
      expect(result.stagedFiles.length).toBe(3);
    });
  });

  // -----------------------------------------------------------------------
  // 3. No staged content - returns empty result
  // -----------------------------------------------------------------------
  describe("no staged content", () => {
    it("returns empty result with ALL recommended target when nothing staged", async () => {
      setupExecResponses([
        { pattern: "rev-parse", stdout: ".git\n" },
        { pattern: "diff --cached --name-only", stdout: "" },
      ]);

      const result = await detector.detectStagedContent({
        ...createRepositoryContext(),
        useCache: false,
      });

      expect(result.hasStagedContent).toBe(false);
      expect(result.stagedFileCount).toBe(0);
      expect(result.stagedFiles).toEqual([]);
      expect(result.recommendedTarget).toBe(DiffTarget.ALL);
    });

    it("returns STAGED recommended target when fallbackToAll is false", async () => {
      mockFeatureSettings.fallbackToAll = false;

      setupExecResponses([
        { pattern: "rev-parse", stdout: ".git\n" },
        { pattern: "diff --cached --name-only", stdout: "" },
      ]);

      const result = await detector.detectStagedContent({
        ...createRepositoryContext(),
        useCache: false,
      });

      expect(result.hasStagedContent).toBe(false);
      expect(result.recommendedTarget).toBe(DiffTarget.STAGED);
    });

    it("handles invalid repository gracefully", async () => {
      setupExecResponses([
        { pattern: "rev-parse", stdout: "", stderr: "fatal: not a git repository", error: true },
      ]);

      const result = await detector.detectStagedContent({
        ...createRepositoryContext(),
        useCache: false,
      });

      expect(result.hasStagedContent).toBe(false);
      expect(result.stagedFileCount).toBe(0);
      expect(result.errorMessage).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // hasStagedChanges (quick check)
  // -----------------------------------------------------------------------
  describe("hasStagedChanges", () => {
    it("returns true when staged files exist", async () => {
      setupExecResponses([
        { pattern: "rev-parse", stdout: ".git\n" },
        { pattern: "diff --cached --name-only", stdout: "file.ts\n" },
      ]);

      const result = await detector.hasStagedChanges("/workspace/repo");
      expect(result).toBe(true);
    });

    it("returns false when no staged files", async () => {
      setupExecResponses([
        { pattern: "rev-parse", stdout: ".git\n" },
        { pattern: "diff --cached --name-only", stdout: "" },
      ]);

      const result = await detector.hasStagedChanges("/workspace/repo");
      expect(result).toBe(false);
    });

    it("returns false on error", async () => {
      setupExecResponses([
        { pattern: "rev-parse", stdout: "", error: true },
      ]);

      const result = await detector.hasStagedChanges("/workspace/repo");
      expect(result).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Cache behavior
  // -----------------------------------------------------------------------
  describe("caching", () => {
    it("clears cache without error", () => {
      expect(() => detector.clearCache()).not.toThrow();
    });
  });
});
