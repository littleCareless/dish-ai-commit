# Implementation Plan: Config Simplification

**Session**: WFS-config-simplification
**Created**: 2026-04-09
**Complexity**: Medium
**Estimated Time**: 3-4 days
**Task Count**: 6

---

## 1. Overview

Unify webview UI and settings.json configuration experience for the dish-ai-commit VSCode extension. The current system has two separate configuration paths that behave inconsistently. This plan introduces dirty state tracking, a sync toggle, core config classification, improved profile switching, settings.json descriptions, and save status notifications.

**Goal**: Both webview UI users and settings.json users have an identical, non-polluting configuration experience.

---

## 2. Architecture Context

### Current Architecture

- **Singleton pattern** for settings managers (FeaturesSettingsManager, SettingsSyncService)
- **Message-passing** between webview and extension (UIRequest / ExtensionResponse enums)
- **Observer pattern** via ConfigurationMonitor for settings.json changes
- **Bidirectional sync** with anti-loop protection (\_syncSource tracking)
- **globalState** is runtime source of truth; settings.json is a "view"

### Key Files

| File                                                                 | Role                            |
| -------------------------------------------------------------------- | ------------------------------- |
| `src/config/services/settings-sync-service.ts`                       | Core bidirectional sync service |
| `src/services/settings/features-settings-manager.ts`                 | Feature settings storage        |
| `src/services/webview/handlers/settings/features-message-handler.ts` | Webview message handler         |
| `src/config/services/configuration-monitor.ts`                       | Config change listener          |
| `webview-ui/src/pages/settings/FeaturesSettings.tsx`                 | Frontend component              |
| `shared/types/messages.ts`                                           | Message type definitions        |

---

## 3. Constraints

1. Must support both webview UI and settings.json users with identical experience
2. Bidirectional sync required between webview UI and settings.json
3. Must not pollute settings.json with unchanged default values
4. Backward compatibility: dirtyKeys optional, old frontends work without it
5. globalState remains runtime source of truth, settings.json as optional view
6. Sync toggle stored in globalState (not settings.json) to avoid circular dependency
7. API keys remain in Secret Storage, not settings.json directly
8. Core config (base._, providers._) always syncs regardless of toggle

---

## 4. Task Summary

### Phase 1: Foundation (P0)

#### IMPL-001: Frontend dirty state tracking and explicit save button (F-001)

- **Scope**: webview-ui/src/pages/settings, shared/types/messages.ts
- **Depends on**: None (foundational)
- **Key changes**:
  - Add `useRef<Set<string>>` dirtyFields tracking in FeaturesSettings.tsx
  - Replace save-on-every-toggle with explicit "Save (N changes)" button
  - Save sends dirtyKeys array to backend
- **Acceptance**: Save button shows dirty count; dirtyKeys in postMessage; backward compatible

#### IMPL-002: Backend dirtyKeys processing and sync result response (F-001 backend)

- **Scope**: src/services/webview/handlers, src/config/services, src/services/settings
- **Depends on**: IMPL-001
- **Key changes**:
  - SettingsSyncService.syncFeaturesToSettingsJson accepts dirtyKeys parameter
  - Targeted sync: only sync specified dirty keys
  - FeaturesSettingsManager.updateSettings passes dirtyKeys through
  - Save response includes syncResult { synced, failed, skipped }
- **Acceptance**: Targeted sync when dirtyKeys provided; SyncResult in response; backward compatible

### Phase 2: Core Features (P0)

#### IMPL-003: Sync toggle control and core config classification (F-002 + F-003)

- **Scope**: src/config/services, webview-ui, shared/types
- **Depends on**: IMPL-002
- **Key changes**:
  - Add isCoreConfigKey/isFeatureConfigKey classification functions
  - Add sync toggle (globalState key: dish_config_sync_toggle)
  - Toggle ON -> immediate sync of non-default Feature Config
  - Toggle OFF -> stop sync, no deletion
  - Core config always syncs regardless of toggle
  - Toggle banner UI at top of Features tab
  - 2 new UIRequest values, 1 new ExtensionResponse value
