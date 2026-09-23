# Task: IMPL-003 SCM Layer Tests (Git/SVN)

## Implementation Summary

### Files Created

- `src/scm/__tests__/smart-diff-selector.test.ts`: 15 tests covering 4 diff target modes (staged, all/auto, empty repo, getDiffWithTarget)
- `src/scm/__tests__/staged-content-detector.test.ts`: 9 tests covering single-file, multi-file, no staged content, error handling, caching
- `src/scm/__tests__/svn-provider.test.ts`: 13 tests covering SVN provider constructor, isAvailable, getDiff, commit, setCommitInput/getCommitInput, startStreamingInput, getCommitLog, copyToClipboard
- `src/scm/__tests__/svn-diff-helper.test.ts`: 11 tests covering getFileStatus, getDiff with specific files, all changes diff, SVN format parsing

### Files Modified

- `src/scm/__tests__/multi-repository-context-manager.test.ts`: Extended from 1 to 14 tests. Added test suites for path boundary safety, mixed SCM types, undefined resourceUri handling, and groupResourceStatesByRepository

### Content Added

- **SmartDiffSelector test suite** (`smart-diff-selector.test.ts`): Tests all 4 diff target selection modes including user preference handling, auto-detection config, error fallback, and getDiffWithTarget method
- **StagedContentDetector test suite** (`staged-content-detector.test.ts`): Tests staged content detection with 1, 3, and 0 staged files; error recovery; hasStagedChanges quick check; cache clearing
- **SvnProvider test suite** (`svn-provider.test.ts`): Tests SvnProvider constructor validation, isAvailable checks, uninitialized state errors, commit flow, inputBox/clipboard fallback, streaming input delegation
- **SvnDiffHelper test suite** (`svn-diff-helper.test.ts`): Tests file status detection (M/?/D prefixes), diff retrieval for tracked/deleted/modified files, all-changes diff, DiffProcessor integration
- **Path boundary tests** (`multi-repository-context-manager.test.ts`): Tests /repo vs /repo-tools boundary safety, files outside repos, multiple repos, mixed git+svn, undefined resources, file grouping

## Outputs for Dependent Tasks

### Test Coverage Summary

| Module                     | Tests                             | Coverage Focus                                            |
| -------------------------- | --------------------------------- | --------------------------------------------------------- |
| smart-diff-selector        | 15                                | All 4 diff target modes (staged/all/auto/empty)           |
| staged-content-detector    | 9                                 | Detection, error handling, caching                        |
| svn-provider               | 13                                | Constructor, availability, diff, commit, input, streaming |
| svn-diff-helper            | 11                                | File status, diff retrieval, format parsing               |
| multi-repo-context-manager | 14                                | Path boundary, mixed SCM, undefined handling, grouping    |
| **Total**                  | **67** (including 5 pre-existing) |                                                           |

### Mock Patterns Established

- `vi.hoisted()` for exec mock shared across test methods
- Custom `promisify` mock that wraps callback-style mock into promise
- Class-based module mocks (survive `vi.clearAllMocks()`)
- `trackedRepositories` pattern for SvnRepositoryManager injection

### Integration Points

- Smart diff selector depends on `ProfileManagerService.getInstance().getFeatureSettings()` - mocked with configurable `mockFeatureSettings` object
- Staged content detector depends on `child_process.exec` promisified - mocked via `vi.hoisted` + custom promisify
- SVN provider depends on `SvnRepositoryManager`, `SvnDiffHelper`, `SvnLogHelper` - all mocked as class constructors
- Multi-repo manager depends on `vscode.extensions.getExtension` - mocked per-test in `beforeEach`

### Usage Examples

```typescript
// Pattern for mocking exec with promisify in SCM tests
const { mockExec } = vi.hoisted(() => ({ mockExec: vi.fn() }));
vi.mock("child_process", () => ({ exec: mockExec }));
vi.mock("util", async () => ({
  ...(await vi.importActual("util")),
  promisify:
    (fn) =>
    (...args) =>
      new Promise((resolve, reject) => {
        fn(...args, (err, result) => (err ? reject(err) : resolve(result)));
      }),
}));

// Pattern for class-based mocks that survive clearAllMocks
vi.mock("@/scm/svn/svn-repository-manager", () => ({
  SvnRepositoryManager: class {
    findRepository = vi.fn(() => undefined);
  },
}));
```

## Status: Complete
