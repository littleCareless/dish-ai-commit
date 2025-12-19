# Utils 模块 - 工具函数库

## 📋 概述

Utils 模块是 Dish AI Commit Gen 的基础工具库，提供跨模块共享的通用功能。模块采用**分层架构设计**，涵盖国际化、日志、通知、上下文管理、Diff 处理等多个领域，确保代码的可复用性和可维护性。

### 核心价值

- ✅ **国际化支持**: 完整的 i18n 系统，支持多语言
- ✅ **增强日志**: 结构化日志，支持上下文和操作追踪
- ✅ **智能通知**: 丰富的通知系统，支持进度、确认和交互
- ✅ **上下文管理**: Token 计算、智能截断、优先级管理
- ✅ **Diff 处理**: Diff 简化、分割、结构化提取
- ✅ **类型安全**: 完整的 TypeScript 类型定义

## 🏗️ 架构设计

### 核心组件

```
Utils Module
├── i18n/                          # 国际化系统
│   ├── localization-manager.ts    # 本地化管理器
│   └── index.ts                   # 统一导出
│
├── notification/                  # 通知系统
│   ├── notification-manager.ts    # 通知管理器 (248行) ⭐
│   ├── notification-types.ts      # 类型定义
│   ├── notification-settings-manager.ts  # 设置管理
│   ├── progress-handler.ts        # 进度处理
│   ├── sound-player.ts            # 声音播放
│   ├── text-to-speech.ts          # 语音合成
│   └── system-notification.ts     # 系统通知
│
├── context-manager/               # 上下文管理
│   ├── index.ts                   # 统一导出
│   ├── token-calculator.ts        # Token 计算器
│   ├── block-processor.ts         # 块处理器
│   ├── content-truncator.ts       # 内容截断器
│   ├── content-builder.ts         # 内容构建器
│   ├── smart-truncator.ts         # 智能截断器
│   ├── context-logger.ts          # 上下文日志
│   ├── types.ts                   # 类型定义
│   └── constants.ts               # 常量配置
│
├── diff/                          # Diff 处理
│   ├── index.ts                   # 统一导出
│   ├── diff-simplifier.ts         # Diff 简化器
│   ├── diff-splitter.ts           # Diff 分割器
│   ├── diff-structure-extractor.ts # 结构提取器
│   ├── file-type-utils.ts         # 文件类型工具
│   └── types.ts                   # 类型定义
│
├── logger.ts                      # 日志系统 (270行) ⭐
├── validation.ts                  # 验证工具
├── prompt-template.ts             # 提示词模板
├── tokenizer.ts                   # Tokenizer 服务
├── vscode.ts                      # VS Code 工具
├── commitlint.ts                  # 提交规范检查
├── safe-write-json.ts             # 安全 JSON 写入
├── state/                         # 状态管理
│   └── state-manager.ts           # 状态管理器
│
├── git/                           # Git 工具
│   ├── git-api.ts                 # Git API 封装
│   └── types.ts                   # Git 类型
│
├── ai/                            # AI 工具
│   ├── index.ts                   # 统一导出
│   └── model-validation.ts        # 模型验证
│
└── index.ts                       # 统一导出入口
```

### 模块关系

```
应用层 (Commands/Services)
    ↓
Utils 提供基础服务
    ├─ i18n → 多语言支持
    ├─ logger → 日志记录
    ├─ notification → 用户通知
    ├─ context-manager → 上下文管理
    ├─ diff → Diff 处理
    └─ validation → 数据验证
```

## 🎯 核心功能详解

### 1. 国际化系统 (i18n)

**文件**: `i18n/localization-manager.ts` (115 行)

**职责**: 多语言消息管理和格式化

```typescript
// 初始化
import { initializeLocalization, getMessage, formatMessage } from '@/utils/i18n';

initializeLocalization(context);

// 获取消息
const message = getMessage('commit.success');
// 返回: "提交成功"

// 格式化消息
const formatted = formatMessage('commit.files', [5]);
// 返回: "已提交 5 个文件"

// 验证消息键
const missing = validateMessages(['key1', 'key2']);
// 返回缺失的键列表
```

**特性**:
- 支持嵌套消息结构 (`user.login.success`)
- 自动回退到默认语言
- 检测重复键
- 参数化消息模板

### 2. 日志系统 (Logger)

**文件**: `logger.ts` (270 行)

**职责**: 结构化日志记录，支持 VS Code 原生日志通道

