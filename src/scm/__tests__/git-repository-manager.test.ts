import { beforeEach, describe, expect, it, vi } from "vitest";
import { GitRepositoryManager, GitRepositoryInfo } from "@/scm/git/git-repository-manager";

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

vi.mock("@/utils/i18n", () => ({
  formatMessage: (messageKey: string) => messageKey,
}));

vi.mock("@/utils/notification/notification-manager", () => ({
  notify: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function createRepoInfo(rootPath: string): GitRepositoryInfo {
  return {
    rootPath,
    name: rootPath.split("/").pop() || rootPath,
    repository: {
      rootUri: { fsPath: rootPath },
      inputBox: { value: "" },
      commit: async () => {},
      log: async () => [],
      getConfig: async () => undefined,
      getGlobalConfig: async () => undefined,
    } as any,
  };
}

describe("GitRepositoryManager path matching", () => {
  beforeEach(() => {
    (GitRepositoryManager as any).instance = undefined;
  });

  it("selects the most specific repository for file paths", async () => {
    const manager = GitRepositoryManager.getInstance({});
    const repoMap = new Map<string, GitRepositoryInfo>([
      ["/workspace/repo", createRepoInfo("/workspace/repo")],
      ["/workspace/repo-tools", createRepoInfo("/workspace/repo-tools")],
    ]);
    vi.spyOn(manager, "discoverRepositories").mockResolvedValue(repoMap);

    const result = await manager.getRepositoryForFile(
      "/workspace/repo-tools/src/index.ts",
    );

    expect(result?.rootPath).toBe("/workspace/repo-tools");
  });

  it("selects the most specific repository for nested repository paths", async () => {
    const manager = GitRepositoryManager.getInstance({});
    const repoMap = new Map<string, GitRepositoryInfo>([
      ["/workspace/repo", createRepoInfo("/workspace/repo")],
      ["/workspace/repo-tools", createRepoInfo("/workspace/repo-tools")],
    ]);
    vi.spyOn(manager, "discoverRepositories").mockResolvedValue(repoMap);

    const result = await manager.getRepositoryByPath(
      "/workspace/repo-tools/packages/core",
    );

    expect(result?.rootPath).toBe("/workspace/repo-tools");
  });
});
