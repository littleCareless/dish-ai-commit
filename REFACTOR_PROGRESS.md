# Context Pipeline Reentrancy 重构任务进度

**开始时间**: 2026-01-29
**目标**: 解决生成链路重复执行问题，实现一次用户意图 = 一次生成事务

---

## 🎯 任务目标

- ✅ 同一代码变更只生成一次
- ✅ SCM 检测只执行一次
- ✅ Prompt/Context 构建只执行一次
- ✅ Token 使用量稳定

---

## 📋 任务清单

### 阶段 1：创建测试分支

- [ ] 创建并切换到 `fix/context-pipeline-reentrancy` 分支

### 阶段 2：创建核心基础设施文件

- [ ] 创建 `src/core/generation-transaction.ts`
- [ ] 创建 `src/core/generation-gate.ts`
- [ ] 创建 `src/core/scm-context-cache.ts`
- [ ] 创建 `src/core/generation-orchestrator.ts`

### 阶段 3：改造现有文件

- [ ] 改造 `src/services/core/scm-detector-service.ts`
- [ ] 改造 `src/commands/generate-commit/builders/context-builder.ts`
- [ ] 改造 `src/commands/generate-commit/utils/streaming-generation-helper.ts`

### 阶段 4：更新导出

- [ ] 更新 `src/core/index.ts`

### 阶段 5：编译测试

- [ ] 运行编译检查
- [ ] 修复编译错误（如有）

### 阶段 6：提交代码

- [ ] 提交代码到 git
- [ ] 推送到远程仓库

---

## 📊 执行日志

### 2026-01-29 - 任务初始化

- 创建进度跟踪文档
- 准备开始执行重构

### 2026-03-24 - 方案收敛（本轮瘦身）

- 主链未接入的编排层 scaffold 已删除：
  - `src/services/core/commit-generation-coordinator.ts`
  - `src/core/generation-orchestrator.ts`
  - `src/core/generation-transaction.ts`
  - `src/core/generation-gate.ts`
- `StreamingGenerationHelper` 中未使用的 `GenerationGate` 引用已移除。
- 本文件保留为历史记录，不再作为进行中任务清单。

---
