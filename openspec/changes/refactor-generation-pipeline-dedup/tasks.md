## 1. Baseline and Spec

- [x] 1.1 Record pre-change baseline metrics for SCM detection count, model validation count, cross-repository reachability, and critical-path `console.*` usage.
- [x] 1.2 Add OpenSpec proposal/design/spec delta and pass strict validation.

## 2. P1 Pipeline Dedup

- [x] 2.1 Refactor `GenerateCommitCommand` to consume `prepare()` context as the single source for single-repository flow.
- [x] 2.2 Remove secondary SCM detection and repository re-resolution from commit execution path.
- [x] 2.3 Wire cross-repository detection via `groupFilesByRepository` and activate `CrossRepositoryHandler`.
- [x] 2.4 Ensure cancellation/progress propagation remains consistent for single and cross-repository paths.

## 3. P2 Service and Artifact Convergence

- [x] 3.1 Keep canonical service entrypoints under `services/core/*` and `services/error-handling/*`.
- [x] 3.2 Remove or deprecate unreferenced duplicate service implementations.
- [x] 3.3 Align command artifacts (registered commands, contributed commands, docs) and remove orphan command files.

## 4. P3 Logging and Verification

- [x] 4.1 Replace `console.*` usage in commit/SCM critical paths with `Logger`.
- [x] 4.2 Execute typecheck and targeted tests/smoke checks.
- [x] 4.3 Publish post-change verification and residual-risk notes.
