## Context

The extension currently runs commit generation through `BaseCommand.prepare()` and then performs extra SCM resolution inside `GenerateCommitCommand`, which duplicates critical path work. Cross-repository support exists but is unreachable due to hardcoded branching. Multiple legacy duplicate service files also increase maintenance overhead.

## Goals / Non-Goals

- Goals:
  - Enforce single-source command context for single-repository commit generation.
  - Make cross-repository execution path reachable and deterministic.
  - Remove orphan/duplicate artifacts with no active references.
  - Normalize logging in critical commit/SCM paths to `Logger`.
- Non-Goals:
  - Add new user-facing features.
  - Change external command IDs.
  - Re-architect all SCM internals in one iteration.

## Decisions

- Decision: `prepare()` output remains the canonical context for single-repository commit execution.
  - Rationale: preserves existing validation, ToS handling, and model init behavior while eliminating downstream re-detection.
- Decision: Cross-repository activation is determined by grouped resource states (`groupFilesByRepository`) and only enabled when repository count > 1.
  - Rationale: avoids accidental branch activation and preserves current single-repo UX.
- Decision: Canonical service locations are `services/core/*` and `services/error-handling/*`; unreferenced legacy duplicates are removed.
  - Rationale: reduces drift risk from parallel implementations.
- Decision: Replace critical-path `console.*` in commit/SCM flow with structured logger calls.
  - Rationale: consistent diagnostics and lower log noise.

## Risks / Trade-offs

- Risk: Cross-repo grouping may change behavior for mixed selections.
  - Mitigation: gate by repository count and keep single-repo path unchanged.
- Risk: Removing legacy files may break hidden imports.
  - Mitigation: enforce typecheck and reference scan before/after deletion.

## Migration Plan

1. Add baseline + spec artifacts.
2. Refactor commit path and cross-repo routing.
3. Converge duplicate services and command artifacts.
4. Run verification and publish residual risks.

## Open Questions

- None blocking for this refactor scope.
