# F-003: SCM 层测试 (Git/SVN)

## Priority: P0 (高回归风险 + 零测试的 SVN 模块)

## Summary

为 SCM 层添加测试，覆盖 Git/SVN 操作、Diff 解析、多仓库管理、暂存区检测和智能 Diff 选择。

## Cross-Role Insights

- **Test Strategist**: 路径边界匹配（`/repo` vs `/repo-tools`）是最容易回归的区域
- **Product Manager**: SCM 模块有 143 次变更、3 次 bug fix，且 SVN 辅助代码零测试
- **System Architect**: `child_process.exec` 需要 module-level mock，`vscode.extensions.getExtension("vscode.git")` 需要 mock

## Requirements

### MUST

- **smart-diff-selector.ts** (新增测试)
  - 有 staged 改动时选择 "staged" 目标
  - 无 staged 但有 unstaged 时选择 "all"
  - "auto" 模式回退逻辑
  - 空仓库（无任何改动）处理

- **staged-content-detector.ts** (新增测试)
  - 单文件 staged 内容检测
  - 多文件 staged 内容检测
  - 无 staged 内容时返回空结果

- **svn-provider.ts / svn-diff-helper.ts** (新增测试, 0 现有测试)
  - SVN diff 获取
  - SVN status 解析
  - SVN commit 执行
  - SVN streaming input

- **multi-repository-context-manager.ts** (已部分测试，扩展)
  - 路径边界安全匹配
  - 混合 SCM 类型（git + svn）
  - undefined resourceUri 处理

### SHOULD

- **git-provider.ts** 扩展测试（路由逻辑已有覆盖）

## Mock Strategy

- `vscode.workspace.workspaceFolders` (per-test 设置)
- `vscode.extensions.getExtension("vscode.git")` → mock Git API
- `child_process.execSync` for git/svn commands
- `@/utils/logger`

## Test Fixtures Needed

- `createResourceState(fsPath)` — VS Code resource state 工厂
- `createWorkspaceFolder(fsPath)` — workspace folder 工厂
- `createMockGitAPI(repositories)` — Git extension API mock
- 样本 git diff 输出（单文件、多文件、`<changes>` 块）
- 样本 SVN status 输出

## Estimated Effort

6-8 天

## Test Organization

```
src/scm/__tests__/
  setup.ts                                  # EXISTS
  git-provider-routing.test.ts              # EXISTS
  git-diff-helper.test.ts                   # EXISTS
  git-repository-manager.test.ts            # EXISTS
  multi-repository-context-manager.test.ts  # EXISTS — expand
  smart-diff-selector.test.ts               # NEW
  staged-content-detector.test.ts           # NEW
  svn-provider.test.ts                      # NEW
  svn-diff-helper.test.ts                   # NEW
```

## Acceptance Criteria

- [ ] smart-diff-selector 覆盖所有目标模式
- [ ] staged-content-detector 覆盖有/无 staged 场景
- [ ] SVN 模块从 0 测试提升到基础覆盖
- [ ] 路径边界匹配测试覆盖边界情况
- [ ] 现有 SCM 测试仍然通过
