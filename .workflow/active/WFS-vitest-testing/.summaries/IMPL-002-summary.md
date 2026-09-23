# Task: IMPL-002 Commit Generation Pipeline Tests

## Implementation Summary

### Files Modified

- `src/commands/generate-commit/__tests__/streaming-generation-helper.test.ts`: Added 38 new tests (9 original -> 47 total). Coverage increased from 40.31% to 82.81%.
- `src/commands/generate-commit/__tests__/commit-generation-orchestrator.test.ts`: Added 9 new tests (6 original -> 15 total). Coverage increased from 79.16% to 95.83%.
- `src/commands/generate-commit/__tests__/generate-commit-command.test.ts`: Added 5 new tests (5 original -> 10 total). Added cross-repo failed list and notification dispatch tests.
- `src/commands/generate-commit/__tests__/layered-commit-handler.test.ts`: Added 8 new tests, fixed 1 pre-existing failing test (10 original -> 18 total).
- `src/commands/generate-commit/handlers/__tests__/function-calling-handler.test.ts`: Verified at 100% coverage. No changes needed.

### Content Added

#### streaming-generation-helper.test.ts (38 new tests)

- **Error handling**: Unknown error mapping to failed result, UUID generation for missing session, error message extraction from response.data and non-standard errors
- **prepareConfigurationAndDiff extended**: Provider config missing error, setCurrentFiles verification, explicit 'all' diffTarget, fallbackToAll=true with auto detection failure, successful auto-detection staged diff, fileDiffMap skip conditions
- **getEffectiveInputTokenLimit**: Gemini provider-specific limits, configured maxInputTokensPerRequest, minimum 4096 floor, adaptive learned limits
- **buildFileDiffSnapshotFromCombinedDiff**: Empty/undefined inputs, no recognized file blocks, path suffix matching, missing original-code sections
- **normalizeFilePathForDiffLookup**: Backslash normalization, ./ prefix stripping
- **createFailedResult**: ErrorCode inclusion, UUID generation for undefined session
- **extractInputLimitFromErrorMessage**: Token limit patterns (at most N, per minute), null returns
- **performStreamingGeneration pipeline**: Missing scmProvider, empty diff, cache hit, streaming generation with caching, empty message detection, RequestTooLargeError pipeline handling, cancellation pipeline handling, suppressSuccessNotification

#### commit-generation-orchestrator.test.ts (9 new tests)

- **Context validation**: Undefined context, missing aiProvider, missing selectedModel
- **SCM detection fallback**: No scmProvider in fallback path, no repositoryPath in fallback path
- **Grouped single-repo**: SCM provider detection failure for grouped repo
- **Error handling**: buildTargetForRepository exception, cross-repo with zero valid targets

#### generate-commit-command.test.ts (5 new tests)

- **Single-repository notifications**: Cancelled result (no notification), too_large result (no notification), failed result without notification payload (error shown)
- **Cross-repository failed list**: Repository names in warning, limit to 5 names

#### layered-commit-handler.test.ts (8 new tests, 1 fix)

- **Fix**: `scheduleSemanticGroupContinuation` test - corrected `showInformationMessage` mock signature to match actual call pattern
- **Edge cases**: No files selected, no prefetched diffs, undefined prefetched diffs
- **Batch processing**: Files with missing diff are skipped
- **Rate limit helpers**: resolveRateLimitValue with valid/invalid/NaN/zero config

### Coverage Results

| File                              | Before       | After        |
| --------------------------------- | ------------ | ------------ |
| streaming-generation-helper.ts    | 40.31% Stmts | 82.81% Stmts |
| commit-generation-orchestrator.ts | 79.16% Stmts | 95.83% Stmts |
| function-calling-handler.ts       | 100%         | 100%         |

### Test Counts

| File                                   | Before | After  |
| -------------------------------------- | ------ | ------ |
| streaming-generation-helper.test.ts    | 9      | 47     |
| commit-generation-orchestrator.test.ts | 6      | 15     |
| generate-commit-command.test.ts        | 5      | 10     |
| layered-commit-handler.test.ts         | 10     | 18     |
| function-calling-handler.test.ts       | 2      | 2      |
| **Total**                              | **32** | **92** |

## Outputs for Dependent Tasks

### Available Test Utilities

Module-level mocks added to streaming-generation-helper.test.ts (available for reuse via vi.mock):

- `@/services/cache/commit-cache-service` mock
- `@/services/context-inspector-service` mock
- `@/ai/model-registry/adaptive-model-limit-service` mock
- `@/ai/model-registry/model-catalog-service` mock
- `@/services/core/prompt-manager-service` mock
- `@/commands/generate-commit/builders/context-builder` mock
- `@/utils/state/state-manager` mock

### Integration Points

- All 193 tests pass across 24 test files (full suite)
- No production code was modified
- Pre-existing failing test in layered-commit-handler.test.ts was fixed

## Status: Complete
