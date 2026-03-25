import { CrossRepositoryHandler } from "@/commands/generate-commit/handlers/cross-repository-handler";
import { GenerationSession } from "@/commands/generate-commit/types";
import { ProgressHandler } from "@/utils/notification/progress-handler";
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
        applied: false,
        requestId: "request-1",
      })
      .mockResolvedValueOnce({
        status: "success",
        applied: true,
        requestId: "request-1",
      });

    const result = await handler.handle(session, performGeneration);

    expect(result.total).toBe(3);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(2);
    expect(result.cancelledCount).toBe(0);
    expect(result.results).toHaveLength(3);
    expect(result.results[0]?.status).toBe("failed");
    expect(result.results[1]?.status).toBe("too_large");
    expect(result.results[2]?.status).toBe("success");
    expect(performGeneration).toHaveBeenCalledTimes(2);
  });

  it("tracks cancelled repositories separately from failures", async () => {
    const handler = new CrossRepositoryHandler({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as any);
    const session = createSession();

    const performGeneration = vi
      .fn()
      .mockResolvedValueOnce({
        status: "cancelled",
        applied: false,
        requestId: "request-1",
      })
      .mockResolvedValueOnce({
        status: "success",
        applied: true,
        requestId: "request-1",
      });

    const result = await handler.handle(session, performGeneration);

    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(1);
    expect(result.cancelledCount).toBe(2);
    expect(result.cancelled).toBe(true);
    expect(result.results.map((item) => item.status)).toEqual([
      "failed",
      "cancelled",
      "cancelled",
    ]);
    expect(performGeneration).toHaveBeenCalledTimes(1);
  });

  it("marks remaining repositories as cancelled when progress token is cancelled", async () => {
    const handler = new CrossRepositoryHandler({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as any);
    const session = createSession();
    const crossTargets = session.scmContext.mode === "cross" ? session.scmContext.targets : [];
    crossTargets[0]!.scmProvider = { type: "git" } as any;
    crossTargets[0]!.detectionError = undefined;

    const token = { isCancellationRequested: false };
    const withProgressSpy = vi
      .spyOn(ProgressHandler, "withProgress")
      .mockImplementation(async (_title, task) =>
        task({ report: () => {} } as any, token as any),
      );

    const performGeneration = vi.fn().mockImplementationOnce(async () => {
      token.isCancellationRequested = true;
      return {
        status: "success",
        applied: true,
        requestId: "request-1",
      };
    });

    const result = await handler.handle(session, performGeneration);

    expect(result.total).toBe(3);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
    expect(result.cancelledCount).toBe(2);
    expect(result.results).toHaveLength(3);
    expect(result.results.map((item) => item.status)).toEqual([
      "success",
      "cancelled",
      "cancelled",
    ]);
    expect(performGeneration).toHaveBeenCalledTimes(1);

    withProgressSpy.mockRestore();
  });
});
