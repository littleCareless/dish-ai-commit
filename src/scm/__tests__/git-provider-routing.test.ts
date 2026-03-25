import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";

const { factoryMock } = vi.hoisted(() => ({
  factoryMock: {
    initRepositoryManager: vi.fn(async () => {}),
    createProviderForRepository: vi.fn(async () => undefined),
  },
}));

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

vi.mock("@/utils/i18n", () => ({
  getMessage: (messageKey: string) => messageKey,
  formatMessage: (messageKey: string) => messageKey,
}));

vi.mock("@/utils/notification/notification-manager", () => ({
  notify: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/scm/git/git-provider-factory", () => ({
  GitProviderType: {
    API: "api",
    COMMAND: "command",
  },
  GitProviderFactory: {
    getInstance: () => factoryMock,
  },
}));

import { GitProvider } from "@/scm/git-provider";

describe("GitProvider input routing", () => {
  beforeEach(() => {
    (vscode.workspace as any).workspaceFolders = [
      {
        uri: {
          fsPath: "/workspace/repo",
        },
      },
    ];
    factoryMock.initRepositoryManager.mockClear();
    factoryMock.createProviderForRepository.mockClear();
  });

  it("routes streaming input by current files before default provider", async () => {
    const provider = new GitProvider({
      getAPI: () => ({ repositories: [] }),
    } as any);

    const defaultProvider = {
      startStreamingInput: vi.fn(async () => {}),
    } as any;
    (provider as any).gitProvider = defaultProvider;

    const ensureDefaultProviderSpy = vi
      .spyOn(provider as any, "ensureDefaultProvider")
      .mockResolvedValue(undefined);

    const fileScopedProvider = {
      startStreamingInput: vi.fn(async () => {}),
    } as any;
    const getProviderForFilesSpy = vi
      .spyOn(provider as any, "getProviderForFiles")
      .mockResolvedValue(fileScopedProvider);

    provider.setCurrentFiles?.(["/workspace/repo-tools/src/index.ts"]);
    await provider.startStreamingInput("feat: test");

    expect(getProviderForFilesSpy).toHaveBeenCalledWith([
      "/workspace/repo-tools/src/index.ts",
    ]);
    expect(fileScopedProvider.startStreamingInput).toHaveBeenCalledWith(
      "feat: test",
    );
    expect(ensureDefaultProviderSpy).not.toHaveBeenCalled();
    expect(defaultProvider.startStreamingInput).not.toHaveBeenCalled();
  });
});
