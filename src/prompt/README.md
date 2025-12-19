# Prompt 模块 - 提示词模板系统

## 📋 概述

Prompt 模块是 Dish AI Commit Gen 的核心模板引擎，负责生成所有 AI 交互的提示词。模块采用**模板化设计**和**变量替换机制**，支持多语言、动态配置和多种 AI 任务场景。

### 核心价值

- ✅ **模板化设计**: 统一的模板语法，易于维护和扩展
- ✅ **多语言支持**: 动态语言替换，支持 15+ 种语言
- ✅ **配置驱动**: 基于用户配置动态生成提示词
- ✅ **场景覆盖**: 提交、分支、代码审查、周报、PR 摘要等完整场景
- ✅ **结构化输出**: 支持函数调用和结构化数据
- ✅ **智能引导**: 包含思维链和自我验证机制

## 🏗️ 架构设计

### 核心组件

```
Prompt Module
├── generate-commit.ts              # 提交生成提示词 (629行) ⭐
├── generate-commit-simple.ts       # 简化版提交提示
├── generate-commit-fallback.ts     # 降级提示词
├── generate-commit.1.ts            # 备用版本
├── layered-commit-file.ts          # 分层提交文件描述
├── layered-commit-batch.ts         # 分层提交批量处理
├── branch-name.ts                  # 分支名称生成
├── code-review.ts                  # 代码审查
├── code-review-simple.ts           # 简化版审查
├── code-review.1.ts                # 备用版本
├── pr-summary.ts                   # PR 摘要
└── weekly-report.ts                # 周报生成
```

### 模板类型

```
模板系统
├── 提交生成
│   ├── 标准模式 (generate-commit.ts)
│   ├── 简化模式 (generate-commit-simple.ts)
│   ├── 分层模式 (layered-commit-*.ts)
│   └── 降级模式 (generate-commit-fallback.ts)
│
├── 分支管理
│   └── 分支名称 (branch-name.ts)
│
├── 代码审查
│   ├── 完整审查 (code-review.ts)
│   └── 简化审查 (code-review-simple.ts)
│
├── 报告生成
│   ├── 周报 (weekly-report.ts)
│   └── PR 摘要 (pr-summary.ts)
```

## 🎯 核心功能详解

### 1. 提交生成提示词 (generate-commit.ts)

**文件**: `generate-commit.ts` (629 行)

**职责**: 生成完整的提交消息提示词，支持配置和多语言

```typescript
import { generateCommitMessageSystemPrompt, getCommitMessageTools } from '@/prompt/generate-commit';

// 生成系统提示词
const systemPrompt = generateCommitMessageSystemPrompt({
  config: userConfig,
  vcsType: 'git',
  commitlintConfig: customRules
});

// 生成函数调用工具定义
const tools = getCommitMessageTools(userConfig, customRules);
```

#### 模板结构

```typescript
const template = `# ${VCSUpper} Commit Message Guide

**CRITICAL INSTRUCTION: YOU MUST FOLLOW THESE EXACT REQUIREMENTS**
1. OUTPUT ONLY THE COMMIT MESSAGE IN ${language}
2. FOLLOW THE FORMAT EXACTLY AS SHOWN IN EXAMPLES
3. INCLUDE NO EXPLANATIONS OR ADDITIONAL TEXT
4. NEVER USE ENGLISH UNLESS SPECIFIED

## REQUIRED ACTIONS (MUST DO)
1. Determine the true intention...
2. WRITE ALL CONTENT IN ${language}
...

## FORMAT TEMPLATE
${getMergeCommitsSection(enableMergeCommit, enableEmoji, enableBody)}

## TYPE REFERENCE
${generateTypeReferenceFromConfig(commitlintConfig, enableEmoji)}

## WRITING RULES
...

## EXAMPLES
${getVCSExamples(vcsType, enableMergeCommit, enableEmoji, enableBody)}

