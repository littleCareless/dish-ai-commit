## 1. Core Runtime Migration

- [x] 1.1 Refactor `BaseOpenAIProvider` to execute generation and streaming through Vercel AI SDK.
- [x] 1.2 Implement provider-family model factory selection (OpenAI-compatible, Anthropic, Gemini, Ollama).
- [x] 1.3 Implement usage mapping and message normalization.
- [x] 1.4 Implement function-calling compatibility bridge using JSON schema output.

## 2. Provider Alignment

- [x] 2.1 Refactor `openai-compatible-provider` to rely on migrated base runtime.
- [x] 2.2 Migrate providers currently using custom SDK request code to the shared AI SDK runtime:
  - `anthropic`
  - `gemini`
  - `groq`
  - `mistral`
  - `perplexity`
  - `azure-openai`
  - `cloudflare-workersai`
  - `vertexai`
  - `ollama`

## 3. Validation

- [x] 3.1 Run type checks for affected package(s).
- [x] 3.2 Fix compile/type issues introduced by migration.
- [x] 3.3 Confirm factory + provider runtime path remains compatible.
