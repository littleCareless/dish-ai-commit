import { vi } from "vitest";

/**
 * Shared mock context helpers.
 *
 * Extracted from the `createMockContext()` pattern in
 * `adaptive-model-limit-service.test.ts` and generalized for reuse.
 *
 * For a more complete ExtensionContext mock with additional properties
 * (extensionPath, storageUri, etc.), use `createMockExtensionContext()`
 * from `@/__tests__/mocks/configuration`.
 *
 * Usage:
 *   import { createMockContext } from "@/__tests__/helpers/mock-context";
 */

/**
 * Creates a minimal mock ExtensionContext with functional state stores.
 * Suitable for tests that only need globalState/workspaceState/secrets.
 */
export function createMockContext(options?: {
  globalStateValues?: Record<string, unknown>;
  workspaceStateValues?: Record<string, unknown>;
  secretValues?: Record<string, string>;
}) {
  const globalStore = new Map<string, unknown>(
    Object.entries(options?.globalStateValues ?? {}),
  );
  const workspaceStore = new Map<string, unknown>(
    Object.entries(options?.workspaceStateValues ?? {}),
  );
  const secretStore = new Map<string, string>(
    Object.entries(options?.secretValues ?? {}),
  );

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
    subscriptions: [] as Array<{ dispose(): void }>,
    extensionPath: "/test/extension",
    storageUri: { fsPath: "/test/storage" },
    globalStorageUri: { fsPath: "/test/global-storage" },
    logUri: { fsPath: "/test/log" },
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
      (relativePath: string) => `/test/extension/${relativePath}`,
    ),
    storagePath: "/test/storage",
    globalStoragePath: "/test/global-storage",
    logPath: "/test/log",
  };
}
