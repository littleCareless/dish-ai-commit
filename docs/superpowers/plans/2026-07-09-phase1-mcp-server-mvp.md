# Dish AI Commit MCP Server (Phase 1: MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现一个 MCP Server，提供 git 上下文收集和 commit message 生成功能，支持 Conventional Commits 格式和中英文。

**Architecture:** 使用 TypeScript 和 @modelcontextprotocol/sdk 构建 MCP Server，通过 simple-git 收集 git 上下文，使用内置的 prompt 工程生成 commit message。采用模块化设计，将工具、上下文收集、生成逻辑、格式化分离。

**Tech Stack:** TypeScript 5.x, Node.js 18+, @modelcontextprotocol/sdk, simple-git, Vitest, tsup, pnpm

## Global Constraints

- Node.js >= 18.20.8
- pnpm >= 10.0.0
- TypeScript 5.x
- 所有代码必须有单元测试
- 使用 Conventional Commits 格式
- 支持中英文 commit message
- 文件行数 < 500 行（核心类 < 200 行）

---

## File Structure

```
packages/
  mcp-server/
    src/
      index.ts                    # MCP server 入口，注册工具
      types/
        index.ts                  # 类型定义
      tools/
        get-git-context.ts        # get_git_context 工具实现
        generate-commit-message.ts # generate_commit_message 工具实现
      context/
        git-collector.ts          # Git 上下文收集逻辑
      generators/
        commit-generator.ts       # Commit message 生成逻辑（prompt 构建）
      formatters/
        conventional.ts           # Conventional Commits 格式化
      config/
        loader.ts                 # 配置文件加载
    tests/
      tools/
        get-git-context.test.ts
        generate-commit-message.test.ts
      context/
        git-collector.test.ts
      generators/
        commit-generator.test.ts
      formatters/
        conventional.test.ts
      fixtures/
        test-repo/                # 测试用 Git 仓库
    package.json
    tsconfig.json
    vitest.config.ts
    README.md
```

---

## Task 1: 项目初始化和基础配置

**Files:**

- Create: `packages/mcp-server/package.json`
- Create: `packages/mcp-server/tsconfig.json`
- Create: `packages/mcp-server/vitest.config.ts`
- Create: `packages/mcp-server/.gitignore`
- Create: `packages/mcp-server/README.md`

**Interfaces:**

