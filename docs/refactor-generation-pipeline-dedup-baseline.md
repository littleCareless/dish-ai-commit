# Generation Pipeline Dedup Baseline (Pre-change)

Date: 2026-03-24
Change: `refactor-generation-pipeline-dedup`

## Scope

Critical path before refactor:

- `src/commands/base-command.ts`
- `src/commands/generate-commit/generate-commit-command.ts`
- `src/commands/generate-commit/handlers/cross-repository-handler.ts`
- `src/scm/multi-repository-context-manager.ts`
- `src/scm/scm-provider.ts`

## Baseline Metrics

1. SCM detection calls in single-repository commit path: **2**

- First detection in `prepare()` via `resolveSCMContext()`.
- Second detection in `GenerateCommitCommand.handleSingleRepositoryScenario()`.

2. Model validation calls in commit path: **1 required + 1 fallback path**

- Required call in `BaseCommand.initializeAIContext()`.
- Fallback call exists in `StreamingGenerationHelper.processModelConfiguration()` when pre-initialized provider/model are missing.

3. Cross-repository reachability: **Not reachable**

- `isCrossRepository` is hardcoded to `false` in `GenerateCommitCommand.parseArguments()`.

4. `console.*` usage in commit/SCM critical files: **54**

- `src/scm/scm-provider.ts`
- `src/scm/multi-repository-context-manager.ts`
- `src/commands/generate-commit/generate-commit-command.ts`

5. Orphan command implementation files (present but unregistered): **3**

- `src/commands/select-model-command.ts`
- `src/commands/show-token-stats-command.ts`
- `src/commands/reset-token-stats-command.ts`

## Evidence Commands

```bash
rg -n "resolveSCMContext\(|detectSCMProvider\(|SCMFactory\.detectSCM\(" \
  src/commands/base-command.ts src/commands/generate-commit/generate-commit-command.ts

rg -n "ModelValidationService\.validateModel\(|initializeAIContext\(|processModelConfiguration\(" \
  src/commands/base-command.ts src/commands/generate-commit/utils/streaming-generation-helper.ts

rg -n "isCrossRepository = false|groupFilesByRepository|CrossRepositoryHandler" \
  src/commands/generate-commit/generate-commit-command.ts src/commands/generate-commit/handlers/cross-repository-handler.ts

rg -n "console\.(log|warn|error|info|debug)" \
  src/scm/scm-provider.ts src/scm/multi-repository-context-manager.ts src/commands/generate-commit/generate-commit-command.ts | wc -l
```
