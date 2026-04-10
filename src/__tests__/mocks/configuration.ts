import { vi } from "vitest";

/**
 * Configuration mock factory.
 *
 * Provides typed mock factories for VS Code configuration objects
 * and extension contexts.
 *
 * Usage:
 *   import { createMockConfiguration, createMockExtensionContext } from "@/__tests__/mocks/configuration";
 */

export type MockConfigValues = Record<string, unknown>;

/**
 * Creates a mock `WorkspaceConfiguration` that stores values in-memory.
 */
export function createMockConfiguration(initialValues?: MockConfigValues): any {
  const store = new Map<string, unknown>(Object.entries(initialValues ?? {}));

  return {
    get: vi.fn((key: string, defaultValue?: unknown) =>
      store.has(key) ? store.get(key) : defaultValue,
    ),
    update: vi.fn(async (key: string, value: unknown) => {
      if (value === undefined) {
        store.delete(key);
      } else {
        store.set(key, value);
      }
    }),
    has: vi.fn((key: string) => store.has(key)),
    inspect: vi.fn(),
  };
}

/**
 * Creates a mock `ExtensionContext` with functional state stores and secrets.
 * This is the extracted and generalized version of `createMockContext()`
 * from `adaptive-model-limit-service.test.ts`.
 */
export function createMockExtensionContext(overrides?: {
  globalStateValues?: MockConfigValues;
  workspaceStateValues?: MockConfigValues;
  secretValues?: Record<string, string>;
  extensionPath?: string;
  storageUri?: { fsPath: string };
  globalStorageUri?: { fsPath: string };
  logUri?: { fsPath: string };
}): any {
  const globalStore = new Map<string, unknown>(
    Object.entries(overrides?.globalStateValues ?? {}),
  );
  const workspaceStore = new Map<string, unknown>(
    Object.entries(overrides?.workspaceStateValues ?? {}),
  );
  const secretStore = new Map<string, string>(
    Object.entries(overrides?.secretValues ?? {}),
  );

  const subscriptions: Array<{ dispose(): void }> = [];

  return {
    globalState: {
      get: vi.fn(<T>(key: string, defaultValue?: T): T | undefined =>
        globalStore.has(key) ? (globalStore.get(key) as T) : defaultValue,
      ),
      update: vi.fn(async (key: string, value: unknown) => {
        if (value === undefined) {
          globalStore.delete(key);
        } else {
          globalStore.set(key, value);
        }
      }),
      keys: vi.fn(() => [...globalStore.keys()]),
      setKeysForSync: vi.fn(),
    },
    workspaceState: {
      get: vi.fn(<T>(key: string, defaultValue?: T): T | undefined =>
        workspaceStore.has(key) ? (workspaceStore.get(key) as T) : defaultValue,
      ),
      update: vi.fn(async (key: string, value: unknown) => {
        if (value === undefined) {
          workspaceStore.delete(key);
        } else {
          workspaceStore.set(key, value);
        }
      }),
      keys: vi.fn(() => [...workspaceStore.keys()]),
    },
    secrets: {
      get: vi.fn(async (key: string) => secretStore.get(key)),
      store: vi.fn(async (key: string, value: string) => {
        secretStore.set(key, value);
      }),
      delete: vi.fn(async (key: string) => {
        secretStore.delete(key);
      }),
      onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
    },
    subscriptions,
    extensionPath: overrides?.extensionPath ?? "/mock/extension/path",
    storageUri: overrides?.storageUri ?? { fsPath: "/mock/storage" },
    globalStorageUri: overrides?.globalStorageUri ?? {
      fsPath: "/mock/global-storage",
    },
    logUri: overrides?.logUri ?? { fsPath: "/mock/log" },
    extensionMode: "test" as const,
    environmentVariableCollection: {
      persistent: false,
      replace: vi.fn(),
      append: vi.fn(),
      prepend: vi.fn(),
      get: vi.fn(),
      forEach: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
    },
    asAbsolutePath: vi.fn(
      (relativePath: string) =>
        `${overrides?.extensionPath ?? "/mock/extension/path"}/${relativePath}`,
    ),
    storagePath: "/mock/storage",
    globalStoragePath: "/mock/global-storage",
    logPath: "/mock/log",
  };
}
