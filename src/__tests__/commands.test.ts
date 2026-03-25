import { beforeEach, describe, expect, it, vi } from "vitest";
import { COMMANDS } from "@/constants";
import { CommandManager } from "@/commands";

const hoisted = vi.hoisted(() => ({
  commandCallbacks: new Map<string, (...args: any[]) => Promise<unknown>>(),
  commitExecute: vi.fn(),
  weeklyExecute: vi.fn(),
  reviewExecute: vi.fn(),
  branchExecute: vi.fn(),
  prExecute: vi.fn(),
  syncExecute: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock("vscode", () => ({
  commands: {
    registerCommand: (
      commandId: string,
      callback: (...args: any[]) => Promise<unknown>,
    ) => {
      hoisted.commandCallbacks.set(commandId, callback);
      return {
        dispose: vi.fn(),
      };
    },
  },
}));

vi.mock("@/utils", () => ({
  notify: {
    error: hoisted.notifyError,
  },
}));

vi.mock("@/commands/generate-commit/generate-commit-command", () => ({
  GenerateCommitCommand: class {
    execute(...args: any[]) {
      return hoisted.commitExecute(...args);
    }
  },
}));

vi.mock("@/commands/generate-weekly-report-command", () => ({
  GenerateWeeklyReportCommand: class {
    execute() {
      return hoisted.weeklyExecute();
    }
  },
}));

vi.mock("@/commands/review-code-command", () => ({
  ReviewCodeCommand: class {
    execute(resources?: any[]) {
      return hoisted.reviewExecute(resources);
    }
  },
}));

vi.mock("@/commands/generate-branch-name/generate-branch-name-command", () => ({
  GenerateBranchNameCommand: class {
    execute(resources?: any[]) {
      return hoisted.branchExecute(resources);
    }
  },
}));

vi.mock("@/commands/generate-pr-summary-command", () => ({
  GeneratePRSummaryCommand: class {
    execute(arg: any) {
      return hoisted.prExecute(arg);
    }
  },
}));

vi.mock("@/commands/sync-model-catalog-command", () => ({
  SyncModelCatalogCommand: class {
    execute() {
      return hoisted.syncExecute();
    }
  },
}));

describe("CommandManager command status", () => {
  beforeEach(() => {
    hoisted.commandCallbacks.clear();
    hoisted.commitExecute.mockReset();
    hoisted.weeklyExecute.mockReset();
    hoisted.reviewExecute.mockReset();
    hoisted.branchExecute.mockReset();
    hoisted.prExecute.mockReset();
    hoisted.syncExecute.mockReset();
    hoisted.notifyError.mockReset();
  });

  it("returns success=true when a command completes", async () => {
    hoisted.commitExecute.mockResolvedValueOnce(undefined);
    new CommandManager({} as any, {} as any);

    const command = hoisted.commandCallbacks.get(COMMANDS.COMMIT.GENERATE);
    expect(command).toBeDefined();

    const result = await command?.();
    expect(result).toEqual({ success: true });
    expect(hoisted.notifyError).not.toHaveBeenCalled();
  });

  it("returns success=false when a command throws", async () => {
    hoisted.commitExecute.mockRejectedValueOnce(new Error("boom"));
    new CommandManager({} as any, {} as any);

    const command = hoisted.commandCallbacks.get(COMMANDS.COMMIT.GENERATE);
    expect(command).toBeDefined();

    const result = await command?.();
    expect(result).toEqual({ success: false, error: "boom" });
    expect(hoisted.notifyError).not.toHaveBeenCalled();
  });

  it("keeps manager-level error notification for non-generate commands", async () => {
    hoisted.weeklyExecute.mockRejectedValueOnce(new Error("weekly boom"));
    new CommandManager({} as any, {} as any);

    const command = hoisted.commandCallbacks.get(
      COMMANDS.WEEKLY_REPORT.GENERATE,
    );
    expect(command).toBeDefined();

    const result = await command?.();
    expect(result).toEqual({ success: false, error: "weekly boom" });
    expect(hoisted.notifyError).toHaveBeenCalledWith(
      "command.weekly.report.failed",
      ["weekly boom"],
    );
  });
});
