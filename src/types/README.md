# Types 模块 - TypeScript 类型系统

## 📋 概述

Types 模块是 Dish AI Commit Gen 的类型安全核心，提供完整的 TypeScript 类型定义、Zod 验证 schema 和接口规范。模块采用**声明式类型设计**，确保跨模块的数据一致性和编译时类型检查。

### 核心价值

- ✅ **完整的类型定义**: 覆盖所有配置、数据结构和 API 接口
- ✅ **Zod 集成**: 运行时验证 + 编译时类型推导
- ✅ **类型安全**: 全面的 TypeScript 类型覆盖
- ✅ **可扩展性**: 易于添加新类型和扩展现有类型
- ✅ **文档化**: 类型即文档，自解释的接口设计
- ✅ **VS Code 集成**: 包含 VS Code Git 扩展的类型定义

## 🏗️ 架构设计

### 核心组件

```
Types Module
├── settings.ts                    # 配置和设置类型 (288行) ⭐
├── provider-config.ts             # Provider 配置类型
├── prompts.ts                     # 提示词类型和枚举
├── weekly-report.ts               # 周报相关类型
├── git.ts                         # VS Code Git API 类型 (486行) ⭐
├── git.d.ts                       # Git 类型声明
└── index.ts                       # 统一导出
```

### 类型层次结构

```
基础类型
├── ProviderType                  # 提供商类型
├── ModelConfig                   # 模型配置
├── ProviderConfig                # 提供商配置
├── UserPreferences               # 用户偏好
└── Profile                       # 完整配置档案

配置类型
├── ExtensionConfig               # 扩展配置
├── FeatureSettings               # 功能开关
├── ConnectionTestResult          # 连接测试
└── ConfigValidationResult        # 配置验证

提示词类型
├── PromptKey                     # 提示词键枚举
├── PromptCategory                # 提示词分类
├── PromptVariable                # 提示词变量
└── PromptDetail                  # 提示词详情

Git 类型
├── Repository                    # 仓库接口
├── Branch                        # 分支接口
├── Commit                        # 提交接口
├── API                           # Git API 接口
└── GitExtension                  # Git 扩展接口
```

## 🎯 核心类型详解

### 1. 配置类型 (settings.ts)

**文件**: `settings.ts` (288 行)

**职责**: 定义所有配置相关的类型和 Zod schema

#### Provider 类型系统

```typescript
// 提供商类型枚举
export const providerTypeSchema = z.enum([
  "first-party",      // 第一方提供商 (OpenAI, Anthropic)
  "aggregator",       // 聚合服务 (OpenRouter, Together)
  "local",            // 本地服务 (Ollama, LMStudio)
  "cloud",            // 云服务 (Azure, Vertex AI)
  "openai-compatible", // OpenAI 兼容
]);
export type ProviderType = z.infer<typeof providerTypeSchema>;

// 模型配置
export const modelConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  maxTokens: z.object({
    input: z.number(),
    output: z.number(),
  }),
  deprecated: z.boolean().optional(),
  capabilities: z.object({
    streaming: z.boolean().optional(),
    functionCalling: z.boolean().optional(),
  }).optional(),
  cost: z.object({
    input: z.number(),
    output: z.number(),
  }).optional(),
});
export type ModelConfig = z.infer<typeof modelConfigSchema>;

// 提供商配置
export const providerConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: providerTypeSchema,
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  region: z.string().optional(),
  projectId: z.string().optional(),
  customHeaders: z.record(z.string(), z.string()).optional(),
  models: z.array(modelConfigSchema).optional(),
  defaultModel: z.string().optional(),
  organization: z.string().optional(),
  createdAt: z.date().or(z.string().datetime()).optional(),
  updatedAt: z.date().or(z.string().datetime()).optional(),
});
export type ProviderConfig = z.infer<typeof providerConfigSchema>;
```

#### 用户偏好类型

