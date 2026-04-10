import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { MultiRepositoryContextManager } from "@/scm/multi-repository-context-manager";

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

vi.mock("@/scm/svn/helpers/svn-utils-helper", () => ({
  SvnUtilsHelper: {
    findSvnRoot: vi.fn(async () => undefined),
  },
}));

vi.mock("child_process", () => ({
  exec: vi.fn(),
  promisify: vi.fn((fn) => fn),
}));

vi.mock("fs", async () => {
  const actual = await vi.importActual("fs");
  return {
    ...actual,
    realpathSync: (p: string) => p,
  };
});

describe("MultiRepositoryContextManager repository matching", () => {
  beforeEach(() => {
    (vscode as any).extensions = {
      getExtension: vi.fn((id: string) => {
        if (id !== "vscode.git") {
          return undefined;
        }

        return {
          isActive: true,
          exports: {
            getAPI: () => ({
              repositories: [
                { rootUri: { fsPath: "/workspace/repo" } },
                { rootUri: { fsPath: "/workspace/repo-tools" } },
              ],
            }),
          },
        };
      }),
    };
  });

  it("prefers boundary-safe and longest repository path", async () => {
    const manager = new MultiRepositoryContextManager();
    const result = await manager.getRepositoryFromResources(undefined, [
      "/workspace/repo-tools/src/index.ts",
    ]);

    expect(result).toBe("/workspace/repo-tools");
  });
});

// ---------------------------------------------------------------------------
// Extended tests: path boundary safety, mixed SCM types, edge cases
// ---------------------------------------------------------------------------

describe("MultiRepositoryContextManager path boundary safety", () => {
  beforeEach(() => {
    (vscode as any).extensions = {
      getExtension: vi.fn((id: string) => {
        if (id !== "vscode.git") {
          return undefined;
        }

        return {
          isActive: true,
          exports: {
            getAPI: () => ({
              repositories: [
                { rootUri: { fsPath: "/workspace/repo" } },
                { rootUri: { fsPath: "/workspace/repo-tools" } },
              ],
            }),
          },
        };
      }),
    };
  });

  it("does not match /repo-tools to /repo boundary (prefix safety)", async () => {
    const manager = new MultiRepositoryContextManager();
    // /workspace/repo-tools is a separate repo, NOT under /workspace/repo
    const result = await manager.getRepositoryFromResources(undefined, [
      "/workspace/repo-tools/src/main.ts",
    ]);

    expect(result).toBe("/workspace/repo-tools");
    expect(result).not.toBe("/workspace/repo");
  });

  it("matches /repo/subdir/file.ts to /workspace/repo", async () => {
    const manager = new MultiRepositoryContextManager();
    const result = await manager.getRepositoryFromResources(undefined, [
      "/workspace/repo/subdir/file.ts",
    ]);

    expect(result).toBe("/workspace/repo");
  });

  it("returns undefined for file outside all repositories", async () => {
    const manager = new MultiRepositoryContextManager();
    const result = await manager.getRepositoryFromResources(undefined, [
      "/other/location/file.ts",
    ]);

    expect(result).toBeUndefined();
  });

  it("handles multiple files matching different repositories", async () => {
    const manager = new MultiRepositoryContextManager();
    // First file should match /workspace/repo
    const result1 = await manager.getRepositoryFromResources(undefined, [
      "/workspace/repo/src/main.ts",
    ]);
    expect(result1).toBe("/workspace/repo");

    // Second file should match /workspace/repo-tools
    const result2 = await manager.getRepositoryFromResources(undefined, [
      "/workspace/repo-tools/lib/util.ts",
    ]);
    expect(result2).toBe("/workspace/repo-tools");
  });
});

describe("MultiRepositoryContextManager mixed SCM types", () => {
  beforeEach(() => {
    // Git extension returns git repos
    (vscode as any).extensions = {
      getExtension: vi.fn((id: string) => {
        if (id === "vscode.git") {
          return {
            isActive: true,
            exports: {
              getAPI: () => ({
                repositories: [
                  { rootUri: { fsPath: "/workspace/git-repo" } },
                ],
              }),
            },
          };
        }
        if (id === "littleCareless.svn-scm-ai" || id === "johnstoncode.svn-scm") {
          return {
            isActive: true,
            exports: {
              getRepositories: async () => [
                { root: "/workspace/svn-repo" },
              ],
            },
          };
        }
        return undefined;
      }),
    };
  });

  it("matches git file to git repository", async () => {
    const manager = new MultiRepositoryContextManager();
    const result = await manager.getRepositoryFromResources(undefined, [
      "/workspace/git-repo/src/main.ts",
    ]);

    expect(result).toBe("/workspace/git-repo");
  });

  it("matches SVN file to SVN repository via SVN extension", async () => {
    const manager = new MultiRepositoryContextManager();
    const result = await manager.getRepositoryFromResources(undefined, [
      "/workspace/svn-repo/src/main.ts",
    ]);

    expect(result).toBe("/workspace/svn-repo");
  });

  it("handles no active extensions gracefully", async () => {
    (vscode as any).extensions = {
      getExtension: vi.fn(() => undefined),
    };

    const manager = new MultiRepositoryContextManager();
    const result = await manager.getRepositoryFromResources(undefined, [
      "/workspace/unknown/file.ts",
    ]);

    expect(result).toBeUndefined();
  });
});

