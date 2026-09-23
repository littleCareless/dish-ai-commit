# 配置同步优化 - Confirmed Guidance Specification

**Metadata**: 2026-04-09 | type: brainstorming | focus: 配置系统优化 | roles: system-architect, ux-expert, product-manager

## 1. Project Positioning & Goals

**CONFIRMED Objectives**: 修复插件配置的"默认值污染"问题——Webview UI保存时不应写入未修改的默认值到settings.json，同时保持双向配置支持（Webview UI + VSCode原生设置编辑器对等使用）。

**CONFIRMED Success Criteria**:

- settings.json中不再出现用户未修改的默认配置值
- 核心配置（provider、API key）始终可从settings.json编辑
- 功能配置通过全局开关控制是否同步到settings.json
- Webview UI保存仅发送用户实际修改的字段
- Profile切换时settings.json配置正确替换

## 2. Concepts & Terminology

**Core Terms**: The following terms are used consistently throughout this specification.

| Term                   | Definition                                              | Aliases                   | Category |
| ---------------------- | ------------------------------------------------------- | ------------------------- | -------- |
| Webview Settings UI    | 插件自建的侧边栏配置界面（React渲染）                   | 菜单配置、Settings View   | 配置界面 |
| VSCode Settings Editor | VSCode内置的settings.json编辑器，支持JSON和GUI模式      | 原生设置、Native Settings | 配置界面 |
| globalState            | VSCode扩展的持久化存储（非settings.json），运行时源数据 | 扩展内部存储              | 存储层   |
| settings.json          | VSCode用户/工作区配置文件，仅存储用户修改过的配置值     | 用户配置文件              | 存储层   |
| SettingsSyncService    | 双向同步服务，在globalState与settings.json之间同步      | 同步服务                  | 基础设施 |
| Dirty State Tracking   | 前端追踪用户实际修改的配置字段                          | 变更追踪                  | 前端机制 |
| Sync Toggle            | 全局开关，控制功能配置是否写入settings.json             | 同步开关                  | 控制机制 |
| Default Value Spill    | 未修改的默认值被写入settings.json的问题                 | 默认值污染                | 问题域   |
| Core Config            | 核心配置（provider、API key、base设置），始终同步       | 必选配置                  | 配置分类 |
| Feature Config         | 功能开关和偏好设置，受Sync Toggle控制                   | 可选配置                  | 配置分类 |

**Usage Rules**:

- All documents MUST use the canonical term
- Aliases are for reference only
- New terms introduced in role analysis MUST be added to this glossary

## 3. Non-Goals (Out of Scope)

The following are explicitly OUT of scope for this project:

- **不删除Webview UI**: Webview Settings UI保留不变，继续作为主要配置入口
- **不改变Provider/API Key配置方式**: 敏感配置继续使用secrets storage
- **不改变globalState存储架构**: globalState作为运行时源数据存储保持不变
- **不强制用户只能使用一种配置方式**: 双编辑器对等支持
- **不重新设计配置分类体系**: 保持现有的base/providers/features分类

**Rationale**: These exclusions maintain stability of the existing system while focusing on the core problem of settings.json pollution.

## 4. system-architect Decisions

### SELECTED Choices

**配置存储架构**: globalState主 + 可选视图

- The system MUST keep globalState as the runtime source of truth
- The system MUST treat settings.json as an optional "view layer" controlled by sync toggle
- The system SHOULD NOT change the read paths from globalState

**变更粒度**: 仅发送变更字段

- The Webview UI frontend MUST track dirty state for each configuration field
- The save operation MUST only send user-modified fields to the backend
- The backend MUST NOT assume all fields are present in the save request

**Profile切换同步**: 全量替换

- The system MUST clear all plugin-related entries from settings.json on profile switch
- The system MUST then write only the new profile's non-default values
- The system SHOULD perform the replacement as an atomic operation

### Cross-Role Considerations

**核心配置始终同步**: Core configs (provider, API key, base settings) MUST always sync to settings.json regardless of toggle state. This ensures users who prefer editing settings.json directly can always access core configuration.

## 5. ux-expert Decisions

### SELECTED Choices

**同步控制方式**: 显式开关

- The system MUST provide a global sync toggle in the Webview UI
- The toggle MUST default to OFF for new users
- The toggle label SHOULD clearly indicate "同步配置到settings.json"

**双编辑器体验**: 优化描述

- The system SHOULD improve configuration descriptions in package.json for better discoverability in VSCode Settings Editor
- The system SHOULD ensure configuration grouping is logical and consistent

**保存反馈**: 状态通知

- The system MUST show "已保存到插件存储" after Webview UI save
- The system SHOULD show "已同步到settings.json" when sync toggle is enabled and sync completes
- The system MAY show the count of changed fields

## 6. product-manager Decisions

### SELECTED Choices

**迁移策略**: 渐进式

- New users MUST have sync toggle default OFF
- Existing users MUST keep their current behavior (sync enabled) during migration
- Existing users MAY manually disable the sync toggle
- The system SHOULD detect and preserve existing settings.json values during migration

**配置分层**: 核心必选 + 功能可选

- Core configs (provider, API key, base.language, base.provider, base.model) MUST always sync to settings.json
- Feature configs (toggles, preferences, advanced settings) MUST be controlled by sync toggle
- The sync toggle MUST NOT affect core config synchronization

