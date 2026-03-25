## Context

The extension already standardizes orchestration in `AbstractAIProvider`, but concrete providers still implement request execution with heterogeneous SDKs.

## Design Decisions

1. Keep `AIProvider` interface and `AbstractAIProvider` orchestration unchanged.
2. Move provider request runtime to AI SDK inside `BaseOpenAIProvider`.
3. Use provider-specific model factories selected by provider id:
   - OpenAI-compatible family: `@ai-sdk/openai`
   - Anthropic: `@ai-sdk/anthropic`
   - Gemini: `@ai-sdk/google`
   - Ollama: `ollama-ai-provider-v2`
4. Keep provider-specific model lists and config defaults in each provider file.
5. Bridge existing OpenAI-style function-calling schema to AI SDK `generateObject + jsonSchema`.

## Runtime Flow

1. `AbstractAIProvider` builds prompts and feature-level orchestration.
2. Concrete provider delegates execution to base runtime methods.
3. Base runtime:
   - Converts messages into AI SDK CoreMessage format.
   - Resolves model factory by provider id + config.
   - Executes `generateText` / `streamText`.
   - Maps usage into existing `{ promptTokens, completionTokens, totalTokens }`.
   - Optionally executes JSON-schema output for function-calling bridge.

## Compatibility

- Preserve public provider class names and factory ids.
- Preserve model refresh/get behavior semantics (best-effort API listing + static fallback).
- Preserve existing return shape expected by command handlers.