## SELF-VERIFICATION CHECKLIST
...

# First, think step-by-step:
1. Analyze the CODE CHANGES...
2. Use the ORIGINAL CODE...
...
`;
```

#### 动态内容生成

**类型参考表**:
```typescript
// 默认类型参考
export function getDefaultTypeReference(enableEmoji: boolean): string {
  return enableEmoji
    ? `| Type     | Emoji | Description          | Example Scopes      |
| -------- | ----- | -------------------- | ------------------- |
| feat     | ✨    | New feature          | user, payment       |
| fix      | 🐛    | Bug fix              | auth, data          |
...`

// 从 commitlint 配置生成
export function generateTypeReferenceFromConfig(
  commitlintConfig: any,
  enableEmoji: boolean
): string {
  const typeEnum = commitlintConfig?.rules?.["type-enum"]?.[2];
  // 动态生成表格
}
```

**合并/分离提交示例**:
```typescript
// 合并提交（多文件合并为一条消息）
getMergedGitExample(useEmoji, useBody)

// 分离提交（每个文件独立消息）
getSeparateGitExample(useEmoji, useBody)
```

**思维链提示**:
```typescript
export function generateThinkingProcessPrompt(
  useRecentCommitsAsReference = false
) {
  const steps = [
    "Analyze the CODE CHANGES...",
    "Use the ORIGINAL CODE...",
    "Identify the purpose...",
    // 条件步骤
    useRecentCommitsAsReference
      ? "Review the provided RECENT REPOSITORY COMMITS..."
      : null,
    "Generate a thoughtful and succinct commit message...",
    "Remove any meta information...",
    "Now only show your message..."
  ].filter(Boolean);

  return `# First, think step-by-step:\n${numberedSteps.join("\n")}`;
}
```

#### 函数调用支持

```typescript
export function getCommitMessageTools(config, commitlintConfig?) {
  const properties = {
    type: {
      type: "string",
      enum: typeEnum,
      description: `Commit type, must be one of: ${typeEnum.join(", ")}`
    },
    scope: {
      type: "string",
      description: "Scope of the change (e.g., component or file name)"
    },
    subject: {
      type: "string",
      description: `A short summary in ${language}. Rules: imperative mood...`
    }
  };

  if (enableBody) {
    properties.body = {
      type: "string",
      description: `Detailed explanation in ${language}...`
    };
  }

  if (enableEmoji) {
    properties.emoji = {
      type: "string",
      description: "Emoji corresponding to the commit type"
    };
  }

  return [{
    type: "function",
    function: {
      name: "generate_commit_message",
      description: functionDescription,
      parameters: {
        type: "object",
        properties,
        required: requiredFields
      }
    }
  }];
}
```

### 2. 分层提交模板 (layered-commit-file.ts)

**文件**: `layered-commit-file.ts` (74 行)

**职责**: 为单个文件生成描述，用于分层提交的阶段 1

```typescript
import {
  LAYERED_COMMIT_TEMPLATE,
  getLayeredCommitVariables
} from '@/prompt/layered-commit-file';

// 生成模板
const template = LAYERED_COMMIT_TEMPLATE;

// 获取变量
const variables = getLayeredCommitVariables({
  config: userConfig.features.commitFormat,
  language: 'Simplified Chinese',
  filePath: 'src/main.ts',
  globalContext: '这是一个用户认证系统',
  otherFiles: ['auth.ts', 'user.ts']
});

// 使用 processPromptTemplate 替换变量
// 结果: "You are an expert programmer... Focus ONLY on the changes in src/main.ts..."
```

**模板特点**:
- 只描述单个文件的变更
- 可选的全局上下文
- 强调不生成完整提交消息
- 支持 body 配置

### 3. 分支名称模板 (branch-name.ts)

**文件**: `branch-name.ts` (100 行)

**职责**: 生成 Git/SVN 分支名称

```typescript
import { BRANCH_NAME_SYSTEM_TEMPLATE, BRANCH_NAME_USER_TEMPLATE } from '@/prompt/branch-name';

