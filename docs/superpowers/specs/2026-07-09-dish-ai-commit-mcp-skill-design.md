# Dish AI Commit: MCP Server + Skill 架构设计

**版本**: v1.0  
**日期**: 2026-07-09  
**状态**: Draft  
**作者**: AI Assistant + User

---

## 1. 概述

### 1.1 项目背景

Dish AI Commit 原为 VS Code 扩展（v0.61.0），提供 AI 驱动的 commit message 生成、分支命名、PR 摘要等功能。随着 AI 工具生态演变（Claude Code、Codex、Cursor 等 CLI/App 兴起），决定放弃 VS Code 扩展形态，转向更现代的 AI-native 架构。

### 1.2 目标

**核心目标**：将 Dish AI Commit 重构为 **MCP Server + Skill 包装层** 架构，适配 AI CLI 时代。

**具体目标**：

1. 实现通用 MCP Server，提供上下文工程和 commit 生成能力
2. 为 Claude Code、Cursor、Codex 等 AI CLI 提供原生 skill 集成
3. 保留现有核心能力（commit、分支名、PR 摘要、周报、代码审查）
4. 支持多 AI provider（通过 MCP 协议，由宿主客户端提供）
5. 增强上下文理解（不仅看 diff，还看代码库结构、历史 commit、issue/PR）

### 1.3 非目标

- ❌ 不再维护 VS Code 扩展（保留代码作为参考）
- ❌ 不再维护 20+ AI provider 抽象层（由 MCP 客户端提供）
- ❌ 不再支持 SVN（聚焦 Git）
- ❌ 不再提供独立 CLI 工具（通过 MCP/Skill 使用）

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     AI CLI Clients                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Claude Code│  │  Cursor  │  │  Codex   │  │  Other   │   │
│  │  Skill   │  │  Rules   │  │ AGENTS.md│  │ MCP CLI  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼──────────────┼──────────────┼──────────────┼────────┘
        │              │              │              │
        └──────────────┴──────────────┴──────────────┘
                       │
                       │ MCP Protocol
                       │
        ┌──────────────▼──────────────┐
        │   MCP Server (Core)         │
        │  ┌───────────────────────┐  │
        │  │ Context Engineering   │  │
        │  │  • Git Diff Analysis  │  │
        │  │  • Commit History     │  │
        │  │  • Code Structure     │  │
        │  │  • Issue/PR Context   │  │
        │  └───────────────────────┘  │
        │  ┌───────────────────────┐  │
        │  │ Generation Logic      │  │
        │  │  • Commit Messages    │  │
        │  │  • Branch Names       │  │
        │  │  • PR Summaries       │  │
        │  │  • Weekly Reports     │  │
        │  │  • Code Review        │  │
        │  └───────────────────────┘  │
        │  ┌───────────────────────┐  │
        │  │ Formatting Rules      │  │
        │  │  • Conventional       │  │
        │  │  • Gitmoji            │  │
        │  │  • Multi-language     │  │
        │  │  • Team Standards     │  │
        │  └───────────────────────┘  │
        └─────────────────────────────┘
```

### 2.2 核心组件

#### 2.2.1 MCP Server (`@dish-ai-commit/mcp-server`)

**职责**：提供标准化的 MCP 工具接口

**核心工具**：

1. `get_git_context` - 收集 git 上下文（diff、history、status）
2. `generate_commit_message` - 生成 commit message
3. `generate_branch_name` - 生成分支名
4. `generate_pr_summary` - 生成 PR 摘要
5. `generate_weekly_report` - 生成周报
6. `review_code` - 代码审查

**技术栈**：

- Language: TypeScript
- Runtime: Node.js 18+
- MCP SDK: `@modelcontextprotocol/sdk`
- Git: `simple-git` (Git 操作)
- Testing: Vitest

#### 2.2.2 Skill 包装层

**Claude Code Skill** (`@dish-ai-commit/claude-skill`)：

- `/commit` - 交互式 commit message 生成
- `/branch` - 分支命名
- `/pr` - PR 摘要生成
- `/report` - 周报生成

**Cursor Rules** (`.cursor/rules/dish-ai-commit.mdc`)：

- 自动检测 commit 场景
- 提供上下文收集指令

**Codex Integration** (`AGENTS.md` 片段)：

- Git 工作流自动化指令

### 2.3 数据流

#### 2.3.1 Commit Message 生成流程

```
1. 用户触发
   └─> Claude Code: `/commit` 或 git hook
   └─> Cursor: 自动检测 staged changes
   └─> 其他 MCP CLI: 调用 `generate_commit_message`

2. 上下文收集
   └─> MCP Server: `get_git_context`
       ├─> git diff --staged (已暂存变更)
       ├─> git log -20 (最近 20 条 commit)
       ├─> git status (仓库状态)
       ├─> 代码库结构 (可选，基于 tree-sitter)
       └─> 关联 issue/PR (可选，通过 GitHub API)

3. Prompt 构建
   └─> 根据配置选择格式 (conventional/gitmoji/plain)
   └─> 注入上下文 (diff + history + code structure)
   └─> 注入语言偏好 (zh/en/ja/kr)
   └─> 注入团队规范 (可选，从 .commitlintrc 读取)

