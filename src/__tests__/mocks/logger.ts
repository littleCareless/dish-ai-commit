import { vi } from "vitest";

/**
 * Logger mock factory.
 *
 * Provides a typed mock matching the `Logger` singleton interface.
 * Consolidates the repeated `vi.mock("@/utils/logger")` patterns found
 * across existing test files.
 *
 * Usage:
 *   import { createMockLogger } from "@/__tests__/mocks/logger";
 *   // or use directly in vi.mock:
 *   vi.mock("@/utils/logger", () => ({
 *     Logger: { getInstance: () => createMockLogger() },
 *   }));
 */

export interface MockLogger {
  trace: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  logError: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
}

export function createMockLogger(): MockLogger {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
    dispose: vi.fn(),
  };
}

/**
 * Convenience: creates the module-shape expected by `vi.mock("@/utils/logger")`.
 * Returns an object with `Logger` that has `getInstance()` returning a mock logger.
 */
export function createLoggerModuleMock() {
  const logger = createMockLogger();
  return {
    Logger: {
      getInstance: vi.fn(() => logger),
    },
    logger,
  };
}
