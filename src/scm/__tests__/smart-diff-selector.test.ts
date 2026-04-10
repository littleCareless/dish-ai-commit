import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiffTarget, StagedDetectionResult } from "@/scm/staged-detector-types";
import { ISCMProvider } from "@/scm/scm-provider";

// -- Shared mocks ---------------------------------------------------------

const mockFeatureSettings = {
  autoDetectStaged: true,
  fallbackToAll: true,
  diffTarget: "auto",
  suppressNonCriticalWarnings: true,
};

vi.mock("@/services/profile-manager/profile-manager-service", () => ({
  ProfileManagerService: {
    getInstance: () => ({
      getFeatureSettings: () => ({ ...mockFeatureSettings }),
    }),
  },
}));

vi.mock("@/utils/notification/notification-manager", () => ({
  notify: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

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

vi.mock("vscode", () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: "/workspace/repo" } }],
    getConfiguration: () => ({ get: (_k: string, d: unknown) => d }),
  },
}));

import { SmartDiffSelector } from "@/scm/smart-diff-selector";

// -- Helpers ---------------------------------------------------------------

function createDetectionResult(
  overrides: Partial<StagedDetectionResult> = {},
): StagedDetectionResult {
  return {
    hasStagedContent: false,
    stagedFileCount: 0,
    stagedFiles: [],
    recommendedTarget: DiffTarget.ALL,
    repositoryPath: "/workspace/repo",
    ...overrides,
  };
}

function createMockProvider(
  overrides: Partial<ISCMProvider> = {},
): ISCMProvider {
  return {
    type: "git",
    isAvailable: vi.fn(async () => true),
    init: vi.fn(async () => {}),
    getDiff: vi.fn(async () => ""),
    commit: vi.fn(async () => {}),
    setCommitInput: vi.fn(async () => {}),
    getCommitInput: vi.fn(async () => ""),
    startStreamingInput: vi.fn(async () => {}),
    getCommitLog: vi.fn(async () => []),
    getRecentCommitMessages: vi.fn(async () => ({
      repository: [],
      user: [],
    })),
    copyToClipboard: vi.fn(async () => {}),
    getStagedFiles: vi.fn(async () => []),
    getAllChangedFiles: vi.fn(async () => []),
    ...overrides,
  } as ISCMProvider;
}

// -- Tests -----------------------------------------------------------------