4. AI 生成
   └─> MCP 客户端调用宿主 AI (Claude/GPT/etc.)
   └─> 返回生成的 commit message

5. 用户确认
   └─> 展示生成的 message
   └─> 用户编辑或确认
   └─> 执行 git commit
```

---

## 3. 核心功能设计

### 3.1 上下文工程 (Context Engineering)

**核心价值**：不仅看 diff，还要理解"为什么改"

#### 3.1.1 Git 上下文

```typescript
interface GitContext {
  stagedDiff: string; // git diff --staged
  unstagedDiff?: string; // git diff (可选)
  commitHistory: string[]; // 最近 N 条 commit
  currentBranch: string; // 当前分支
  repositoryStructure?: string; // 代码库结构 (可选)
}
```

#### 3.1.2 代码上下文 (增强)

```typescript
interface CodeContext {
  changedFiles: string[]; // 变更的文件列表
  relatedFunctions?: string[]; // 相关函数定义 (tree-sitter)
  relatedTests?: string[]; // 相关测试文件
  imports?: string[]; // 导入的模块
}
```

#### 3.1.3 Issue/PR 上下文 (增强)

```typescript
interface IssueContext {
  linkedIssue?: {
    number: number;
    title: string;
    description: string;
  };
  linkedPR?: {
    number: number;
    title: string;
  };
}
```

### 3.2 Commit Message 生成

#### 3.2.1 支持的格式

1. **Conventional Commits**

   ```
   feat(auth): add OAuth2 login support

   - Implement Google OAuth2 provider
   - Add token refresh logic
   - Update user model with provider field

   Closes #123
   ```

2. **Gitmoji**

   ```
   ✨ feat(auth): add OAuth2 login support

   🎨 Add Google OAuth2 provider
   ♻️ Refactor token refresh logic
   💄 Update user model schema
   ```

3. **Plain**

   ```
   Add OAuth2 login support

   Implemented Google OAuth2 provider with token refresh.
   Updated user model to support multiple auth providers.
   ```

#### 3.2.2 多语言支持

- 中文 (zh)
- 英文 (en)
- 日文 (ja)
- 韩文 (kr)

通过配置文件指定：

```json
{
  "commitLanguage": "zh",
  "commitFormat": "conventional"
}
```

### 3.3 分支命名

```typescript
interface BranchNameOptions {
  type: "feature" | "bugfix" | "hotfix" | "release";
  description?: string;
  fromChanges?: boolean; // 从当前变更推断
}

// 示例输出
// feature/oauth2-login
// bugfix/fix-token-refresh
// hotfix/security-patch
```

### 3.4 PR 摘要生成

```typescript
interface PRSummary {
  title: string;
  description: string;
  changelog: string[];
  breakingChanges?: string[];
}
```

### 3.5 周报生成

```typescript
interface WeeklyReport {
  period: { start: string; end: string };
  commits: CommitSummary[];
  highlights: string[];
  statistics: {
    totalCommits: number;
    filesChanged: number;
    insertions: number;
    deletions: number;
  };
}
```

---

## 4. 配置系统

### 4.1 配置文件

支持多种配置方式（优先级从高到低）：

1. 项目级：`.dish-ai-commit.json` (仓库根目录)
2. 用户级：`~/.config/dish-ai-commit/config.json`
3. 环境变量：`DISH_AI_COMMIT_*`

### 4.2 配置项

```typescript
interface Config {
  // 基础配置
  language: "zh" | "en" | "ja" | "kr";
  commitFormat: "conventional" | "gitmoji" | "plain";

  // 上下文配置
  context: {
    includeHistory: boolean; // 是否包含 commit history
    historyLimit: number; // history 条数 (默认 20)
    includeCodeStructure: boolean; // 是否包含代码结构 (默认 false)
    includeIssueContext: boolean; // 是否包含 issue/PR (默认 false)
  };

  // 生成配置
  generation: {
    maxLength: number; // commit message 最大长度 (默认 72)
    includeBody: boolean; // 是否包含 body (默认 true)
    includeFooter: boolean; // 是否包含 footer (默认 true)
  };