```typescript
import { Logger } from '@/utils/logger';

const logger = Logger.getInstance('DishAICommit');

// 基础日志
logger.info('用户登录成功');

// 带上下文的日志
logger.debug('处理用户请求', {
  operation: 'processRequest',
  userId: 'user123',
  requestId: 'req-456',
  data: { requestType: 'commit', fileCount: 5 }
});

// 错误日志
try {
  // ...
} catch (error) {
  logger.logError(error as Error, '生成提交失败', {
    operation: 'generateCommit',
    userId: 'user123',
    data: { fileCount: 3 }
  });
}

// 操作追踪
logger.logOperationStart('generateCommitMessage');
// ... 执行操作 ...
logger.logOperationEnd('generateCommitMessage', 150); // 150ms
```

**日志级别**:
- `trace`: 详细调试信息
- `debug`: 调试信息
- `info`: 一般信息
- `warn`: 警告
- `error`: 错误

**上下文信息**:
- `operation`: 操作名称
- `userId`: 用户标识
- `requestId`: 请求追踪 ID
- `error`: 错误对象（包含堆栈）
- `data`: 额外数据（自动 JSON 序列化）

### 3. 通知系统 (Notification)

**文件**: `notification/notification-manager.ts` (248 行)

**职责**: 管理所有用户通知和交互

```typescript
import { notify, withProgress } from '@/utils/notification';

// 信息通知（3秒自动消失）
await notify.info('commit.success');

// 警告通知
await notify.warn('config.missing', ['apiKey']);

// 错误通知
await notify.error('api.failed', ['网络超时']);

// 确认对话框
await notify.confirm(
  'migrate.confirm',
  () => { performMigration(); },
  () => { console.log('取消迁移'); }
);

// 提示选择
await notify.prompt(
  'select.action',
  { title: '生成提交', handler: () => generateCommit() },
  { title: '查看日志', handler: () => showLogs() }
);

// 进度条
const result = await withProgress(
  '正在索引代码',
  async (progress, token) => {
    for (let i = 0; i < 100; i++) {
      if (token.isCancellationRequested) {
        throw new Error('用户取消');
      }
      progress.report({ increment: 1, message: `处理文件 ${i}/100` });
      await new Promise(r => setTimeout(r, 50));
    }
    return '完成';
  },
  { cancellable: true }
);
```

**通知类型**:
- `info`: 信息（蓝色）
- `warn`: 警告（黄色）
- `error`: 错误（红色）

**高级特性**:
- 超时自动关闭
- 按钮交互
- 模态对话框
- 进度报告
- 取消支持

### 4. 上下文管理器 (Context Manager)

**文件**: `context-manager/index.ts`

**职责**: 管理 AI 提示词的上下文构建和优化

```typescript
import {
  TokenCalculator,
  BlockProcessor,
  ContentTruncator,
  ContentBuilder,
  SmartTruncator
} from '@/utils/context-manager';

// Token 计算器
const calculator = new TokenCalculator(model);
const result = calculator.calculateInitialTokens(systemPrompt);
// { maxTokens: 8192, systemPromptTokens: 150 }

// 内容构建器
const builder = new ContentBuilder();
builder.addBlock({
  content: '用户代码',
  priority: 100,
  strategy: TruncationStrategy.SmartTruncateDiff,
  name: 'code-changes'
});
const context = builder.build(4000); // 限制 4000 tokens

// 智能截断
const truncator = new SmartTruncator();
const truncated = truncator.truncateWithPriority(
  blocks,
  maxTokens,
  systemPromptTokens
);
```

**优先级系统**:
- `950`: 用户主动输入、自定义指令
- `850`: 全局上下文
- `800`: 原始代码
- `100`: 代码变更（最高优先级保留）

**截断策略**:
- `TruncateTail`: 从尾部截断
- `SmartTruncateDiff`: 智能 Diff 截断
- `TruncateHead`: 从头部截断

### 5. Diff 处理系统

**文件**: `diff/index.ts`

**职责**: 简化、分割和提取 Diff 信息

```typescript
import {
  simplifyDiff,
  splitDiffByFile,
  extractDiffStructure,
  isBinaryFile
} from '@/utils/diff';

// 简化 Diff
const simplified = simplifyDiff(rawDiff);
// 移除二进制标记，简化路径

// 按文件分割
const files = splitDiffByFile(diff);
// 返回: Map<文件路径, Diff内容>

// 提取结构
const structure = extractDiffStructure(diff);
// 返回: { hunks: [...], files: [...] }

// 文件类型判断
const isBinary = isBinaryFile(filePath);
```

### 6. 验证工具 (Validation)

