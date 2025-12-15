# Change: Enhance Model Discovery

## Why

Currently, users often have to manually input model names or guess them, which leads to configuration errors and frustration. The `ConnectionMessageHandler` has incomplete logic (TODOs) for fetching models dynamically. We need to automate this to improve the onboarding experience.

## What Changes

- Implement `ConnectionGetAllModels` in `ConnectionMessageHandler` to dynamically fetch models from supported providers (OpenAI, Ollama, etc.).
- Update `AIProviderFactory` and provider implementations to ensure `getModels()` works reliably for all supported providers.
- Add a "Detect Models" feature in the Settings UI to auto-populate available models.

## Impact

- **Affected Specs**: `settings`
- **Affected Code**:
  - `src/services/webview/handlers/settings/connection-message-handler.ts`
  - `src/ai/providers/*`
  - `webview-ui/src/components/settings/*`
