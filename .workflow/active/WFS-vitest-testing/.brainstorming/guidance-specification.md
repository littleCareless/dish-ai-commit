# Guidance Specification: Vitest Testing System

## Topic

为 Dish AI Commit Message Gen (VS Code Extension) 添加全面的 Vitest 单元测试系统，覆盖 AI Provider 层、SCM 层、配置/设置层、命令编排层，首要目标是回归保护。

## Concepts & Terminology

| Term                  | Definition                                     | Aliases        | Category  |
| --------------------- | ---------------------------------------------- | -------------- | --------- |
| Regression Protection | 确保代码修改后现有功能仍然正常的测试策略       | 回归测试       | Strategy  |
| Unit Test             | 隔离测试单个函数/类，无外部依赖，快速反馈      | 单元测试       | Test Type |
| Mock                  | 模拟外部依赖（VS Code API、AI API）的替身对象  | Stub, Fake     | Technique |
| Test Fixture          | 预定义的测试数据和状态                         | 测试夹具       | Technique |
| Coverage              | 测试覆盖代码的百分比指标                       | 覆盖率         | Metric    |
| AI Provider           | 封装 AI 服务调用的策略模式实现                 | Provider       | Module    |
| SCM                   | Source Control Management - Git/SVN 操作抽象层 | Source Control | Module    |
| Command Orchestration | 命令执行的多步骤工作流协调                     | 编排器         | Module    |
| Profile               | 用户配置档案，支持多套 AI 配置切换             | 配置档案       | Feature   |
| Dirty State           | 设置项是否被用户修改的状态追踪                 | 脏状态         | Feature   |

## Non-Goals

- **NOT** E2E testing with live VS Code instance (out of scope for this phase)
- **NOT** Performance/load testing
- **NOT** Visual/UI testing for webview components
- **NOT** 100% coverage target (pragmatic coverage of critical paths)
- **NOT** Integration tests between external AI services (use mocks)
- **NOT** Refactoring existing code to be more testable (keep changes minimal)

## Scope

### In Scope

1. **AI Provider Layer Testing**
   - AIProviderFactory 创建逻辑
   - Provider 注册/发现机制
   - 流式生成回调处理
   - 错误处理与 Fallback 链
   - 模型目录同步

2. **SCM Layer Testing**
   - Git/SVN 操作抽象
   - Diff 解析和格式化
   - 多仓库管理器
   - 暂存区内容检测
   - SCM 工厂模式

3. **Configuration/Settings Layer Testing**
   - ConfigurationManager 状态管理
   - Profile 切换和验证
   - 设置同步（双向绑定）
   - 配置变更监听
   - 默认值合并逻辑

4. **Command Orchestration Layer Testing**
   - CommitGenerationOrchestrator 工作流
   - Command 基类行为
   - 跨仓库场景处理
   - 错误传播和恢复

### Test Infrastructure

- Vitest 配置优化（setup files, mocks, fixtures）
- VS Code API mocking 策略
- 测试工具函数库
- CI 集成配置

## Constraints

- **MUST** use existing Vitest framework (already configured)
- **MUST** mock all external dependencies (VS Code API, AI services, file system)
- **MUST** be runnable in CI without VS Code instance
- **MUST NOT** modify production code for testability (unless minimal)
- **SHOULD** follow existing test patterns in `src/scm/__tests__/setup.ts`
- **SHOULD** achieve fast test execution (< 30s total)
- **SHOULD** organize tests mirroring source directory structure

## Success Criteria

1. 每个核心模块至少有覆盖关键路径的单元测试
2. 测试可在 CI 环境中无 VS Code 实例运行
3. 修改任何核心模块后，运行测试可在 < 30s 内验证回归
4. 测试代码遵循项目现有模式和惯例
5. 清晰的测试组织结构，镜像源代码目录

## Current State

- **Existing tests**: 10 test directories, ~3353 lines of test code
- **Test framework**: Vitest with @vitest/coverage-v8
- **Setup**: `src/scm/__tests__/setup.ts` provides VS Code mocking
- **Coverage areas**: Command execution, Git operations, model registry, semantic grouping
- **Coverage gaps**: AI providers (mostly mocked), settings management, webview, configuration

## RFC 2119 Keywords

- **MUST**: 绝对要求
- **MUST NOT**: 绝对禁止
- **SHOULD**: 推荐但不强制
- **MAY**: 可选项