**实施优先级**: 核心问题优先

- P0 (MUST implement first): Dirty state tracking (F-001) + Sync toggle control (F-002) + Core config always sync (F-003)
- P1 (SHOULD implement next): Profile switch replacement (F-004)
- P2 (MAY implement later): VSCode settings description (F-005) + Save status notification (F-006)

## 7. Cross-Role Integration

**CONFIRMED Integration Points**:

- Frontend dirty tracking (F-001) feeds into backend sync service via partial updates
- Sync toggle (F-002) gates the SettingsSyncService's `syncFeaturesToSettingsJson` path
- Core config always sync (F-003) bypasses the sync toggle check
- Profile switch (F-004) respects sync toggle state for feature configs
- VSCode settings descriptions (F-005) improve the native editing experience without code changes to sync logic

## 8. Risks & Constraints

**Identified Risks**:

1. Dirty state tracking in React frontend adds complexity → Mitigate: Use a lightweight dirty map pattern
2. Existing users may not discover the sync toggle → Mitigate: Show migration notification on first upgrade
3. Profile switch with sync OFF may confuse users expecting settings.json to update → Mitigate: Clear notification about sync state

**Constraints**:

- MUST NOT break backward compatibility with existing settings.json values
- MUST support both global and workspace scope for configuration
- The sync toggle MUST be stored in globalState, not settings.json (to avoid circular dependency)

## Feature Decomposition

**Constraints**: Max 8 features | Each independently implementable | ID format: F-{3-digit}

| Feature ID | Name                        | Description                                                        | Related Roles                                | Priority |
| ---------- | --------------------------- | ------------------------------------------------------------------ | -------------------------------------------- | -------- |
| F-001      | dirty-state-tracking        | Webview UI前端追踪变更字段，保存时仅发送dirty字段到后端            | system-architect, ux-expert                  | High     |
| F-002      | sync-toggle-control         | 全局同步开关，控制功能配置是否写入settings.json，默认关闭          | system-architect, ux-expert, product-manager | High     |
| F-003      | core-config-always-sync     | 核心配置（provider、API key）始终同步到settings.json，不受开关影响 | system-architect, product-manager            | High     |
| F-004      | profile-switch-replacement  | Profile切换时全量替换settings.json中的配置，清理旧值               | system-architect                             | Medium   |
| F-005      | vscode-settings-description | 优化package.json中配置项的描述、分组和排序                         | ux-expert                                    | Medium   |
| F-006      | save-status-notification    | 配置保存后的状态通知（"已保存" + "已同步到settings.json"）         | ux-expert                                    | Low      |

## Next Steps

**Automatic Continuation** (auto mode):

- Auto mode assigns agents for role-specific analysis
- Each selected role gets conceptual-planning-agent
- Agents read this guidance-specification.md for context

## Appendix: Decision Tracking

| Decision ID | Category         | Question           | Selected                                                    | Phase | Rationale                                   |
| ----------- | ---------------- | ------------------ | ----------------------------------------------------------- | ----- | ------------------------------------------- |
| D-001       | Intent           | 核心痛点场景       | 全场景（全量写入、同步不一致、原生编辑器体验、Profile切换） | 1     | 用户反馈多个配置问题并存                    |
| D-002       | Intent           | 理想配置行为       | 可选同步                                                    | 1     | 用户希望自主控制同步行为                    |
| D-003       | Intent           | 用户群体使用模式   | 对等使用                                                    | 1     | Webview和settings.json都需要完全支持        |
| D-004       | Roles            | 角色选择           | system-architect, ux-expert, product-manager                | 2     | 覆盖架构设计、用户体验、产品策略            |
| D-005       | system-architect | 配置存储架构       | globalState主 + 可选视图                                    | 3     | 保持运行时稳定性，settings.json作为可选视图 |
| D-006       | system-architect | 变更粒度           | 仅发送变更字段                                              | 3     | 从源头减少不必要的数据传输                  |
| D-007       | system-architect | Profile切换同步    | 全量替换                                                    | 3     | 确保Profile切换后settings.json干净          |
| D-008       | ux-expert        | 同步控制方式       | 显式开关                                                    | 3     | 用户明确控制，不自动猜测                    |
| D-009       | ux-expert        | 双编辑器体验       | 优化描述                                                    | 3     | 低成本改善原生设置编辑器体验                |
| D-010       | ux-expert        | 保存反馈           | 状态通知                                                    | 3     | 用户需要知道配置去向                        |
| D-011       | product-manager  | 迁移策略           | 渐进式                                                      | 3     | 新老用户平滑过渡                            |
| D-012       | product-manager  | 配置分层           | 核心必选 + 功能可选                                         | 3     | 保证核心配置可发现性                        |
| D-013       | product-manager  | 实施优先级         | 核心问题优先（P0→P1→P2）                                    | 3     | 聚焦最大痛点                                |
| D-014       | Cross-Role       | 开关与核心配置冲突 | 分层控制                                                    | 4     | 核心配置始终同步，功能配置受开关控制        |
| D-015       | Cross-Role       | 开关粒度           | 全局开关                                                    | 4     | 简单直观，一次设置全局生效                  |
