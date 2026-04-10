import { vi } from "vitest";

/**
 * Notification mock factory.
 *
 * Provides a typed mock matching the `notify` singleton exported from
 * `@/utils/notification/notification-manager`. Consolidates repeated
 * `vi.mock("@/utils/notification")` patterns across existing test files.
 *
 * Usage:
 *   import { createMockNotification } from "@/__tests__/mocks/notification";
 *   vi.mock("@/utils/notification/notification-manager", () => ({
 *     notify: createMockNotification(),
 *   }));
 */

export interface MockNotification {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  add: ReturnType<typeof vi.fn>;
  confirm: ReturnType<typeof vi.fn>;
  prompt: ReturnType<typeof vi.fn>;
}

export function createMockNotification(): MockNotification {
  return {
    info: vi.fn(async () => undefined),
    warn: vi.fn(async () => undefined),
    error: vi.fn(async () => undefined),
    add: vi.fn(async () => undefined),
    confirm: vi.fn(async () => undefined),
    prompt: vi.fn(),
  };
}

/**
 * Convenience: creates the module-shape expected by
 * `vi.mock("@/utils/notification/notification-manager")`.
 */
export function createNotificationModuleMock() {
  return {
    notify: createMockNotification(),
  };
}

/**
 * Convenience: creates the module-shape expected by
 * `vi.mock("@/utils/notification")` (the barrel export).
 */
export function createNotificationBarrelMock() {
  const notify = createMockNotification();
  return {
    notify,
    NotificationType: {},
    NotificationConfig: {},
  };
}
