import { vi } from "vitest";

// Minimal vscode mock for unit tests that import utility/state modules.
vi.mock("vscode", () => ({
  ProgressLocation: {
    Notification: 15,
  },
  workspace: {
    getConfiguration: () => ({
      get: (_key: string, defaultValue?: unknown) => defaultValue,
      update: async () => {},
    }),
  },
  window: {
    createOutputChannel: () => ({
      trace: () => {},
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      show: () => {},
      hide: () => {},
      clear: () => {},
      dispose: () => {},
    }),
    showInformationMessage: async () => undefined,
    showWarningMessage: async () => undefined,
    showErrorMessage: async () => undefined,
    withProgress: async (
      _options: any,
      task: (progress: { report: (data: any) => void }, token: { isCancellationRequested: boolean }) => Promise<any>,
    ) =>
      task(
        {
          report: () => {},
        },
        { isCancellationRequested: false },
      ),
  },
  commands: {
    executeCommand: async () => undefined,
  },
}));
