/**
 * Commit message fixtures for testing.
 *
 * Provides sample commit messages in various formats used across the
 * codebase: conventional commits, emoji-style, messages with body,
 * and multi-line formats.
 */

/** Conventional commit: type(scope): subject */
export const CONVENTIONAL_COMMIT = "feat(auth): add JWT token validation";

/** Conventional commit with body and footer. */
export const CONVENTIONAL_COMMIT_WITH_BODY = `feat(auth): add JWT token validation

Implement JWT validation middleware to verify tokens
on each request before processing.

Closes #123
`;

/** Conventional commit with breaking change. */
export const CONVENTIONAL_COMMIT_BREAKING = `feat(api)!: change authentication endpoint

BREAKING CHANGE: The /auth endpoint now requires Bearer token
instead of basic auth credentials.

Closes #456
`;

/** Emoji-style commit message. */
export const EMOJI_COMMIT = ":sparkles: add new feature for user authentication";

/** Simple single-line commit message. */
export const SIMPLE_COMMIT = "fix typo in readme";

/** Multi-line commit with bullet points. */
export const MULTI_LINE_COMMIT = `feat: implement user settings sync

- Add bi-directional sync between local and remote
- Support conflict resolution with merge strategy
- Add anti-loop protection for recursive sync events
- Include unit tests for all new functionality

Ref: JIRA-789
`;

/** A revert commit message. */
export const REVERT_COMMIT = `Revert "feat(auth): add JWT token validation"

This reverts commit abc123def456.
`;

/** A merge commit message. */
export const MERGE_COMMIT = "Merge branch 'feature/auth' into main";

/**
 * All commit messages as a keyed collection for easy iteration in tests.
 */
export const ALL_COMMIT_MESSAGES = {
  conventional: CONVENTIONAL_COMMIT,
  conventionalWithBody: CONVENTIONAL_COMMIT_WITH_BODY,
  conventionalBreaking: CONVENTIONAL_COMMIT_BREAKING,
  emoji: EMOJI_COMMIT,
  simple: SIMPLE_COMMIT,
  multiLine: MULTI_LINE_COMMIT,
  revert: REVERT_COMMIT,
  merge: MERGE_COMMIT,
} as const;
