# Feature Spec: F-002 - Sync Toggle Control

**Priority**: High
**Contributing Roles**: system-architect, ux-expert, product-manager
**Status**: Draft (from synthesis)

## 1. Requirements Summary

- The system MUST provide a global sync toggle controlling whether Feature Config is written to settings.json
- The toggle MUST default to OFF for new users, ON for existing users
- The toggle MUST be stored in globalState (NOT settings.json) to avoid circular dependency
- When toggle transitions from OFF to ON, the system MUST immediately sync all non-default Feature Config to settings.json (EP-004)
- When toggle transitions from ON to OFF, the system MUST NOT delete existing settings.json entries

## 2. Design Decisions

### Decision 2.1: Toggle Storage Location

- **Decision**: The sync toggle MUST be stored in `globalState` with key `dish_config_sync_toggle`
- **Context**: Storing the toggle in settings.json would create a circular dependency (toggle controls whether to write to settings.json, but toggle itself would need to be in settings.json)
- **Chosen Approach**: `context.globalState.get<boolean>("dish_config_sync_toggle", false)` with default false
- **Trade-offs**: Toggle not visible in VSCode Settings Editor, but this is intentional — it's a control mechanism, not a user configuration value
- **Source**: system-architect

### Decision 2.2: Toggle Placement in Webview UI

- **Decision**: The toggle MUST be placed as a banner at the top of the Features Settings tab
- **Context**: Features tab is where users interact with the most toggles (~15 boolean switches), creating immediate mental connection
- **Chosen Approach**: Banner component above feature cards with label "同步功能配置到 settings.json" and a Switch control
- **Trade-offs**: Not in a separate "Advanced" section — more prominent but potentially cluttering. Acceptable because it's a single-line banner.
- **Source**: ux-expert

### Decision 2.3: Toggle Default by User Type

- **Decision**: New users (no existing globalState data) MUST default to OFF; existing users MUST default to ON
- **Context**: Progressive migration — existing users should not notice any behavior change
- **Chosen Approach**: During `SettingsSyncService.initialize()`, detect if globalState has existing feature data. If yes, set toggle to true. If no, leave as false (default).
- **Trade-offs**: Requires a one-time detection check during activation, but ensures seamless migration
- **Source**: product-manager

### Decision 2.4: Toggle ON → Immediate Sync (EP-004)

- **Decision**: When user enables sync toggle, the system MUST immediately sync all non-default Feature Config from globalState to settings.json
- **Context**: User expectation is that enabling sync means "make my current settings visible in settings.json now"
- **Chosen Approach**: `SettingsSyncService.setSyncEnabled(true)` triggers `syncFeaturesToSettingsJson(currentSettings)` with all non-default values
- **Trade-offs**: One-time full sync when enabling, but this is the expected user behavior
- **Source**: product-manager, system-architect

### Decision 2.5: Toggle OFF → No Deletion

- **Decision**: When user disables sync toggle, the system MUST NOT delete existing Feature Config from settings.json
- **Context**: Deletion could remove values the user manually added to settings.json
- **Chosen Approach**: Simply stop writing new values. Existing entries remain until manually removed or profile switch (F-004)
- **Trade-offs**: settings.json may have stale entries, but this is safer than potential data loss
- **Source**: system-architect, ux-expert

## 3. Interface Contract

### SyncToggle API

```typescript
// In SettingsSyncService
class SettingsSyncService {
  private static readonly SYNC_TOGGLE_KEY = "dish_config_sync_toggle";

  get isSyncEnabled(): boolean {
    return this.context.globalState.get<boolean>(
      SettingsSyncService.SYNC_TOGGLE_KEY,
      false,
    );
  }

  async setSyncEnabled(enabled: boolean): Promise<SyncResult> {
    await this.context.globalState.update(
      SettingsSyncService.SYNC_TOGGLE_KEY,
      enabled,
    );
    if (enabled) {
      // EP-004: Immediate sync on toggle ON
      const { FeaturesSettingsManager } =
        await import("@/services/settings/features-settings-manager");
      const settings = FeaturesSettingsManager.getInstance(
        this.context,
      ).getSettings();
      return this.syncFeaturesToSettingsJson(settings);
    }
    return { synced: 0, failed: [], skipped: 0 };
  }
}
```

### Webview Message

```typescript
// Toggle state query
{ command: UIRequest.GetSyncToggleState }

// Toggle state change
{ command: UIRequest.SetSyncToggleState, data: { enabled: boolean } }
```

## 4. Constraints & Risks

- **Circular Dependency Prevention**: Toggle stored in globalState, not settings.json
- **Migration Safety**: Existing users maintain current behavior (toggle ON by default)
- **Risk**: User disables sync, then edits settings.json manually. `syncFromSettingsJson` still reads from settings.json to globalState (direction A is NOT gated by toggle). This is correct — user's manual edit should be respected.
- **Scope**: Toggle only affects Feature Config. Core Config (provider, API key, base.\*) always syncs regardless.

## 5. Acceptance Criteria

- [ ] Features tab shows sync toggle banner at the top
- [ ] New users see toggle OFF by default
- [ ] Existing users see toggle ON by default (preserving current behavior)
- [ ] Enabling toggle immediately syncs non-default Feature Config to settings.json
- [ ] Disabling toggle stops future sync but doesn't delete existing entries
- [ ] Core Config sync is unaffected by toggle state

## 6. Detailed Analysis References

- @../system-architect/analysis.md (Section 3: Sync Toggle Architecture)
- @../ux-expert/analysis.md (Section 2: Sync Toggle UX)
- @../product-manager/analysis.md (Section 3: Migration Plan)

## 7. Cross-Feature Dependencies

- **Depends on**: F-001 (dirty keys needed for targeted sync when toggle is ON)
- **Required by**: F-003 (core config bypasses toggle), F-004 (profile switch respects toggle), F-006 (notification depends on toggle state)
- **Integration points**: SettingsSyncService.syncFeaturesToSettingsJson() checks toggle before writing feature config