describe("SmartDiffSelector", () => {
  let selector: SmartDiffSelector;

  beforeEach(() => {
    selector = new SmartDiffSelector();
    mockFeatureSettings.autoDetectStaged = true;
    mockFeatureSettings.fallbackToAll = true;
    mockFeatureSettings.diffTarget = "auto";
    mockFeatureSettings.suppressNonCriticalWarnings = true;
  });

  // -----------------------------------------------------------------------
  // 1. Staged selection - when staged content exists
  // -----------------------------------------------------------------------
  describe("staged selection", () => {
    it("selects STAGED when staged content exists and user preference is AUTO", async () => {
      const provider = createMockProvider({
        getDiff: vi.fn(async () => "staged diff content"),
        getStagedFiles: vi.fn(async () => [
          "/workspace/repo/file1.ts",
          "/workspace/repo/file2.ts",
        ]),
      });
      const result = createDetectionResult({
        hasStagedContent: true,
        stagedFileCount: 2,
        stagedFiles: ["/workspace/repo/file1.ts", "/workspace/repo/file2.ts"],
        recommendedTarget: DiffTarget.STAGED,
      });

      const target = await selector.selectDiffTarget(provider, result);
      expect(target).toBe(DiffTarget.STAGED);
    });

    it("honors explicit STAGED user preference regardless of detection", async () => {
      const provider = createMockProvider();
      const result = createDetectionResult({
        hasStagedContent: false,
        stagedFileCount: 0,
      });

      const target = await selector.selectDiffTarget(
        provider,
        result,
        DiffTarget.STAGED,
      );
      expect(target).toBe(DiffTarget.STAGED);
    });

    it("honors explicit ALL user preference regardless of detection", async () => {
      const provider = createMockProvider();
      const result = createDetectionResult({
        hasStagedContent: true,
        stagedFileCount: 5,
      });

      const target = await selector.selectDiffTarget(
        provider,
        result,
        DiffTarget.ALL,
      );
      expect(target).toBe(DiffTarget.ALL);
    });
  });

  // -----------------------------------------------------------------------
  // 2. Unstaged fallback - fallback to ALL when no staged content
  // -----------------------------------------------------------------------
  describe("unstaged fallback to ALL", () => {
    it("falls back to ALL when no staged content and fallbackToAll is true", async () => {
      const provider = createMockProvider();
      const result = createDetectionResult({
        hasStagedContent: false,
        stagedFileCount: 0,
      });
      mockFeatureSettings.fallbackToAll = true;

      const target = await selector.selectDiffTarget(provider, result);
      expect(target).toBe(DiffTarget.ALL);
    });

    it("returns STAGED when no staged content but fallbackToAll is false", async () => {
      const provider = createMockProvider();
      const result = createDetectionResult({
        hasStagedContent: false,
        stagedFileCount: 0,
      });
      mockFeatureSettings.fallbackToAll = false;

      const target = await selector.selectDiffTarget(provider, result);
      expect(target).toBe(DiffTarget.STAGED);
    });
  });

  // -----------------------------------------------------------------------
  // 3. Auto mode detection
  // -----------------------------------------------------------------------
  describe("auto mode", () => {
    it("selects STAGED when auto detection finds staged files", async () => {
      const provider = createMockProvider();
      const result = createDetectionResult({
        hasStagedContent: true,
        stagedFileCount: 3,
        recommendedTarget: DiffTarget.STAGED,
      });

      const target = await selector.selectDiffTarget(
        provider,
        result,
        DiffTarget.AUTO,
      );
      expect(target).toBe(DiffTarget.STAGED);
    });

    it("falls back to ALL when auto detection finds no staged files", async () => {
      const provider = createMockProvider();
      const result = createDetectionResult({
        hasStagedContent: false,
        stagedFileCount: 0,
        recommendedTarget: DiffTarget.ALL,
      });

      const target = await selector.selectDiffTarget(
        provider,
        result,
        DiffTarget.AUTO,
      );
      expect(target).toBe(DiffTarget.ALL);
    });

    it("uses preferredTarget when auto-detection is disabled", async () => {
      const provider = createMockProvider();
      const result = createDetectionResult({
        hasStagedContent: true,
        stagedFileCount: 1,
      });
      mockFeatureSettings.autoDetectStaged = false;
      mockFeatureSettings.diffTarget = "staged";

      const target = await selector.selectDiffTarget(provider, result);
      expect(target).toBe(DiffTarget.STAGED);
    });

    it("defaults to ALL when auto-detection disabled and preferredTarget is auto", async () => {
      const provider = createMockProvider();
      const result = createDetectionResult({
        hasStagedContent: false,
      });
      mockFeatureSettings.autoDetectStaged = false;
      mockFeatureSettings.diffTarget = "auto";

      const target = await selector.selectDiffTarget(provider, result);
      expect(target).toBe(DiffTarget.ALL);
    });
  });

  // -----------------------------------------------------------------------
  // 4. Empty repo - detection error handling
  // -----------------------------------------------------------------------
  describe("empty repo / error handling", () => {
    it("falls back to ALL when detection result has an error and fallbackToAll is true", async () => {
      const provider = createMockProvider();
      const result = createDetectionResult({
        hasStagedContent: false,
        stagedFileCount: 0,
        errorMessage: "Not a valid git repository",
      });
      mockFeatureSettings.fallbackToAll = true;

      const target = await selector.selectDiffTarget(provider, result);
      expect(target).toBe(DiffTarget.ALL);
    });

    it("falls back to STAGED when detection result has an error and fallbackToAll is false", async () => {
      const provider = createMockProvider();
      const result = createDetectionResult({
        hasStagedContent: false,
        stagedFileCount: 0,
        errorMessage: "Command timed out",
      });
      mockFeatureSettings.fallbackToAll = false;

      const target = await selector.selectDiffTarget(provider, result);
      expect(target).toBe(DiffTarget.STAGED);
    });
  });

  // -----------------------------------------------------------------------
  // getDiffWithTarget
  // -----------------------------------------------------------------------
  describe("getDiffWithTarget", () => {
    it("returns diff with files for STAGED target", async () => {
      const provider = createMockProvider({
        getDiff: vi.fn(async () => "staged diff content"),
        getStagedFiles: vi.fn(async () => ["/repo/a.ts"]),
      });

      const diffResult = await selector.getDiffWithTarget(
        provider,
        DiffTarget.STAGED,
      );
      expect(diffResult.content).toBe("staged diff content");
      expect(diffResult.target).toBe(DiffTarget.STAGED);
      expect(diffResult.files).toEqual(["/repo/a.ts"]);
    });

    it("returns diff with files for ALL target", async () => {
      const provider = createMockProvider({
        getDiff: vi.fn(async () => "all diff content"),
        getAllChangedFiles: vi.fn(async () => ["/repo/a.ts", "/repo/b.ts"]),
      });

      const diffResult = await selector.getDiffWithTarget(
        provider,
        DiffTarget.ALL,
      );
      expect(diffResult.content).toBe("all diff content");
      expect(diffResult.target).toBe(DiffTarget.ALL);
      expect(diffResult.files).toEqual(["/repo/a.ts", "/repo/b.ts"]);
    });

    it("resolves AUTO target to ALL", async () => {
      const provider = createMockProvider({
        getDiff: vi.fn(async () => "auto resolved content"),
        getAllChangedFiles: vi.fn(async () => []),
      });

      const diffResult = await selector.getDiffWithTarget(
        provider,
        DiffTarget.AUTO,
      );
      expect(diffResult.content).toBe("auto resolved content");
      expect(diffResult.target).toBe(DiffTarget.ALL);
    });

    it("throws for unsupported diff target", async () => {
      const provider = createMockProvider();

      await expect(
        selector.getDiffWithTarget(provider, "unknown" as DiffTarget),
      ).rejects.toThrow("Unsupported diff target");
    });
  });
});
