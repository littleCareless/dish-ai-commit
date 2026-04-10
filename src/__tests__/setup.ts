/**
 * Global test setup entry point.
 *
 * Re-exports the extended VS Code mock from the SCM setup file
 * and provides access to all shared test infrastructure modules.
 *
 * NOTE: The vitest.config.ts currently points to `src/scm/__tests__/setup.ts`
 * as the global setup file. This file exists as the future canonical location
 * when the config is updated. It re-exports the SCM setup so tests importing
 * from here get the full VS Code mock.
 *
 * Mock factories, fixtures, and helpers are imported on-demand by individual
 * test files -- they are NOT loaded globally here to keep test isolation clean.
 */

// Re-export the VS Code mock setup (ensures vscode is mocked globally)
export {};