// 系统提示
const systemPrompt = BRANCH_NAME_SYSTEM_TEMPLATE;
// 强调: 英文输出、kebab-case、前缀类型

// 用户提示
const userPrompt = BRANCH_NAME_USER_TEMPLATE.replace(
  '{{diffContent}}',
  diffContent
);
```

**命名规范**:
- 前缀: `feature/`, `fix/`, `refactor/`, `docs/`, `chore/`, `style/`, `perf/`, `test/`
- 格式: kebab-case (小写连字符)
- 长度: 25-50 字符
- 示例: `feature/user-authentication`, `fix/payment-gateway-timeout`

### 4. 代码审查模板 (code-review.ts)

**文件**: `code-review.ts` (296 行)

**职责**: 生成全面的代码审查报告

```typescript
import {
  CODE_REVIEW_SYSTEM_TEMPLATE,
  getCodeReviewVariables
} from '@/prompt/code-review';

const systemPrompt = CODE_REVIEW_SYSTEM_TEMPLATE;
const variables = getCodeReviewVariables('Simplified Chinese');

// 模板包含:
// - 6 个审查维度 (设计、代码异味、安全、性能、可维护性、兼容性)
// - 10 种语言的特定规则
// - 6 步审查流程
// - 详细的输出格式
```

**审查维度**:

| 维度 | 检查点 |
|------|--------|
| 设计合理性 | SOLID 原则、设计模式 |
| 代码异味 | 重复代码、过长方法 |
| 安全漏洞 | 注入攻击、XSS、CSRF |
| 性能问题 | 内存泄漏、循环效率 |
| 可维护性 | 命名、注释、复杂度 |
| 兼容性 | 版本兼容、API 使用 |

**输出格式**:
```
# Code Review Report

## Overall Assessment
- Quality Score: [0-100]
- Risk Level: [Low/Medium/High]
- Technical Debt: [小时数]

## Issue List
1. [类别] - [严重程度]
   - File: [路径]
   - Line Numbers: [行号]
   - Issue: [问题描述]
   - Impact: [影响]
   - Suggestion: [建议]

## Highlights
- [值得表扬的实践]

## Improvement Roadmap
1. 短期改进
2. 长期优化

## Security Assessment
- [安全漏洞和建议]

## Performance Analysis
- [性能瓶颈和优化]
```

### 5. 周报模板 (weekly-report.ts)

**文件**: `weekly-report.ts` (223 行)

**职责**: 基于提交记录生成周报

```typescript
import {
  WEEKLY_REPORT_TEMPLATE,
  getWeeklyReportVariables
} from '@/prompt/weekly-report';

const variables = getWeeklyReportVariables({
  language: 'Simplified Chinese',
  startDate: '2024/12/09',
  endDate: '2024/12/15'
});

// 模板包含:
// - 主要成就 (功能开发、Bug 修复、重构优化、其他工作)
// - 进行中的工作
// - 下周计划
// - 技术总结
```

**内容分类规则**:
- **功能开发**: add, feature, implement, support, enhance, extend, UI
- **Bug 修复**: fix, resolve, bug, exception, error, crash
- **重构优化**: refactor, restructure, optimize, performance, architecture
- **其他工作**: doc, test, config, setting

### 6. PR 摘要模板 (pr-summary.ts)

**文件**: `pr-summary.ts` (19 行)

**职责**: 生成 PR 标题和描述

```typescript
import { PR_SUMMARY_SYSTEM_TEMPLATE, PR_SUMMARY_USER_TEMPLATE } from '@/prompt/pr-summary';

const systemPrompt = PR_SUMMARY_SYSTEM_TEMPLATE;
const userPrompt = PR_SUMMARY_USER_TEMPLATE;

