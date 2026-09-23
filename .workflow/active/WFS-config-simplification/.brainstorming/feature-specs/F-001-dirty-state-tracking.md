# Feature Spec: F-001 - Dirty State Tracking

**Priority**: High
**Contributing Roles**: system-architect, ux-expert, product-manager
**Status**: Draft (from synthesis)

## 1. Requirements Summary

- The Webview UI frontend MUST track which configuration fields the user has actually modified
- The save operation MUST only send user-modified fields to the backend (via `dirtyKeys` array)
- The backend MUST use `dirtyKeys` to determine which fields to sync to settings.json
- The system SHOULD display an explicit "Save" button showing the count of unsaved changes
- The system MUST fall back to full sync when `dirtyKeys` is not provided (backward compatibility)

## 2. Design Decisions

### Decision 2.1: Frontend DirtyMap Implementation

- **Decision**: The frontend MUST use a `Set<string>` to track dirty field names
- **Context**: Current behavior sends the entire settings object on every toggle, causing full sync
- **Options Considered**: Map<string, value> (stores old values) vs Set<string> (stores only changed keys)
- **Chosen Approach**: Set<string> is sufficient — React state already manages current values; dirty tracking only needs "which fields changed"
- **Trade-offs**: Simpler implementation but cannot detect "reverted to original" (user changes A→B→A still marks as dirty). Acceptable because reverting to default is handled by sync logic.
- **Source**: system-architect, ux-expert

### Decision 2.2: Backend Message Contract Extension

- **Decision**: The `FeaturesSaveSettings` message MUST be extended with optional `dirtyKeys: string[]` field
- **Context**: Backend needs to know which fields were actually modified to perform targeted sync
- **Options Considered**: Send only changed values (breaks merge) vs send all values + dirty markers (backward compatible)
- **Chosen Approach**: Keep sending full `data` object for globalState merge, add `dirtyKeys` as a parallel field
- **Trade-offs**: Slightly more data transmitted, but maintains 100% backward compatibility
- **Source**: system-architect

### Decision 2.3: Explicit Save Button (EP-001 Enhancement)

- **Decision**: The Features tab MUST replace "save on every toggle" with an explicit "Save" button
- **Context**: Current `handleFeatureToggle` in FeaturesSettings.tsx immediately saves on every toggle. This causes multiple unnecessary syncs and provides no undo opportunity.
- **Options Considered**: Keep auto-save + batch dirty tracking vs explicit save with dirty count
- **Chosen Approach**: Add a "Save (N changes)" button that appears when dirty fields exist. Follows the same pattern as ProfileForm.tsx (editingActive/editingInactive badges).
- **Trade-offs**: One extra click per save session, but reduces accidental writes and gives users a review opportunity
- **Source**: ux-expert

## 3. Interface Contract

### Frontend → Backend Message

```typescript
// Extended message format
{
  command: UIRequest.FeaturesSaveSettings,
  data: Partial<FeaturesSettings>,    // Full current values (for globalState merge)
  dirtyKeys?: string[]                 // NEW: Which fields user actually modified
}
```

### Backend → Frontend Response

```typescript
// Enhanced response with sync result (EP-003)
{
  command: ExtensionResponse.FeaturesSettingsLoaded,
  data: FeaturesSettings,
  syncResult?: {                       // NEW: Sync operation result
    synced: number,
    failed: string[],
    skipped: number                    // Skipped due to sync toggle OFF
  }
}
```

### Frontend State

```typescript
// DirtyMap in React component
const dirtyFields = useRef<Set<keyof FeaturesSettings>>(new Set());

// Field change handler
const handleChange = (field: keyof FeaturesSettings, value: unknown) => {
  dirtyFields.current.add(field);
  setLocalSettings((prev) => ({ ...prev, [field]: value }));
};

// Save handler
const handleSave = () => {
  postMessage({
    command: UIRequest.FeaturesSaveSettings,
    data: localSettings,
    dirtyKeys: Array.from(dirtyFields.current),
  });
  dirtyFields.current.clear();
};
```

## 4. Constraints & Risks

- **Performance**: Set operations are O(1), no performance concern
- **Compatibility**: `dirtyKeys` is optional — old frontends work without it, backend falls back to full sync
- **Risk**: User modifies field, reverts to original, then saves — the field is still in dirtyKeys. Acceptable because sync service already checks `current === defaultValue`.
- **Migration**: No data migration needed, purely frontend + message contract change

## 5. Acceptance Criteria

- [ ] Webview UI Features tab shows a "Save (N changes)" button when fields are modified
- [ ] Button count accurately reflects number of modified fields
- [ ] Save operation only sends dirty fields in `dirtyKeys`
- [ ] Backend receives `dirtyKeys` and uses it for targeted sync
- [ ] When `dirtyKeys` is absent, backend falls back to current behavior
- [ ] "Save" button disappears after successful save (no unsaved changes)

## 6. Detailed Analysis References

- @../system-architect/analysis.md (Section 2: Data Model)
- @../ux-expert/analysis.md (Section 6: Dirty State Tracking UX)
- @../product-manager/analysis.md (Section 2: Feature Priority Matrix)

## 7. Cross-Feature Dependencies

- **Depends on**: None (foundational feature)
- **Required by**: F-002 (sync toggle needs dirty keys to know what to gate), F-006 (save notification needs dirty count)
- **Shared patterns**: DirtyMap pattern can be reused for Preferences and Advanced tabs
