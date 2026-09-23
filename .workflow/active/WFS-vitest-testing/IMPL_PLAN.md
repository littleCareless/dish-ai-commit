# Implementation Plan: Vitest Testing System

**Session**: WFS-vitest-testing
**Created**: 2026-04-10
**Status**: Planning Complete

---

## 1. Overview

### Goal

Add comprehensive Vitest unit testing for regression protection across 4 core layers: AI Provider, SCM, Configuration/Settings, and Command Orchestration. The system uses shared test infrastructure (mock factories, fixtures, helpers) to minimize duplication and ensure all tests run in CI without a VS Code instance.

### Scope

- **6 features** mapped to **6 implementation tasks**
- **18 new test files**, **7 existing test files extended**
- **4 modules covered**: commands/generate-commit, scm, config, ai/services
- **20 existing test files** must continue passing (zero regression)

### Complexity Assessment

**High** -- 30+ source files to test, complex mock requirements (VS Code API, AI SDKs, child_process), multi-module coverage across 4 layers with dependency injection patterns.

---

## 2. Architecture & Approach

### Execution Strategy: Phased

```
Phase 1 (Infrastructure)    Phase 2 (P0 Critical)      Phase 3 (P1 Config)       Phase 4 (P2 Services)
┌─────────────┐            ┌──────────┬──────────┐    ┌──────────────┐          ┌──────────┬──────────┐
│  IMPL-001   │───────────>│ IMPL-002 │ IMPL-003 │───>│   IMPL-004   │─────────>│ IMPL-005 │ IMPL-006 │
│ Test Infra  │            │ Commit   │ SCM Layer│    │ Config/      │          │ AI Prov  │ Services │
│ (1-2 days)  │            │ (8-10 d) │ (6-8 d)  │    │ Settings     │          │ (3-4 d)  │ (3-5 d)  │
└─────────────┘            └──────────┴──────────┘    │ (5-7 days)   │          └──────────┴──────────┘
                                    parallel                   │                       parallel
                                                     └──────────────┘
```

### Mock Architecture (4 External Dependency Surfaces)

| Surface        | Mock Strategy                            | Shared Factory                         |
| -------------- | ---------------------------------------- | -------------------------------------- |
| VS Code API    | vi.mock('vscode') with extended setup.ts | `src/__tests__/mocks/vscode.ts`        |
| AI SDKs        | vi.mock for provider SDK clients         | `src/__tests__/mocks/ai-providers.ts`  |
| SCM Operations | vi.mock('child_process') for execSync    | `src/__tests__/mocks/scm-providers.ts` |
| Configuration  | vi.mock with controlled config values    | `src/__tests__/mocks/configuration.ts` |

### Test Organization Pattern

Tests mirror source directory structure using `__tests__` co-location:

```
src/<module>/__tests__/<source-name>.test.ts
```

---

## 3. Task Summary

| Task ID  | Title                      | Priority | Depends On   | Effort | New Files | Modified Files |
| -------- | -------------------------- | -------- | ------------ | ------ | --------- | -------------- |
| IMPL-001 | Shared Test Infrastructure | P0       | --           | 1-2 d  | 11        | 1              |
| IMPL-002 | Commit Generation Pipeline | P0       | IMPL-001     | 8-10 d | 0         | 5              |
| IMPL-003 | SCM Layer (Git/SVN)        | P0       | IMPL-001     | 6-8 d  | 4         | 1              |
| IMPL-004 | Configuration/Settings     | P1       | IMPL-002,003 | 5-7 d  | 5         | 0              |
| IMPL-005 | AI Provider Layer          | P2       | IMPL-004     | 3-4 d  | 4         | 0              |
| IMPL-006 | Service Layer              | P2       | IMPL-004     | 3-5 d  | 2         | 1              |

**Totals**: 6 tasks, 26 new files, 8 modified files, 26-36 days estimated effort

---

## 4. Task Details

### IMPL-001: Shared Test Infrastructure Layer

**Priority**: P0 (Prerequisite)
**Status**: Pending
**Effort**: 1-2 days

Build shared test infrastructure including VS Code API mock extensions, 6 mock factory modules, 3 data fixture modules, and 2 helper modules. All subsequent tasks depend on this.

**Deliverables**:

- Extended `src/scm/__tests__/setup.ts` with complete VS Code API coverage
- 6 mock factories: `vscode.ts`, `ai-providers.ts`, `scm-providers.ts`, `configuration.ts`, `logger.ts`, `notification.ts`
- 3 fixtures: `diff-samples.ts`, `commit-messages.ts`, `config-states.ts`
- 2 helpers: `mock-context.ts`, `di-helpers.ts`

**Acceptance**: 20 existing tests still pass, all mock factories importable

---

### IMPL-002: Commit Generation Pipeline Tests

**Priority**: P0 (Highest regression risk)
**Status**: Pending
**Effort**: 8-10 days
**Depends on**: IMPL-001

Expand existing tests for streaming-generation-helper (system prompt hash, diff parsing, error mapping), commit-generation-orchestrator (cross-repo scenarios, crash fallback), generate-commit-command (summary notifications), and layered-commit-handler (diff extraction).

**Deliverables**:

- 4 existing test files expanded with new test scenarios
- 1 existing test file verified (function-calling-handler)

