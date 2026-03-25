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
