## Why

The current provider layer mixes multiple SDKs and hand-written HTTP/client behaviors. This creates duplicated logic, inconsistent streaming/tool behavior, and high maintenance cost when adding or updating providers.

We need a unified runtime based on Vercel AI SDK while preserving the existing `AIProvider` interface used by commands and services.

## What Changes

- **MODIFIED**: Replace provider runtime request execution with Vercel AI SDK primitives.
- **MODIFIED**: Refactor `BaseOpenAIProvider` to use AI SDK model factories instead of OpenAI SDK calls.
- **MODIFIED**: Align provider implementations (OpenAI-compatible, Anthropic, Gemini, Groq, Mistral, Perplexity, Azure OpenAI, Cloudflare, Vertex, Ollama) onto the shared AI SDK execution path.
- **ADDED**: JSON-schema based function-calling compatibility bridge for existing `generateCommitWithFunctionCalling`.
- **ADDED**: Unified message conversion and usage mapping for sync and streaming generation.

## Impact

- Affected specs: `ai-provider`
- Affected code:
  - `src/ai/providers/base-openai-provider.ts`
  - `src/ai/providers/openai-compatible-provider.ts`
  - `src/ai/providers/{anthropic,gemini,groq,mistral,perplexity,azure-openai,cloudflare-workersai,vertexai,ollama}-provider.ts`
  - `src/ai/ai-provider-factory.ts` (if needed for constructor compatibility)
- Expected result:
  - Provider runtime calls are migrated to Vercel AI SDK.
  - Existing command/service call sites continue to work through unchanged `AIProvider` contracts.
