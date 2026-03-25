# Change: Refactor Generation Pipeline Dedup

## Why

The commit generation pipeline has duplicated SCM detection paths, unreachable cross-repository execution, and parallel legacy service implementations. These issues increase regression risk, make failures harder to diagnose, and cause avoidable runtime overhead.

## What Changes

- Deduplicate commit-generation execution so `prepare()` context is the single source of truth for single-repository execution.
- Make cross-repository flow reachable by wiring file grouping to `CrossRepositoryHandler`.
- Align command registration, menus, and docs to remove orphan command artifacts.
- Converge duplicate service implementations to canonical paths under `services/core/*` and `services/error-handling/*`.
- Replace `console.*` logging in commit/SCM critical paths with structured `Logger` usage.
- Add baseline and post-change verification artifacts for SCM detection count, model validation count, and cross-repository reachability.

## Impact

- Affected specs: generation-pipeline (new)
- Affected code:
  - `src/commands/base-command.ts`
  - `src/commands/generate-commit/generate-commit-command.ts`
  - `src/commands/generate-commit/handlers/cross-repository-handler.ts`
  - `src/scm/multi-repository-context-manager.ts`
  - `src/scm/scm-provider.ts`
  - `src/commands.ts`
  - `src/package.json`
  - `src/services/*` (duplicate cleanup)
