# F-002: 提交生成管道测试

## Priority: P0 (最高回归风险区域)

## Summary

为提交生成管道的核心文件添加全面的单元测试，覆盖 streaming generation、layered commit、function calling、input normalization 和 cross-repository orchestration。

## Cross-Role Insights

- **Test Strategist**: `streaming-generation-helper.ts` 是项目中修改最频繁的文件（24 次变更），现有测试可扩展
- **Product Manager**: `commands/generate-commit` 占所有代码变更的 25%（226 次），是最高 ROI 测试目标
- **System Architect**: 命令层是最可测试的，因为已有构造函数注入模式

## Requirements

### MUST

- **streaming-generation-helper.ts** (1,409 行, 24 次变更)
  - System prompt hash 在 SCM 类型/工作区/prompt 变化时改变
  - Combined diff 解析将文件块映射到绝对路径
  - 错误映射：`RequestTooLargeError` → `too_large`, 取消 → `cancelled`
  - `fallbackToAll=false` 在 auto 检测异常时仍使用 staged 目标

- **commit-generation-orchestrator.ts** (已部分测试，需扩展)
  - 单仓库：复用 grouped result 并跳过 SCM 检测
  - 跨仓库：按 repo 分组，每 repo 检测 SCM 类型
  - 分组崩溃时的安全回退（multi-resource abort, single-resource fallback）

- **generate-commit-command.ts** (已部分测试，需扩展)
  - 跨仓库摘要：全部成功 vs 部分成功 vs 取消
  - 单仓库：成功通知 + 系统通知

- **layered-commit-handler.ts** (1,190 行, 18 次变更) — 新增
  - 文件级 diff 提取和 regex 解析
  - 层化提交生成流程

- **function-calling-handler.ts** (已存在测试，需审查) — 确认覆盖

### SHOULD

- **input-normalizer.ts** — 已完整测试，确认无需额外工作
- **semantic-grouping-service.ts** — 已存在测试，确认覆盖
- **grouped-commit-ui-service.ts** — 已存在测试，确认覆盖

## Mock Strategy

- `@/scm/multi-repository-context-manager` (groupResourceStatesByRepository)
- `@/services/core/scm-detector-service` (SCMDetectorService)
- `@/utils/notification/notification-manager` (notify)
- `@/ai/utils/generate-helper` (getSystemPrompt)
- `@/scm/staged-content-detector`, `@/scm/smart-diff-selector`

## Estimated Effort

8-10 天 (含 CI 集成)

## Test Organization

```
src/commands/generate-commit/__tests__/
  commit-generation-orchestrator.test.ts   # EXISTS — expand
  streaming-generation-helper.test.ts      # EXISTS — expand
  generate-commit-command.test.ts          # EXISTS — expand
  layered-commit-handler.test.ts           # NEW
  function-calling-handler.test.ts         # EXISTS — verify
  input-normalizer.test.ts                 # EXISTS — complete
```

## Acceptance Criteria

- [ ] streaming-generation-helper 覆盖率 ≥ 80%
- [ ] commit-generation-orchestrator 覆盖率 ≥ 80%
- [ ] layered-commit-handler 新增测试文件
- [ ] 所有跨仓库场景有覆盖（成功/部分/取消）
- [ ] 错误映射测试覆盖所有 ResultType