**Acceptance**: streaming-generation-helper coverage >= 80%, all cross-repo scenarios covered, error mapping tested for all ResultTypes

---

### IMPL-003: SCM Layer Tests (Git/SVN)

**Priority**: P0 (Zero-test SVN modules)
**Status**: Pending
**Effort**: 6-8 days
**Depends on**: IMPL-001

Create new tests for smart-diff-selector (4 target modes), staged-content-detector (3 detection scenarios), SVN provider/diff-helper (currently 0 tests), and extend multi-repository-context-manager with path boundary safety tests.

**Deliverables**:

- 4 new test files: smart-diff-selector, staged-content-detector, svn-provider, svn-diff-helper
- 1 existing test file expanded: multi-repository-context-manager

**Acceptance**: SVN from 0 to basic coverage, path boundary edge cases tested, all target modes covered

---

### IMPL-004: Configuration/Settings Layer Tests

**Priority**: P1
**Status**: Pending
**Effort**: 5-7 days
**Depends on**: IMPL-002, IMPL-003

Create tests for configuration-monitor (6 key routing scenarios), settings-sync-service (6 sync scenarios including anti-loop), and features-settings-manager (3 default merging scenarios). Optional: config-service and profile-manager tests.

**Deliverables**:

- 3 MUST-have test files: configuration-monitor, settings-sync-service, features-settings-manager
- 2 SHOULD-have test files: configuration-service, profile-manager-service

**Acceptance**: Config key routing fully tested, anti-loop protection verified, default merging covered

---

### IMPL-005: AI Provider Layer Tests

**Priority**: P2
**Status**: Pending
**Effort**: 3-4 days
**Depends on**: IMPL-004

Create tests for ai-provider-factory (parameterized 20+ provider mappings, sensitive value masking), abstract-ai-provider (7 generation method variants via concrete stub), and model-registry services (catalog sync, validation).

**Deliverables**:

- 4 new test files: ai-provider-factory, abstract-provider-stub, model-catalog-service, model-validator

**Acceptance**: All factory switch cases covered, sensitive masking edge cases tested, generation method variants covered

---

### IMPL-006: Service Layer Tests (Prompt/Cache/Command Parser)

**Priority**: P2
**Status**: Pending
**Effort**: 3-5 days
**Depends on**: IMPL-004

Create tests for prompt-manager-service (template loading, variable substitution, fallback), commit-cache-service (extend with invalidation and size limit), and command-parser (parsing, argument extraction, edge cases).

**Deliverables**:

- 2 new test files: prompt-manager-service, command-parser
- 1 existing test file extended: commit-cache-service

**Acceptance**: Template loading and variable substitution tested, cache invalidation covered, command parsing edge cases handled

---

## 5. Dependency Graph

```
IMPL-001 (Infrastructure)
    ├──> IMPL-002 (Commit Gen) ──┐
    └──> IMPL-003 (SCM Layer) ───┤
                                 ├──> IMPL-004 (Config) ──┬──> IMPL-005 (AI Provider)
                                 │                        └──> IMPL-006 (Services)
                                 │                              (parallel)
```

**Parallelization opportunities**:

- IMPL-002 and IMPL-003 can run in parallel after IMPL-001
- IMPL-005 and IMPL-006 can run in parallel after IMPL-004

---

## 6. Constraints & Conventions

### Hard Constraints (from planning-notes.md)

1. MUST use existing Vitest framework (already configured)
2. MUST mock all external dependencies (VS Code API, AI services, file system)
3. MUST be runnable in CI without VS Code instance
4. MUST NOT modify production code for testability (unless minimal)
5. MUST NOT break existing 20 test files

### Test Conventions (from existing patterns)

- **Mock style**: `vi.mock()` + `vi.hoisted()` for complex inter-dependent mocks
- **Assertion style**: `expect()` with `toEqual`, `toBe`, `toHaveBeenCalledWith`
- **Import style**: `import { describe, it, expect, vi, beforeEach } from 'vitest'`
- **Timeout**: 10s default test, 5s hooks
- **Organization**: `__tests__` directories alongside source files

---

## 7. Risk Mitigation

| Risk                                                 | Severity | Mitigation                                                                  |
| ---------------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| Extending setup.ts breaks existing tests             | Medium   | Additive-only changes; run full suite after modification                    |
| ConfigurationMonitor singleton requires special init | Medium   | Research constructor deps, use DI helpers from IMPL-001                     |
| AbstractAIProvider complex constructor deps          | Medium   | Create minimal stub with only required methods                              |
| Existing test mock setup conflicts with shared mocks | Low      | Use vi.hoisted() pattern; shared mocks provide defaults, per-test overrides |

---

## 8. Success Criteria

1. Each core module has unit tests covering critical paths
2. All tests runnable in CI without VS Code instance
3. Test execution completes in < 30 seconds
4. Total test file count: 25+ (20 existing + 18 new - overlap)
5. Zero regression in existing 20 test files
6. Test code follows existing patterns and conventions

---

## Quality Gate Status

- [x] Context loaded from session metadata, planning-notes, context-package
- [x] Feature specs analyzed for all 6 features
- [x] Existing test patterns analyzed (vi.mock + vi.hoisted style)
- [x] Task JSONs generated with quantified acceptance criteria
- [x] plan.json with dependency graph and execution phases
- [x] TODO_LIST.md with proper linking
- [x] No circular dependencies in task chain