```typescript
export const userPreferencesSchema = z.object({
  temperature: z.number(),
  verbosity: z.number(),
  rateLimitSeconds: z.number(),
  consecutiveMistakeLimit: z.number(),
  language: z.enum([
    "Simplified Chinese",
    "Traditional Chinese",
    "Japanese",
    "Korean",
    "Czech",
    "German",
    "French",
    "Italian",
    "Dutch",
    "Portuguese",
    "Vietnamese",
    "English",
    "Spanish",
    "Swedish",
    "Russian",
    "Bahasa",
    "Polish",
    "Turkish",
    "Thai",
  ]),
  maxTokens: z.number().optional(),
  timeout: z.number().optional(),
  retryAttempts: z.number().optional(),
  skipDiffFileExtensions: z.array(z.string()).optional(),
  skipDiffPathPatterns: z.array(z.string()).optional(),
  maxDiffFileSizeKB: z.number().optional(),
  autoDetectBinaryFiles: z.boolean().optional(),
  respectGitAttributes: z.boolean().optional(),
  commitTemperature: z.number().optional(),
  reviewTemperature: z.number().optional(),
  branchNameTemperature: z.number().optional(),
  weeklyReportTemperature: z.number().optional(),
});
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
```

#### Profile 类型

```typescript
export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  providers: z.record(z.string(), providerConfigSchema),
  preferences: userPreferencesSchema,
  createdAt: z.date().or(z.string().datetime()),
  updatedAt: z.date().or(z.string().datetime()),
  version: z.string(),
  activeProviderId: z.string().optional(),
  isAutoMigrated: z.boolean().optional(),
});
export type Profile = z.infer<typeof profileSchema>;
```

#### 功能设置

```typescript
export interface FeatureSettings {
  enableEmoji: boolean;
  enableMergeCommit: boolean;
  enableBody: boolean;
  enableLayeredCommit: boolean;
  enableGlobalContext: boolean;
  useRecentCommitsAsReference: boolean;
  simplifyDiff: boolean;
  autoDetectStaged: boolean;
  fallbackToAll: boolean;
  diffTarget: "staged" | "all" | "auto";
  suppressNonCriticalWarnings: boolean;
  weeklyReport: boolean;
  codeReview: boolean;
  generateBranchName: boolean;
  generatePRSummary: boolean;
}
```

#### 默认配置常量

```typescript
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  temperature: 0.0,
  verbosity: 0,
  rateLimitSeconds: 5,
  consecutiveMistakeLimit: 3,
  language: "Simplified Chinese",
  maxTokens: 4000,
  timeout: 30000,
  retryAttempts: 3,
  skipDiffFileExtensions: DEFAULT_SKIP_DIFF_EXTENSIONS,
  skipDiffPathPatterns: DEFAULT_SKIP_DIFF_PATTERNS,
  maxDiffFileSizeKB: 1024,
  autoDetectBinaryFiles: true,
  respectGitAttributes: true,
  commitTemperature: 0.7,
  reviewTemperature: 0.8,
  branchNameTemperature: 0.7,
  weeklyReportTemperature: 0.9,
};
```

### 2. 提示词类型 (prompts.ts)

**文件**: `prompts.ts` (187 行)

**职责**: 提示词的枚举、分类和变量定义

#### 提示词键枚举

```typescript
export enum PromptKey {
  BranchNameSystem = "branchNameSystem",
  CodeReviewSimple = "codeReviewSimple",
  CodeReviewSystem = "codeReviewSystem",
  GenerateCommitFallbackSystem = "generateCommitFallbackSystem",
  GenerateCommitSimple = "generateCommitSimple",
  GenerateCommitSystem = "generateCommitSystem",
  LayeredCommitFile = "layeredCommitFile",
  LayeredCommitBatch = "layeredCommitBatch",
  PRSummarySystem = "prSummarySystem",
  WeeklyReport = "weeklyReport",
}
```

#### 提示词分类

```typescript
export enum PromptCategory {
  Commit = "commit",
  CodeReview = "codeReview",
  PR = "pr",
  Report = "report",
  Git = "git",
  Custom = "custom",
}

export const CATEGORY_DISPLAY_NAMES: Record<PromptCategory, string> = {
  [PromptCategory.Commit]: "提交生成",
  [PromptCategory.CodeReview]: "代码审查",
  [PromptCategory.PR]: "拉取请求",
  [PromptCategory.Report]: "报告",
  [PromptCategory.Git]: "Git操作",
  [PromptCategory.Custom]: "自定义提示词",
};

export const PROMPT_CATEGORIES: Record<PromptKey, PromptCategory> = {
  [PromptKey.BranchNameSystem]: PromptCategory.Git,
  [PromptKey.CodeReviewSimple]: PromptCategory.CodeReview,
  [PromptKey.CodeReviewSystem]: PromptCategory.CodeReview,
  [PromptKey.GenerateCommitFallbackSystem]: PromptCategory.Commit,
  [PromptKey.GenerateCommitSimple]: PromptCategory.Commit,
  [PromptKey.GenerateCommitSystem]: PromptCategory.Commit,
  [PromptKey.LayeredCommitFile]: PromptCategory.Commit,
  [PromptKey.LayeredCommitBatch]: PromptCategory.Commit,
  [PromptKey.PRSummarySystem]: PromptCategory.PR,
  [PromptKey.WeeklyReport]: PromptCategory.Report,
};
```

