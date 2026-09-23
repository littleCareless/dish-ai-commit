# F-006: 服务层测试 (Prompt/Cache/Settings)

## Priority: P2

## Summary

为关键服务（Prompt 管理、命令解析、缓存、偏好设置）添加单元测试。

## Cross-Role Insights

- **Product Manager**: `services/` 是最大模块（18,859 行），84 次目录变更，prompt-manager 是生成关键路径
- **Test Strategist**: 命令解析器和偏好管理器有纯逻辑，测试 ROI 高

## Requirements

### MUST

- **prompt-manager-service.ts** (837 行, 新增测试)
  - Prompt 模板加载和缓存
  - 变量替换逻辑
  - 默认 prompt 回退

- **command-parser.ts** (559 行, 新增测试)
  - 命令字符串解析
  - 参数提取和验证
  - 边界情况（空字符串、特殊字符）

- **commit-cache-service.ts** (新增测试)
  - 缓存存取
  - 缓存失效
  - 缓存大小限制

### SHOULD

- **active-prompt-store.ts** (818 行)
- **preference-manager.ts** (525 行)
- **settings handlers** (3 文件, 1,300+ 行)

## Estimated Effort

3-5 天

## Test Organization

```
src/services/prompt/__tests__/
  prompt-manager-service.test.ts          # NEW
src/services/cache/__tests__/
  commit-cache-service.test.ts            # NEW
src/services/preferences/__tests__/
  preference-manager.test.ts              # NEW
src/commands/generate-commit/utils/__tests__/
  command-parser.test.ts                  # NEW
```

## Acceptance Criteria

- [ ] prompt-manager 覆盖模板加载和变量替换
- [ ] command-parser 覆盖解析边界情况
- [ ] commit-cache 覆盖存取和失效逻辑
