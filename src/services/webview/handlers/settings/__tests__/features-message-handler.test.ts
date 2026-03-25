import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeaturesMessageHandler } from "@/services/webview/handlers/settings/features-message-handler";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import * as vscode from "vscode";

const hoisted = vi.hoisted(() => ({
  executeCommand: vi.fn(),
  postMessage: vi.fn(),
  globalStateGet: vi.fn(),
  globalStateUpdate: vi.fn(),
  getSummary: vi.fn(() => ({
    totalEntries: 0,
    updatedEntries: 0,
    lastSyncAt: "2026-01-01T00:00:00.000Z",
  })),
}));

vi.mock("@/services/settings/features-settings-manager", () => ({
  FeaturesSettingsManager: {
    getInstance: () => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      getSettings: vi.fn(() => ({})),
      updateSettings: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock("@/services/settings/active-prompt-store", () => ({
  ActivePromptStore: {
    getInstance: () => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      setActivePrompt: vi.fn().mockResolvedValue(undefined),
      getActivePrompts: vi.fn().mockResolvedValue({}),
      getActivePromptsBySubCategory: vi.fn().mockResolvedValue({}),
      getPromptSource: vi.fn().mockResolvedValue(undefined),
      getAllWorkspaceActiveStates: vi.fn().mockResolvedValue({}),
    }),
  },
}));

vi.mock("@/services/core/workspace-manager", () => ({
  workspaceManager: {
    getAllWorkspaces: vi.fn(() => []),
    getCurrentWorkspace: vi.fn(() => null),
  },
}));

vi.mock("@/ai/model-registry/third-party-model-catalog-sync-service", () => ({
  ThirdPartyModelCatalogSyncService: {
    getInstance: () => ({
      getSummary: hoisted.getSummary,
      getAllEntries: vi.fn(() => []),
    }),
  },
}));

vi.mock("@/services/storage/model-custom-storage", () => ({
  ModelCustomStorage: {
    getInstance: () => ({
      getAllModelInfo: vi.fn().mockResolvedValue({
        lastSync: "",
        models: {},
      }),
    }),
  },
}));

describe("FeaturesMessageHandler command execution", () => {
  beforeEach(() => {
    hoisted.executeCommand.mockReset();
    hoisted.postMessage.mockReset();
    hoisted.globalStateGet.mockReset();
    hoisted.globalStateUpdate.mockReset();
    hoisted.getSummary.mockClear();

    (vscode.commands as any).executeCommand = hoisted.executeCommand;

    hoisted.postMessage.mockResolvedValue(true);
    hoisted.globalStateGet.mockImplementation((_key: string, defaultValue: any) =>
      defaultValue,
    );
    hoisted.globalStateUpdate.mockResolvedValue(undefined);
  });

  it("returns failed quick action result when command reports success=false", async () => {
    hoisted.executeCommand.mockResolvedValueOnce({
      success: false,
      error: "command failed",
    });

    const handler = new FeaturesMessageHandler({
      globalState: {
        get: hoisted.globalStateGet,
        update: hoisted.globalStateUpdate,
      },
    } as any);

    await handler.handle(
      {
        command: UIRequest.FeaturesExecuteCommand,
        data: { action: "generateCommit", source: "welcome-page" },
      },
      { postMessage: hoisted.postMessage } as any,
    );

    expect(hoisted.postMessage).toHaveBeenCalledWith({
      command: ExtensionResponse.FeaturesCommandExecuted,
      data: {
        action: "generateCommit",
        source: "welcome-page",
        success: false,
        error: "command failed",
      },
    });
  });

  it("returns failed sync result when command reports success=false", async () => {
    hoisted.executeCommand.mockResolvedValueOnce({
      success: false,
      error: "sync failed",
    });

    const handler = new FeaturesMessageHandler({
      globalState: {
        get: hoisted.globalStateGet,
        update: hoisted.globalStateUpdate,
      },
    } as any);

    await handler.handle(
      {
        command: UIRequest.FeaturesSyncModelCatalog,
      },
      { postMessage: hoisted.postMessage } as any,
    );

    expect(hoisted.postMessage).toHaveBeenCalledWith({
      command: ExtensionResponse.FeaturesModelCatalogSynced,
      data: {
        success: false,
        error: "sync failed",
      },
    });
  });
});
