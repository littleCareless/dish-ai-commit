# F-005: AI Provider 层测试

## Priority: P2

## Summary

为 AI Provider 工厂、抽象基类和模型注册服务添加单元测试。个体 Provider 实现为薄封装，由基类测试覆盖共享行为。

## Cross-Role Insights

- **Test Strategist**: Factory 35+ switch cases 是回归高风险区；AbstractAIProvider 7 个生成方法有细微差异
- **System Architect**: 需要创建 MockAIProvider 工厂实现 AIProvider 接口
- **Product Manager**: Provider 层 174 次变更但仅 1 次 bug fix，ROI 中等

## Requirements

### MUST

- **ai-provider-factory.ts** (372 行, 新增测试)
  - 所有 20+ provider 类型映射到正确 Provider 类（参数化测试）
  - OpenAI 兼容 providers 传递正确的 providerId/providerName
  - 未知 provider 类型抛出错误（i18n 消息）
  - `sanitizeConfigForLog` 屏蔽敏感 key（apiKey, token, secret, password）
  - `maskSensitiveValue` 处理短字符串(≤8)、长字符串、非字符串值
  - `getAllProviders()` 返回正确数量的 provider

- **abstract-ai-provider.ts** (1,118 行, 新增测试)
  - 通过最小具体 stub 测试
  - `generateCommit()` 有/无 messages 的分支
  - `generateCommitStream()` 包装 stream iterator 并记录 token usage
  - `generateCommitWithFunctionCalling()` 工具调用格式化和回退
  - `handleContextLengthError()` 已知/未知模式处理

- **model-registry services** (新增测试)
  - model-catalog-service — 目录同步
  - model-validator — 模型验证
  - enhanced-model-fetcher — 增强获取

### SHOULD

- **config-parser.ts** — Provider 配置解析工具
- 不测试个体 Provider 实现（薄封装，基类覆盖 80%+ 逻辑）

## Mock Strategy

- `@/ai/utils/generate-helper` (getSystemPrompt 等)
- `@/services/core/token-stats-service` (TokenStatsService)
- `@/services/settings/preferences-settings-manager`
- `@/utils/i18n/localization-manager`
- `@/config/provider-definitions`

## Estimated Effort

3-4 天

## Test Organization

```
src/ai/__tests__/
  ai-provider-factory.test.ts             # NEW
  providers/__tests__/
    abstract-provider-stub.test.ts        # NEW
    config-parser.test.ts                 # NEW
  model-registry/__tests__/
    adaptive-model-limit-service.test.ts  # EXISTS
    model-catalog-service.test.ts         # NEW
    model-validator.test.ts               # NEW
    enhanced-model-fetcher.test.ts        # NEW
```

## Acceptance Criteria

- [ ] ai-provider-factory 覆盖所有 switch cases（参数化测试）
- [ ] abstract-ai-provider 覆盖 7 个生成方法的差异
- [ ] 敏感值屏蔽测试覆盖边界情况
- [ ] 错误处理路径有覆盖
