import { GenerateCommitCommand } from "@/commands/generate-commit/generate-commit-command";
import { CrossRepositoryResult } from "@/commands/generate-commit/types";
import { notify } from "@/utils/notification/notification-manager";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/utils/notification/notification-manager", () => ({
  notify: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function createCrossRepoResult(
  overrides: Partial<CrossRepositoryResult>,
): CrossRepositoryResult {
  return {
    requestId: "request-1",
    total: 2,
    successCount: 0,
    failureCount: 0,
    cancelledCount: 0,
    cancelled: false,
    results: [],
    ...overrides,
  };
}

describe("GenerateCommitCommand cross-repository summary", () => {
  it("does not report full success when cancelled repositories exist", async () => {
    const command = new GenerateCommitCommand({} as any);
    const result = createCrossRepoResult({
      successCount: 1,
      cancelledCount: 1,
      cancelled: true,
      results: [
        {
          repoPath: "/repo-a",
          status: "success",
          applied: true,
          requestId: "request-1",
        },
        {
          repoPath: "/repo-b",
          status: "cancelled",
          applied: false,
          requestId: "request-1",
        },
      ],
    });

    await (command as any).notifyCrossRepositorySummary(result);

    expect(notify.info).not.toHaveBeenCalledWith(
      "generate.commit.cross.repository.success",
      expect.anything(),
    );
    expect(notify.warn).toHaveBeenCalledWith(
      "generate.commit.cross.repository.partial",
      [1, 1],
    );
  });

  it("reports success only when both failure and cancelled counts are zero", async () => {
    const command = new GenerateCommitCommand({} as any);
    const result = createCrossRepoResult({
      successCount: 2,
      results: [
        {
          repoPath: "/repo-a",
          status: "success",
          applied: true,
          requestId: "request-1",
        },
        {
          repoPath: "/repo-b",
          status: "success",
          applied: true,
          requestId: "request-1",
        },
      ],
    });

    await (command as any).notifyCrossRepositorySummary(result);

    expect(notify.info).toHaveBeenCalledWith(
      "generate.commit.cross.repository.success",
      [2],
    );
  });

  it("derives non-success count from total repositories to avoid undercounting", async () => {
    const command = new GenerateCommitCommand({} as any);
    const result = createCrossRepoResult({
      total: 4,
      successCount: 1,
      failureCount: 1,
      cancelledCount: 1,
      cancelled: true,
      results: [
        {
          repoPath: "/repo-a",
          status: "success",
          applied: true,
          requestId: "request-1",
        },
        {
          repoPath: "/repo-b",
          status: "failed",
          applied: false,
          requestId: "request-1",
        },
        {
          repoPath: "/repo-c",
          status: "cancelled",
          applied: false,
          requestId: "request-1",
        },
      ],
    });

    await (command as any).notifyCrossRepositorySummary(result);

    expect(notify.warn).toHaveBeenCalledWith(
      "generate.commit.cross.repository.partial",
      [1, 3],
    );
  });
});