- Consumes: 无（第一个任务）
- Produces: 可构建的 TypeScript 项目结构

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "@dish-ai-commit/mcp-server",
  "version": "0.1.0",
  "description": "MCP Server for AI-powered commit message generation",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "dish-ai-commit-mcp": "./dist/index.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit"
  },
  "keywords": ["mcp", "git", "commit", "ai"],
  "author": "",
  "license": "MIT",
  "engines": {
    "node": ">=18.20.8"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "simple-git": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "typescript": "^5.3.3",
    "tsup": "^8.0.1",
    "vitest": "^1.2.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "eslint": "^8.56.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: 创建 vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
```

- [ ] **Step 4: 创建 .gitignore**

```
node_modules/
dist/
*.log
.DS_Store
coverage/
```

- [ ] **Step 5: 创建 README.md**

````markdown
# @dish-ai-commit/mcp-server

MCP Server for AI-powered commit message generation with intelligent context collection.

## Features

- Git context collection (diff, history, status)
- Commit message generation with Conventional Commits format
- Multi-language support (Chinese, English)
- MCP protocol compatible

## Installation

```bash
npm install -g @dish-ai-commit/mcp-server
```
````

## Usage

Configure in your MCP client (Claude Desktop, Claude Code, etc.):

```json
{
  "mcpServers": {
    "dish-ai-commit": {
      "command": "dish-ai-commit-mcp",
      "args": []
    }
  }
}
```

## Tools

### get_git_context

Collects git context including staged diff, commit history, and repository status.

### generate_commit_message

Generates a commit message based on staged changes using Conventional Commits format.

## Configuration

Create `.dish-ai-commit.json` in your project root:

```json
{
  "language": "zh",
  "commitFormat": "conventional",
  "context": {
    "includeHistory": true,
    "historyLimit": 20
  }
}
```

## Development

```bash
pnpm install
pnpm dev
pnpm test
```

## License

MIT

````

- [ ] **Step 6: 安装依赖**

Run: `cd packages/mcp-server && pnpm install`
Expected: 依赖安装成功

- [ ] **Step 7: 验证项目结构**

Run: `cd packages/mcp-server && pnpm typecheck`
Expected: TypeScript 编译通过（虽然还没有源代码）

- [ ] **Step 8: 提交**

```bash
git add packages/mcp-server/
git commit -m "🎉 init: add MCP server project structure"
````

---

## Task 2: 类型定义

**Files:**

- Create: `packages/mcp-server/src/types/index.ts`
- Test: `packages/mcp-server/tests/types/index.test.ts`

**Interfaces:**

- Consumes: 无
- Produces: `GitContext`, `Config`, `CommitMessage`, `GenerationOptions` 类型定义

- [ ] **Step 1: 编写类型定义测试**

```typescript
// tests/types/index.test.ts
import { describe, it, expect } from "vitest";
import type {
  GitContext,
  Config,
  CommitMessage,
  GenerationOptions,
} from "../../src/types/index.js";

describe("Type Definitions", () => {
  it("should define GitContext type correctly", () => {
    const context: GitContext = {
      stagedDiff: "diff --git a/file.ts b/file.ts",
      commitHistory: ["feat: add feature", "fix: resolve bug"],
      currentBranch: "main",
    };
    expect(context.stagedDiff).toBe("diff --git a/file.ts b/file.ts");
    expect(context.commitHistory).toHaveLength(2);
    expect(context.currentBranch).toBe("main");
  });

  it("should define Config type correctly", () => {
    const config: Config = {
      language: "zh",
      commitFormat: "conventional",
      context: {
        includeHistory: true,
        historyLimit: 20,
      },
      generation: {
        maxLength: 72,
        includeBody: true,
        includeFooter: true,
      },
    };
    expect(config.language).toBe("zh");
    expect(config.commitFormat).toBe("conventional");
  });

  it("should define CommitMessage type correctly", () => {
    const message: CommitMessage = {
      subject: "add new feature",
      body: "Implemented OAuth2 login",
      footer: "Closes #123",
    };
    expect(message.subject).toBe("add new feature");
  });

  it("should define GenerationOptions type correctly", () => {
    const options: GenerationOptions = {
      language: "en",
      format: "conventional",
      includeBody: true,
    };
    expect(options.language).toBe("en");
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd packages/mcp-server && pnpm test tests/types/index.test.ts`
Expected: FAIL - "Cannot find module"

- [ ] **Step 3: 实现类型定义**

```typescript
// src/types/index.ts
export interface GitContext {
  stagedDiff: string;
  unstagedDiff?: string;
  commitHistory: string[];
  currentBranch: string;
  repositoryStructure?: string;
}

export interface Config {
  language: "zh" | "en" | "ja" | "kr";
  commitFormat: "conventional" | "gitmoji" | "plain";
  context: {
    includeHistory: boolean;
    historyLimit: number;
    includeCodeStructure: boolean;
    includeIssueContext: boolean;
  };
  generation: {
    maxLength: number;
    includeBody: boolean;
    includeFooter: boolean;
  };
}

export interface CommitMessage {
  subject: string;
  body?: string;
  footer?: string;
}

export interface GenerationOptions {
  language?: "zh" | "en" | "ja" | "kr";
  format?: "conventional" | "gitmoji" | "plain";
  includeBody?: boolean;
  includeFooter?: boolean;
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd packages/mcp-server && pnpm test tests/types/index.test.ts`
Expected: PASS - 4 tests passed

- [ ] **Step 5: 提交**

```bash
git add packages/mcp-server/src/types/ packages/mcp-server/tests/types/
git commit -m "✨ types: add core type definitions"
```

---

## Task 3: 配置加载器

**Files:**

- Create: `packages/mcp-server/src/config/loader.ts`
- Test: `packages/mcp-server/tests/config/loader.test.ts`

**Interfaces:**

- Consumes: `Config` type from `../types/index.js`
- Produces: `loadConfig(): Promise<Config>` 函数

- [ ] **Step 1: 编写配置加载器测试**

```typescript
// tests/config/loader.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../../src/config/loader.js";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("Config Loader", () => {
  const testDir = join(tmpdir(), "dish-ai-commit-test-" + Date.now());
  const configPath = join(testDir, ".dish-ai-commit.json");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await unlink(configPath);
    } catch {
      // ignore
    }
  });

  it("should load config from .dish-ai-commit.json", async () => {
    const configData = {
      language: "zh",
      commitFormat: "conventional",
      context: {
        includeHistory: true,
        historyLimit: 10,
        includeCodeStructure: false,
        includeIssueContext: false,
      },
      generation: {
        maxLength: 72,
        includeBody: true,
        includeFooter: false,
      },
    };
    await writeFile(configPath, JSON.stringify(configData));

    const config = await loadConfig(testDir);

    expect(config.language).toBe("zh");
    expect(config.commitFormat).toBe("conventional");
    expect(config.context.historyLimit).toBe(10);
  });

  it("should return default config when file not found", async () => {
    const config = await loadConfig(testDir);

    expect(config.language).toBe("en");
    expect(config.commitFormat).toBe("conventional");
    expect(config.context.includeHistory).toBe(true);
    expect(config.context.historyLimit).toBe(20);
  });

  it("should merge partial config with defaults", async () => {
    const partialConfig = {
      language: "zh",
    };
    await writeFile(configPath, JSON.stringify(partialConfig));

    const config = await loadConfig(testDir);

    expect(config.language).toBe("zh");
    expect(config.commitFormat).toBe("conventional"); // default
    expect(config.context.includeHistory).toBe(true); // default
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd packages/mcp-server && pnpm test tests/config/loader.test.ts`
Expected: FAIL - "Cannot find module"

- [ ] **Step 3: 实现配置加载器**

```typescript
// src/config/loader.ts
import { readFile } from "fs/promises";
import { join } from "path";
import type { Config } from "../types/index.js";

const DEFAULT_CONFIG: Config = {
  language: "en",
  commitFormat: "conventional",
  context: {
    includeHistory: true,
    historyLimit: 20,
    includeCodeStructure: false,
    includeIssueContext: false,
  },
  generation: {
    maxLength: 72,
    includeBody: true,
    includeFooter: true,
  },
};

export async function loadConfig(projectRoot: string): Promise<Config> {
  const configPath = join(projectRoot, ".dish-ai-commit.json");

  try {
    const configContent = await readFile(configPath, "utf-8");
    const userConfig = JSON.parse(configContent);
    return mergeConfig(DEFAULT_CONFIG, userConfig);
  } catch {
    return DEFAULT_CONFIG;
  }
}

function mergeConfig(defaults: Config, userConfig: Partial<Config>): Config {
  return {
    ...defaults,
    ...userConfig,
    context: {
      ...defaults.context,
      ...userConfig.context,
    },
    generation: {
      ...defaults.generation,
      ...userConfig.generation,
    },
  };
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd packages/mcp-server && pnpm test tests/config/loader.test.ts`
Expected: PASS - 3 tests passed

- [ ] **Step 5: 提交**

```bash
git add packages/mcp-server/src/config/ packages/mcp-server/tests/config/
git commit -m "✨ config: add configuration loader with defaults"
```

---

## Task 4: Git 上下文收集器

**Files:**

- Create: `packages/mcp-server/src/context/git-collector.ts`
- Test: `packages/mcp-server/tests/context/git-collector.test.ts`
- Create: `packages/mcp-server/tests/fixtures/test-repo/` (测试用 Git 仓库)

**Interfaces:**

- Consumes: `GitContext` type from `../types/index.js`, `Config` from `../config/loader.js`
- Produces: `collectGitContext(projectRoot: string, config: Config): Promise<GitContext>` 函数

- [ ] **Step 1: 创建测试用 Git 仓库**

```bash
cd packages/mcp-server/tests/fixtures
mkdir test-repo
cd test-repo
git init
git config user.email "test@example.com"
git config user.name "Test User"
echo "# Test Repo" > README.md
git add README.md
git commit -m "Initial commit"
echo "console.log('hello');" > index.js
git add index.js
```

- [ ] **Step 2: 编写 Git 上下文收集器测试**

```typescript
// tests/context/git-collector.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { collectGitContext } from "../../src/context/git-collector.js";
import { join } from "path";
import type { Config } from "../../src/types/index.js";

describe("Git Context Collector", () => {
  const testRepoPath = join(__dirname, "../fixtures/test-repo");

  const defaultConfig: Config = {
    language: "en",
    commitFormat: "conventional",
    context: {
      includeHistory: true,
      historyLimit: 20,
      includeCodeStructure: false,
      includeIssueContext: false,
    },
    generation: {
      maxLength: 72,
      includeBody: true,
      includeFooter: true,
    },
  };

  it("should collect staged diff", async () => {
    const context = await collectGitContext(testRepoPath, defaultConfig);

    expect(context.stagedDiff).toContain("index.js");
    expect(context.stagedDiff).toContain("console.log('hello')");
  });

  it("should collect commit history", async () => {
    const context = await collectGitContext(testRepoPath, defaultConfig);

    expect(context.commitHistory).toBeInstanceOf(Array);
    expect(context.commitHistory.length).toBeGreaterThan(0);
    expect(context.commitHistory[0]).toContain("Initial commit");
  });

  it("should collect current branch", async () => {
    const context = await collectGitContext(testRepoPath, defaultConfig);

    expect(context.currentBranch).toBe("master");
  });

  it("should respect historyLimit config", async () => {
    const limitedConfig: Config = {
      ...defaultConfig,
      context: {
        ...defaultConfig.context,
        historyLimit: 5,
      },
    };

    const context = await collectGitContext(testRepoPath, limitedConfig);

    expect(context.commitHistory.length).toBeLessThanOrEqual(5);
  });

  it("should exclude history when includeHistory is false", async () => {
    const noHistoryConfig: Config = {
      ...defaultConfig,
      context: {
        ...defaultConfig.context,
        includeHistory: false,
      },
    };

    const context = await collectGitContext(testRepoPath, noHistoryConfig);

    expect(context.commitHistory).toEqual([]);
  });
});
```

- [ ] **Step 3: 运行测试验证失败**

Run: `cd packages/mcp-server && pnpm test tests/context/git-collector.test.ts`
Expected: FAIL - "Cannot find module"

- [ ] **Step 4: 实现 Git 上下文收集器**

```typescript
// src/context/git-collector.ts
import { simpleGit, SimpleGit } from "simple-git";
import type { GitContext, Config } from "../types/index.js";

export async function collectGitContext(
  projectRoot: string,
  config: Config,
): Promise<GitContext> {
  const git: SimpleGit = simpleGit(projectRoot);

  const [stagedDiff, currentBranch, commitHistory] = await Promise.all([
    git.diff(["--staged"]),
    git.revparse(["--abbrev-ref", "HEAD"]),
    config.context.includeHistory
      ? git
          .log({ maxCount: config.context.historyLimit })
          .then((log) => log.all.map((c) => c.message))
      : Promise.resolve([]),
  ]);

  return {
    stagedDiff,
    commitHistory,
    currentBranch,
  };
}
```

- [ ] **Step 5: 运行测试验证通过**

Run: `cd packages/mcp-server && pnpm test tests/context/git-collector.test.ts`
Expected: PASS - 5 tests passed

- [ ] **Step 6: 提交**

```bash
git add packages/mcp-server/src/context/ packages/mcp-server/tests/context/ packages/mcp-server/tests/fixtures/
git commit -m "✨ context: add git context collector"
```

---

## Task 5: Conventional Commits 格式化器

**Files:**

- Create: `packages/mcp-server/src/formatters/conventional.ts`
- Test: `packages/mcp-server/tests/formatters/conventional.test.ts`

**Interfaces:**

- Consumes: `CommitMessage` type from `../types/index.js`
- Produces: `formatConventionalCommit(message: CommitMessage): string` 函数

- [ ] **Step 1: 编写格式化器测试**

```typescript
// tests/formatters/conventional.test.ts
import { describe, it, expect } from "vitest";
import { formatConventionalCommit } from "../../src/formatters/conventional.js";
import type { CommitMessage } from "../../src/types/index.js";

describe("Conventional Commits Formatter", () => {
  it("should format subject only", () => {
    const message: CommitMessage = {
      subject: "feat(auth): add OAuth2 login",
    };

    const result = formatConventionalCommit(message);

    expect(result).toBe("feat(auth): add OAuth2 login");
  });

  it("should format subject with body", () => {
    const message: CommitMessage = {
      subject: "feat(auth): add OAuth2 login",
      body: "- Implement Google OAuth2\n- Add token refresh",
    };

    const result = formatConventionalCommit(message);

    expect(result).toBe(
      "feat(auth): add OAuth2 login\n\n- Implement Google OAuth2\n- Add token refresh",
    );
  });

  it("should format subject with body and footer", () => {
    const message: CommitMessage = {
      subject: "feat(auth): add OAuth2 login",
      body: "Implemented OAuth2 provider",
      footer: "Closes #123",
    };

    const result = formatConventionalCommit(message);

    expect(result).toBe(
      "feat(auth): add OAuth2 login\n\nImplemented OAuth2 provider\n\nCloses #123",
    );
  });

  it("should handle empty body", () => {
    const message: CommitMessage = {
      subject: "fix: resolve bug",
      body: "",
      footer: "Fixes #456",
    };

    const result = formatConventionalCommit(message);

    expect(result).toBe("fix: resolve bug\n\nFixes #456");
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd packages/mcp-server && pnpm test tests/formatters/conventional.test.ts`
Expected: FAIL - "Cannot find module"

- [ ] **Step 3: 实现格式化器**

```typescript
// src/formatters/conventional.ts
import type { CommitMessage } from "../types/index.js";

export function formatConventionalCommit(message: CommitMessage): string {
  const parts: string[] = [message.subject];

  if (message.body && message.body.trim()) {
    parts.push("", message.body.trim());
  }

  if (message.footer && message.footer.trim()) {
    parts.push("", message.footer.trim());
  }

  return parts.join("\n");
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd packages/mcp-server && pnpm test tests/formatters/conventional.test.ts`
Expected: PASS - 4 tests passed

- [ ] **Step 5: 提交**

```bash
git add packages/mcp-server/src/formatters/ packages/mcp-server/tests/formatters/
git commit -m "✨ formatter: add conventional commits formatter"
```

---

## Task 6: Commit Message 生成器

**Files:**

- Create: `packages/mcp-server/src/generators/commit-generator.ts`
- Test: `packages/mcp-server/tests/generators/commit-generator.test.ts`

**Interfaces:**

- Consumes: `GitContext`, `GenerationOptions`, `CommitMessage` from `../types/index.js`
- Produces: `generateCommitPrompt(context: GitContext, options: GenerationOptions): string` 函数

- [ ] **Step 1: 编写生成器测试**

```typescript
// tests/generators/commit-generator.test.ts
import { describe, it, expect } from "vitest";
import { generateCommitPrompt } from "../../src/generators/commit-generator.js";
import type { GitContext, GenerationOptions } from "../../src/types/index.js";

describe("Commit Message Generator", () => {
  const mockContext: GitContext = {
    stagedDiff: `diff --git a/auth.ts b/auth.ts
+export function login() {
+  return oauth2.authenticate();
+}`,
    commitHistory: ["feat: add user model", "fix: resolve auth bug"],
    currentBranch: "feature/oauth2",
  };

  it("should generate prompt in English", () => {
    const options: GenerationOptions = {
      language: "en",
      format: "conventional",
    };

    const prompt = generateCommitPrompt(mockContext, options);

    expect(prompt).toContain("Generate a commit message");
    expect(prompt).toContain("English");
    expect(prompt).toContain(mockContext.stagedDiff);
    expect(prompt).toContain("Conventional Commits");
  });

  it("should generate prompt in Chinese", () => {
    const options: GenerationOptions = {
      language: "zh",
      format: "conventional",
    };

    const prompt = generateCommitPrompt(mockContext, options);

    expect(prompt).toContain("生成 commit message");
    expect(prompt).toContain("中文");
  });

  it("should include commit history when provided", () => {
    const options: GenerationOptions = {
      language: "en",
      format: "conventional",
    };

    const prompt = generateCommitPrompt(mockContext, options);

    expect(prompt).toContain("feat: add user model");
    expect(prompt).toContain("fix: resolve auth bug");
  });

  it("should specify format requirements", () => {
    const options: GenerationOptions = {
      language: "en",
      format: "conventional",
      includeBody: true,
    };

    const prompt = generateCommitPrompt(mockContext, options);

    expect(prompt).toContain("body");
    expect(prompt).toContain("format: <type>(<scope>): <subject>");
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd packages/mcp-server && pnpm test tests/generators/commit-generator.test.ts`
Expected: FAIL - "Cannot find module"

- [ ] **Step 3: 实现生成器**

````typescript
// src/generators/commit-generator.ts
import type { GitContext, GenerationOptions } from "../types/index.js";

export function generateCommitPrompt(
  context: GitContext,
  options: GenerationOptions,
): string {
  const language = options.language === "zh" ? "中文" : "English";
  const instruction =
    options.language === "zh"
      ? "生成 commit message"
      : "Generate a commit message";

  const parts: string[] = [
    `${instruction} in ${language}:`,
    "",
    "## Code Changes",
    "```diff",
    context.stagedDiff,
    "```",
    "",
  ];

  if (context.commitHistory.length > 0) {
    parts.push("## Recent Commit History");
    parts.push(context.commitHistory.map((h) => `- ${h}`).join("\n"));
    parts.push("");
  }

  parts.push("## Requirements");
  parts.push(`- Language: ${language}`);
  parts.push("- Format: Conventional Commits (<type>(<scope>): <subject>)");

  if (options.includeBody) {
    parts.push("- Include a body explaining the changes");
  }

  parts.push("- Keep subject under 72 characters");
  parts.push('- Use imperative mood ("add" not "added")');

  return parts.join("\n");
}
````

- [ ] **Step 4: 运行测试验证通过**

Run: `cd packages/mcp-server && pnpm test tests/generators/commit-generator.test.ts`
Expected: PASS - 4 tests passed

- [ ] **Step 5: 提交**

```bash
git add packages/mcp-server/src/generators/ packages/mcp-server/tests/generators/
git commit -m "✨ generator: add commit message prompt generator"
```

---

## Task 7: MCP 工具实现 - get_git_context

**Files:**

- Create: `packages/mcp-server/src/tools/get-git-context.ts`
- Test: `packages/mcp-server/tests/tools/get-git-context.test.ts`

**Interfaces:**

- Consumes: `collectGitContext` from `../context/git-collector.js`, `loadConfig` from `../config/loader.js`
- Produces: `getGitContextTool` MCP tool handler

- [ ] **Step 1: 编写工具测试**

```typescript
// tests/tools/get-git-context.test.ts
import { describe, it, expect } from "vitest";
import { getGitContextTool } from "../../src/tools/get-git-context.js";

describe("get_git_context Tool", () => {
  it("should be defined", () => {
    expect(getGitContextTool).toBeDefined();
  });

  it("should have correct name", () => {
    expect(getGitContextTool.name).toBe("get_git_context");
  });

  it("should have description", () => {
    expect(getGitContextTool.description).toContain("git context");
  });

  it("should have input schema", () => {
    expect(getGitContextTool.inputSchema).toBeDefined();
    expect(getGitContextTool.inputSchema.type).toBe("object");
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd packages/mcp-server && pnpm test tests/tools/get-git-context.test.ts`
Expected: FAIL - "Cannot find module"

- [ ] **Step 3: 实现工具**

```typescript
// src/tools/get-git-context.ts
import { collectGitContext } from "../context/git-collector.js";
import { loadConfig } from "../config/loader.js";

export const getGitContextTool = {
  name: "get_git_context",
  description:
    "Collect git context including staged diff, commit history, and repository status",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectRoot: {
        type: "string",
        description: "Path to the git repository root",
      },
    },
    required: ["projectRoot"],
  },
  handler: async (args: { projectRoot: string }) => {
    const config = await loadConfig(args.projectRoot);
    const context = await collectGitContext(args.projectRoot, config);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(context, null, 2),
        },
      ],
    };
  },
};
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd packages/mcp-server && pnpm test tests/tools/get-git-context.test.ts`
Expected: PASS - 4 tests passed

- [ ] **Step 5: 提交**

```bash
git add packages/mcp-server/src/tools/ packages/mcp-server/tests/tools/
git commit -m "✨ tool: implement get_git_context MCP tool"
```

---

## Task 8: MCP 工具实现 - generate_commit_message

**Files:**

- Create: `packages/mcp-server/src/tools/generate-commit-message.ts`
- Test: `packages/mcp-server/tests/tools/generate-commit-message.test.ts`

**Interfaces:**

- Consumes: `collectGitContext`, `generateCommitPrompt`, `formatConventionalCommit`, `loadConfig`
- Produces: `generateCommitMessageTool` MCP tool handler

- [ ] **Step 1: 编写工具测试**

```typescript
// tests/tools/generate-commit-message.test.ts
import { describe, it, expect } from "vitest";
import { generateCommitMessageTool } from "../../src/tools/generate-commit-message.js";

describe("generate_commit_message Tool", () => {
  it("should be defined", () => {
    expect(generateCommitMessageTool).toBeDefined();
  });

  it("should have correct name", () => {
    expect(generateCommitMessageTool.name).toBe("generate_commit_message");
  });

  it("should have description", () => {
    expect(generateCommitMessageTool.description).toContain("commit message");
  });

  it("should have input schema with optional parameters", () => {
    expect(generateCommitMessageTool.inputSchema).toBeDefined();
    expect(generateCommitMessageTool.inputSchema.properties).toHaveProperty(
      "projectRoot",
    );
    expect(generateCommitMessageTool.inputSchema.properties).toHaveProperty(
      "language",
    );
    expect(generateCommitMessageTool.inputSchema.properties).toHaveProperty(
      "format",
    );
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd packages/mcp-server && pnpm test tests/tools/generate-commit-message.test.ts`
Expected: FAIL - "Cannot find module"

- [ ] **Step 3: 实现工具**

```typescript
// src/tools/generate-commit-message.ts
import { collectGitContext } from "../context/git-collector.js";
import { generateCommitPrompt } from "../generators/commit-generator.js";
import { loadConfig } from "../config/loader.js";
import type { GenerationOptions } from "../types/index.js";

export const generateCommitMessageTool = {
  name: "generate_commit_message",
  description: "Generate a commit message based on staged changes",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectRoot: {
        type: "string",
        description: "Path to the git repository root",
      },
      language: {
        type: "string",
        enum: ["zh", "en", "ja", "kr"],
        description: "Language for the commit message",
      },
      format: {
        type: "string",
        enum: ["conventional", "gitmoji", "plain"],
        description: "Commit message format",
      },
    },
    required: ["projectRoot"],
  },
  handler: async (args: {
    projectRoot: string;
    language?: "zh" | "en" | "ja" | "kr";
    format?: "conventional" | "gitmoji" | "plain";
  }) => {
    const config = await loadConfig(args.projectRoot);
    const context = await collectGitContext(args.projectRoot, config);

    const options: GenerationOptions = {
      language: args.language || config.language,
      format: args.format || config.commitFormat,
      includeBody: config.generation.includeBody,
    };

    const prompt = generateCommitPrompt(context, options);

    return {
      content: [
        {
          type: "text" as const,
          text: prompt,
        },
      ],
    };
  },
};
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd packages/mcp-server && pnpm test tests/tools/generate-commit-message.test.ts`
Expected: PASS - 4 tests passed

- [ ] **Step 5: 提交**

```bash
git add packages/mcp-server/src/tools/ packages/mcp-server/tests/tools/
git commit -m "✨ tool: implement generate_commit_message MCP tool"
```

---

## Task 9: MCP Server 入口

**Files:**

- Create: `packages/mcp-server/src/index.ts`
- Create: `packages/mcp-server/tsup.config.ts`

**Interfaces:**

- Consumes: `getGitContextTool`, `generateCommitMessageTool`
- Produces: 可运行的 MCP Server

- [ ] **Step 1: 创建 tsup 配置**

```typescript
// tsup.config.ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: "node18",
  outDir: "dist",
});
```

- [ ] **Step 2: 实现 MCP Server 入口**

```typescript
// src/index.ts
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getGitContextTool } from './tools/get-git-context.js';
import { generateCommitMessageTool } from './tools/generate-commit-message.js';

const server = new Server(
  {
    name: 'dish-ai-commit-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const tools = [getGitContextTool, generateCommitMessageTool];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  const tool = tools.find(t => t.name === name);
  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }

  return await tool.handler(args as any);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Dish AI Commit MCP Server running on stdio');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

- [ ] **Step 3: 构建项目**

Run: `cd packages/mcp-server && pnpm build`
Expected: 构建成功，生成 dist/index.js

- [ ] **Step 4: 提交**

```bash
git add packages/mcp-server/src/index.ts packages/mcp-server/tsup.config.ts
git commit -m "✨ mcp: add MCP server entry point"
```

---

## Task 10: 集成测试和文档完善

**Files:**

- Modify: `packages/mcp-server/README.md`
- Create: `packages/mcp-server/tests/integration.test.ts`

**Interfaces:**

- Consumes: 所有工具和组件
- Produces: 端到端集成测试，完善的文档

- [ ] **Step 1: 编写集成测试**

```typescript
// tests/integration.test.ts
import { describe, it, expect } from "vitest";
import { collectGitContext } from "../src/context/git-collector.js";
import { generateCommitPrompt } from "../src/generators/commit-generator.js";
import { loadConfig } from "../src/config/loader.js";
import { join } from "path";

describe("Integration Test", () => {
  const testRepoPath = join(__dirname, "fixtures/test-repo");

  it("should complete full workflow: collect context -> generate prompt", async () => {
    const config = await loadConfig(testRepoPath);
    const context = await collectGitContext(testRepoPath, config);

    expect(context.stagedDiff).toBeTruthy();
    expect(context.currentBranch).toBeTruthy();

    const prompt = generateCommitPrompt(context, {
      language: config.language,
      format: config.commitFormat,
      includeBody: config.generation.includeBody,
    });

    expect(prompt).toContain("Code Changes");
    expect(prompt).toContain(context.stagedDiff);
    expect(prompt).toContain("Conventional Commits");
  });
});
```

- [ ] **Step 2: 运行所有测试**

Run: `cd packages/mcp-server && pnpm test`
Expected: 所有测试通过

- [ ] **Step 3: 完善 README**

添加使用示例和配置说明到 README.md

- [ ] **Step 4: 提交**

```bash
git add packages/mcp-server/tests/integration.test.ts packages/mcp-server/README.md
git commit -m "📝 docs: add integration tests and improve README"
```

---

## Task 11: 发布到 npm

**Files:**

- Modify: `packages/mcp-server/package.json` (version bump)

**Interfaces:**

- Consumes: 完整的项目
- Produces: npm 包发布

- [ ] **Step 1: 构建生产版本**

Run: `cd packages/mcp-server && pnpm build`
Expected: 构建成功

- [ ] **Step 2: 验证包内容**

Run: `cd packages/mcp-server && npm pack --dry-run`
Expected: 显示将打包的文件列表

- [ ] **Step 3: 发布到 npm**

Run: `cd packages/mcp-server && npm publish --access public`
Expected: 发布成功

- [ ] **Step 4: 提交版本更新**

```bash
git add packages/mcp-server/package.json
git commit -m "🔖 release: v0.1.0 - MCP Server MVP"
git tag v0.1.0
git push origin v0.1.0
```

---

## Self-Review Checklist

完成所有任务后，检查：

- [ ] 所有测试通过：`pnpm test`
- [ ] TypeScript 编译通过：`pnpm typecheck`
- [ ] 构建成功：`pnpm build`
- [ ] README 完整：包含安装、使用、配置说明
- [ ] 包已发布到 npm
- [ ] Git tag 已创建

---

## Next Steps

Phase 1 完成后，继续 Phase 2：Claude Code Skill 集成