#### 提示词变量

```typescript
export interface PromptVariable {
  name: string;
  description: string;
}

export const PROMPT_VARIABLES: Record<PromptKey, PromptVariable[]> = {
  [PromptKey.BranchNameSystem]: [
    {
      name: "diffContent",
      description: "Git/SVN diff content for branch name generation",
    },
  ],
  [PromptKey.GenerateCommitSystem]: [
    { name: "language", description: "Target language for the output" },
    {
      name: "type_reference",
      description: "Auto-generated commit type table (respects config)",
    },
    {
      name: "format_template",
      description: "Auto-generated format guide (respects config)",
    },
    {
      name: "examples",
      description: "Auto-generated examples (respects config & VCS)",
    },
    {
      name: "thinking_process",
      description: "Auto-generated Chain-of-Thought steps",
    },
  ],
  // ... 其他提示词变量
};
```

### 3. Git 类型 (git.ts)

**文件**: `git.ts` (486 行)

**职责**: VS Code Git 扩展的完整类型定义

#### 核心接口

```typescript
// Git 执行器
export interface Git {
  readonly path: string;
}

// 输入框
export interface InputBox {
  value: string;
}

// 引用类型
export const enum RefType {
  Head,
  RemoteHead,
  Tag,
}

// 分支
export interface Branch extends Ref {
  readonly upstream?: UpstreamRef;
  readonly ahead?: number;
  readonly behind?: number;
}

// 提交
export interface Commit {
  readonly hash: string;
  readonly message: string;
  readonly parents: string[];
  readonly authorDate?: Date;
  readonly authorName?: string;
  readonly authorEmail?: string;
  readonly commitDate?: Date;
  readonly shortStat?: CommitShortStat;
}

// 仓库状态
export interface RepositoryState {
  readonly HEAD: Branch | undefined;
  readonly refs: Ref[];
  readonly remotes: Remote[];
  readonly submodules: Submodule[];
  readonly rebaseCommit: Commit | undefined;

  readonly mergeChanges: Change[];
  readonly indexChanges: Change[];
  readonly workingTreeChanges: Change[];
  readonly untrackedChanges: Change[];

  readonly onDidChange: Event<void>;
}
```

#### 仓库接口

```typescript
export interface Repository {
  readonly rootUri: Uri;
  readonly inputBox: InputBox;
  readonly state: RepositoryState;
  readonly ui: RepositoryUIState;

  readonly onDidCommit: Event<void>;
  readonly onDidCheckout: Event<void>;

  // 配置操作
  getConfigs(): Promise<{ key: string; value: string }[]>;
  getConfig(key: string): Promise<string>;
  setConfig(key: string, value: string): Promise<string>;

  // 文件操作
  add(paths: string[]): Promise<void>;
  revert(paths: string[]): Promise<void>;
  clean(paths: string[]): Promise<void>;

  // Diff 操作
  diff(cached?: boolean): Promise<string>;
  diffWithHEAD(): Promise<Change[]>;
  diffWith(ref: string, path: string): Promise<string>;

  // 分支操作
  createBranch(name: string, checkout: boolean, ref?: string): Promise<void>;
  deleteBranch(name: string, force?: boolean): Promise<void>;
  getBranch(name: string): Promise<Branch>;
  getBranches(query: BranchQuery): Promise<Ref[]>;

  // 提交操作
  commit(message: string, opts?: CommitOptions): Promise<void>;

  // 日志
  log(options?: LogOptions): Promise<Commit[]>;
}
```

#### Git API

```typescript
export interface API {
  readonly state: APIState;
  readonly onDidChangeState: Event<APIState>;
  readonly onDidPublish: Event<PublishEvent>;
  readonly git: Git;
  readonly repositories: Repository[];
  readonly onDidOpenRepository: Event<Repository>;
  readonly onDidCloseRepository: Event<Repository>;

  toGitUri(uri: Uri, ref: string): Uri;
  getRepository(uri: Uri): Repository | null;
  getRepositoryRoot(uri: Uri): Promise<Uri | null>;
  init(root: Uri, options?: InitOptions): Promise<Repository | null>;
  openRepository(root: Uri): Promise<Repository | null>;

  registerRemoteSourcePublisher(publisher: RemoteSourcePublisher): Disposable;
  registerRemoteSourceProvider(provider: RemoteSourceProvider): Disposable;
  registerCredentialsProvider(provider: CredentialsProvider): Disposable;
}

export interface GitExtension {
  readonly enabled: boolean;
  readonly onDidChangeEnablement: Event<boolean>;
  getAPI(version: 1): API;
}
```

