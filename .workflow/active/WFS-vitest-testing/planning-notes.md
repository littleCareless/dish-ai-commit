# Planning Notes

**Session**: WFS-vitest-testing
**Created**: 2026-04-10

## User Intent (Phase 1)

- **GOAL**: Add comprehensive Vitest unit testing system for AI Provider, SCM, Configuration/Settings, and Command Orchestration layers
- **KEY_CONSTRAINTS**:
  - MUST use existing Vitest framework
  - MUST mock all external dependencies (VS Code API, AI services, file system)
  - MUST be runnable in CI without VS Code instance
  - MUST NOT modify production code for testability (unless minimal)
  - SHOULD follow existing test patterns in src/scm/**tests**/setup.ts
  - SHOULD achieve fast test execution (< 30s total)

---

## Context Findings (Phase 2)

- **CRITICAL_FILES**: src/scm/**tests**/setup.ts, vitest.config.ts, streaming-generation-helper.ts, multi-repository-context-manager.ts
- **ARCHITECTURE**: dependency-injection, strategy-pattern, factory-pattern, event-driven, singleton
- **CONFLICT_RISK**: low (test-only changes; only setup.ts modification in F-001 needs care)
- **CONSTRAINTS**: 20 existing tests must pass; test co-location pattern; vi.mock + vi.hoisted style
- **MOCK_NEEDED**: vscode API, child_process, AI SDKs, logger, notification, scm-detector

## Conflict Decisions (Phase 3)

(To be filled if conflicts detected)

## Consolidated Constraints (Phase 4 Input)

1. MUST use existing Vitest framework (already configured)
2. MUST mock all external dependencies (VS Code API, AI services, file system)
3. MUST be runnable in CI without VS Code instance
4. MUST NOT modify production code for testability (unless minimal)
5. SHOULD follow existing test patterns in src/scm/**tests**/setup.ts
6. SHOULD achieve fast test execution (< 30s total)
7. SHOULD organize tests mirroring source directory structure

---

## Task Generation (Phase 4)

- **Task Count**: 6 tasks (IMPL-001 through IMPL-006)
- **Execution Strategy**: Phased (4 phases: infrastructure -> P0 parallel -> P1 -> P2 parallel)
- **New Test Files**: 18 planned
- **Existing Test Files Extended**: 7
- **Complexity**: High
- **Estimated Effort**: 26-36 days

## N+1 Context

### Decisions

| Decision                             | Rationale                                                                         | Revisit? |
| ------------------------------------ | --------------------------------------------------------------------------------- | -------- |
| 6 tasks (not 7+ with merged P2)      | F-005 and F-006 have distinct scopes (AI vs services) that justify separate tasks | No       |
| IMPL-002/003 parallel after IMPL-001 | Both are P0 with independent scopes (commands vs scm)                             | No       |
| IMPL-005/006 parallel after IMPL-004 | Both are P2 with independent scopes (ai vs services)                              | No       |
| Extend existing setup.ts additively  | Preserves backward compatibility for 20 existing tests                            | No       |
| Skip individual provider tests       | Abstract base class covers 80%+ logic; individual providers are thin wrappers     | Yes      |

### Deferred

- [ ] E2E testing with live VS Code instance (out of scope)
- [ ] Performance/load testing
- [ ] Visual/UI testing for webview components
- [ ] Individual AI provider implementation tests (thin wrappers)
- [ ] 100% coverage target (pragmatic critical-path coverage)
- [ ] CI pipeline integration (tests are CI-ready but pipeline config not included)