// 简洁但完整，支持 Conventional Commits
```

## 📦 模板变量系统

### 变量语法

使用 `{{variable}}` 语法进行变量替换：

```typescript
import { processPromptTemplate } from '@/utils/prompt-template';

const template = '你好 {{name}}，今天是 {{date}}';
const result = processPromptTemplate(template, {
  name: '张三',
  date: '2024-12-19'
});
// "你好 张三，今天是 2024-12-19"
```

### 常用变量

**提交生成**:
- `{{language}}` - 输出语言
- `{{VCSUpper}}` - VCS 类型 (GIT/SVN)
- `{{enableEmoji}}` - 是否启用 Emoji
- `{{enableBody}}` - 是否包含正文
- `{{enableMergeCommit}}` - 是否合并提交

**分支名称**:
- `{{diffContent}}` - Diff 内容

**分层提交**:
- `{{filePath}}` - 文件路径
- `{{globalContext}}` - 全局上下文
- `{{otherFiles}}` - 其他文件列表
- `{{body_instruction}}` - Body 指令

**周报**:
- `{{date_range}}` - 日期范围

**代码审查**:
- `{{language}}` - 输出语言

## 🔧 使用示例

### 示例 1: 生成提交提示词

```typescript
import {
  generateCommitMessageSystemPrompt,
  getCommitMessageTools
} from '@/prompt/generate-commit';
import { processPromptTemplate } from '@/utils/prompt-template';

// 1. 准备配置
const config = {
  base: { language: 'Simplified Chinese' },
  features: {
    commitFormat: {
      enableEmoji: true,
      enableBody: true,
      enableMergeCommit: false
    },
    commitMessage: {
      useRecentCommitsAsReference: true
    }
  }
};

// 2. 生成系统提示
const systemPrompt = generateCommitMessageSystemPrompt({
  config,
  vcsType: 'git',
  commitlintConfig: null
});

// 3. 生成函数工具（如果使用函数调用）
const tools = getCommitMessageTools(config);

// 4. 调用 AI
const messages = [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: `Diff:\n${diffContent}` }
];

const response = await aiProvider.chat({
  messages,
  tools: tools,
  model: 'gpt-4o'
});
```

### 示例 2: 生成分支名称

```typescript
import {
  BRANCH_NAME_SYSTEM_TEMPLATE,
  BRANCH_NAME_USER_TEMPLATE
} from '@/prompt/branch-name';
import { processPromptTemplate } from '@/utils/prompt-template';

const userPrompt = processPromptTemplate(
  BRANCH_NAME_USER_TEMPLATE,
  { diffContent }
);

const messages = [
  { role: 'system', content: BRANCH_NAME_SYSTEM_TEMPLATE },
  { role: 'user', content: userPrompt }
];

const branchName = await aiProvider.chat({ messages });
// 返回: "feature/user-authentication"
```

### 示例 3: 分层提交 - 文件描述生成

```typescript
import {
  LAYERED_COMMIT_TEMPLATE,
  getLayeredCommitVariables
} from '@/prompt/layered-commit-file';
import { processPromptTemplate } from '@/utils/prompt-template';

// 为每个文件生成描述
async function generateFileDescription(file: string, diff: string, context: string) {
  const variables = getLayeredCommitVariables({
    config: userConfig.features.commitFormat,
    language: userConfig.base.language,
    filePath: file,
    globalContext: context,
    otherFiles: otherFiles
  });

  const template = processPromptTemplate(LAYERED_COMMIT_TEMPLATE, variables);

  const messages = [
    { role: 'system', content: template },
    { role: 'user', content: `File Diff:\n${diff}` }
  ];

  return await aiProvider.chat({ messages });
}

// 阶段 1: 为每个文件生成描述
const fileDescriptions = await Promise.all(
  files.map(file => generateFileDescription(file, diff, globalContext))
);