- **Acceptance**: Core config syncs always; feature config gated by toggle; toggle UI visible

### Phase 3: Dependent Features (P1)

#### IMPL-004: Profile switch with full settings.json replacement (F-004)

- **Scope**: src/config/services
- **Depends on**: IMPL-003
- **Key changes**:
  - Two-phase profile switch: clear all -> write new
  - Core config always written; feature config respects toggle
  - Prevents stale entries from previous profiles
- **Acceptance**: Profile switch clears old entries; respects toggle and classification

### Phase 4: Polish (P2, parallel)

#### IMPL-005: VSCode settings.json description and ordering optimization (F-005)

- **Scope**: src/package.json
- **Depends on**: None (parallel task)
- **Key changes**:
  - Add `order` property to all configuration entries
  - Logical grouping: base -> providers -> features by subcategory
  - Enhanced descriptions with Webview UI availability notes
- **Acceptance**: Settings Editor shows logical groups; key settings mention Webview UI

### Phase 5: UX Feedback (P2)

#### IMPL-006: Save status notification and external change detection (F-006)

- **Scope**: webview-ui, src/config/services, shared/types
- **Depends on**: IMPL-003, IMPL-005
- **Key changes**:
  - Inline save confirmation: sync-aware messaging
  - External change detection via ConfigurationMonitor
  - Refresh banner when settings.json changes externally
  - 1 new ExtensionResponse value
- **Acceptance**: Save shows feedback; external changes trigger refresh banner

---

## 5. Dependency Graph

```
IMPL-001 (F-001 frontend)
    |
    v
IMPL-002 (F-001 backend)
    |
    v
IMPL-003 (F-002 + F-003) ----+
    |                         |
    v                         |
IMPL-004 (F-004)              |
                               |
IMPL-005 (F-005) -----------+ |
                             | |
                             v v
                          IMPL-006 (F-006)

IMPL-005 is independent (can run in parallel with IMPL-001..IMPL-003)
```

---

## 6. Execution Strategy

| Phase   | Tasks                | Strategy               | CLI Execution |
| ------- | -------------------- | ---------------------- | ------------- |
| Phase 1 | IMPL-001 -> IMPL-002 | Sequential (resume)    | new -> resume |
| Phase 2 | IMPL-003             | Sequential (resume)    | resume        |
| Phase 3 | IMPL-004             | Sequential (resume)    | resume        |
| Phase 4 | IMPL-005             | Parallel (new session) | new           |
| Phase 5 | IMPL-006             | Merge fork             | merge_fork    |

**Recommended order**: IMPL-001 -> IMPL-002 -> IMPL-003 -> IMPL-004 -> IMPL-006
**Parallel opportunity**: IMPL-005 can run independently at any point

---

## 7. Risk Assessment

| Risk                                     | Impact    | Mitigation                                     |
| ---------------------------------------- | --------- | ---------------------------------------------- |
| Reverted field stays dirty in dirtyKeys  | Low       | Sync service checks current === defaultValue   |
| Phase 2 fails during profile switch      | Low       | globalState has fallback data; next sync fixes |
| order property unsupported in old VSCode | Minimal   | Property is silently ignored                   |
| External change notification fatigue     | Low       | Debounce (max once per 5 seconds)              |
| Toggle circular dependency               | Prevented | Stored in globalState, not settings.json       |

---

## 8. Quality Gates

- [ ] All 6 task JSONs generated in `.task/` directory
- [ ] Each task has quantified acceptance criteria with verification commands
- [ ] No circular dependencies in task graph
- [ ] Backward compatibility preserved in all tasks
- [ ] IMPL-005 can execute independently (parallel-safe)
- [ ] All feature specs (F-001 through F-006) mapped to tasks
