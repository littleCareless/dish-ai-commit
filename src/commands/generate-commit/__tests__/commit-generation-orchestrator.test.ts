import { CommitGenerationOrchestrator } from "@/commands/generate-commit/services/commit-generation-orchestrator";
import { multiRepositoryContextManager } from "@/scm/multi-repository-context-manager";
import { SCMDetectorService } from "@/services/core/scm-detector-service";
import { notify } from "@/utils/notification/notification-manager";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/utils/i18n", () => ({
  getMessage: (key: string) => key,
}));

vi.mock("@/utils/notification/notification-manager", () => ({
  notify: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/scm/multi-repository-context-manager", () => ({
  multiRepositoryContextManager: {
    groupResourceStatesByRepository: vi.fn(),
  },
}));

vi.mock("@/services/core/scm-detector-service", () => ({
  SCMDetectorService: {
    getInstance: vi.fn(),
  },
}));

const detectSCMProviderMock = vi.fn();

function createPrepareContext(overrides: Partial<any> = {}) {
  return {
    provider: "openai",
    model: "gpt-test",
    providerConfig: {},
    scmProvider: undefined as any,
    selectedFiles: undefined,
    repositoryPath: undefined,
    aiProvider: { getName: () => "openai" } as any,
    selectedModel: {
      id: "gpt-test",
      provider: { id: "openai" },
      maxTokens: { input: 8192, output: 1024 },
    } as any,
    ...overrides,
  };
}

function createInput(resourceStates?: any[]) {
  const effectiveResourceStates =
    resourceStates ?? ([{ id: "state-a" }, { id: "state-b" }] as any[]);
  return {
    rawArgs: [],
    source: "resource-context" as const,
    resourceStates: effectiveResourceStates,
    prepareArg: effectiveResourceStates,
  };
}