// 阶段 2: 合并描述生成最终提交
const finalPrompt = generateCommitMessageSystemPrompt({ ... });
const finalMessages = [
  { role: 'system', content: finalPrompt },
  { role: 'user', content: `Files: ${fileDescriptions.join('\n')}` }
];
const commitMessage = await aiProvider.chat({ messages: finalMessages });
```

### 示例 4: 代码审查

```typescript
import {
  CODE_REVIEW_SYSTEM_TEMPLATE,
  getCodeReviewVariables
} from '@/prompt/code-review';
import { processPromptTemplate } from '@/utils/prompt-template';

const variables = getCodeReviewVariables('Simplified Chinese');
const systemPrompt = processPromptTemplate(
  CODE_REVIEW_SYSTEM_TEMPLATE,
  variables
);

const messages = [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: `Please review this code:\n${codeDiff}` }
];

const reviewReport = await aiProvider.chat({ messages });
```

### 示例 5: 周报生成

```typescript
import {
  WEEKLY_REPORT_TEMPLATE,
  getWeeklyReportVariables
} from '@/prompt/weekly-report';
import { processPromptTemplate } from '@/utils/prompt-template';

const variables = getWeeklyReportVariables({
  language: 'Simplified Chinese',
  startDate: '2024/12/09',
  endDate: '2024/12/15'
});

const systemPrompt = processPromptTemplate(
  WEEKLY_REPORT_TEMPLATE,
  variables
);

const messages = [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: `Commit History:\n${commitLogs}` }
];

const weeklyReport = await aiProvider.chat({ messages });
```

## 🎓 设计模式

### 1. 模板方法模式

```typescript
// 基础模板
const BASE_TEMPLATE = `
# Guide
{{requirements}}

## Format
{{format}}

## Examples
{{examples}}
`;

// 子类通过变量定制
const variables = {
  requirements: getRequirements(),
  format: getFormat(),
  examples: getExamples()
};
```

### 2. 策略模式

```typescript
// 不同的提交策略
const strategies = {
  standard: generateCommitMessageSystemPrompt,
  layered: getLayeredCommitVariables,
  fallback: generateCommitFallbackPrompt
};

// 根据场景选择
const prompt = strategies[mode](config);
```

### 3. 工厂模式

```typescript
// 提示词工厂
class PromptFactory {
  static createCommitPrompt(config) {
    return generateCommitMessageSystemPrompt(config);
  }

  static createBranchPrompt(diff) {
    return processPromptTemplate(BRANCH_NAME_USER_TEMPLATE, { diffContent: diff });
  }

  static createReviewPrompt(language) {
    return processPromptTemplate(CODE_REVIEW_SYSTEM_TEMPLATE, { language });
  }
}
```

### 4. 观察者模式

```typescript
// 配置变更时重新生成提示词
vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration('dish-ai-commit')) {
    // 重新生成提示词
    const newPrompt = generateCommitMessageSystemPrompt(updatedConfig);
    // 更新缓存
  }
});
```

## 📊 模板统计

| 模板类型 | 文件数 | 代码行数 | 变量数 | 语言支持 |
|---------|--------|---------|--------|---------|
| 提交生成 | 5 | 800+ | 10+ | 动态 |
| 分支名称 | 1 | 100 | 2 | 英文 |
| 代码审查 | 3 | 300+ | 1 | 动态 |
| 周报 | 1 | 223 | 2 | 动态 |
| PR 摘要 | 1 | 19 | 1 | 动态 |
| **总计** | **11** | **1400+** | **16+** | **全支持** |

## 🔍 故障排除

### 常见问题

#### 1. 变量未替换

**问题**: `{{variable}}` 保留在输出中

**解决方案**:
```typescript
// 1. 检查变量名拼写
const variables = {
  language: 'Chinese',  // 正确
  // language: 'Chinese'  // 错误: 多了逗号
};

// 2. 确保使用 processPromptTemplate
const result = processPromptTemplate(template, variables);

