# Feature Spec: F-003 - Core Config Always Sync

**Priority**: High
**Contributing Roles**: system-architect, product-manager
**Status**: Draft (from synthesis)

## 1. Requirements Summary

- Core configuration (provider, API key, base settings) MUST always sync to settings.json regardless of sync toggle state
- The system MUST define a clear classification of "core" vs "feature" config keys
- The sync service MUST route core config through an unconditional sync path

## 2. Design Decisions

### Decision 2.1: Core Config Classification

- **Decision**: The following config prefixes MUST be classified as "core" and always sync
- **Context**: Users who prefer editing settings.json need reliable access to fundamental plugin configuration
- **Core Config Keys**:
  - `base.language` — User's most frequently edited setting
  - `base.provider` — Primary provider selection
  - `base.model` — Primary model selection
  - `providers.*.baseUrl` — Connection endpoints for all providers
  - `providers.*.apiKey` — Note: actual keys stored in Secret Storage, but provider config visibility in settings.json helps discovery
- **Feature Config Keys**: All keys prefixed with `features.*` (controlled by sync toggle)
- **Source**: product-manager, system-architect

### Decision 2.2: Classification Implementation

- **Decision**: The system MUST use prefix-based classification functions
- **Context**: Need a simple, maintainable way to classify any config key
- **Chosen Approach**:

```typescript
const CORE_CONFIG_PREFIXES = ["base.", "providers."] as const;

function isCoreConfigKey(dotPath: string): boolean {
  return CORE_CONFIG_PREFIXES.some((prefix) => dotPath.startsWith(prefix));
}

function isFeatureConfigKey(dotPath: string): boolean {
  return dotPath.startsWith("features.");
}
```

- **Trade-offs**: Prefix-based is simple but not granular. If a future `base.experimental.*` section shouldn't sync, the function would need updating. Acceptable for current scope.
- **Source**: system-architect

### Decision 2.3: Unconditional Sync Path

- **Decision**: Core config MUST bypass the sync toggle check entirely
- **Context**: The sync toggle only gates Feature Config. Core Config always syncs.
- **Chosen Approach**: In `syncFeaturesToSettingsJson`, check `isCoreConfigKey` first — if true, always write. If feature key, then check toggle.
- **Source**: system-architect

## 3. Interface Contract

### Config Classification API

```typescript
// Exported from settings-sync-service.ts
export function isCoreConfigKey(dotPath: string): boolean;
export function isFeatureConfigKey(dotPath: string): boolean;
```

### Sync Service Flow

```
For each config key to sync:
  if isCoreConfigKey(key):
    → Always write to settings.json (bypass toggle)
  elif isFeatureConfigKey(key):
    → Check sync toggle:
      if ON and value !== default → write
      if ON and value === default → clear from settings.json
      if OFF → skip
```

## 4. Constraints & Risks

- **Scope limitation**: API keys are stored in VSCode Secret Storage, not settings.json directly. The `providers.*.apiKey` in settings.json is a reference/placeholder. Actual secret handling is unchanged.
- **Risk**: Adding new base._ or providers._ config in future requires no additional code — prefix-based classification handles it automatically
- **Backward compatibility**: Current behavior already syncs all config. This feature adds a classification layer but doesn't change the outcome for core config

## 5. Acceptance Criteria

- [ ] `isCoreConfigKey("base.language")` returns true
- [ ] `isCoreConfigKey("providers.openai.baseUrl")` returns true
- [ ] `isFeatureConfigKey("features.commitFormat.enableEmoji")` returns true
- [ ] Core config is written to settings.json even when sync toggle is OFF
- [ ] Feature config respects sync toggle state

## 6. Detailed Analysis References

- @../system-architect/analysis.md (Section 4: Core Config vs Feature Config)
- @../product-manager/analysis.md (Section: 配置分层的产品论证)

## 7. Cross-Feature Dependencies

- **Depends on**: F-002 (sync toggle provides the gating mechanism)
- **Required by**: F-004 (profile switch needs to know which configs are core vs feature)
- **Shared patterns**: Classification functions are used by all sync operations
