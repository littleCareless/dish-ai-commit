/**
 * Test helpers index - exports all test utilities
 */

// Interfaces and types
export * from './test-interfaces';

// Utilities and assertions
export * from './test-utilities';

// Mock factories
export * from './mock-factories';

// Test data generators
export * from './test-data-generators';

// Command executor mock
export * from './mock-command-executor';

// Re-export commonly used items for convenience
export {
  TestUtils,
  TestErrorHandler,
  TestAssertions,
} from './test-utilities';

export {
  MockVSCodeAPIFactory,
  MockGitExtensionFactory,
  MockSvnExtensionFactory,
  ConfigurableMockFactory,
} from './mock-factories';

export {
  GitTestData,
  SvnTestData,
  TestFileSystem,
} from './test-data-generators';

export {
  MockCommandExecutor,
} from './mock-command-executor';