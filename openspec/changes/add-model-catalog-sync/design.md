## Context

Model limits are provider-dependent and often missing in unified model APIs. Runtime-only discovery is insufficient for deterministic request guards. The solution must avoid extra token consumption and still provide pre-request safety.

## Goals / Non-Goals

- Goals:
  - Provide deterministic input-limit resolution before request dispatch.
  - Support external metadata ingestion without making user-request-time probing calls.
  - Preserve local manual overrides as source of truth.
- Non-Goals:
  - No online capability probing/exploration requests against provider model APIs for limit discovery.
  - No automatic pricing optimization in this change.

## Decisions

- Decision: Introduce `ModelCatalogService` that resolves metadata by key `(provider, model, endpointVariant?)`.
- Decision: Metadata source precedence is:
  1. local manual overrides
  2. synced third-party defaults (OpenRouter/LiteLLM)
  3. safe fallback defaults by provider family
- Decision: Store `confidence`, `source`, and `lastVerifiedAt` for each record.
- Decision: Preflight budget uses resolved `contextLength` and existing request reserve logic to compute allowed input.
- Decision: Sync jobs are offline/manual-scheduled and must not run in user request path.

## Risks / Trade-offs

- Risk: Third-party sources can be stale or inconsistent.
  - Mitigation: Keep manual overrides highest priority and record source/confidence.
- Risk: Overly conservative fallback may truncate too much context.
  - Mitigation: Make fallback explicit and observable in logs with confidence markers.

## Migration Plan

1. Add catalog schema and local override file support.
2. Add external source fetch adapters and merge pipeline.
3. Route commit-generation preflight to catalog resolver.
4. Add logs and diagnostics for resolved limit source/confidence.

## Open Questions

- Should endpoint variant key include `baseUrl` hash or normalized provider profile name?
- Should sync be exposed as command-only first, then scheduled task later?
