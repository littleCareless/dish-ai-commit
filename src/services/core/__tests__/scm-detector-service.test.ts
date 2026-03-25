import { SCMDetectorService } from "@/services/core/scm-detector-service";
import { multiRepositoryContextManager } from "@/scm/multi-repository-context-manager";
import { SCMFactory } from "@/scm/scm-provider";
import { notify } from "@/utils/notification/notification-manager";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/scm/scm-provider", () => ({
  SCMFactory: {
    detectSCM: vi.fn(),
    createProviderForRepository: vi.fn(),
    getCurrentRepositoryPath: vi.fn(),
  },
}));

vi.mock("@/scm/multi-repository-context-manager", () => ({
  multiRepositoryContextManager: {
    getRepositoryFromResources: vi.fn(),
  },
}));

describe("SCMDetectorService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters selected files outside detected repository before provider detection", async () => {
    vi.mocked(
      multiRepositoryContextManager.getRepositoryFromResources,
    ).mockResolvedValue("/repo-a");
    vi.mocked(SCMFactory.detectSCM).mockResolvedValue({ type: "git" } as any);

    const resources = [
      { resourceUri: { fsPath: "/repo-a/a.ts" } },
      { resourceUri: { fsPath: "/repo-b/b.ts" } },
    ] as any;

    const result =
      await SCMDetectorService.getInstance().detectSCMProvider(resources);

    expect(SCMFactory.detectSCM).toHaveBeenCalledWith(
      ["/repo-a/a.ts"],
      "/repo-a",
    );
    expect(notify.warn).toHaveBeenCalledWith(
      "generate.commit.selected.files.filtered",
      [1, "/repo-a"],
    );
    expect(result?.selectedFiles).toEqual(["/repo-a/a.ts"]);
    expect(result?.repositoryPath).toBe("/repo-a");
  });

  it("aborts when all selected files are outside the detected repository", async () => {
    vi.mocked(
      multiRepositoryContextManager.getRepositoryFromResources,
    ).mockResolvedValue("/repo-a");

    const resources = [{ resourceUri: { fsPath: "/repo-b/b.ts" } }] as any;

    const result =
      await SCMDetectorService.getInstance().detectSCMProvider(resources);

    expect(result).toBeUndefined();
    expect(SCMFactory.detectSCM).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledWith(
      "generate.commit.selected.files.outside.repository",
      ["/repo-a"],
    );
  });

  it("filters mixed string-path input after fallback repository resolution", async () => {
    vi.mocked(SCMFactory.detectSCM).mockResolvedValue({ type: "git" } as any);
    vi.mocked(SCMFactory.getCurrentRepositoryPath).mockReturnValue("/repo-a");

    const result = await SCMDetectorService.getInstance().detectSCMProvider([
      "/repo-a/a.ts",
      "/repo-b/b.ts",
    ]);

    expect(SCMFactory.detectSCM).toHaveBeenCalledWith(
      ["/repo-a/a.ts", "/repo-b/b.ts"],
      undefined,
    );
    expect(notify.warn).toHaveBeenCalledWith(
      "generate.commit.selected.files.filtered",
      [1, "/repo-a"],
    );
    expect(result?.selectedFiles).toEqual(["/repo-a/a.ts"]);
    expect(result?.repositoryPath).toBe("/repo-a");
  });

  it("supports explicit repository context with preferred SCM type", async () => {
    vi.mocked(SCMFactory.createProviderForRepository).mockResolvedValue({
      type: "svn",
    } as any);

    const result = await SCMDetectorService.getInstance().detectSCMProvider({
      selectedFiles: ["/repo-a/a.ts", "/repo-b/b.ts"],
      repositoryPath: "/repo-a",
      scmType: "svn",
      suppressNotifications: true,
    });

    expect(SCMFactory.createProviderForRepository).toHaveBeenCalledWith(
      "/repo-a",
      "svn",
    );
    expect(SCMFactory.detectSCM).not.toHaveBeenCalled();
    expect(notify.warn).not.toHaveBeenCalled();
    expect(result?.selectedFiles).toEqual(["/repo-a/a.ts"]);
    expect(result?.repositoryPath).toBe("/repo-a");
    expect(result?.scmProvider.type).toBe("svn");
  });
});
