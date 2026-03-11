# Change: Add Model Catalog Sync and Input Limit Guard

## Why

The extension supports 20+ providers through a unified interface, but many providers do not return reliable `max_input_tokens` / `context_length` in API responses. This causes unstable pre-request token checks and avoidable runtime failures.

## What Changes

- Add a local Model Catalog with `(provider, model, endpointVariant?)` metadata used for pre-request token budgeting.
- Add third-party catalog sync support (OpenRouter models and LiteLLM model map) as an offline data source.
- Define a deterministic merge priority: manual local overrides > synced third-party defaults > safe fallback defaults.
- Enforce request preflight calculation using catalog-derived limits before any commit-generation model call.
- Persist confidence and source information to support safe fallback and future manual maintenance.

## Impact

- Affected specs: `settings`, `model-catalog`
- Affected code:
  - `src/commands/generate-commit/utils/streaming-generation-helper.ts`
  - `src/ai/model-registry/*` (new catalog integration)
  - `src/services/*` (new catalog storage/sync services)
  - optional sync script/command wiring for scheduled/manual refresh
