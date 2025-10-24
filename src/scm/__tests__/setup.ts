/**
 * Test setup file for SCM tests
 * This file is run before all tests to configure the testing environment
 */

import { vi } from "vitest";

// Mock VS Code API globally
const mockVSCode = {
  workspace: {
    workspaceFolders: [],
    getConfiguration: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
  },
  window: {
    showErrorMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    showInputBox: vi.fn(),
    showQuickPick: vi.fn(),
  },
  env: {
    clipboard: {
      writeText: vi.fn(),
    },
  },
  extensions: {
    getExtension: vi.fn(),
  },
  Uri: {
    file: vi.fn((path: string) => ({ fsPath: path, path })),
    parse: vi.fn((uri: string) => ({ fsPath: uri, path: uri })),
  },
  commands: {
    executeCommand: vi.fn(),
  },
};

// Mock the vscode module
vi.mock("vscode", () => mockVSCode);

// Mock child_process for command execution
import { MockCommandExecutor } from "./helpers/mock-command-executor";

vi.mock("child_process", () => ({
  exec: MockCommandExecutor.getExecMock(),
  spawn: vi.fn(),
}));

// Mock fs/promises for file system operations
vi.mock("fs/promises", () => ({
  access: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  rmdir: vi.fn(),
  stat: vi.fn(),
  readdir: vi.fn(),
}));

// Mock path module
vi.mock("path", async () => {
  const actual = await vi.importActual("path");
  return {
    ...actual,
    join: vi.fn((...args: string[]) => args.join("/")),
    resolve: vi.fn((...args: string[]) => args.join("/")),
    dirname: vi.fn((path: string) => path?.split("/").slice(0, -1).join("/")),
    basename: vi.fn((path: string) => path?.split("/").pop() || ""),
  };
});

// Global test configuration
export const TEST_CONFIG = {
  timeout: 10000,
  hookTimeout: 5000,
  teardownTimeout: 5000,
};

// Set up command mocks
beforeAll(() => {
  MockCommandExecutor.setupAllMocks();
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  MockCommandExecutor.clearMocks();
  MockCommandExecutor.setupAllMocks();
});

// Global error handler for unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
