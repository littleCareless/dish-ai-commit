import { vi } from "vitest";

/**
 * VS Code API mock factory.
 *
 * Provides `createMockVSCode()` that returns a complete mock of the
 * `vscode` module, plus convenience helpers for individual surfaces.
 *
 * Usage:
 *   import { createMockVSCode } from "@/__tests__/mocks/vscode";
 *   vi.mock("vscode", () => createMockVSCode());
 */

// ---------------------------------------------------------------------------
// Individual surface factories
// ---------------------------------------------------------------------------

export function createMockWorkspace(overrides?: Record<string, unknown>): any {
  const configStore = new Map<string, unknown>();

  return {
    getConfiguration: vi.fn((section?: string) => ({
      get: vi.fn((key: string, defaultValue?: unknown) =>
        configStore.has(key) ? configStore.get(key) : defaultValue,
      ),
      update: vi.fn(async (key: string, value: unknown) => {
        if (value === undefined) {
          configStore.delete(key);
        } else {
          configStore.set(key, value);
        }
      }),
      has: vi.fn((key: string) => configStore.has(key)),
      inspect: vi.fn(),
    })),
    workspaceFolders: [] as Array<{
      uri: { fsPath: string; path: string; toString(): string };
      name: string;
      index: number;
    }> | undefined,
    getWorkspaceFolder: vi.fn(),
    onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
    openTextDocument: vi.fn(),
    textDocuments: [],
    fs: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      stat: vi.fn(),
      readDirectory: vi.fn(),
      createDirectory: vi.fn(),
      delete: vi.fn(),
      rename: vi.fn(),
      copy: vi.fn(),
    },
    ...overrides,
  };
}

export function createMockWindow(overrides?: Record<string, unknown>): any {
  return {
    createOutputChannel: vi.fn(() => ({
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      clear: vi.fn(),
      dispose: vi.fn(),
      name: "mock-output-channel",
      append: vi.fn(),
      appendLine: vi.fn(),
      replace: vi.fn(),
    })),
    showInformationMessage: vi.fn(async () => undefined),
    showWarningMessage: vi.fn(async () => undefined),
    showErrorMessage: vi.fn(async () => undefined),
    showInputBox: vi.fn(async () => undefined),
    showQuickPick: vi.fn(async () => undefined),
    showOpenDialog: vi.fn(async () => undefined),
    showSaveDialog: vi.fn(async () => undefined),
    showTextDocument: vi.fn(async () => undefined),
    createQuickPick: vi.fn(() => ({
      items: [],
      placeholder: "",
      activeItems: [],
      selectedItems: [],
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
      onDidAccept: vi.fn(() => ({ dispose: vi.fn() })),
      onDidChangeSelection: vi.fn(() => ({ dispose: vi.fn() })),
      onDidChangeValue: vi.fn(() => ({ dispose: vi.fn() })),
      onDidHide: vi.fn(() => ({ dispose: vi.fn() })),
    })),
    createWebviewPanel: vi.fn(() => ({
      webview: {
        html: "",
        onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })),
        postMessage: vi.fn(async () => true),
        asWebviewUri: vi.fn((uri: { toString(): string }) => uri),
        options: {},
      },
      onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
      onDidChangeViewState: vi.fn(() => ({ dispose: vi.fn() })),
      reveal: vi.fn(),
      dispose: vi.fn(),
      visible: true,
      viewColumn: 1,
      title: "",
      iconPath: undefined,
    })),
    registerWebviewViewProvider: vi.fn(() => ({ dispose: vi.fn() })),
    activeTextEditor: undefined,
    withProgress: vi.fn(
      async (
        _options: unknown,
        task: (
          progress: { report: (data: unknown) => void },
          token: { isCancellationRequested: boolean },
        ) => Promise<unknown>,
      ) =>
        task(
          { report: vi.fn() },
          { isCancellationRequested: false },
        ),
    ),
    ...overrides,
  };
}

export function createMockCommands(overrides?: Record<string, unknown>): any {
  return {
    executeCommand: vi.fn(async () => undefined),
    registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
    registerTextEditorCommand: vi.fn(() => ({ dispose: vi.fn() })),
    ...overrides,
  };
}