// 3. 检查变量是否完整
console.log(Object.keys(variables)); // 确认所有变量都提供了
```

#### 2. 提示词过长

**问题**: 超过模型 token 限制

**解决方案**:
```typescript
// 1. 使用简化版本
import { generateCommitSimplePrompt } from '@/prompt/generate-commit-simple';

// 2. 移除示例
const prompt = basePrompt.replace(/## EXAMPLES[\s\S]*/, '');

// 3. 使用函数调用（更短）
const tools = getCommitMessageTools(config);
// 只发送工具定义，不发送完整示例
```

#### 3. 语言不生效

**问题**: 提示词仍使用英文

**解决方案**:
```typescript
// 1. 检查配置
const language = config.base.language; // "Simplified Chinese"

// 2. 确认模板使用了变量
// 模板中必须有: ${language} 或 {{language}}

// 3. 检查生成函数
const prompt = generateCommitMessageSystemPrompt({
  config: { base: { language: 'Simplified Chinese' } },
  vcsType: 'git'
});
```

#### 4. 函数调用失败

**问题**: AI 不返回结构化数据

**解决方案**:
```typescript
// 1. 检查工具定义
const tools = getCommitMessageTools(config);
// 确认 parameters.required 包含必要字段

// 2. 简化描述
// 避免过长的 description

// 3. 使用明确的指令
// 在系统提示中强调: "必须使用函数调用"
```

## 🤝 开发指南

### 添加新模板

```typescript
// 1. 创建模板文件
// src/prompt/my-task.ts

export const MY_TASK_TEMPLATE = `# My Task Guide

CRITICAL: Output in {{language}}

## Format
{{format}}

## Examples
{{examples}}
`;

export function getMyTaskVariables(config: any) {
  return {
    language: config.base.language,
    format: getFormat(config),
    examples: getExamples(config)
  };
}

// 2. 导出
// src/prompt/index.ts (如果存在)
export * from '@/prompt/my-task';

// 3. 使用
import { MY_TASK_TEMPLATE, getMyTaskVariables } from '@/prompt/my-task';
import { processPromptTemplate } from '@/utils/prompt-template';

const variables = getMyTaskVariables(userConfig);
const prompt = processPromptTemplate(MY_TASK_TEMPLATE, variables);
```

### 扩展现有模板

```typescript
// 扩展提交生成模板
import { generateCommitMessageSystemPrompt } from '@/prompt/generate-commit';

function generateCommitMessageSystemPromptExtended(params) {
  const basePrompt = generateCommitMessageSystemPrompt(params);

  // 添加自定义规则
  const customRules = `
## Custom Rules
- Must include JIRA ticket number if available
- Use imperative mood
`;

  return basePrompt + '\n' + customRules;
}
```

### 测试策略

```typescript
describe('Prompt Generation', () => {
  it('should generate commit prompt with emoji', () => {
    const config = {
      base: { language: 'English' },
      features: {
        commitFormat: { enableEmoji: true, enableBody: true }
      }
    };

    const prompt = generateCommitMessageSystemPrompt({
      config,
      vcsType: 'git'
    });

    expect(prompt).toContain('✨');
    expect(prompt).toContain('feat');
  });

  it('should handle variable replacement', () => {
    const template = 'Hello {{name}}';
    const result = processPromptTemplate(template, { name: 'World' });
    expect(result).toBe('Hello World');
  });
});
```

## 📚 相关文档

- **主 README**: [../README.md](../README.md) - 项目总览
- **AI 模块**: [../ai/README.md](../ai/README.md) - AI 提供商
- **命令模块**: [../commands/README.md](../commands/README.md) - 命令层
- **Utils 模块**: [../utils/README.md](../utils/README.md) - 模板工具

---

**最后更新**: 2024年12月
**模块版本**: v0.56.1
**模板数量**: 11
**代码行数**: 1400+
**语言支持**: 动态多语言
**代码质量**: ⭐⭐⭐⭐⭐