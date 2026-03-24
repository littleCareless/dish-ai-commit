# Generation Pipeline Dedup Verification (Post-change)

Date: 2026-03-24
Change: `refactor-generation-pipeline-dedup`

## Results Summary

1. SCM detection calls in single-repository commit path: **1**

- `prepare()` performs detection and `GenerateCommitCommand` reuses context directly.

2. Model validation in commit path: **1**

- `prepare()` initializes and validates model context once.
- Cross-repository execution now reuses prepared `aiProvider/selectedModel` and no longer triggers per-repository fallback validation.

3. Cross-repository path: **Reachable**

- `GenerateCommitCommand.parseArguments()` now groups files via `groupFilesByRepository()` and enables cross-repo flow when `size > 1`.

4. Critical path `console.*` usage: **0**

- Target files now use `Logger`:
  - `src/commands/generate-commit/generate-commit-command.ts`
  - `src/scm/scm-provider.ts`
  - `src/scm/multi-repository-context-manager.ts`

5. Orphan command artifacts: **Removed**

- Deleted unregistered command files:
  - `select-model-command.ts`
  - `show-token-stats-command.ts`
  - `reset-token-stats-command.ts`

6. Duplicate service implementations: **Converged**

- Removed legacy duplicate files under `src/services/`.
- Canonical paths documented in `docs/refactor-generation-pipeline-dedup-decisions.md`.

## Validation Commands and Outputs

1. Typecheck

```bash
pnpm --filter dish-ai-commit check-types
```

Result: ✅ pass

2. Tests

```bash
pnpm --filter dish-ai-commit test
```

Result: ⚠ failed because project currently has no files matching configured test pattern (`No test files found`).

3. Metrics checks

```bash
rg -n "resolveSCMContext\(|detectSCMProvider\(|SCMFactory\.detectSCM\(" \
  src/commands/base-command.ts src/commands/generate-commit/generate-commit-command.ts

rg -n "processModelConfiguration\(|ModelValidationService\.validateModel\(" \
  src/commands/generate-commit/utils/streaming-generation-helper.ts

rg -n "groupFilesByRepository\(|isCrossRepository = filesByRepository\.size > 1" \
  src/commands/generate-commit/generate-commit-command.ts

rg -n "console\.(log|warn|error|info|debug)" \
  src/commands/generate-commit/generate-commit-command.ts \
  src/scm/scm-provider.ts src/scm/multi-repository-context-manager.ts
```

Result: ✅ dedup/cross-repo checks pass; model fallback path is no longer hit by cross-repo call wiring; console count is 0.

## Smoke Checklist

- [x] Command IDs unchanged (`dish-ai-commit.*`).
- [x] `contributes.commands` and runtime `commands.ts` remain aligned (6 active commands).
- [x] Duplicate SCM menu entry removed from `scm/title`.
- [x] Single-repo commit path uses prepared context without re-detection.
- [x] Cross-repo route can be activated by grouped resources (>1 repository).
- [ ] Automated unit/integration test suite executed (blocked: no matching test files).

## Residual Risks

1. `prepare()` still performs one SCM detection before cross-repo branching, and each repository execution still performs its own detection in cross-repo mode (expected per repo, but baseline counters should be interpreted accordingly).
2. Refactor scaffolds retained but not wired (`commit-generation-coordinator`, `generation-orchestrator`) are now tracked with explicit sunset dates in the decisions doc.
3. Broader repository `console.*` cleanup was out of scope; this refactor only guarantees critical commit/SCM path cleanup.