### 4. 周报类型 (weekly-report.ts)

**文件**: `weekly-report.ts` (56 行)

**职责**: 周报生成相关的数据结构

```typescript
// 周报配置
export interface Config {
  totalHours: number;
  totalDays: number;
  minUnit: number;
}

// Jira 问题
export interface JiraIssue {
  key: string;
  title: string;
  linkUsers?: string[];
  priority?: string;
  description?: string;
}

// 工作项
export interface WorkItem {
  content: string;
  time: string;
  description: string;
}

// 代码仓库
export interface Repository {
  type: 'git' | 'svn';
  path: string;
  author?: string;
}
```

## 📦 类型工具和辅助

### 事件和回调类型

```typescript
// 设置变更事件
export interface SettingsChangeEvent {
  type: "provider" | "profile" | "preferences" | "feature";
  action: "create" | "update" | "delete" | "activate";
  target: string;
  timestamp: Date;
}

// 验证结果
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// 连接测试结果
export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  latency?: number;
  timestamp: Date;
}

// 回调类型
export type ProviderValidator = (
  provider: ProviderConfig
) => ConfigValidationResult;

export type ProviderChangeCallback = (
  providerId: string,
  provider: ProviderConfig
) => void;

export type SettingsChangeCallback = (event: SettingsChangeEvent) => void;
```

## 🔧 使用示例

### 示例 1: 使用 Zod Schema 验证

```typescript
import {
  providerConfigSchema,
  userPreferencesSchema,
  profileSchema
} from '@/types/settings';

// 验证 Provider 配置
const validationResult = providerConfigSchema.safeParse({
  id: "openai",
  name: "OpenAI",
  type: "first-party",
  apiKey: "sk-...",
  baseUrl: "https://api.openai.com/v1"
});

if (validationResult.success) {
  const config = validationResult.data;
  // config 的类型自动推导为 ProviderConfig
} else {
  console.error(validationResult.error);
}

// 验证用户偏好
const prefsResult = userPreferencesSchema.safeParse({
  temperature: 0.7,
  language: "Simplified Chinese",
  // ...
});

// 验证完整 Profile
const profileResult = profileSchema.safeParse({
  id: "profile-1",
  name: "Default",
  providers: { openai: { ... } },
  preferences: { ... },
  createdAt: new Date(),
  updatedAt: new Date(),
  version: "1.0.0"
});
```

### 示例 2: 类型安全的配置管理

```typescript
import type { Profile, ProviderConfig, UserPreferences } from '@/types/settings';

class ProfileManager {
  private profile: Profile | null = null;

  // 获取配置 - 类型安全
  getProfile(): Profile {
    if (!this.profile) {
      throw new Error("Profile not initialized");
    }
    return this.profile;
  }

  // 更新 Provider - 类型检查
  updateProvider(id: string, config: Partial<ProviderConfig>): void {
    const profile = this.getProfile();

    if (!profile.providers[id]) {
      throw new Error(`Provider ${id} not found`);
    }

    // TypeScript 会确保 config 符合 ProviderConfig
    profile.providers[id] = {
      ...profile.providers[id],
      ...config,
      updatedAt: new Date()
    };
  }

  // 更新偏好 - 类型安全
  updatePreferences(prefs: Partial<UserPreferences>): void {
    const profile = this.getProfile();

    // TypeScript 会确保 prefs 符合 UserPreferences
    profile.preferences = {
      ...profile.preferences,
      ...prefs
    };
  }
}
```

### 示例 3: Git 类型使用

```typescript
import type { Repository, Commit, Branch } from '@/types/git';

class GitHelper {
  // 获取提交日志 - 类型安全
  async getRecentCommits(repo: Repository, limit: number = 10): Promise<Commit[]> {
    return await repo.log({ maxEntries: limit });
  }

  // 获取分支信息 - 类型安全
  async getBranchInfo(repo: Repository, branchName: string): Promise<Branch> {
    return await repo.getBranch(branchName);
  }

  // 处理变更 - 类型安全
  async processChanges(repo: Repository): Promise<void> {
    const changes = await repo.diffWithHEAD();

    // changes 的类型是 Change[]
    for (const change of changes) {
      console.log(change.uri.fsPath);
      console.log(change.status);
    }
  }
}
```

