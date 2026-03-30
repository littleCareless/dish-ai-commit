import { SemanticGroupingService } from "@/commands/generate-commit/services/semantic-grouping-service";
import { describe, expect, it, vi } from "vitest";

function createService() {
  return new SemanticGroupingService({
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  } as any);
}

function createInput(overrides?: Partial<any>) {
  return {
    aiProvider: {
      generateCommit: vi.fn(async () => ({
        content: JSON.stringify({
          groups: [
            {
              title: "core changes",
              reason: "business logic updates",
              files: ["src/core.ts", "src/service.ts"],
            },
            {
              title: "docs",
              reason: "documentation updates",
              files: ["README.md"],
            },
          ],
        }),
      })),
    },
    requestParams: { language: "English" },
    selectedModel: { id: "test-model" },
    fileChanges: [
      { filePath: "src/core.ts", description: "refactor core" },
      { filePath: "src/service.ts", description: "add service flow" },
      { filePath: "README.md", description: "update docs" },
    ],
    repositoryPath: "/repo",
    language: "English",
    ...overrides,
  } as any;
}

describe("SemanticGroupingService", () => {
  it("uses AI grouping when response is valid", async () => {
    const service = createService();
    const input = createInput();

    const result = await service.groupChanges(input);

    expect(result.fallbackUsed).toBe(false);
    expect(result.groups).toHaveLength(2);
    expect(result.groups[0].files).toEqual(["src/core.ts", "src/service.ts"]);
    expect(result.groups[1].files).toEqual(["README.md"]);
    expect(input.aiProvider.generateCommit).toHaveBeenCalledTimes(1);
  });

  it("retries after first failure and falls back when second attempt is still invalid", async () => {
    const service = createService();
    const input = createInput({
      aiProvider: {
        generateCommit: vi
          .fn()
          .mockResolvedValueOnce({
            content: JSON.stringify({
              groups: [
                {
                  title: "bad duplicate",
                  reason: "duplicate files",
                  files: ["src/core.ts", "src/core.ts"],
                },
                {
                  title: "missing",
                  reason: "missing files",
                  files: ["README.md"],
                },
              ],
            }),
          })
          .mockResolvedValueOnce({
            content: JSON.stringify({
              groups: [
                {
                  title: "invalid path",
                  reason: "path not in selection",
                  files: ["src/not-exists.ts"],
                },
                {
                  title: "another",
                  reason: "another group",
                  files: ["README.md"],
                },
              ],
            }),
          }),
      },
    });

    const result = await service.groupChanges(input);

    expect(result.fallbackUsed).toBe(true);
    expect(result.groups.length).toBeGreaterThan(0);
    expect(result.fallbackReason).toContain("first_attempt=");
    expect(result.fallbackReason).toContain("second_attempt=");
    expect(input.aiProvider.generateCommit).toHaveBeenCalledTimes(2);
  });
});
