# F-001: 共享测试基础设施层

## Priority: P0 (Prerequisite for all other features)

## Summary

建立共享测试基础设施，包括 VS Code API Mock、测试工具函数库、Mock 工厂、测试夹具，为所有模块测试提供统一基础。

## Cross-Role Insights

- **System Architect**: 需要分层 Mock 架构覆盖 4 个外部依赖面（VS Code API、AI SDK、SCM 操作、配置状态）
- **Test Strategist**: 现有 `src/scm/__tests__/setup.ts` 提供了基线，但缺少多个 VS Code API 面
- **Product Manager**: 基础设施投入 1-2 天，但为所有后续测试节省 30-40% 的重复代码

## Requirements

### MUST

- 扩展现有 `setup.ts` 覆盖完整 VS Code API 面
- 创建共享 Mock 工厂（Logger、Notification、AI Provider、SCM Provider、Config）
- 提取 `createMockContext()` 到共享位置（来自 adaptive-model-limit-service.test.ts）
- 所有 Mock 支持 TypeScript 类型检查（`satisfies Partial<typeof import("vscode")>`）

### SHOULD

- 组织测试工具到 `src/__tests__/test-helpers/` 目录
- 创建数据夹具（diff 样本、配置状态、提交消息）
- 统一 Logger 和 Notification Mock（目前每个测试文件重复定义）

## Implementation Scope

```
src/__tests__/
  setup.ts                    # 扩展全局 VS Code mock
  mocks/
    vscode.ts                 # 完整 VS Code API mock
    ai-providers.ts           # AI provider mock factory
    scm-providers.ts          # SCM provider mock factory
    configuration.ts          # Config manager mock factory
    logger.ts                 # Logger mock (共享)
    notification.ts           # Notification mock (共享)
  fixtures/
    diff-samples.ts           # Diff 样本数据
    commit-messages.ts        # 提交消息样本
    config-states.ts          # 配置状态预设
  helpers/
    mock-context.ts           # createMockContext() 提取
    di-helpers.ts             # 构造函数参数构建器
    async-helpers.ts          # 流式/异步测试工具
```

## Estimated Effort

1-2 天

## Acceptance Criteria

- [ ] `setup.ts` 覆盖所有缺失的 VS Code API 面
- [ ] Logger/Notification Mock 可从共享位置导入
- [ ] `createMockContext()` 从共享位置可用
- [ ] 现有测试仍然通过（无回归）
