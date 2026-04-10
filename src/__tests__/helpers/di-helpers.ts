import { vi } from "vitest";
import { createMockLogger } from "@/__tests__/mocks/logger";
import { createMockNotification } from "@/__tests__/mocks/notification";

/**
 * Dependency Injection helper utilities.
 *
 * The codebase uses constructor injection extensively. This module
 * provides builders for common constructor argument objects, reducing
 * boilerplate in test setup.
 *
 * Usage:
 *   import { createServiceDeps } from "@/__tests__/helpers/di-helpers";
 *   const deps = createServiceDeps();
 *   new MyService(deps.context, deps.logger, deps.notification);
 */

/**
 * Creates a standard set of service dependencies for constructor injection.
 * Most services expect some combination of: context, logger, notify, config.
 */
export function createServiceDeps(overrides?: {
  context?: Record<string, unknown>;
  logger?: ReturnType<typeof createMockLogger>;
  notification?: ReturnType<typeof createMockNotification>;
}) {
  const logger = overrides?.logger ?? createMockLogger();
  const notification = overrides?.notification ?? createMockNotification();

  return {
    logger,
    notification,
    context: overrides?.context ?? {},
  };
}

/**
 * Creates mock constructor arguments for services that follow the pattern:
 * `constructor(context: ExtensionContext, logger: Logger)`
 */
export function createContextLoggerDeps(overrides?: {
  context?: Record<string, unknown>;
  logger?: ReturnType<typeof createMockLogger>;
}) {
  const { createMockExtensionContext } = require("@/__tests__/mocks/configuration");
  return {
    context: overrides?.context ?? createMockExtensionContext(),
    logger: overrides?.logger ?? createMockLogger(),
  };
}

/**
 * Creates mock constructor arguments for services that follow the pattern:
 * `constructor(logger: Logger, notification: Notification)`
 */
export function createLoggerNotificationDeps(overrides?: {
  logger?: ReturnType<typeof createMockLogger>;
  notification?: ReturnType<typeof createMockNotification>;
}) {
  return {
    logger: overrides?.logger ?? createMockLogger(),
    notification: overrides?.notification ?? createMockNotification(),
  };
}

/**
 * Creates a mock storage manager for services that depend on
 * `StorageManager` or `AdvancedStorage`.
 */
export function createMockStorageManager(
  initialValues?: Record<string, unknown>,
): any {
  const store = new Map<string, unknown>(
    Object.entries(initialValues ?? {}),
  );

  return {
    getGlobal: vi.fn(<T>(key: string, defaultValue?: T): T | undefined =>
      store.has(key) ? (store.get(key) as T) : defaultValue,
    ),
    setGlobal: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    deleteGlobal: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    getWorkspace: vi.fn(<T>(key: string, defaultValue?: T): T | undefined =>
      store.has(key) ? (store.get(key) as T) : defaultValue,
    ),
    setWorkspace: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    deleteWorkspace: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    initialize: vi.fn(async () => {}),
    dispose: vi.fn(),
  };
}
