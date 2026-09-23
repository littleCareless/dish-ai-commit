# F-004: 配置/设置层测试

## Priority: P1

## Summary

为配置管理、设置同步、变更监听和 Profile 管理添加单元测试。

## Cross-Role Insights

- **Test Strategist**: 双向同步反循环保护是关键测试点，缺失会导致无限循环
- **System Architect**: ConfigurationMonitor 使用事件驱动模式，需要 mock `onDidChangeConfiguration` 来手动触发回调
- **Product Manager**: config 模块 41 次变更，0 测试 — 中等风险但完全未覆盖

## Requirements

### MUST

- **configuration-monitor.ts** (新增测试)
  - `handleConfigurationChange(["providers.openai.apiKey"])` 触发 provider sync
  - `handleConfigurationChange(["base.language"])` 触发 base config sync
  - `handleConfigurationChange(["features.enableEmoji"])` 触发 features sync
  - 混合 key 变更触发多个 handler
  - 未知 key 前缀不触发 handler
  - `onExternalFeaturesChange` 回调仅传递 feature keys
  - Dispose 清理所有事件监听器

- **settings-sync-service.ts** (新增测试)
  - `parseProviderKey("providers.openai.apiKey")` 解析正确
  - `parseProviderKey` 对非 sync 字段返回 null
  - `isCoreConfigKey` / `isFeatureConfigKey` 分类正确
  - `syncFromSettingsJson` 将变更值写入 secrets
  - `syncToSettingsJson` 仅写入非默认 feature 值
  - 反循环保护 (`_syncSource` 追踪)

- **features-settings-manager.ts** (新增测试)
  - 缺失 key 应用默认设置
  - `getSettings()` 返回合并的 defaults + stored
  - `updateSettings()` 持久化并触发 sync

### SHOULD

- **configuration-manager.ts** — 单例模式、dispose 测试
- **configuration-service.ts** — 基础读写测试
- **provider-config-validator.ts** — Provider 配置验证
- **profile-manager-service.ts** — Profile CRUD 操作

## Mock Strategy

- `vscode.workspace.onDidChangeConfiguration` (提供触发机制)
- `vscode.workspace.getConfiguration` (返回受控配置值)
- `@/services/profile-manager/profile-manager-service`
- `@/utils/logger`
- `createMockContext()` 用于 ExtensionContext

## Estimated Effort

5-7 天

## Test Organization

```
src/config/services/__tests__/
  configuration-monitor.test.ts           # NEW
  settings-sync-service.test.ts           # NEW
  configuration-change-handler.test.ts    # NEW
  configuration-service.test.ts           # NEW
  provider-config-validator.test.ts       # NEW
src/services/settings/__tests__/
  features-settings-manager.test.ts       # NEW
src/services/profile-manager/__tests__/
  profile-manager-service.test.ts         # NEW
```

## Acceptance Criteria

- [ ] configuration-monitor 覆盖所有 key 类型的路由
- [ ] settings-sync-service 反循环保护有测试
- [ ] features-settings-manager 默认值合并有测试
- [ ] 所有配置测试使用共享 Mock，无 VS Code 依赖
