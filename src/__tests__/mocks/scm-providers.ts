import { vi } from "vitest";

/**
 * SCM Provider mock factory.
 *
 * Provides typed mock factories for SCM (Source Code Management) provider
 * interfaces, resource states, and workspace folder structures.
 *
 * Usage:
 *   import { createMockSCMProvider } from "@/__tests__/mocks/scm-providers";
 */

export interface MockSCMProviderOptions {
  type?: "git" | "svn";
  available?: boolean;
  diffContent?: string;
  commitLog?: string[];
}

/**
 * Creates a mock that satisfies the `ISCMProvider` interface.
 */
export function createMockSCMProvider(options: MockSCMProviderOptions = {}) {
  const {
    type = "git",
    available = true,
    diffContent = "diff --git a/file.ts b/file.ts\nindex abc..def 100644\n--- a/file.ts\n+++ b/file.ts\n@@ -1,3 +1,4 @@\n import x;\n+import y;\n export class Foo {}\n",
    commitLog = ["feat: initial commit", "fix: bug fix"],
  } = options;

  return {
    type,
    isAvailable: vi.fn(async () => available),
    init: vi.fn(async () => {}),
    getDiff: vi.fn(async () => diffContent),
    commit: vi.fn(async () => {}),
    setCommitInput: vi.fn(async () => {}),
    getCommitInput: vi.fn(async () => ""),
    startStreamingInput: vi.fn(async () => {}),
    getCommitLog: vi.fn(async () => commitLog),
    getBranches: vi.fn(async () => ["main", "develop"]),
    getRecentCommitMessages: vi.fn(async () => ({
      repository: commitLog,
      user: commitLog,
    })),
    getRecentCommits: vi.fn(async () =>
      commitLog.map((msg, i) => ({
        hash: `abc${i}def`,
        message: msg,
        author: "test-user",
        date: "2026-01-01",
      })),
    ),
    getChanges: vi.fn(async () => []),
    copyToClipboard: vi.fn(async () => {}),
    setCurrentFiles: vi.fn(),
    getStagedFiles: vi.fn(async () => []),
    getAllChangedFiles: vi.fn(async () => []),
  };
}

/**
 * Creates a mock `SourceControlResourceState` object.
 */
export function createResourceState(
  fsPath: string,
  decorations?: {
    letter?: string;
    tooltip?: string;
    strikeThrough?: boolean;
  },
) {
  return {
    uri: {
      fsPath,
      path: fsPath,
      scheme: "file",
      toString: () => fsPath,
    },
    decorations: decorations ?? {
      letter: "M",
      tooltip: "Modified",
      strikeThrough: false,
    },
    command: undefined,
    letter: decorations?.letter ?? "M",
    tooltip: decorations?.tooltip ?? "Modified",
    color: undefined,
  };
}

/**
 * Creates a mock `WorkspaceFolder` object.
 */
export function createWorkspaceFolder(
  fsPath: string,
  name?: string,
  index?: number,
) {
  return {
    uri: {
      fsPath,
      path: fsPath,
      scheme: "file",
      toString: () => fsPath,
    },
    name: name ?? fsPath.split("/").pop() ?? "workspace",
    index: index ?? 0,
  };
}

/**
 * Creates a mock Git provider factory.
 */
export function createMockGitProviderFactory(
  provider?: ReturnType<typeof createMockSCMProvider>,
) {
  const mockProvider = provider ?? createMockSCMProvider({ type: "git" });
  return {
    createGitProvider: vi.fn(() => mockProvider),
    mockProvider,
  };
}

/**
 * Creates a mock SVN provider factory.
 */
export function createMockSvnProviderFactory(
  provider?: ReturnType<typeof createMockSCMProvider>,
) {
  const mockProvider = provider ?? createMockSCMProvider({ type: "svn" });
  return {
    createSvnProvider: vi.fn(() => mockProvider),
    mockProvider,
  };
}
