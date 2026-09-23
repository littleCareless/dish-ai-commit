# Task: IMPL-001 Frontend dirty state tracking and explicit save button (F-001)

## Implementation Summary

### Files Modified

- `webview-ui/src/pages/settings/FeaturesSettings.tsx`: Added dirty state tracking with useRef<Set<string>>, replaced auto-save-on-toggle with explicit Save button
- `src/services/webview/handlers/settings/features-message-handler.ts`: Strip dirtyKeys from message.data before passing to updateSettings for backward compatibility
- `webview-ui/src/i18n/locales/en/features-settings.json`: Added unsavedChanges and saveChanges translation keys
- `webview-ui/src/i18n/locales/zh-cn/features-settings.json`: Added unsavedChanges and saveChanges translation keys

### Content Added

- **dirtyFields ref** (`FeaturesSettings.tsx:137`): `useRef<Set<string>>(new Set())` for O(1) dirty field tracking
- **dirtyCount state** (`FeaturesSettings.tsx:138`): useState(0) to trigger re-renders when dirty count changes
- **handleChange()** (`FeaturesSettings.tsx:140-146`): Replaces handleFeatureToggle, updates local state and adds field to dirtyFields set
- **handleSave()** (`FeaturesSettings.tsx:161-169`): Sends postMessage with full features + dirtyKeys array, then clears dirty state
- **Save button banner** (`FeaturesSettings.tsx:192-201`): Conditionally rendered sticky bar with dirty count and Save button
- **dirtyKeys extraction** (`features-message-handler.ts:58-59`): Destructures dirtyKeys from message.data, reserved for IMPL-002 targeted sync

## Outputs for Dependent Tasks

### Available Components

```typescript
// Frontend dirty tracking pattern (FeaturesSettings.tsx)
const dirtyFields = useRef<Set<string>>(new Set());
const [dirtyCount, setDirtyCount] = useState(0);

// handleChange adds to dirty set and updates state
const handleChange = useCallback(
  (field: string, value: string | boolean | number) => {
    dirtyFields.current.add(field);
    setDirtyCount(dirtyFields.current.size);
    setFeatures((prev: any) => ({ ...prev, [field]: value }));
  },
  [],
);

// handleSave sends dirtyKeys to backend
const handleSave = useCallback(() => {
  const dirtyKeys = Array.from(dirtyFields.current);
  postMessage(UIRequest.FeaturesSaveSettings, { ...features, dirtyKeys });
  dirtyFields.current.clear();
  setDirtyCount(0);
}, [features]);
```

### Integration Points

- **Backend message handler**: `features-message-handler.ts` extracts `dirtyKeys` from `message.data` via destructuring. IMPL-002 should use `dirtyKeys` for targeted settings.json sync instead of full sync.
- **Translation keys**: `unsavedChanges` and `saveChanges` added to both en and zh-cn locale files with `{{count}}` interpolation.
- **Backward compatibility**: Save without `dirtyKeys` works identically - backend falls back to current full-sync behavior.

### Message Contract

```typescript
// Frontend -> Backend (FeaturesSaveSettings)
{
  command: "features.saveSettings",
  data: {
    ...FeaturesSettings,  // Full current values
    dirtyKeys: string[]   // Which fields user modified (NEW)
  }
}
```

## Status: Complete
