## 1. Backend Implementation

- [ ] 1.1 Update `ConnectionMessageHandler` to implement `ConnectionGetAllModels` logic.
- [ ] 1.2 Verify `AIProviderFactory.getProvider` correctly handles dynamic config for model fetching.
- [ ] 1.3 Ensure `getModels()` is implemented for major providers (OpenAI, Ollama, DeepSeek, etc.).

## 2. Frontend Implementation

- [ ] 2.1 Add "Detect Models" button to the Settings UI (Provider configuration section).
- [ ] 2.2 Implement handler in `SettingsView` to send `ConnectionFetchProviderModels` and update state.
- [ ] 2.3 Display loading state and error messages during model detection.

## 3. Verification

- [ ] 3.1 Test with OpenAI (valid/invalid key).
- [ ] 3.2 Test with Ollama (local server running/stopped).
- [ ] 3.3 Verify model list is correctly populated in the dropdown.
