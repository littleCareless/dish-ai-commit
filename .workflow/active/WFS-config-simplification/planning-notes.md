# Planning Notes

**Session**: WFS-config-simplification
**Created**: 2026-04-09
**Status**: Re-planning from completed brainstorm session

## User Intent (Phase 1)

- **GOAL**: Unify webview UI and settings.json configuration experience for consistent plugin usage across both user groups
- **KEY_CONSTRAINTS**: VSCode extension has two separate configuration paths - webview UI users and settings.json users. Need bidirectional sync so both groups have identical experience.

## Prior Brainstorm Context

Session completed brainstorming with 6 features generated:

- **F-001**: dirty-state-tracking (High) - Track which fields user actually modified
- **F-002**: sync-toggle-control (High) - User control over sync behavior
- **F-003**: core-config-always-sync (High) - Core configs always synced
- **F-004**: profile-switch-replacement (Medium) - Replace profile switch
- **F-005**: vscode-settings-description (Medium) - Description in settings.json
- **F-006**: save-status-notification (Low) - Notification on save

---

## Context Findings (Phase 2)

- **CRITICAL_FILES**: src/config/services/settings-sync-service.ts, src/services/settings/features-settings-manager.ts, src/services/webview/handlers/settings/features-message-handler.ts, src/config/services/configuration-monitor.ts, webview-ui/src/pages/settings/FeaturesSettings.tsx
- **ARCHITECTURE**: Singleton pattern, Message-passing (webview↔extension), Observer pattern, Bidirectional sync with anti-loop protection
- **CONFLICT_RISK**: low (brainstorm resolved all decisions; changes are additive)
- **CONSTRAINTS**: Backward compatibility required; globalState as source of truth; API keys in Secret Storage; dirtyKeys optional for compat

## Conflict Decisions (Phase 3)

(To be filled if conflicts detected)

## Consolidated Constraints (Phase 4 Input)

1. Must support both webview UI and settings.json users with identical experience
2. Bidirectional sync required between webview UI and settings.json
3. Must not pollute settings.json with unchanged default values
4. [Context] Backward compatibility - dirtyKeys optional, old frontends work without it
5. [Context] globalState remains runtime source of truth, settings.json as optional view
6. [Context] Sync toggle stored in globalState (not settings.json) to avoid circular dependency
7. [Context] API keys remain in Secret Storage, not settings.json directly
8. [Context] Core config (base._, providers._) always syncs regardless of toggle

---

## Task Generation (Phase 4)

(To be filled by action-planning-agent)

## N+1 Context

### Decisions

| Decision                             | Rationale                                      | Revisit?                         |
| ------------------------------------ | ---------------------------------------------- | -------------------------------- |
| Set<string> for dirty tracking       | Simple O(1) lookup; React state manages values | No                               |
| dirtyKeys as optional parallel field | Backward compatible; old frontends omit it     | No                               |
| Sync toggle in globalState           | Avoids circular dependency with settings.json  | No                               |
| Prefix-based config classification   | Simple and maintainable; auto-handles new keys | Yes (if granular control needed) |
| Two-phase profile switch             | Ensures clean state; globalState as fallback   | No                               |
| Inline webview notifications         | Non-disruptive vs vscode.window popups         | No                               |
| IMPL-005 parallel execution          | No code dependencies on other tasks            | No                               |

### Deferred

- [ ] DirtyMap reuse for Preferences and Advanced tabs (N+1)
- [ ] Rate limiting for external change notifications (debounce > 5s) (N+1)
- [ ] "Clean settings.json" action using clear pattern from F-004 (N+1)