describe("CommitGenerationOrchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    detectSCMProviderMock.mockReset();
    vi.mocked(SCMDetectorService.getInstance).mockReturnValue({
      detectSCMProvider: detectSCMProviderMock,
    } as any);
  });

  it("reuses grouped repository result for single target and skips prepare SCM detection", async () => {
    vi.mocked(
      multiRepositoryContextManager.groupResourceStatesByRepository,
    ).mockResolvedValue(
      new Map([
        ["/repo-a", { files: ["/repo-a/a.ts"], scmType: "git" as const }],
      ]),
    );
    detectSCMProviderMock.mockResolvedValueOnce({
      scmProvider: { type: "git" } as any,
      selectedFiles: ["/repo-a/a.ts"],
      repositoryPath: "/repo-a",
    });

    const prepare = vi.fn().mockResolvedValue(createPrepareContext());
    const orchestrator = new CommitGenerationOrchestrator({
      prepare,
      logger: { warn: vi.fn() } as any,
    });

    const session = await orchestrator.createSession(createInput());
    if (!session || session.scmContext.mode !== "single") {
      throw new Error("Expected single repository session");
    }

    expect(prepare).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ skipSCMDetection: true }),
    );
    expect(detectSCMProviderMock).toHaveBeenCalledWith({
      selectedFiles: ["/repo-a/a.ts"],
      repositoryPath: "/repo-a",
      scmType: "git",
      suppressNotifications: true,
    });
    expect(session.scmContext.target.repositoryPath).toBe("/repo-a");
    expect(session.scmContext.target.selectedFiles).toEqual(["/repo-a/a.ts"]);
    expect(session.scmContext.target.scmProvider?.type).toBe("git");
  });

  it("reuses grouped SCM type and skips detectSCM for cross-repository targets", async () => {
    vi.mocked(
      multiRepositoryContextManager.groupResourceStatesByRepository,
    ).mockResolvedValue(
      new Map([
        ["/repo-a", { files: ["/repo-a/a.ts"], scmType: "git" as const }],
        ["/repo-b", { files: ["/repo-b/b.ts"], scmType: "svn" as const }],
      ]),
    );
    detectSCMProviderMock
      .mockResolvedValueOnce({
        scmProvider: { type: "git" } as any,
        selectedFiles: ["/repo-a/a.ts"],
        repositoryPath: "/repo-a",
      })
      .mockResolvedValueOnce({
        scmProvider: { type: "svn" } as any,
        selectedFiles: ["/repo-b/b.ts"],
        repositoryPath: "/repo-b",
      });

    const prepare = vi.fn().mockResolvedValue(createPrepareContext());
    const orchestrator = new CommitGenerationOrchestrator({
      prepare,
      logger: { warn: vi.fn() } as any,
    });

    const input = createInput();
    const session = await orchestrator.createSession(input);

    expect(session?.scmContext.mode).toBe("cross");
    expect(detectSCMProviderMock).toHaveBeenCalledTimes(2);
    expect(detectSCMProviderMock).toHaveBeenNthCalledWith(
      1,
      {
        selectedFiles: ["/repo-a/a.ts"],
        repositoryPath: "/repo-a",
        scmType: "git",
        suppressNotifications: true,
      },
    );
    expect(detectSCMProviderMock).toHaveBeenNthCalledWith(
      2,
      {
        selectedFiles: ["/repo-b/b.ts"],
        repositoryPath: "/repo-b",
        scmType: "svn",
        suppressNotifications: true,
      },
    );
    expect(prepare).toHaveBeenCalledWith(
      input.prepareArg,
      expect.objectContaining({ skipSCMDetection: true }),
    );
  });

  it("passes grouped repository context to detector even when SCM type is missing", async () => {
    vi.mocked(
      multiRepositoryContextManager.groupResourceStatesByRepository,
    ).mockResolvedValue(
      new Map([
        ["/repo-a", { files: ["/repo-a/a.ts"], scmType: "git" as const }],
        ["/repo-b", { files: ["/repo-b/b.ts"] }],
      ]),
    );
    detectSCMProviderMock
      .mockResolvedValueOnce({
        scmProvider: { type: "git" } as any,
        selectedFiles: ["/repo-a/a.ts"],
        repositoryPath: "/repo-a",
      })
      .mockResolvedValueOnce({
        scmProvider: { type: "svn" } as any,
        selectedFiles: ["/repo-b/b.ts"],
        repositoryPath: "/repo-b",
      });

    const prepare = vi.fn().mockResolvedValue(createPrepareContext());
    const orchestrator = new CommitGenerationOrchestrator({
      prepare,
      logger: { warn: vi.fn() } as any,
    });

    const session = await orchestrator.createSession(createInput());

    expect(session?.scmContext.mode).toBe("cross");
    expect(detectSCMProviderMock).toHaveBeenCalledTimes(2);
    expect(detectSCMProviderMock).toHaveBeenNthCalledWith(
      2,
      {
        selectedFiles: ["/repo-b/b.ts"],
        repositoryPath: "/repo-b",
        scmType: undefined,
        suppressNotifications: true,
      },
    );
  });

  it("keeps repository type from grouped state even when provider initialization fails", async () => {
    vi.mocked(
      multiRepositoryContextManager.groupResourceStatesByRepository,
    ).mockResolvedValue(
      new Map([
        ["/repo-a", { files: ["/repo-a/a.ts"], scmType: "git" as const }],
        ["/repo-b", { files: ["/repo-b/b.ts"], scmType: "svn" as const }],
      ]),
    );
    detectSCMProviderMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        scmProvider: { type: "svn" } as any,
        selectedFiles: ["/repo-b/b.ts"],
        repositoryPath: "/repo-b",
      });

    const prepare = vi.fn().mockResolvedValue(createPrepareContext());
    const orchestrator = new CommitGenerationOrchestrator({
      prepare,
      logger: { warn: vi.fn() } as any,
    });

    const session = await orchestrator.createSession(createInput());
    if (!session || session.scmContext.mode !== "cross") {
      throw new Error("Expected cross repository session");
    }

    expect(session.scmContext.targets[0]?.detectionError).toContain(
      "/repo-a",
    );
    expect(
      session.scmContext.targets[0]?.repositoryContext.repository.type,
    ).toBe("git");
    expect(
      session.scmContext.targets[1]?.repositoryContext.repository.type,
    ).toBe("svn");
  });

  it("falls back to prepare SCM context when repository grouping has no result", async () => {
    vi.mocked(
      multiRepositoryContextManager.groupResourceStatesByRepository,
    ).mockResolvedValue(new Map());

    const prepare = vi.fn().mockResolvedValue(
      createPrepareContext({
        scmProvider: { type: "git" } as any,
        selectedFiles: ["/repo-fallback/a.ts"],
        repositoryPath: "/repo-fallback",
      }),
    );

    const orchestrator = new CommitGenerationOrchestrator({
      prepare,
      logger: { warn: vi.fn() } as any,
    });

    const session = await orchestrator.createSession(createInput());
    if (!session || session.scmContext.mode !== "single") {
      throw new Error("Expected single repository session");
    }

    expect(prepare).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ skipSCMDetection: false }),
    );
    expect(detectSCMProviderMock).not.toHaveBeenCalled();
    expect(session.scmContext.target.repositoryPath).toBe("/repo-fallback");
    expect(session.scmContext.target.selectedFiles).toEqual([
      "/repo-fallback/a.ts",
    ]);
    expect(session.scmContext.target.scmProvider?.type).toBe("git");
  });

  it("aborts generation when grouping fails with multi-resource input to avoid unsafe downgrade", async () => {
    vi.mocked(
      multiRepositoryContextManager.groupResourceStatesByRepository,
    ).mockRejectedValue(new Error("grouping crashed"));

    const prepare = vi.fn().mockResolvedValue(createPrepareContext());
    const orchestrator = new CommitGenerationOrchestrator({
      prepare,
      logger: { warn: vi.fn() } as any,
    });

    const session = await orchestrator.createSession(createInput());

    expect(session).toBeUndefined();
    expect(prepare).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledWith(
      "generate.commit.repository.grouping.failed",
    );
  });

  it("keeps single-resource fallback path when grouping fails", async () => {
    vi.mocked(
      multiRepositoryContextManager.groupResourceStatesByRepository,
    ).mockRejectedValue(new Error("grouping crashed"));

    const singleResource = [{ id: "state-only" }] as any[];
    const prepare = vi.fn().mockResolvedValue(
      createPrepareContext({
        scmProvider: { type: "git" } as any,
        selectedFiles: ["/repo-safe/a.ts"],
        repositoryPath: "/repo-safe",
      }),
    );
    const orchestrator = new CommitGenerationOrchestrator({
      prepare,
      logger: { warn: vi.fn() } as any,
    });

    const session = await orchestrator.createSession(createInput(singleResource));
    if (!session || session.scmContext.mode !== "single") {
      throw new Error("Expected single repository session");
    }

    expect(prepare).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ skipSCMDetection: false }),
    );
    expect(session.scmContext.target.repositoryPath).toBe("/repo-safe");
    expect(session.scmContext.target.selectedFiles).toEqual(["/repo-safe/a.ts"]);
  });
});