describe("MultiRepositoryContextManager undefined resourceUri", () => {
  beforeEach(() => {
    (vscode as any).extensions = {
      getExtension: vi.fn((id: string) => {
        if (id !== "vscode.git") {
          return undefined;
        }

        return {
          isActive: true,
          exports: {
            getAPI: () => ({
              repositories: [
                { rootUri: { fsPath: "/workspace/repo" } },
              ],
            }),
          },
        };
      }),
    };
  });

  it("handles undefined resourceStates without error", async () => {
    const manager = new MultiRepositoryContextManager();
    const result = await manager.getRepositoryFromResources(undefined, undefined);
    expect(result).toBeUndefined();
  });

  it("handles resourceStates with undefined uri", async () => {
    const manager = new MultiRepositoryContextManager();
    // Resource state without proper uri
    const states = [{ uri: undefined }];
    const result = await manager.getRepositoryFromResources(
      states as any,
      undefined,
    );
    // Should not throw; result is undefined because no files to match
    expect(result).toBeUndefined();
  });

  it("handles empty file array", async () => {
    const manager = new MultiRepositoryContextManager();
    const result = await manager.getRepositoryFromResources(undefined, []);
    expect(result).toBeUndefined();
  });
});

describe("MultiRepositoryContextManager groupResourceStatesByRepository", () => {
  beforeEach(() => {
    (vscode as any).extensions = {
      getExtension: vi.fn((id: string) => {
        if (id !== "vscode.git") {
          return undefined;
        }

        return {
          isActive: true,
          exports: {
            getAPI: () => ({
              repositories: [
                { rootUri: { fsPath: "/workspace/repo" } },
                { rootUri: { fsPath: "/workspace/repo-tools" } },
              ],
            }),
          },
        };
      }),
    };
  });

  it("groups files by repository", async () => {
    const manager = new MultiRepositoryContextManager();

    const states = [
      {
        resourceUri: { fsPath: "/workspace/repo/src/main.ts", scheme: "file" },
        resourceGroup: {
          sourceControl: { id: "git", rootUri: { fsPath: "/workspace/repo" } },
        },
      },
      {
        resourceUri: { fsPath: "/workspace/repo-tools/lib/util.ts", scheme: "file" },
        resourceGroup: {
          sourceControl: {
            id: "git",
            rootUri: { fsPath: "/workspace/repo-tools" },
          },
        },
      },
    ];

    const grouped = await manager.groupResourceStatesByRepository(
      states as any,
    );

    expect(grouped.size).toBe(2);
    expect(grouped.has("/workspace/repo")).toBe(true);
    expect(grouped.has("/workspace/repo-tools")).toBe(true);
  });

  it("deduplicates files within the same repository", async () => {
    const manager = new MultiRepositoryContextManager();

    const states = [
      {
        resourceUri: { fsPath: "/workspace/repo/a.ts", scheme: "file" },
        resourceGroup: {
          sourceControl: { id: "git", rootUri: { fsPath: "/workspace/repo" } },
        },
      },
      {
        resourceUri: { fsPath: "/workspace/repo/a.ts", scheme: "file" },
        resourceGroup: {
          sourceControl: { id: "git", rootUri: { fsPath: "/workspace/repo" } },
        },
      },
    ];

    const grouped = await manager.groupResourceStatesByRepository(
      states as any,
    );

    expect(grouped.size).toBe(1);
    const repoState = grouped.get("/workspace/repo");
    expect(repoState?.files.length).toBe(1);
  });

  it("skips states without file paths", async () => {
    const manager = new MultiRepositoryContextManager();

    const states = [
      { resourceUri: undefined },
      {
        resourceUri: { fsPath: "/workspace/repo/a.ts", scheme: "file" },
        resourceGroup: {
          sourceControl: { id: "git", rootUri: { fsPath: "/workspace/repo" } },
        },
      },
    ];

    const grouped = await manager.groupResourceStatesByRepository(
      states as any,
    );

    expect(grouped.size).toBe(1);
  });
});