### 示例 4: 提示词类型管理

```typescript
import {
  PromptKey,
  PromptCategory,
  PROMPT_CATEGORIES,
  PROMPT_DISPLAY_NAMES,
  PROMPT_VARIABLES
} from '@/types/prompts';

// 获取提示词信息
function getPromptInfo(key: PromptKey) {
  const category = PROMPT_CATEGORIES[key];
  const displayName = PROMPT_DISPLAY_NAMES[key];
  const variables = PROMPT_VARIABLES[key];

  return {
    key,
    category,
    displayName,
    variables,
    categoryDisplayName: CATEGORY_DISPLAY_NAMES[category]
  };
}

// 示例: 获取提交生成提示词信息
const commitPromptInfo = getPromptInfo(PromptKey.GenerateCommitSystem);
// {
//   key: "GenerateCommitSystem",
//   category: "commit",
//   displayName: "Commit 消息 (高级)",
//   variables: [...],
//   categoryDisplayName: "提交生成"
// }
```

### 示例 5: 事件处理

```typescript
import type { SettingsChangeEvent, SettingsChangeCallback } from '@/types/settings';

class SettingsManager {
  private listeners: SettingsChangeCallback[] = [];

  // 注册监听器
  onSettingsChange(callback: SettingsChangeCallback): void {
    this.listeners.push(callback);
  }

  // 触发事件
  private emitChange(event: SettingsChangeEvent): void {
    this.listeners.forEach(callback => callback(event));
  }

  // 更新 Provider
  async updateProvider(id: string, config: ProviderConfig): Promise<void> {
    // ... 更新逻辑 ...

    this.emitChange({
      type: "provider",
      action: "update",
      target: id,
      timestamp: new Date()
    });
  }
}

// 使用
const manager = new SettingsManager();
manager.onSettingsChange((event) => {
  console.log(`Settings changed: ${event.type} - ${event.action}`);
});
```

## 🎓 设计模式

### 1. Zod Schema 模式

```typescript
// Schema 定义
const schema = z.object({
  id: z.string(),
  name: z.string(),
  optional: z.string().optional()
});

// 类型推导
type Type = z.infer<typeof schema>;

// 验证
const result = schema.safeParse(data);
if (result.success) {
  // result.data 是类型安全的
}
```

### 2. 枚举模式

```typescript
// 定义
export enum PromptCategory {
  Commit = "commit",
  CodeReview = "codeReview",
}

// 映射
export const CATEGORY_DISPLAY_NAMES: Record<PromptCategory, string> = {
  [PromptCategory.Commit]: "提交生成",
  [PromptCategory.CodeReview]: "代码审查",
};

// 使用
const display = CATEGORY_DISPLAY_NAMES[PromptCategory.Commit];
```

### 3. 接口扩展模式

```typescript
// 基础接口
export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
}

// 扩展接口
export interface ExtensionConfig {
  features: {
    codeIndexing: boolean;
    commitChat: boolean;
  };
}
```

### 4. 事件驱动模式

```typescript
// 事件接口
export interface SettingsChangeEvent {
  type: "provider" | "profile";
  action: "create" | "update" | "delete";
  target: string;
  timestamp: Date;
}

// 回调类型
export type SettingsChangeCallback = (event: SettingsChangeEvent) => void;
```

## 📊 类型统计

| 类型类别 | 文件数 | 接口数 | 枚举数 | Zod Schema |
|---------|--------|--------|--------|------------|
| 配置类型 | 2 | 15+ | 2 | 5 |
| 提示词类型 | 1 | 5 | 3 | 0 |
| Git 类型 | 2 | 40+ | 3 | 0 |
| 周报类型 | 1 | 4 | 0 | 0 |
| **总计** | **6** | **60+** | **8** | **5** |

## 🔍 故障排除

### 常见问题

#### 1. 类型推导失败

**问题**: TypeScript 无法推导正确的类型

**解决方案**:
```typescript
// 1. 显式指定类型
const config: ProviderConfig = {
  id: "openai",
  name: "OpenAI",
  type: "first-party"
};

// 2. 使用类型断言
const config = {
  id: "openai",
  name: "OpenAI",
  type: "first-party"
} as ProviderConfig;

// 3. 使用 Zod 验证
const result = providerConfigSchema.safeParse(data);
if (result.success) {
  const config: ProviderConfig = result.data; // 自动推导
}
```