export function createMockEnv(overrides?: Record<string, unknown>) {
  return {
    clipboard: {
      writeText: vi.fn(async () => {}),
      readText: vi.fn(async () => ""),
    },
    language: "en",
    machineId: "test-machine-id",
    appName: "VS Code",
    appRoot: "/app",
    uriScheme: "vscode",
    version: "1.90.0",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Uri helper
// ---------------------------------------------------------------------------

export function createMockUri() {
  return {
    file: (filePath: string) => ({
      fsPath: filePath,
      path: filePath,
      scheme: "file",
      authority: "",
      query: "",
      fragment: "",
      toString: () => `file://${filePath}`,
      with: vi.fn(function (this: Record<string, unknown>) {
        return this;
      }),
    }),
    parse: (value: string) => ({
      fsPath: value,
      path: value,
      scheme: "file",
      authority: "",
      query: "",
      fragment: "",
      toString: () => value,
    }),
    joinPath: (base: { fsPath: string }, ...pathSegments: string[]) => ({
      fsPath: [base.fsPath, ...pathSegments].join("/"),
      path: [base.fsPath, ...pathSegments].join("/"),
      scheme: "file",
      authority: "",
      query: "",
      fragment: "",
      toString: () => [base.fsPath, ...pathSegments].join("/"),
    }),
  };
}

// ---------------------------------------------------------------------------
// Disposable / EventEmitter helpers
// ---------------------------------------------------------------------------

export function createMockDisposable() {
  return vi.fn((callOnDispose: () => void) => ({
    dispose: callOnDispose,
  }));
}

export function createMockEventEmitter<T = unknown>(): any {
  const listeners: Array<(e: T) => unknown> = [];
  return {
    event: vi.fn((callback: (e: T) => unknown) => {
      listeners.push(callback);
      return { dispose: vi.fn() };
    }),
    fire: vi.fn((data: T) => {
      for (const listener of listeners) {
        listener(data);
      }
    }),
    dispose: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// CancellationTokenSource
// ---------------------------------------------------------------------------

export function createMockCancellationTokenSource(): any {
  let cancelled = false;
  const listeners: Array<() => void> = [];
  return {
    token: {
      isCancellationRequested: false,
      onCancellationRequested: vi.fn((cb: () => void) => {
        listeners.push(cb);
        return { dispose: vi.fn() };
      }),
    },
    cancel: vi.fn(() => {
      cancelled = true;
      for (const cb of listeners) {
        cb();
      }
    }),
    dispose: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// SCM API
// ---------------------------------------------------------------------------

export function createMockSCM(): any {
  return {
    sourceControls: [] as unknown[],
    createSourceControl: vi.fn(() => ({
      quickDiffProvider: undefined,
      acceptInputCommand: undefined,
      inputBox: { value: "" },
      createResourceGroup: vi.fn(() => ({
        resourceStates: [],
        dispose: vi.fn(),
      })),
      dispose: vi.fn(),
    })),
  };
}

// ---------------------------------------------------------------------------
// Complete VS Code mock
// ---------------------------------------------------------------------------

export interface MockVSCodeOptions {
  workspace?: Record<string, unknown>;
  window?: Record<string, unknown>;
  commands?: Record<string, unknown>;
  env?: Record<string, unknown>;
}

/**
 * Returns a plain object suitable for `vi.mock("vscode", () => ...)`.
 * Each top-level property corresponds to a `vscode` export.
 */
export function createMockVSCode(options?: MockVSCodeOptions): any {
  const Disposable = createMockDisposable();
  return {
    // Namespaces
    workspace: createMockWorkspace(options?.workspace),
    window: createMockWindow(options?.window),
    commands: createMockCommands(options?.commands),
    env: createMockEnv(options?.env),
    scm: createMockSCM(),

    // Classes / factories
    Uri: createMockUri(),
    Disposable,
    EventEmitter: createMockEventEmitter,
    CancellationTokenSource: createMockCancellationTokenSource,
    CancellationToken: {
      None: { isCancellationRequested: false, onCancellationRequested: vi.fn(() => ({ dispose: vi.fn() })) },
    },

    // Enums
    ProgressLocation: { Notification: 15, SourceControl: 1, Window: 10 },
    ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
    ViewColumn: { One: 1, Two: 2, Three: 3, Beside: -2, Active: -1 },
    QuickPickItemKind: { Separator: -1, Default: 0 },
    TextDocumentChangeReason: { Undo: 1, Redo: 2 },

    // Type helpers (identity-like)
    RelativePattern: vi.fn((base: unknown, pattern: string) => ({ base, pattern })),
    ThemeIcon: { File: "file", Folder: "folder" },
    MarkdownString: vi.fn((value?: string) => ({ value: value ?? "", isTrusted: false })),
    Selection: vi.fn(),
    Range: vi.fn(),
    Position: vi.fn(),
    TextEdit: vi.fn(),
    WorkspaceEdit: vi.fn(() => ({
      createFile: vi.fn(),
      deleteFile: vi.fn(),
      renameFile: vi.fn(),
      replace: vi.fn(),
      insert: vi.fn(),
    })),

    // Extensions
    extensions: {
      getExtension: vi.fn(() => undefined),
      all: [],
      onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
    },

    // Languages
    languages: {
      match: vi.fn(() => 0),
      createDiagnosticCollection: vi.fn(() => ({
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        dispose: vi.fn(),
      })),
    },
  };
}
