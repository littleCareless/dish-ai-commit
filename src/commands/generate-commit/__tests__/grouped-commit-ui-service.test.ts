import { GroupedCommitUiService } from "@/commands/generate-commit/services/grouped-commit-ui-service";
import * as vscode from "vscode";
import { describe, expect, it, vi } from "vitest";

function createService() {
  return new GroupedCommitUiService({
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  } as any);
}

function createInput(overrides?: Partial<any>) {
  return {
    groups: [
      {
        id: "g1",
        title: "core",
        reason: "core changes",
        files: ["src/a.ts"],
        commitMessage: "fix(src): legacy template",
      },
    ],
    selectedFiles: ["src/a.ts"],
    scmProvider: {
      type: "svn",
      startStreamingInput: vi.fn(async () => {}),
    },
    ...overrides,
  } as any;
}

describe("GroupedCommitUiService", () => {
  it("fails when resolveCommitMessage returns empty", async () => {
    const service = createService();
    (vscode.window as any).showQuickPick = vi.fn(async (items: any[]) => items[0]);
    const input = createInput({
      resolveCommitMessage: vi.fn(async () => ""),
    });

    const result = await service.pickAndApplyGroup(input);

    expect(result.status).toBe("failed");
    expect(input.scmProvider.startStreamingInput).not.toHaveBeenCalled();
  });

  it("fails when resolveCommitMessage throws", async () => {
    const service = createService();
    (vscode.window as any).showQuickPick = vi.fn(async (items: any[]) => items[0]);
    const input = createInput({
      resolveCommitMessage: vi.fn(async () => {
        throw new Error("resolve failed");
      }),
    });

    const result = await service.pickAndApplyGroup(input);

    expect(result.status).toBe("failed");
    expect(result.error).toBe("resolve failed");
    expect(input.scmProvider.startStreamingInput).not.toHaveBeenCalled();
  });
});
