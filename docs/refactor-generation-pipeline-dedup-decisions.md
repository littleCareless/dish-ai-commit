# Generation Pipeline Dedup Decisions

Date: 2026-03-24
Change: `refactor-generation-pipeline-dedup`

## Canonical Paths

- SCM detection: `src/services/core/scm-detector-service.ts`
- Model picker: `src/services/core/model-picker-service.ts`
- Token statistics: `src/services/core/token-stats-service.ts`
- Error handling: `src/services/error-handling/*`
- Code review report generator: `src/services/reporting/code-review-report-generator.ts`

## Removed in This Refactor

- `src/services/scm-detector-service.ts`
- `src/services/model-picker-service.ts`
- `src/services/token-stats-service.ts`
- `src/services/error-classification.ts`
- `src/services/error-context.ts`
- `src/services/error-translation.ts`
- `src/services/enhanced-error-handler.ts`
- `src/services/code-review-report-generator.ts`
- `src/commands/select-model-command.ts`
- `src/commands/show-token-stats-command.ts`
- `src/commands/reset-token-stats-command.ts`
- `src/services/core/commit-generation-coordinator.ts`
- `src/core/generation-orchestrator.ts`
- `src/core/generation-transaction.ts`
- `src/core/generation-gate.ts`

## No-Gray-Area Rule Applied

Each disconnected key module now has an explicit status:

- Removed now.
