# Feature Spec: F-004 - Profile Switch Replacement

**Priority**: Medium
**Contributing Roles**: system-architect
**Status**: Draft (from synthesis)

## 1. Requirements Summary

- Profile switch MUST perform full replacement of settings.json plugin entries
- The system MUST clear all old profile's entries before writing new profile's values
- The replacement MUST respect sync toggle state for Feature Config
- Core Config MUST always be updated regardless of toggle state

## 2. Design Decisions

### Decision 2.1: Two-Phase Replacement Strategy

- **Decision**: Profile switch MUST execute in two phases: Clear → Write
- **Context**: Current `syncOnProfileSwitch` directly writes all values, which may leave stale entries from the previous profile
- **Chosen Approach**:
  - Phase 1: Clear all `features.*` entries from settings.json
  - Phase 2: Write new profile's non-default values (respecting sync toggle for Feature Config)
- **Trade-offs**: Two-pass operation is not atomic, but globalState has the correct profile data as fallback
- **Source**: system-architect

### Decision 2.2: Toggle-Aware Profile Switch

- **Decision**: Profile switch for Feature Config MUST check sync toggle state
- **Context**: When toggle is OFF, profile switch should not write Feature Config to settings.json
- **Chosen Approach**:
  - Core Config: Always clear + write (regardless of toggle)
  - Feature Config: Clear always, but write only if toggle is ON
  - Rationale: Clearing is safe (globalState has the data), writing is gated by user preference
- **Source**: system-architect

## 3. Interface Contract

### Updated syncOnProfileSwitch

```typescript
async syncOnProfileSwitch(settings: FeaturesSettings): Promise<void> {
  this._syncSource = "globalState";
  try {
    const config = vscode.workspace.getConfiguration(SECTION);

    // Phase 1: Clear all feature entries
    for (const dotPath of Object.values(REVERSE_FEATURE_MAP)) {
      const inspect = config.inspect(dotPath);
      if (inspect?.globalValue !== undefined || inspect?.workspaceValue !== undefined) {
        await config.update(dotPath, undefined, true);
      }
    }

    // Phase 2: Write new profile's values (respecting toggle for features)
    for (const [stateKey, dotPath] of Object.entries(REVERSE_FEATURE_MAP)) {
      const value = settings[stateKey as keyof FeaturesSettings];
      const defaultValue = DEFAULT_FEATURE_SETTINGS[stateKey as keyof FeaturesSettings];

      if (isCoreConfigKey(dotPath)) {
        // Core: always write
        if (value !== defaultValue) {
          await config.update(dotPath, value, true);
        }
      } else if (this.isSyncEnabled) {
        // Feature + toggle ON: write non-defaults
        if (value !== defaultValue) {
          await config.update(dotPath, value, true);
        }
      }
      // Feature + toggle OFF: skip (already cleared in Phase 1)
    }
  } finally {
    this._syncSource = "none";
  }
}
```

## 4. Constraints & Risks

- **Atomicity**: VSCode's `config.update()` is not atomic across multiple calls. If Phase 1 completes but Phase 2 fails, settings.json may be partially cleared. Mitigation: globalState always has the correct profile data; next sync will fix.
- **Performance**: Iterating all REVERSE_FEATURE_MAP entries twice (clear + write). With ~25 entries, this is negligible.
- **Risk**: Profile switch with toggle OFF leaves settings.json with no Feature Config entries. User may be confused. Mitigation: Clear notification about sync state (F-006).

## 5. Acceptance Criteria

- [ ] Profile switch clears all old Feature Config entries from settings.json
- [ ] New profile's non-default values are written to settings.json when toggle is ON
- [ ] Profile switch with toggle OFF only updates Core Config, not Feature Config
- [ ] After profile switch, settings.json contains no stale entries from previous profile

## 6. Detailed Analysis References

- @../system-architect/analysis.md (Section 7: Profile Switch Flow)

## 7. Cross-Feature Dependencies

- **Depends on**: F-002 (toggle state), F-003 (core vs feature classification)
- **Required by**: None
- **Shared patterns**: Same clear-then-write pattern can be reused for "clean settings.json" action (future enhancement)