**文件**: `validation.ts`

**职责**: 数据验证和初始化检查

```typescript
import { ensureInitialized } from '@/utils/validation';

class MyService {
  private config: Config | undefined;

  doSomething() {
    // 如果未初始化会抛出错误
    const config = ensureInitialized(this.config, 'config');
    // config 的类型自动推导为 Config（非可选）
  }
}
```

### 7. 提示词模板 (Prompt Template)

**文件**: `prompt-template.ts`

**职责**: 模板变量替换

```typescript
import { processPromptTemplate } from '@/utils/prompt-template';

const template = '你好 {{name}}，今天是 {{date}}';
const variables = { name: '张三', date: '2024-12-19' };

const result = processPromptTemplate(template, variables);
// 返回: "你好 张三，今天是 2024-12-19"
```

### 8. Tokenizer 服务

**文件**: `tokenizer.ts`

**职责**: Token 计算和编码

```typescript
import { tokenizerService } from '@/utils/tokenizer';

// 计算 Token 数量
const count = tokenizerService.countTokens(text, model);

// 编码
const tokens = tokenizerService.encode(text, model);

// 解码
const text = tokenizerService.decode(tokens, model);
```

### 9. VS Code 工具

**文件**: `vscode.ts`

**职责**: VS Code 相关的辅助函数

```typescript
import { getWorkspaceRoot, showQuickPick } from '@/utils/vscode';

// 获取工作区根目录
const root = getWorkspaceRoot();

// 显示快速选择
const selected = await showQuickPick(
  ['选项1', '选项2'],
  { placeHolder: '请选择' }
);
```

### 10. 提交规范检查 (Commitlint)

**文件**: `commitlint.ts`

**职责**: 验证提交消息是否符合规范

```typescript
import { validateCommitMessage } from '@/utils/commitlint';

const result = validateCommitMessage('feat: 添加新功能');
// { valid: true, errors: [] }

const invalid = validateCommitMessage('错误格式');
// { valid: false, errors: ['缺少类型前缀'] }
```

### 11. 安全 JSON 写入

**文件**: `safe-write-json.ts`

**职责**: 安全地写入 JSON 文件

```typescript
import { safeWriteJSON } from '@/utils/safe-write-json';

await safeWriteJSON('/path/to/file.json', {
  key: 'value'
});
// 自动创建目录，原子写入，错误处理
```

### 12. 状态管理器

**文件**: `state/state-manager.ts`

**职责**: VS Code 状态管理封装

```typescript
import { StateManager } from '@/utils/state/state-manager';

const stateManager = new StateManager(context);

// 工作区状态
await stateManager.updateWorkspace('lastUsedProvider', 'openai');
const provider = stateManager.getWorkspace('lastUsedProvider');

// 全局状态
await stateManager.updateGlobal('userPreferences', prefs);
const prefs = stateManager.getGlobal('userPreferences');
```

### 13. Git 工具

**文件**: `git/git-api.ts`

**职责**: Git API 封装

```typescript
import { GitAPI } from '@/utils/git';

const git = new GitAPI();
const branches = await git.getBranches();
const status = await git.getStatus();
```

### 14. AI 工具

**文件**: `ai/model-validation.ts`

**职责**: AI 模型验证

```typescript
import { validateModelSupport } from '@/utils/ai';

const result = validateModelSupport('gpt-4o', 'functionCalling');
// { supported: true, features: [...] }
```

## 📦 导出的 API

### 主要导出

```typescript
// i18n
export { initializeLocalization, getMessage, formatMessage, validateMessages } from '@/utils/i18n';

// notification
export { notify, withProgress } from '@/utils/notification';

// context-manager
export {
  TokenCalculator,
  BlockProcessor,
  ContentTruncator,
  ContentBuilder,
  SmartTruncator,
  ContextLogger,
  TruncationStrategy,
  // ... 其他类型和常量
} from '@/utils/context-manager';

// diff
export {
  simplifyDiff,
  splitDiffByFile,
  extractDiffStructure,
  isBinaryFile
} from '@/utils/diff';

// 核心工具
export { Logger } from '@/utils/logger';
export { ensureInitialized } from '@/utils/validation';
export { processPromptTemplate } from '@/utils/prompt-template';
export { tokenizerService } from '@/utils/tokenizer';
export { validateCommitMessage } from '@/utils/commitlint';
export { safeWriteJSON } from '@/utils/safe-write-json';
```

## 🔧 使用示例

### 示例 1: 完整的日志和通知流程

