# Review Report: Quality

**Session**: WFS-config-simplification
**Date**: 2026-04-09
**Type**: quality

## Summary

- Tasks Reviewed: 6 (IMPL-001 through IMPL-006)
- Files Changed: 14 (+622/-227 lines)
- Overall Severity: **HIGH** (2 critical, 4 high issues require fixing)

## Critical Issues

### C-1: Race Condition in useEffect Message Handler

- **File**: webview-ui/src/pages/settings/FeaturesSettings.tsx:172
- **Issue**: useEffect dependency array `[t]` doesn't include state setters used in handleMessage (setSyncEnabled, setExternalChanges, setSaveStatus, syncEnabled). Creates stale closure.
- **Fix**: Add missing dependencies or use useCallback

### C-2: Memory Leak in saveStatus Timer

- **File**: webview-ui/src/pages/settings/FeaturesSettings.tsx:124-130
- **Issue**: Timer fires setSaveStatus after component unmount, causing React memory leak warnings
- **Fix**: Track mounted state or clear timer in cleanup

## High Issues

### H-1: Unsafe External Callback in ConfigurationMonitor

- **File**: src/config/services/configuration-monitor.ts:81
- **Issue**: `onExternalFeaturesChange` callback can throw and crash the monitor
- **Fix**: Wrap in try-catch

### H-2: Unhandled Promise Rejection in syncFromSettingsJson

- **File**: src/config/services/settings-sync-service.ts:133-163
- **Issue**: Errors only logged to console, not propagated to caller
- **Fix**: Return error status or re-throw

## Medium Issues

### M-1: Type Safety - dirtyKeys Array Validation

- **File**: src/services/webview/handlers/settings/features-message-handler.ts:60-64
- **Fix**: Add `Array.isArray(dirtyKeys)` validation

### M-2: Premature Dirty State Clearing

- **File**: webview-ui/src/pages/settings/FeaturesSettings.tsx:204-212
- **Issue**: dirtyFields cleared immediately on save, not after confirmation
- **Fix**: Clear only after backend success response

### M-3: Inconsistent Error Handling in FeaturesSettingsManager

- **File**: src/services/settings/features-settings-manager.ts:183-195
- **Issue**: Returns undefined on error instead of SyncResult

### M-4: Missing Null Guard in SettingsViewProvider

- **File**: src/webview/settings-view-provider.ts:106-113
- **Issue**: this.\_view could become null between check and postMessage

## Positive Observations

- Clean separation of sync service from settings managers
- Anti-loop protection via \_syncSource tracking is well-implemented
- Sync toggle stored correctly in globalState (avoiding circular dependency)
- Two-phase profile switch ensures clean state
- Proper backward compatibility (dirtyKeys optional everywhere)
- Good i18n support for new UI strings

## Action Items

- [ ] Fix C-1: useEffect dependency array in FeaturesSettings.tsx
- [ ] Fix C-2: Timer cleanup in FeaturesSettings.tsx
- [ ] Fix H-1: try-catch in ConfigurationMonitor callback
- [ ] Fix H-2: Error propagation in syncFromSettingsJson
- [ ] Fix M-1: dirtyKeys array validation
- [ ] Fix M-2: Delay dirty state clearing until save confirmation
