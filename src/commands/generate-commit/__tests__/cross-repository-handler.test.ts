import { CrossRepositoryHandler } from "@/commands/generate-commit/handlers/cross-repository-handler";
import { GenerationSession } from "@/commands/generate-commit/types";
import { describe, expect, it, vi } from "vitest";

function createSession(): GenerationSession {
  return {
    requestId: "request-1",
    provider: "openai",
    model: "gpt-test",
    providerConfig: {},
    aiProvider: {} as any,
    selectedModel: {
      id: "gpt-test",
      provider: { id: "openai" },
      maxTokens: { input: 8192, output: 1024 },
    } as any,
    input: {
      rawArgs: [],
      source: "resource-context",
      resourceStates: [],
    },
    scmContext: {
      mode: "cross",
      targets: [
        {
          repositoryPath: "/repo-a",
          selectedFiles: ["/repo-a/a.ts"],
          resources: [],
          repositoryContext: {
            repository: {
              path: "/repo-a",
              name: "repo-a",
              type: "git",
              isActive: false,
            },
          },
          detectionError: "provider missing",
        },
        {
          repositoryPath: "/repo-b",
          selectedFiles: ["/repo-b/b.ts"],
          resources: [],
          scmProvider: { type: "git" } as any,
          repositoryContext: {
            repository: {
              path: "/repo-b",
              name: "repo-b",
              type: "git",
              isActive: false,
            },
          },
        },
        {
          repositoryPath: "/repo-c",
          selectedFiles: ["/repo-c/c.ts"],
          resources: [],
          scmProvider: { type: "git" } as any,
          repositoryContext: {
            repository: {
              path: "/repo-c",
              name: "repo-c",
              type: "git",
              isActive: false,
            },
          },
        },
      ],
    },
  };
}

describe("CrossRepositoryHandler", () => {
  it("aggregates repository results using GenerationResult status", async () => {
    const handler = new CrossRepositoryHandler({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as any);
    const session = createSession();

    const performGeneration = vi
      .fn()
      .mockResolvedValueOnce({
        status: "too_large",
        requestId: "request-1",
      })
      .mockResolvedValueOnce({
        status: "success",
        requestId: "request-1",
      });

    const result = await handler.handle(session, performGeneration);

    expect(result.total).toBe(3);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(2);
    expect(result.results).toHaveLength(3);
    expect(result.results[0]?.status).toBe("failed");
    expect(result.results[1]?.status).toBe("too_large");
    expect(result.results[2]?.status).toBe("success");
    expect(performGeneration).toHaveBeenCalledTimes(2);
  });
});

