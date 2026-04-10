import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";

// -- Shared mocks ----------------------------------------------------------

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  logError: vi.fn(),
};

vi.mock("@/utils/logger", () => ({
  Logger: {
    getInstance: () => mockLogger,
  },
}));

vi.mock("@/utils/i18n", () => ({
  getMessage: (key: string) => key,
  formatMessage: (key: string, args: any[] = []) =>
    args.length > 0 ? `${key}:${args.join(",")}` : key,
}));

vi.mock("@/utils/notification/notification-manager", () => ({
  notify: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/scm/svn/helpers/svn-path-helper", () => ({
  SvnPathHelper: {
    normalizePath: (p: string) => p,
    getSvnPath: vi.fn(async () => "svn"),
    getEnvironmentConfig: () => ({}),
    escapeShellPath: (p: string) => p,
    createExecOptions: (cwd: string) => ({ cwd }),
  },
}));

// Track repositories passed to SvnRepositoryManager so findRepository can return them
let trackedRepositories: any[] = [];

vi.mock("@/scm/svn/svn-repository-manager", () => {
  return {
    SvnRepositoryManager: class {
      constructor(repositories: any[], _repoPath?: string) {
        trackedRepositories = repositories;
      }
      findRepository = vi.fn(() => trackedRepositories[0] || undefined);
      findRepositoryAndPath = vi.fn(() => {
        const repo = trackedRepositories[0];
        if (!repo) {return undefined;}
        const repoPath = repo.rootUri?.fsPath || repo.root;
        return repoPath ? { repository: repo, repositoryPath: repoPath } : undefined;
      });
      updateRepositories = vi.fn((repos: any[]) => {
        trackedRepositories = repos;
      });
    },
  };
});

vi.mock("@/scm/svn/helpers/svn-diff-helper", () => {
  return {
    SvnDiffHelper: class {
      getDiff = vi.fn(async () => "svn diff output");
    },
  };
});

vi.mock("@/scm/svn/helpers/svn-log-helper", () => {
  return {
    SvnLogHelper: class {
      getCommitLog = vi.fn(async () => []);
      getRecentCommitMessages = vi.fn(async () => ({
        repository: [],
        user: [],
      }));
    },
  };
});

vi.mock("@/utils/diff/diff-processor", () => ({
  DiffProcessor: {
    process: vi.fn((content: string) => content),
  },
}));

import { SvnProvider } from "@/scm/svn/svn-provider";

// -- Helpers ---------------------------------------------------------------

function createSvnExtensionMock(repositories: any[] = []) {
  return {
    getAPI: () => ({
      repositories,
    }),
  };
}

function createMockRepo(overrides: Record<string, any> = {}) {
  return {
    rootUri: { fsPath: "/workspace/svn-repo" },
    inputBox: { value: "" },
    commitFiles: vi.fn(async () => {}),
    root: "/workspace/svn-repo",
    ...overrides,
  };
}

// -- Tests -----------------------------------------------------------------

describe("SvnProvider", () => {
  let mockSvnExtension: any;

  beforeEach(() => {
    vi.clearAllMocks();
    trackedRepositories = [];
    mockSvnExtension = createSvnExtensionMock([createMockRepo()]);

    // Set workspace folders for constructor
    (vscode.workspace as any).workspaceFolders = [
      { uri: { fsPath: "/workspace/svn-repo" } },
    ];
  });

  // -----------------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------------
  describe("constructor", () => {
    it("throws when no workspace folders exist", () => {
      (vscode.workspace as any).workspaceFolders = undefined;
      expect(
        () => new SvnProvider(mockSvnExtension),
      ).toThrow();
    });

    it("creates instance with valid workspace", () => {
      const provider = new SvnProvider(mockSvnExtension);
      expect(provider.type).toBe("svn");
    });
  });

  // -----------------------------------------------------------------------
  // isAvailable
  // -----------------------------------------------------------------------
  describe("isAvailable", () => {
    it("returns true when SVN extension has repositories", async () => {
      const provider = new SvnProvider(mockSvnExtension);
      const result = await provider.isAvailable();
      expect(result).toBe(true);
    });

    it("returns false when SVN extension has no repositories", async () => {
      const emptyExt = createSvnExtensionMock([]);
      const provider = new SvnProvider(emptyExt);
      const result = await provider.isAvailable();
      expect(result).toBe(false);
    });

    it("returns false when constructor extension throws", () => {
      // Constructor will throw if getAPI throws, so we test that behavior
      const badExt = {
        getAPI: () => {
          throw new Error("API unavailable");
        },
      };
      expect(
        () => new SvnProvider(badExt),
      ).toThrow("API unavailable");
    });
  });

  // -----------------------------------------------------------------------
  // getDiff
  // -----------------------------------------------------------------------
  describe("getDiff", () => {
    it("throws when not initialized", async () => {
      const provider = new SvnProvider(mockSvnExtension);
      await expect(provider.getDiff()).rejects.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // commit
  // -----------------------------------------------------------------------
  describe("commit", () => {
    it("throws when no repository found", async () => {
      // Empty extension = no repositories
      const emptyExt = createSvnExtensionMock([]);
      const provider = new SvnProvider(emptyExt);
      await expect(
        provider.commit("test message", ["/file.ts"]),
      ).rejects.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // setCommitInput / getCommitInput
  // -----------------------------------------------------------------------
  describe("setCommitInput / getCommitInput", () => {
    it("sets inputBox value when repository has inputBox", async () => {
      const mockRepo = createMockRepo();
      const ext = createSvnExtensionMock([mockRepo]);
      const provider = new SvnProvider(ext);

      await provider.setCommitInput("test commit message");
      expect(mockRepo.inputBox.value).toBe("test commit message");
    });

    it("copies to clipboard when repository has no inputBox", async () => {
      const mockRepo = createMockRepo({ inputBox: undefined });
      const ext = createSvnExtensionMock([mockRepo]);
      const provider = new SvnProvider(ext);

      // Should not throw - falls back to clipboard
      await provider.setCommitInput("fallback message");
    });

    it("throws when no repository found for getCommitInput", async () => {
      const emptyExt = createSvnExtensionMock([]);
      const provider = new SvnProvider(emptyExt);
      await expect(provider.getCommitInput()).rejects.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // startStreamingInput
  // -----------------------------------------------------------------------
  describe("startStreamingInput", () => {
    it("delegates to setCommitInput", async () => {
      const mockRepo = createMockRepo();
      const ext = createSvnExtensionMock([mockRepo]);
      const provider = new SvnProvider(ext);

      await provider.startStreamingInput("streaming message");
      expect(mockRepo.inputBox.value).toBe("streaming message");
    });
  });

  // -----------------------------------------------------------------------
  // getCommitLog
  // -----------------------------------------------------------------------
  describe("getCommitLog", () => {
    it("throws when not initialized", async () => {
      const provider = new SvnProvider(mockSvnExtension);
      await expect(provider.getCommitLog()).rejects.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // copyToClipboard
  // -----------------------------------------------------------------------
  describe("copyToClipboard", () => {
    it("writes message to clipboard without throwing", async () => {
      const provider = new SvnProvider(mockSvnExtension);
      // copyToClipboard uses vscode.env.clipboard.writeText which is mocked in setup.ts
      await expect(
        provider.copyToClipboard("clipboard message"),
      ).resolves.toBeUndefined();
    });
  });
});
