# Tasks: Config Simplification

## Phase 1: Foundation (P0)

- [x] **IMPL-001**: Frontend dirty state tracking and explicit save button (F-001) → [📋](./.task/IMPL-001.json) | [✅](./.summaries/IMPL-001-summary.md)
- [ ] **IMPL-002**: Backend dirtyKeys processing and sync result response (F-001 backend) → [📋](./.task/IMPL-002.json)

## Phase 2: Core Features (P0)

- [ ] **IMPL-003**: Sync toggle control and core config classification (F-002 + F-003) → [📋](./.task/IMPL-003.json)

## Phase 3: Dependent Features (P1)

- [ ] **IMPL-004**: Profile switch with full settings.json replacement (F-004) → [📋](./.task/IMPL-004.json)

## Phase 4: Polish (P2, parallel)

- [ ] **IMPL-005**: VSCode settings.json description and ordering optimization (F-005) → [📋](./.task/IMPL-005.json)

## Phase 5: UX Feedback (P2)

- [ ] **IMPL-006**: Save status notification and external change detection (F-006) → [📋](./.task/IMPL-006.json)

## Dependency Chain

```
IMPL-001 → IMPL-002 → IMPL-003 → IMPL-004
                                    ↘
IMPL-005 ──────────────────────────→ IMPL-006
```

## Status Legend

- `- [ ]` = Pending task
- `- [x]` = Completed task
