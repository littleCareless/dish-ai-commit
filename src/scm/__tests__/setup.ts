import { vi } from "vitest";

// Minimal vscode mock for unit tests that import utility/state modules.
vi.mock("vscode", () => ({
  workspace: {
    getConfiguration: () => ({
      get: (_key: string, defaultValue?: unknown) => defaultValue,
      update: async () => {},
    }),
  },
}));