#### 2. Zod 验证错误

**问题**: 运行时验证失败

**解决方案**:
```typescript
// 1. 检查必填字段
const requiredFields = ['id', 'name', 'type'];
const missing = requiredFields.filter(f => !(f in data));

// 2. 查看详细错误
const result = schema.safeParse(data);
if (!result.error) {
  result.error.issues.forEach(issue => {
    console.log(`${issue.path}: ${issue.message}`);
  });
}

// 3. 使用默认值
const config = {
  ...data,
  createdAt: data.createdAt || new Date(),
  updatedAt: data.updatedAt || new Date()
};
```

#### 3. Git 类型不匹配

**问题**: VS Code Git API 类型不兼容

**解决方案**:
```typescript
// 1. 检查 VS Code 版本
// 确保使用兼容的 @types/vscode 版本

// 2. 使用 ProviderResult
import type { ProviderResult } from '@/types/git';

async function getBranch(name: string): ProviderResult<Branch> {
  // 可以返回 Branch | undefined | Promise<Branch | undefined>
}

// 3. 处理可能的 undefined
const repo = gitApi.getRepository(uri);
if (repo) {
  const branch = await repo.getBranch('main');
  // branch 可能是 undefined
}
```

#### 4. 枚举使用错误

**问题**: 枚举值不匹配或未处理所有情况

**解决方案**:
```typescript
// 1. 使用 Record 映射
const displayNames: Record<PromptCategory, string> = {
  [PromptCategory.Commit]: "提交生成",
  [PromptCategory.CodeReview]: "代码审查",
  // TypeScript 会检查是否完整
};

// 2. 使用 switch 处理所有情况
function getCategoryDisplay(category: PromptCategory): string {
  switch (category) {
    case PromptCategory.Commit:
      return "提交生成";
    case PromptCategory.CodeReview:
      return "代码审查";
    // ... 其他情况
    default:
      const _exhaustive: never = category;
      return "未知";
  }
}

// 3. 使用 never 类型确保完整性
function processCategory(cat: PromptCategory) {
  if (cat === PromptCategory.Commit) {
    // ...
  } else if (cat === PromptCategory.CodeReview) {
    // ...
  } else {
    const _exhaustive: never = cat; // 如果遗漏类型，这里会报错
  }
}
```

## 🤝 开发指南

### 添加新类型

```typescript
// 1. 定义 Zod Schema
export const newFeatureSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  options: z.array(z.string()).optional()
});

// 2. 导出类型
export type NewFeature = z.infer<typeof newFeatureSchema>;

// 3. 添加到相关接口
export interface ExtensionConfig {
  features: {
    codeIndexing: boolean;
    commitChat: boolean;
    newFeature: NewFeature; // 新增
  };
}

// 4. 导出
export * from '@/types/new-feature';
```

### 扩展现有类型

```typescript
// 扩展 ProviderConfig
export const providerConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: providerTypeSchema,
  // 新增字段
  customModels: z.array(z.string()).optional(),
  rateLimit: z.number().optional()
  // ...
});

// 向后兼容
export type ProviderConfig = z.infer<typeof providerConfigSchema>;
```

### 类型安全最佳实践

```typescript
// ✅ 推荐
interface Config {
  id: string;
  name: string;
  optional?: string; // 可选字段明确标记
}

// ❌ 避免
interface Config {
  id: string;
  name: string;
  optional: string | undefined; // 不如使用 ?
}

// ✅ 推荐
const schema = z.object({
  id: z.string(),
  name: z.string(),
  optional: z.string().optional()
});

// ✅ 推荐
type Result = Success | Failure;

interface Success {
  success: true;
  data: Profile;
}

interface Failure {
  success: false;
  error: string;
}

// 使用
if (result.success) {
  // result.data 类型安全
} else {
  // result.error 类型安全
}
```

## 📚 相关文档

- **主 README**: [../README.md](../README.md) - 项目总览
- **配置系统**: [../config/README.md](../config/README.md) - 配置定义
- **AI 模块**: [../ai/README.md](../ai/README.md) - AI 类型
- **SCM 模块**: [../scm/README.md](../scm/README.md) - SCM 类型

---

**最后更新**: 2024年12月
**模块版本**: v0.56.1
**类型数量**: 60+
**Zod Schema**: 5
**代码行数**: 800+
**代码质量**: ⭐⭐⭐⭐⭐