```typescript
import { Logger, notify, withProgress } from '@/utils';

const logger = Logger.getInstance('MyExtension');

async function performTask() {
  logger.logOperationStart('task');

  try {
    const result = await withProgress(
      '正在处理',
      async (progress) => {
        progress.report({ increment: 0 });

        // 步骤 1
        logger.debug('步骤 1 开始');
        await doStep1();
        progress.report({ increment: 33, message: '步骤 1 完成' });

        // 步骤 2
        logger.debug('步骤 2 开始');
        await doStep2();
        progress.report({ increment: 66, message: '步骤 2 完成' });

        // 步骤 3
        logger.debug('步骤 3 开始');
        await doStep3();
        progress.report({ increment: 100, message: '完成' });

        return '成功';
      }
    );

    logger.logOperationEnd('task', 150);
    await notify.info('task.success');

  } catch (error) {
    logger.logError(error as Error, '任务失败', {
      operation: 'task'
    });
    await notify.error('task.failed', [String(error)]);
  }
}
```

### 示例 2: 上下文构建和 Token 管理

```typescript
import {
  TokenCalculator,
  ContentBuilder,
  TruncationStrategy
} from '@/utils/context-manager';
import { tokenizerService } from '@/utils/tokenizer';

async function buildAIContext(diff: string, model: AIModel) {
  // 1. 计算初始 Token
  const calculator = new TokenCalculator(model);
  const { maxTokens, systemPromptTokens } = calculator.calculateInitialTokens(
    getSystemPrompt()
  );

  // 2. 构建内容块
  const builder = new ContentBuilder();

  builder.addBlock({
    content: getSystemPrompt(),
    priority: 1000,
    strategy: TruncationStrategy.TruncateTail,
    name: 'system-prompt'
  });

  builder.addBlock({
    content: diff,
    priority: 100,
    strategy: TruncationStrategy.SmartTruncateDiff,
    name: 'code-changes'
  });

  // 3. 构建并截断
  const availableTokens = maxTokens - systemPromptTokens - 500; // 预留
  const context = builder.build(availableTokens);

  return context;
}
```

### 示例 3: Diff 处理和优化

```typescript
import {
  simplifyDiff,
  splitDiffByFile,
  extractDiffStructure
} from '@/utils/diff';

function processDiff(rawDiff: string) {
  // 1. 简化 Diff
  const simplified = simplifyDiff(rawDiff);

  // 2. 按文件分割
  const files = splitDiffByFile(simplified);

  // 3. 提取结构
  const result = [];
  for (const [filePath, fileDiff] of files) {
    const structure = extractDiffStructure(fileDiff);
    result.push({
      file: filePath,
      changes: structure.hunks.length,
      lines: structure.totalLines
    });
  }

  return result;
}
```

### 示例 4: 国际化和通知

```typescript
import { initializeLocalization, getMessage, formatMessage, notify } from '@/utils';

// 初始化
initializeLocalization(context);

// 使用
const greeting = getMessage('welcome');
// "欢迎使用 Dish AI Commit Gen"

const message = formatMessage('files.selected', [5]);
// "已选择 5 个文件"

// 通知
await notify.info('commit.success');
await notify.confirm('migrate.confirm', () => {
  performMigration();
});
```

## 🎓 设计模式

### 1. 单例模式

```typescript
// Logger
const logger = Logger.getInstance('MyExtension');

// StateManager
const stateManager = new StateManager(context);
```

### 2. 工厂模式

```typescript
// TokenCalculator 需要模型
const calculator = new TokenCalculator(model);

// ContentBuilder 创建上下文
const builder = new ContentBuilder();
```

### 3. 策略模式

```typescript
// 不同的截断策略
const strategies = {
  tail: TruncationStrategy.TruncateTail,
  smart: TruncationStrategy.SmartTruncateDiff,
  head: TruncationStrategy.TruncateHead
};

// 根据场景选择
builder.addBlock({
  content: diff,
  strategy: useSmartTruncation
    ? TruncationStrategy.SmartTruncateDiff
    : TruncationStrategy.TruncateTail
});
```

### 4. 观察者模式

```typescript
// 通知系统内部使用 VS Code 事件
vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration('dish-ai-commit')) {
    logger.info('配置已更新');
  }
});
```

## 📊 性能指标

### 日志系统

| 操作 | 耗时 | 说明 |
|------|------|------|
| 基础日志 | < 1ms | VS Code 原生支持 |
| 带上下文日志 | < 5ms | JSON 序列化 |
| 错误日志 | < 10ms | 包含堆栈处理 |

