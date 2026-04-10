import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Extended vscode mock covering all API surfaces used across the codebase.
// Additive-only: existing properties preserved, new surfaces added below.
// ---------------------------------------------------------------------------

vi.mock("vscode", () => ({
  // -- Enums --
  ProgressLocation: {
    Notification: 15,
    SourceControl: 1,
    Window: 10,
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
  ViewColumn: {
    One: 1,
    Two: 2,
    Three: 3,
    Beside: -2,
    Active: -1,
  },
  QuickPickItemKind: {
    Separator: -1,
    Default: 0,
  },
  TextDocumentChangeReason: {
    Undo: 1,
    Redo: 2,
  },

  // -- workspace --
  workspace: {
    getConfiguration: () => ({
      get: (_key: string, defaultValue?: unknown) => defaultValue,
      update: async () => {},
      has: () => false,
      inspect: () => undefined,
    }),
    workspaceFolders: undefined,
    getWorkspaceFolder: () => undefined,
    onDidChangeConfiguration: () => ({ dispose: () => {} }),
    openTextDocument: async () => undefined,
    textDocuments: [],
    fs: {
      readFile: async () => new Uint8Array(),
      writeFile: async () => {},
      stat: async () => ({}),
      readDirectory: async () => [],
      createDirectory: async () => {},
      delete: async () => {},
      rename: async () => {},
      copy: async () => {},
    },
  },

  // -- window --
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
      name: "mock-output-channel",
      append: () => {},
      appendLine: () => {},
      replace: () => {},
    }),
    showInformationMessage: async () => undefined,
    showWarningMessage: async () => undefined,
    showErrorMessage: async () => undefined,
    showInputBox: async () => undefined,
    showQuickPick: async () => undefined,
    showOpenDialog: async () => undefined,
    showSaveDialog: async () => undefined,
    showTextDocument: async () => undefined,
    createQuickPick: () => ({
      items: [],
      placeholder: "",
      activeItems: [],
      selectedItems: [],
      show: () => {},
      hide: () => {},
      dispose: () => {},
      onDidAccept: () => ({ dispose: () => {} }),
      onDidChangeSelection: () => ({ dispose: () => {} }),
      onDidChangeValue: () => ({ dispose: () => {} }),
      onDidHide: () => ({ dispose: () => {} }),
    }),
    createWebviewPanel: () => ({
      webview: {
        html: "",
        onDidReceiveMessage: () => ({ dispose: () => {} }),
        postMessage: async () => true,
        asWebviewUri: (uri: { toString(): string }) => uri,
        options: {},
      },
      onDidDispose: () => ({ dispose: () => {} }),
      onDidChangeViewState: () => ({ dispose: () => {} }),
      reveal: () => {},
      dispose: () => {},
      visible: true,
      viewColumn: 1,
      title: "",
    }),
    registerWebviewViewProvider: () => ({ dispose: () => {} }),
    activeTextEditor: undefined,
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

  // -- commands --
  commands: {
    executeCommand: async () => undefined,
    registerCommand: () => ({ dispose: () => {} }),
    registerTextEditorCommand: () => ({ dispose: () => {} }),
  },

  // -- env --
  env: {
    clipboard: {
      writeText: async () => {},
      readText: async () => "",
    },
    language: "en",
    machineId: "test-machine-id",
    appName: "VS Code",
    appRoot: "/app",
    uriScheme: "vscode",
    version: "1.90.0",
  },

  // -- Uri --
  Uri: {
    file: (filePath: string) => ({
      fsPath: filePath,
      path: filePath,
      scheme: "file",
      authority: "",
      query: "",
      fragment: "",
      toString: () => filePath,
      with: function (this: Record<string, unknown>) {
        return this;
      },
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
    joinPath: (base: { fsPath: string }, ...segments: string[]) => ({
      fsPath: [base.fsPath, ...segments].join("/"),
      path: [base.fsPath, ...segments].join("/"),
      scheme: "file",
      authority: "",
      query: "",
      fragment: "",
      toString: () => [base.fsPath, ...segments].join("/"),
    }),
  },

  // -- Disposable --
  Disposable: (callOnDispose: () => void) => ({
    dispose: callOnDispose,
  }),

  // -- EventEmitter --
  EventEmitter: class MockEventEmitter<T = unknown> {
    private listeners: Array<(e: T) => unknown> = [];
    event = (callback: (e: T) => unknown) => {
      this.listeners.push(callback);
      return { dispose: () => {} };
    };
    fire = (data: T) => {
      for (const listener of this.listeners) {
        listener(data);
      }
    };
    dispose = () => {};
  },

  // -- CancellationTokenSource --
  CancellationTokenSource: class MockCancellationTokenSource {
    token = {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    };
    cancel = () => {
      this.token.isCancellationRequested = true;
    };
    dispose = () => {};
  },

  CancellationToken: {
    None: {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    },
  },

  // -- SCM --
  scm: {
    sourceControls: [],
    createSourceControl: () => ({
      quickDiffProvider: undefined,
      acceptInputCommand: undefined,
      inputBox: { value: "" },
      createResourceGroup: () => ({
        resourceStates: [],
        dispose: () => {},
      }),
      dispose: () => {},
    }),
  },

  // -- extensions --
  extensions: {
    getExtension: () => undefined,
    all: [],
    onDidChange: () => ({ dispose: () => {} }),
  },

  // -- languages --
  languages: {
    match: () => 0,
    createDiagnosticCollection: () => ({
      set: () => {},
      delete: () => {},
      clear: () => {},
      dispose: () => {},
    }),
  },

  // -- Type helpers --
  RelativePattern: (base: unknown, pattern: string) => ({ base, pattern }),
  ThemeIcon: { File: "file", Folder: "folder" },
  MarkdownString: (value?: string) => ({
    value: value ?? "",
    isTrusted: false,
  }),
  Selection: () => ({}),
  Range: () => ({}),
  Position: () => ({}),
  TextEdit: () => ({}),
  WorkspaceEdit: () => ({
    createFile: () => {},
    deleteFile: () => {},
    renameFile: () => {},
    replace: () => {},
    insert: () => {},
  }),
}));
