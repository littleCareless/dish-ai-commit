# Feature Spec: F-006 - Save Status Notification

**Priority**: Low
**Contributing Roles**: ux-expert
**Status**: Draft (from synthesis)

## 1. Requirements Summary

- The system MUST show a save confirmation after Webview UI save
- The notification MUST be sync-aware: different messages when toggle ON vs OFF
- The notification SHOULD include the count of synced changes when applicable
- The system SHOULD detect external settings.json changes and prompt refresh (EP-002)

## 2. Design Decisions

### Decision 2.1: Two-Tier Feedback Pattern

- **Decision**: Use inline micro-feedback (checkmark animation) + sync-aware status notification
- **Context**: Users currently have no confirmation that their settings were persisted
- **Chosen Approach**:
  - Tier 1: Each switch shows brief checkmark after successful save
  - Tier 2: Status notification at bottom of webview:
    - Toggle OFF: "已保存到插件存储"
    - Toggle ON: "已保存到插件存储，并同步 N 项变更到 settings.json"
- **Trade-offs**: Slight increase in UI complexity, but builds user confidence and correct mental model
- **Source**: ux-expert

### Decision 2.2: External Change Detection (EP-002)

- **Decision**: When Webview is open and settings.json changes externally, show a refresh banner
- **Context**: Currently the Webview has no listener for external config changes
- **Chosen Approach**: `ConfigurationMonitor` detects external change → posts message to Webview → Webview shows banner "配置已外部更新，点击刷新"
- **Trade-offs**: Adds a communication channel between backend and Webview, but prevents stale UI state
- **Source**: ux-expert

## 3. Interface Contract

### Backend → Webview Notification Messages

```typescript
// Save confirmation
{
  command: ExtensionResponse.SaveCompleted,
  data: {
    savedToStorage: true,
    syncResult?: {
      synced: number,
      failed: string[],
      skipped: number
    }
  }
}

// External change detected
{
  command: ExtensionResponse.ExternalConfigChanged,
  data: {
    changedKeys: string[]
  }
}
```

## 4. Constraints & Risks

- **UX**: Notification must NOT use `vscode.window.showInformationMessage` (creates dismissable popup that interrupts workflow). Use inline webview notification.
- **Performance**: External change detection uses existing `ConfigurationMonitor` — no additional overhead
- **Risk**: Frequent external changes could cause notification fatigue. Mitigation: Debounce notifications (show at most once per 5 seconds)

## 5. Acceptance Criteria

- [ ] After save, user sees confirmation in Webview UI
- [ ] Confirmation message differs based on sync toggle state
- [ ] When sync is ON, message includes count of synced changes
- [ ] When settings.json changes externally while Webview is open, refresh banner appears

## 6. Detailed Analysis References

- @../ux-expert/analysis.md (Section 3: Save Feedback Design)

## 7. Cross-Feature Dependencies

- **Depends on**: F-001 (dirty count), F-002 (toggle state), EP-003 (sync result)
- **Required by**: None
- **Integration points**: FeaturesMessageHandler sends save confirmation with sync result