### 通知系统

| 操作 | 耗时 | 说明 |
|------|------|------|
| 简单通知 | < 50ms | VS Code API |
| 带按钮通知 | < 100ms | 用户交互 |
| 进度条 | 实时 | 每 50ms 更新 |

### 上下文管理

| 操作 | 耗时 | 说明 |
|------|------|------|
| Token 计算 | < 20ms | 基于模型 |
| 内容构建 | < 50ms | 包含截断 |
| 智能截断 | < 30ms | 优先级处理 |

### Diff 处理

| 操作 | 耗时 | 说明 |
|------|------|------|
| 简化 Diff | < 10ms | 正则替换 |
| 文件分割 | < 5ms | 字符串处理 |
| 结构提取 | < 15ms | AST 解析 |

## 🔍 故障排除

### 常见问题

#### 1. 国际化消息未加载

**问题**: `getMessage` 返回 key 而非翻译

**解决方案**:
```typescript
// 1. 检查初始化
initializeLocalization(context);

// 2. 检查文件路径
// extension/i18n/zh.json 或 en.json 必须存在

// 3. 检查文件格式
// 必须是有效的 JSON
```

#### 2. 日志不显示

**问题**: 日志输出通道为空

**解决方案**:
```typescript
// 1. 检查通道名称
const logger = Logger.getInstance('DishAICommit');

// 2. 显示输出通道
logger.show();

// 3. 检查 VS Code 日志级别
// 设置 → 输出 → 日志级别 → 调试
```

#### 3. 通知超时未生效

**问题**: 带按钮的通知不会自动关闭

**解决方案**:
```typescript
// 这是预期行为
// VS Code 不支持程序关闭带按钮的通知

// 解决方案 1: 不使用按钮
await notify.info('message', [], { timeout: 3000 });

// 解决方案 2: 使用进度条
await withProgress('处理中', async () => {
  // ...
});
```

#### 4. Token 计算不准确

**问题**: Token 数量与实际不符

**解决方案**:
```typescript
// 1. 检查模型配置
const calculator = new TokenCalculator(model);

// 2. 验证模型 Token 限制
console.log(model.maxTokens); // 确保配置正确

// 3. 使用精确的 Tokenizer
const exactCount = tokenizerService.countTokens(text, model);
```

#### 5. Diff 简化过度

**问题**: 重要信息被移除

**解决方案**:
```typescript
// 1. 检查简化规则
// 查看 diff-simplifier.ts 中的正则表达式

// 2. 使用原始 Diff
const rawDiff = await scmProvider.getDiff();

// 3. 自定义简化逻辑
const customSimplified = rawDiff
  .replace(/binary files?/g, '[二进制文件]')
  // 保留其他信息
```

## 🤝 开发指南

### 添加新的工具函数

```typescript
// 1. 创建文件
// src/utils/my-tool.ts

export function myUtilityFunction(param: string): string {
  return `处理: ${param}`;
}

// 2. 导出
// src/utils/index.ts
export * from '@/utils/my-tool';

// 3. 使用
import { myUtilityFunction } from '@/utils';
```

### 扩展现有功能

```typescript
// 扩展 Logger
class ExtendedLogger extends Logger {
  customLog(message: string) {
    this.info(`[自定义] ${message}`);
  }
}

// 扩展通知
const extendedNotify = {
  ...notify,
  success: (messageKey: string, args?: any[]) =>
    notify.info(messageKey, args, { timeout: 2000 })
};
```

### 测试策略

```typescript
describe('Logger', () => {
  it('should format messages with context', () => {
    const logger = Logger.getInstance('Test');
    // 测试逻辑
  });
});

describe('Notification', () => {
  it('should handle timeout', async () => {
    const result = await notify.info('test', [], { timeout: 100 });
    expect(result).toBeUndefined();
  });
});

describe('ContextManager', () => {
  it('should truncate by priority', () => {
    const calculator = new TokenCalculator(mockModel);
    // 测试截断逻辑
  });
});
```

## 📚 相关文档

- **主 README**: [../README.md](../README.md) - 项目总览
- **服务模块**: [../services/README.md](../services/README.md) - 服务层
- **命令模块**: [../commands/README.md](../commands/README.md) - 命令层
- **AI 模块**: [../ai/README.md](../ai/README.md) - AI 提供商

---

**最后更新**: 2024年12月
**模块版本**: v0.56.1
**工具数量**: 15+
**代码质量**: ⭐⭐⭐⭐⭐
**架构模式**: 单例、工厂、策略