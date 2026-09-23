# Feature Spec: F-005 - VSCode Settings Description Optimization

**Priority**: Medium
**Contributing Roles**: ux-expert
**Status**: Draft (from synthesis)

## 1. Requirements Summary

- The system MUST add `order` property to all configuration entries in package.json for logical grouping
- Configuration descriptions MUST be improved for better discoverability in VSCode Settings Editor
- Descriptions SHOULD indicate which settings are also configurable via Webview UI

## 2. Design Decisions

### Decision 2.1: Configuration Ordering

- **Decision**: All `contributes.configuration` entries MUST include `order` property for logical grouping
- **Context**: Currently VSCode displays settings alphabetically, mixing base/providers/features randomly
- **Chosen Approach**:
  - `base.*` properties: order 1-10
  - `providers.*` properties: order 11-40
  - `features.commitFormat.*`: order 41-50
  - `features.codeAnalysis.*`: order 51-60
  - `features.commitMessage.*`: order 61-70
  - `features.branchName.*`: order 71-80
  - `features.prSummary.*`: order 81-90
- **Trade-offs**: Manual ordering requires maintenance when adding new configs. Acceptable because config changes are infrequent.
- **Source**: ux-expert

### Decision 2.2: Description Enhancement

- **Decision**: Configuration descriptions MUST be improved with context about the Webview UI relationship
- **Chosen Approach**: Add brief note to key settings: "Also configurable in the extension's sidebar settings panel."
- **Source**: ux-expert

## 3. Interface Contract

No code interface changes — purely `package.json` metadata updates.

## 4. Constraints & Risks

- **Risk**: `order` property is a VSCode convention but not formally documented in all versions. Test on VSCode 1.85+.
- **Scope**: Only affects VSCode Settings Editor display, no runtime behavior change

## 5. Acceptance Criteria

- [ ] VSCode Settings Editor displays dish-ai-commit settings in logical groups (base → providers → features)
- [ ] Key settings include note about Webview UI availability
- [ ] No regression in existing settings display

## 6. Detailed Analysis References

- @../ux-expert/analysis.md (Section 4: Information Architecture)

## 7. Cross-Feature Dependencies

- **Depends on**: None
- **Required by**: None
- **Shared patterns**: None (pure metadata change)
