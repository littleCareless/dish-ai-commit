/**
 * Configuration state fixtures for testing.
 *
 * Provides pre-built configuration objects matching the extension's
 * configuration schema: default (minimal), partial, and full states.
 */

/**
 * Default / minimal configuration with sensible defaults.
 * Represents a freshly installed extension with no user customization.
 */
export const DEFAULT_CONFIG = {
  "commitAI.provider": "openai",
  "commitAI.model": "",
  "commitAI.language": "en",
  "commitAI.maxTokens": 500,
  "commitAI.temperature": 0.7,
  "commitAI.scm": "auto",
  "commitAI.commitMessageFormat": "conventional",
  "commitAI.prompt": "",
  "commitAI.enableStreaming": true,
} as const;

/**
 * Partial configuration where the user has customized a subset of settings.
 * Other settings should fall back to defaults.
 */
export const PARTIAL_CONFIG = {
  "commitAI.provider": "anthropic",
  "commitAI.model": "claude-sonnet-4-20250514",
  "commitAI.language": "zh-cn",
  "commitAI.commitMessageFormat": "emoji",
  "commitAI.enableStreaming": false,
} as const;

/**
 * Full configuration with all settings explicitly set.
 */
export const FULL_CONFIG = {
  "commitAI.provider": "google",
  "commitAI.model": "gemini-2.5-flash",
  "commitAI.language": "en",
  "commitAI.maxTokens": 1000,
  "commitAI.temperature": 0.5,
  "commitAI.scm": "git",
  "commitAI.commitMessageFormat": "conventional",
  "commitAI.prompt": "You are an expert commit message writer.",
  "commitAI.enableStreaming": true,
  "commitAI.apiKey": "test-api-key",
  "commitAI.apiEndpoint": "https://custom.api.endpoint/v1",
  "commitAI.proxy": "",
  "commitAI.enableCodeReview": true,
  "commitAI.enableBranchName": true,
  "commitAI.enableWeeklyReport": true,
  "commitAI.autoDetectSCM": true,
  "commitAI.excludePatterns": ["*.lock", "package-lock.json"],
  "commitAI.includeFileList": true,
  "commitAI.contextLines": 3,
} as const;

/**
 * Invalid configuration for error-handling tests.
 */
export const INVALID_CONFIG = {
  "commitAI.provider": "",
  "commitAI.model": 12345, // wrong type
  "commitAI.temperature": -1, // out of range
  "commitAI.maxTokens": "abc", // wrong type
} as const;

/**
 * Feature flags configuration (used by features-settings-manager).
 */
export const FEATURES_CONFIG = {
  "commitAI.features.semanticGrouping": true,
  "commitAI.features.layeredCommit": false,
  "commitAI.features.smartDiffSelection": true,
  "commitAI.features.functionCalling": false,
  "commitAI.features.customPrompts": true,
  "commitAI.features.multiRepository": true,
} as const;
