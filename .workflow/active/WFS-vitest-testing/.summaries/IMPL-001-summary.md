# Task: IMPL-001 Shared Test Infrastructure Layer

## Implementation Summary

### Files Modified

- `src/scm/__tests__/setup.ts`: Extended with complete VS Code API mock coverage (additive only, no removals)

### Files Created

- `src/__tests__/setup.ts`: Global test setup entry point (future canonical location)
- `src/__tests__/mocks/vscode.ts`: Complete VS Code API mock factory with `createMockVSCode()` and per-surface factories
- `src/__tests__/mocks/ai-providers.ts`: AI provider mock factory with `createMockAIProvider()`, `createMockStreamingResponse()`, `createMockProviderFactory()`
- `src/__tests__/mocks/scm-providers.ts`: SCM provider mock factory with `createMockSCMProvider()`, `createResourceState()`, `createWorkspaceFolder()`
- `src/__tests__/mocks/configuration.ts`: Config mock factory with `createMockConfiguration()`, `createMockExtensionContext()`
- `src/__tests__/mocks/logger.ts`: Logger mock with `createMockLogger()`, `createLoggerModuleMock()`
- `src/__tests__/mocks/notification.ts`: Notification mock with `createMockNotification()`, `createNotificationModuleMock()`, `createNotificationBarrelMock()`
- `src/__tests__/fixtures/diff-samples.ts`: 5 diff fixtures (single-file, multi-file, SVN, empty, binary) + `ALL_DIFFS` collection
- `src/__tests__/fixtures/commit-messages.ts`: 8 commit message fixtures (conventional, emoji, multi-line, revert, merge, etc.) + `ALL_COMMIT_MESSAGES` collection
- `src/__tests__/fixtures/config-states.ts`: 5 config presets (DEFAULT, PARTIAL, FULL, INVALID, FEATURES)
- `src/__tests__/helpers/mock-context.ts`: Extracted `createMockContext()` from adaptive-model-limit-service test
- `src/__tests__/helpers/di-helpers.ts`: DI helpers (`createServiceDeps`, `createContextLoggerDeps`, `createLoggerNotificationDeps`, `createMockStorageManager`)

### Content Added

**Mock Factories (6 modules)**:

- **createMockVSCode()** (`src/__tests__/mocks/vscode.ts`): Complete VS Code API surface with workspace, window, commands, env, Uri, Disposable, EventEmitter, CancellationTokenSource, SCM, extensions, languages, and enums
- **createMockAIProvider()** (`src/__tests__/mocks/ai-providers.ts`): AIProvider interface mock with configurable generate/stream/function-calling responses
- **createMockSCMProvider()** (`src/__tests__/mocks/scm-providers.ts`): ISCMProvider interface mock with type, diff, commit log, branches
- **createMockConfiguration()** (`src/__tests__/mocks/configuration.ts`): WorkspaceConfiguration mock with in-memory store
- **createMockExtensionContext()** (`src/__tests__/mocks/configuration.ts`): Full ExtensionContext mock with globalState, workspaceState, secrets, subscriptions
- **createMockLogger()** (`src/__tests__/mocks/logger.ts`): Logger interface mock (trace, debug, info, warn, error, logError)
- **createMockNotification()** (`src/__tests__/mocks/notification.ts`): INotify interface mock (info, warn, error, add, confirm, prompt)

**Extended setup.ts surfaces (additive to existing)**:

- ConfigurationTarget, ViewColumn, QuickPickItemKind, TextDocumentChangeReason enums
- workspace: workspaceFolders, getWorkspaceFolder, onDidChangeConfiguration, openTextDocument, textDocuments, fs
- window: showInputBox, showQuickPick, showOpenDialog, showSaveDialog, showTextDocument, createQuickPick, createWebviewPanel, registerWebviewViewProvider, activeTextEditor
- commands: registerCommand, registerTextEditorCommand
- env: clipboard, language, machineId, appName
- Uri: parse, joinPath
- Disposable, EventEmitter (class), CancellationTokenSource (class), CancellationToken
- scm, extensions, languages namespaces

## Outputs for Dependent Tasks

### Available Components

```typescript
// Mock factories
import {
  createMockVSCode,
  createMockWorkspace,
  createMockWindow,
  createMockCommands,
} from "@/__tests__/mocks/vscode";
import {
  createMockAIProvider,
  createMockStreamingResponse,
  createMockProviderFactory,
} from "@/__tests__/mocks/ai-providers";
import {
  createMockSCMProvider,
  createResourceState,
  createWorkspaceFolder,
} from "@/__tests__/mocks/scm-providers";
import {
  createMockConfiguration,
  createMockExtensionContext,
} from "@/__tests__/mocks/configuration";
import {
  createMockLogger,
  createLoggerModuleMock,
} from "@/__tests__/mocks/logger";
import {
  createMockNotification,
  createNotificationModuleMock,
} from "@/__tests__/mocks/notification";

// Fixtures
import {
  SINGLE_FILE_DIFF,
  MULTI_FILE_DIFF,
  SVN_DIFF,
  EMPTY_DIFF,
  BINARY_DIFF,
  ALL_DIFFS,
} from "@/__tests__/fixtures/diff-samples";
import {
  CONVENTIONAL_COMMIT,
  SIMPLE_COMMIT,
  MULTI_LINE_COMMIT,
  ALL_COMMIT_MESSAGES,
} from "@/__tests__/fixtures/commit-messages";
import {
  DEFAULT_CONFIG,
  PARTIAL_CONFIG,
  FULL_CONFIG,
  INVALID_CONFIG,
  FEATURES_CONFIG,
} from "@/__tests__/fixtures/config-states";

// Helpers
import { createMockContext } from "@/__tests__/helpers/mock-context";
import {
  createServiceDeps,
  createMockStorageManager,
} from "@/__tests__/helpers/di-helpers";
```

### Integration Points

- **vi.mock pattern**: Use `createLoggerModuleMock()` for `vi.mock("@/utils/logger")` — returns `{ Logger: { getInstance: () => logger } }`
- **vi.mock pattern**: Use `createNotificationModuleMock()` for `vi.mock("@/utils/notification/notification-manager")` — returns `{ notify: mockNotify }`
- **ExtensionContext**: `createMockExtensionContext({ globalStateValues: { key: value }, secretValues: { apiKey: 'key' } })`
- **SCM testing**: `createMockSCMProvider({ type: 'svn', diffContent: SVN_DIFF })`

### Usage Examples

```typescript
// Basic logger mock for a service test
const { Logger, logger } = createLoggerModuleMock();
vi.mock("@/utils/logger", () => ({ Logger }));

// Full extension context for service initialization
const context = createMockExtensionContext({
  globalStateValues: { "cached-models": ["gpt-4"] },
  secretValues: { "openai-api-key": "sk-test" },
});

// SCM provider with custom diff for commit generation tests
const provider = createMockSCMProvider({
  type: "git",
  diffContent: SINGLE_FILE_DIFF,
  commitLog: ["feat: initial commit"],
});
```

## Validation Results

- 20 test files: 19 passed, 1 pre-existing failure (unrelated to changes)
- 6 mock factory modules created
- 3 fixture modules created
- 2 helper modules created
- Zero regression from infrastructure changes

## Status: Complete