  // 团队规范 (可选)
  teamStandards?: {
    commitlintConfig?: string; // .commitlintrc 路径
    allowedTypes?: string[]; // 允许的 type
    scopes?: string[]; // 允许的 scope
  };
}
```

---

## 5. 实现计划

### 5.1 Phase 1: MCP Server 核心 (MVP)

**目标**：实现基础 MCP Server，支持 commit message 生成

**任务**：

1. 初始化 MCP Server 项目结构
2. 实现 `get_git_context` 工具
3. 实现 `generate_commit_message` 工具
4. 支持 Conventional Commits 格式
5. 支持中英文
6. 编写单元测试
7. 发布到 npm

**预计时间**：2-3 周

### 5.2 Phase 2: Claude Code Skill 集成

**目标**：为 Claude Code 提供原生 skill 体验

**任务**：

1. 创建 `/commit` skill
2. 创建 `/branch` skill
3. 实现 skill 与 MCP Server 的交互
4. 编写 skill 文档
5. 发布到 Claude Code skill registry

**预计时间**：1-2 周

### 5.3 Phase 3: 增强功能

**目标**：实现分支命名、PR 摘要、周报

**任务**：

1. 实现 `generate_branch_name` 工具
2. 实现 `generate_pr_summary` 工具
3. 实现 `generate_weekly_report` 工具
4. 支持 Gitmoji 格式
5. 支持日文、韩文

**预计时间**：2-3 周

### 5.4 Phase 4: 上下文增强

**目标**：增强上下文理解能力

**任务**：

1. 集成 tree-sitter 解析代码结构
2. 集成 GitHub API 获取 issue/PR
3. 实现智能过滤（忽略测试、文档等）
4. 实现风格一致性（学习历史 commit）

**预计时间**：3-4 周

### 5.5 Phase 5: 其他 AI CLI 集成

**目标**：支持 Cursor、Codex 等

**任务**：

1. 创建 Cursor rules 模板
2. 创建 Codex AGENTS.md 模板
3. 编写集成文档
4. 测试各平台兼容性

**预计时间**：1-2 周

---

## 6. 技术栈

### 6.1 核心技术

- **Language**: TypeScript 5.x
- **Runtime**: Node.js 18+
- **Package Manager**: pnpm 10.x
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **Git**: `simple-git`
- **Testing**: Vitest
- **Build**: tsup
- **Lint**: ESLint + Prettier

### 6.2 可选依赖

- **Tree-sitter**: `tree-sitter` + `tree-sitter-typescript` (代码结构解析)
- **GitHub API**: `@octokit/rest` (issue/PR 上下文)
- **AI SDK**: `ai` (Vercel AI SDK，用于本地测试)

---

## 7. 测试策略

### 7.1 单元测试

- 上下文收集逻辑
- Prompt 构建逻辑
- 格式化逻辑
- 配置解析

### 7.2 集成测试

- MCP Server 工具调用
- 与真实 Git 仓库交互
- 与 Claude Code skill 交互

### 7.3 端到端测试

- 完整的 commit 流程
- 多语言生成
- 多格式生成

---

## 8. 分发策略

### 8.1 MCP Server

- **npm**: `@dish-ai-commit/mcp-server`
- **GitHub Releases**: 预编译二进制
- **MCP Registry**: 注册到官方 MCP server 列表

### 8.2 Claude Code Skill

- **GitHub**: 开源 skill 代码
- **Claude Code Registry**: 发布到 skill registry
- **文档**: README + 使用示例

### 8.3 其他 AI CLI

- **Cursor**: `.cursor/rules/` 模板
- **Codex**: `AGENTS.md` 片段
- **文档**: 集成指南

---

## 9. 成功指标

### 9.1 短期 (3 个月)

- MCP Server 发布到 npm，获得 100+ 下载
- Claude Code skill 被 50+ 用户使用
- GitHub stars 达到 500+

### 9.2 中期 (6 个月)

- npm 下载量达到 1000+
- 被 3+ 个 AI CLI 平台集成
- GitHub stars 达到 2000+

### 9.3 长期 (12 个月)

- 成为 MCP commit 工具的事实标准
- 被企业级用户采用
- 形成活跃的社区

---

## 10. 风险与缓解

### 10.1 技术风险

**风险**：MCP 协议不稳定，可能发生重大变更  
**缓解**：密切关注 MCP 规范更新，保持与官方同步

**风险**：上下文收集性能问题（大型仓库）  
**缓解**：实现智能过滤、增量更新、缓存机制

### 10.2 市场风险

**风险**：AI CLI 平台内置 commit 功能，不需要外部工具  
**缓解**：聚焦"上下文工程"差异化价值，提供更智能的 commit 生成

**风险**：竞品（aicommits、opencommit）快速跟进 MCP  
**缓解**：快速迭代，建立先发优势，聚焦企业级功能

### 10.3 用户风险

**风险**：现有 VS Code 扩展用户流失  
**缓解**：提供迁移指南，保留 VS Code 扩展代码作为参考

---

## 11. 后续规划

### 11.1 企业版功能

- 团队规范强制执行
- 审计日志
- 合规检查
- 私有部署

### 11.2 高级功能

- 多模态 commit（图片、视频变更）
- 跨仓库 commit（monorepo 支持）
- AI 代码审查增强
- 自动化 changelog 生成

---

## 12. 附录

### 12.1 参考资料

- [MCP 协议规范](https://modelcontextprotocol.io/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Gitmoji](https://gitmoji.dev/)
- [aicommits](https://github.com/Nutlope/aicommits)
- [opencommit](https://github.com/di-sukharev/opencommit)

### 12.2 术语表

- **MCP**: Model Context Protocol，模型上下文协议
- **AI CLI**: AI 命令行工具（Claude Code、Codex、Cursor 等）
- **Skill**: AI CLI 的功能扩展（类似插件）
- **上下文工程**: 收集和优化 AI 输入上下文的技术

---

**文档结束**
