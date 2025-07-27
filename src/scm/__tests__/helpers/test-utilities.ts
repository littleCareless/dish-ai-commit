/**
 * Common test utilities and helper functions
 */

import { vi, expect } from 'vitest';
import { TestConfig, TestError, ErrorHandlerConfig } from './test-interfaces';

/**
 * Test error handler class
 */
export class TestErrorHandler {
  static handleSetupError(error: Error, testName: string): void {
    const testError: TestError = Object.assign(error, {
      type: 'setup' as const,
      context: { testName },
    });
    console.error(`Setup error in test "${testName}":`, testError);
    throw testError;
  }

  static handleMockError(error: Error, mockName: string): void {
    const testError: TestError = Object.assign(error, {
      type: 'mock' as const,
      context: { mockName },
    });
    console.error(`Mock error for "${mockName}":`, testError);
    throw testError;
  }

  static handleAssertionError(error: Error, assertion: string): void {
    const testError: TestError = Object.assign(error, {
      type: 'assertion' as const,
      context: { assertion },
    });
    console.error(`Assertion error: "${assertion}":`, testError);
    throw testError;
  }

  static handleTimeoutError(testName: string, timeout: number): void {
    const error = new Error(`Test "${testName}" timed out after ${timeout}ms`);
    const testError: TestError = Object.assign(error, {
      type: 'timeout' as const,
      context: { testName, timeout },
    });
    console.error('Timeout error:', testError);
    throw testError;
  }

  static handleResourceError(error: Error, resource: string): void {
    const testError: TestError = Object.assign(error, {
      type: 'resource' as const,
      context: { resource },
    });
    console.error(`Resource error for "${resource}":`, testError);
    throw testError;
  }
}

/**
 * Utility functions for test setup and teardown
 */
export class TestUtils {
  /**
   * Create a test timeout wrapper
   */
  static withTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    testName: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          TestErrorHandler.handleTimeoutError(testName, timeout);
        }, timeout);
      }),
    ]);
  }

  /**
   * Wait for a condition to be true
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout = 5000,
    interval = 100
  ): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Create a delayed promise
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate a random string for test data
   */
  static randomString(length = 8): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate a random number within range
   */
  static randomNumber(min = 0, max = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Create a mock function with predefined behavior
   */
  static createMockWithBehavior<T extends (...args: any[]) => any>(
    behavior: T
  ): ReturnType<typeof vi.fn> & T {
    return vi.fn(behavior) as any;
  }

  /**
   * Verify that a mock was called with specific arguments
   */
  static expectMockCalledWith(
    mock: ReturnType<typeof vi.fn>,
    ...args: any[]
  ): void {
    expect(mock).toHaveBeenCalledWith(...args);
  }

  /**
   * Verify that a mock was called a specific number of times
   */
  static expectMockCalledTimes(
    mock: ReturnType<typeof vi.fn>,
    times: number
  ): void {
    expect(mock).toHaveBeenCalledTimes(times);
  }

  /**
   * Reset all mocks to their initial state
   */
  static resetAllMocks(): void {
    vi.clearAllMocks();
    vi.resetAllMocks();
  }

  /**
   * Create a test configuration with default values
   */
  static createTestConfig(overrides: Partial<TestConfig> = {}): TestConfig {
    return {
      mockWorkspacePath: '/mock/workspace',
      scmType: 'git',
      hasExtension: true,
      hasCommandLine: true,
      ...overrides,
    };
  }

  /**
   * Validate test configuration
   */
  static validateTestConfig(config: TestConfig): void {
    if (!config.mockWorkspacePath) {
      throw new Error('mockWorkspacePath is required');
    }
    if (!['git', 'svn', 'none'].includes(config.scmType)) {
      throw new Error('scmType must be git, svn, or none');
    }
  }

  /**
   * Create a safe test environment
   */
  static createSafeTestEnvironment(): void {
    // Ensure we're in a test environment
    if (!process.env.NODE_ENV?.includes('test') && !process.env.VITEST) {
      throw new Error('Test utilities should only be used in test environment');
    }

    // Set up global error handlers
    process.removeAllListeners('unhandledRejection');
    process.removeAllListeners('uncaughtException');

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
    });
  }
}

/**
 * Assertion helpers for common test patterns
 */
export class TestAssertions {
  /**
   * Assert that a value is defined and not null
   */
  static assertDefined<T>(value: T | undefined | null, message?: string): asserts value is T {
    expect(value, message).toBeDefined();
    expect(value, message).not.toBeNull();
  }

  /**
   * Assert that a string matches a pattern
   */
  static assertStringMatches(value: string, pattern: RegExp, message?: string): void {
    expect(value, message).toMatch(pattern);
  }

  /**
   * Assert that an array contains specific items
   */
  static assertArrayContains<T>(array: T[], items: T[], message?: string): void {
    for (const item of items) {
      expect(array, message).toContain(item);
    }
  }

  /**
   * Assert that an object has specific properties
   */
  static assertObjectHasProperties(obj: any, properties: string[], message?: string): void {
    for (const prop of properties) {
      expect(obj, message).toHaveProperty(prop);
    }
  }

  /**
   * Assert that a function throws a specific error
   */
  static async assertThrowsError(
    fn: () => Promise<any> | any,
    errorMessage?: string | RegExp,
    message?: string
  ): Promise<void> {
    if (errorMessage) {
      await expect(fn, message).rejects.toThrow(errorMessage);
    } else {
      await expect(fn, message).rejects.toThrow();
    }
  }

  /**
   * Assert that a promise resolves within a timeout
   */
  static async assertResolvesWithin<T>(
    promise: Promise<T>,
    timeout: number,
    message?: string
  ): Promise<T> {
    return TestUtils.withTimeout(promise, timeout, message || 'Promise resolution');
  }
}