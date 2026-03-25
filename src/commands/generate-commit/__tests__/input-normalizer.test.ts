import { describe, expect, it } from "vitest";
import { normalizeGenerateCommitInput } from "@/commands/generate-commit/utils/input-normalizer";

describe("normalizeGenerateCommitInput", () => {
  it("normalizes scm/title source control args", () => {
    const sourceControl = {
      id: "git",
      rootUri: { fsPath: "/repo" },
    } as any;

    const normalized = normalizeGenerateCommitInput([sourceControl]);

    expect(normalized.source).toBe("scm-title");
    expect(normalized.sourceControl).toBe(sourceControl);
    expect(normalized.resourceStates).toHaveLength(0);
    expect(normalized.prepareArg).toBe(sourceControl);
  });

  it("normalizes resource state args from spread arguments", () => {
    const stateA = { resourceUri: { fsPath: "/repo/a.ts" } } as any;
    const stateB = { resourceUri: { fsPath: "/repo/b.ts" } } as any;

    const normalized = normalizeGenerateCommitInput([stateA, stateB]);

    expect(normalized.source).toBe("resource-context");
    expect(normalized.resourceStates).toEqual([stateA, stateB]);
    expect(normalized.prepareArg).toEqual([stateA, stateB]);
  });

  it("supports legacy nested array argument shape", () => {
    const stateA = { resourceUri: { fsPath: "/repo/a.ts" } } as any;
    const stateB = { resourceUri: { fsPath: "/repo/b.ts" } } as any;

    const normalized = normalizeGenerateCommitInput([[stateA, stateB]]);

    expect(normalized.source).toBe("resource-context");
    expect(normalized.resourceStates).toEqual([stateA, stateB]);
  });

  it("falls back to command-palette source", () => {
    const normalized = normalizeGenerateCommitInput([]);

    expect(normalized.source).toBe("command-palette");
    expect(normalized.prepareArg).toBeUndefined();
  });
});

