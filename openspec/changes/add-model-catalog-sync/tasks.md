## 1. Implementation

- [ ] 1.1 Add model catalog data schema and storage layer with fields: provider, model, endpointVariant, contextLength, maxOutputTokens, tokenizerFamily, confidence, source, lastVerifiedAt.
- [ ] 1.2 Add local manual override loader and precedence enforcement.
- [ ] 1.3 Add third-party source adapters to fetch OpenRouter model metadata and LiteLLM model map.
- [ ] 1.4 Add merge pipeline (manual override > third-party > fallback defaults) and cache.
- [ ] 1.5 Integrate catalog resolution into commit-generation preflight limit calculation.
- [ ] 1.6 Add structured logs for resolved limit source/confidence and fallback usage.
- [ ] 1.7 Add tests for resolution precedence and unknown-model fallback behavior.

## 2. Validation

- [ ] 2.1 Run `openspec validate add-model-catalog-sync --strict`.
- [ ] 2.2 Run `pnpm turbo run check-types --filter=dish-ai-commit --output-logs=errors-only`.
