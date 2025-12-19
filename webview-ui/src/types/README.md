# Types 模块文档

## 📋 概述

Types 模块定义了应用的核心 TypeScript 类型和接口，确保类型安全和代码可维护性。

## 📁 文件结构

```
types/
├── settings.ts           # 设置相关类型
└── README.md             # 本文档
```

## 🔧 核心类型定义

### 1. ProviderType (提供商类型)

```typescript
type ProviderType =
  | "first-party" // Anthropic, OpenAI, Gemini
  | "aggregator" // OpenRouter, Glama, Unbound
  | "local" // Ollama, LMStudio
  | "cloud" // Bedrock, Vertex
  | "openai-compatible"; // 通用 OpenAI 兼容
```

**用途**: 区分不同类型的 AI 提供商，用于配置和显示。

### 2. ModelConfig (模型配置)

```typescript
interface ModelConfig {
  id: string; // 模型 ID (如: "gpt-4o")
  name: string; // 显示名称 (如: "GPT-4o")
  provider: string; // 提供商 ID (如: "openai")
  maxTokens: {
    // 令牌限制
    input: number; // 输入令牌上限
    output: number; // 输出令牌上限
  };
  deprecated?: boolean; // 是否已弃用
  capabilities?: {
    // 模型能力
    streaming?: boolean; // 支持流式输出
    functionCalling?: boolean; // 支持函数调用
  };
  cost?: {
    // 成本信息（可选）
    input: number; // 每千令牌输入价格
    output: number; // 每千令牌输出价格
  };
}
```

**示例**:

```typescript
const gpt4o: ModelConfig = {
  id: "gpt-4o",
  name: "GPT-4o",
  provider: "openai",
  maxTokens: { input: 128000, output: 4096 },
  capabilities: {
    streaming: true,
    functionCalling: true,
  },
  cost: { input: 5.0, output: 15.0 }, // $5 / $15 每百万令牌
};
```

### 3. ProviderConfig (提供商配置)

```typescript
interface ProviderConfig {
  id: string; // 配置 ID
  name: string; // 配置名称
  type: ProviderType; // 提供商类型
  apiKey?: string; // API 密钥（可选，本地提供商不需要）
  baseURL?: string; // 自定义 API 地址
  region?: string; // 区域（如 AWS Bedrock）
  projectId?: string; // 项目 ID（如 Google Cloud）
  customHeaders?: Record<string, string>; // 自定义请求头
  models: ModelConfig[]; // 可用模型列表
  defaultModel?: string; // 默认模型 ID
  organization?: string; // 组织 ID（OpenAI）
  isActive?: boolean; // 是否激活
  createdAt?: Date; // 创建时间
  updatedAt?: Date; // 更新时间

  // 新增字段
  cliPath?: string; // CLI 路径（本地）
  maxOutputTokens?: number; // 最大输出令牌
  useCustomUrl?: boolean; // 使用自定义 URL
  apiVersion?: string; // API 版本
  accountId?: string; // 账户 ID

  // 动态字段
  customFields?: Record<string, unknown>;

  // 高级设置
  timeout?: number; // 超时时间（毫秒）
  retries?: number; // 重试次数
  temperature?: number; // 温度参数
  maxTokens?: number; // 最大令牌数
}
```

**示例**:

```typescript
const openaiConfig: ProviderConfig = {
  id: "openai-1",
  name: "OpenAI",
  type: "first-party",
  apiKey: "sk-...",
  baseURL: "https://api.openai.com/v1",
  models: [gpt4o, gpt4oMini],
  defaultModel: "gpt-4o",
  isActive: true,
  timeout: 30000,
  retries: 3,
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

### 4. UserPreferences (用户偏好)

```typescript
interface UserPreferences {
  // 基本设置
  temperature: number; // AI 创造力 (0-2)
  verbosity: number; // 详细程度 (0-2)
  rateLimitSeconds: number; // 速率限制（秒）
  consecutiveMistakeLimit: number; // 连续错误限制
  language: string; // 界面语言

  // 高级设置
  maxTokens?: number; // 最大生成令牌
  timeout?: number; // 请求超时（毫秒）
  retryAttempts?: number; // 重试次数

  // Diff 跳过配置
  skipDiffFileExtensions?: string[]; // 跳过的文件扩展名
  maxDiffFileSizeKB?: number; // 最大 Diff 文件大小
  autoDetectBinaryFiles?: boolean; // 自动检测二进制文件
  skipDiffPathPatterns?: string[]; // 跳过的路径模式
  respectGitAttributes?: boolean; // 遵守 .gitignore

  // 温度设置（按功能）
  commitTemperature?: number; // 提交信息温度
  reviewTemperature?: number; // 代码审查温度
  branchNameTemperature?: number; // 分支名称温度
  weeklyReportTemperature?: number; // 周报温度
}
```

**默认值**:

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

  // Diff 配置
  skipDiffFileExtensions: [
    ".lock",
    ".min.js",
    ".map",
    ".svg",
    ".png",
    ".jpg",
    ".mp4",
    ".pdf",
    ".doc",
    ".xlsx",
    ".pptx",
  ],
  maxDiffFileSizeKB: 500,
  autoDetectBinaryFiles: true,
  skipDiffPathPatterns: [
    "node_modules/",
    "dist/",
    "build/",
    "coverage/",
    ".git/",
    ".idea/",
    ".vscode/",
  ],
  respectGitAttributes: true,

  // 温度配置
  commitTemperature: 0.0,
  reviewTemperature: 0.0,
  branchNameTemperature: 0.0,
  weeklyReportTemperature: 0.0,
};
```

### 5. Profile (配置文件)

```typescript
interface Profile {
  id: string; // 配置文件 ID
  name: string; // 配置文件名称
  description?: string; // 描述
  providers: Record<string, ProviderConfig>; // 提供商配置映射
  preferences: UserPreferences; // 用户偏好
  createdAt: Date; // 创建时间
  updatedAt: Date; // 更新时间
  version: string; // 版本号
  activeProviderId?: string; // 活跃提供商 ID
}
```

**示例**:

```typescript
const devProfile: Profile = {
  id: "profile-dev",
  name: "开发环境",
  description: "用于本地开发测试",
  providers: {
    openai: openaiConfig,
    ollama: ollamaConfig,
  },
  preferences: {
    ...DEFAULT_USER_PREFERENCES,
    temperature: 0.3,
    commitTemperature: 0.1,
  },
  activeProviderId: "openai",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date(),
  version: "1.0.0",
};
```

### 6. ExtensionConfig (扩展配置)

```typescript
interface ExtensionConfig {
  features: {
    codeIndexing: boolean; // 代码索引功能
    commitChat: boolean; // 提交聊天功能
    weeklyReport: boolean; // 周报功能
    autoCommit: boolean; // 自动提交功能
  };

  workspace: {
    autoSave: boolean; // 自动保存
    backupEnabled: boolean; // 备份功能
    syncEnabled: boolean; // 同步功能
  };

  ui: {
    theme: "light" | "dark" | "auto"; // 主题
    language: "zh" | "en"; // 语言
    fontSize: number; // 字体大小
  };
}
```

### 7. 连接测试结果

```typescript
interface ConnectionTestResult {
  success: boolean; // 是否成功
  error?: string; // 错误信息
  latency?: number; // 延迟（毫秒）
  timestamp: Date; // 测试时间
}
```

### 8. 配置验证结果

```typescript
interface ConfigValidationResult {
  isValid: boolean; // 是否有效
  errors: string[]; // 错误列表
  warnings: string[]; // 警告列表
}
```

### 9. 导出/导入格式

```typescript
interface ProfileExport {
  version: string; // 导出版本
  profile: Profile; // 配置文件数据
  metadata: {
    exportedAt: Date; // 导出时间
    exportedBy: string; // 导出者
    extensionVersion: string; // 扩展版本
  };
}
```

### 10. 设置变更事件

```typescript
interface SettingsChangeEvent {
  type: "provider" | "profile" | "preferences" | "feature";
  action: "create" | "update" | "delete" | "activate";
  target: string; // 目标 ID
  timestamp: Date; // 发生时间
}
```

## 🎯 类型工具函数

### 1. 提供商类型守卫

```typescript
// 检查是否是本地提供商
export function isLocalProvider(
  config: ProviderConfig,
): config is ProviderConfig & { type: "local" } {
  return config.type === "local";
}

// 检查是否需要 API Key
export function requiresApiKey(config: ProviderConfig): boolean {
  return config.type !== "local";
}

// 使用
if (requiresApiKey(provider)) {
  // 显示 API Key 输入框
}
```

### 2. 模型选择器类型

```typescript
interface ModelSelectorProps {
  providerId: string;
  value?: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
}

interface ModelGroup {
  provider: string;
  models: ModelConfig[];
}
```

### 3. 配置表单类型

```typescript
interface ConfigFormProps {
  provider: ProviderDefinition;
  config?: Partial<ProviderConfig>;
  onSubmit: (config: ProviderConfig) => void;
  onCancel: () => void;
}

interface DynamicFieldProps {
  field: ConfigField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}
```

## 🔧 类型转换和辅助

### 1. 配置文件到导出格式

```typescript
function toExportFormat(profile: Profile, exportedBy: string): ProfileExport {
  return {
    version: "1.0.0",
    profile: {
      ...profile,
      // 移除敏感信息（可选）
      providers: Object.fromEntries(
        Object.entries(profile.providers).map(([id, config]) => [
          id,
          {
            ...config,
            apiKey: config.apiKey ? "***" : undefined,
          },
        ]),
      ),
    },
    metadata: {
      exportedAt: new Date(),
      exportedBy,
      extensionVersion: "0.56.1",
    },
  };
}
```

### 2. 旧配置迁移类型

```typescript
interface LegacyConfig {
  version: "0.x.x";
  // 旧的字段名
  aiProvider: string;
  apiKey: string;
  // ...
}

function migrateLegacyConfig(old: LegacyConfig): Profile {
  return {
    id: `profile-${Date.now()}`,
    name: "迁移的配置",
    providers: {
      [old.aiProvider]: {
        id: old.aiProvider,
        name: old.aiProvider,
        type: getProviderType(old.aiProvider),
        apiKey: old.apiKey,
        models: getModelsForProvider(old.aiProvider),
      },
    },
    preferences: DEFAULT_USER_PREFERENCES,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: "1.0.0",
  };
}
```

## 🎨 类型最佳实践

### 1. 使用类型推断

```typescript
// ✅ 推荐：让 TypeScript 推断类型
const defaultPreferences = {
  temperature: 0.0,
  verbosity: 0,
  language: "zh",
} as const; // 使用 as const 获得更精确的类型

// 类型自动推断为:
// {
//   readonly temperature: 0;
//   readonly verbosity: 0;
//   readonly language: "zh";
// }
```

### 2. 使用 Partial 和 Required

```typescript
// ✅ 推荐：灵活的类型组合
type PartialProfile = Partial<Profile>; // 所有字段可选
type RequiredProfile = Required<Profile>; // 所有字段必填

// 使用场景
function updateProfile(id: string, updates: Partial<Profile>) {
  // 只更新提供的字段
}
```

### 3. 使用联合类型和类型守卫

```typescript
// ✅ 推荐：类型安全的联合类型
type ProviderAction =
  | { type: "create"; profile: Profile }
  | { type: "update"; id: string; updates: Partial<Profile> }
  | { type: "delete"; id: string };

function handleAction(action: ProviderAction) {
  switch (action.type) {
    case "create":
      // action.profile 已知类型
      break;
    case "update":
      // action.id 和 action.updates 已知类型
      break;
    case "delete":
      // action.id 已知类型
      break;
  }
}
```

### 4. 使用枚举代替字面量

```typescript
// ✅ 推荐：使用枚举提高可维护性
export enum ProviderType {
  FirstParty = "first-party",
  Aggregator = "aggregator",
  Local = "local",
  Cloud = "cloud",
  OpenAICompatible = "openai-compatible",
}

// 使用
interface ProviderConfig {
  type: ProviderType;
}

// 检查
if (config.type === ProviderType.Local) {
  // 本地提供商逻辑
}
```

## 🔍 类型验证

### 1. 运行时类型检查

```typescript
function validateProfile(data: any): data is Profile {
  return (
    typeof data.id === "string" &&
    typeof data.name === "string" &&
    typeof data.providers === "object" &&
    typeof data.preferences === "object" &&
    data.createdAt instanceof Date &&
    data.updatedAt instanceof Date
  );
}

// 使用
if (validateProfile(maybeProfile)) {
  // TypeScript 知道这是 Profile 类型
  console.log(maybeProfile.name);
}
```

### 2. 类型守卫函数库

```typescript
export const TypeGuards = {
  isProfile: (data: any): data is Profile => {
    return validateProfile(data);
  },

  isProviderConfig: (data: any): data is ProviderConfig => {
    return (
      typeof data.id === "string" &&
      typeof data.name === "string" &&
      typeof data.type === "string" &&
      Array.isArray(data.models)
    );
  },

  isUserPreferences: (data: any): data is UserPreferences => {
    return (
      typeof data.temperature === "number" && typeof data.verbosity === "number"
    );
  },
};
```

## 📊 类型统计

| 类型定义         | 数量 | 说明         |
| ---------------- | ---- | ------------ |
| 接口 (Interface) | 10+  | 主要数据结构 |
| 类型别名 (Type)  | 5+   | 辅助类型     |
| 枚举 (Enum)      | 1    | 提供商类型   |
| 类型守卫         | 3+   | 运行时验证   |

## 📚 相关文档

- **配置验证**: [../utils/config-validator.ts](../utils/config-validator.ts)
- **设置上下文**: [../contexts/SettingsContext.tsx](../contexts/SettingsContext.tsx)
- **ProfileManager**: [../services/webview/profile-manager.ts](../services/webview/profile-manager.ts)
- **Provider Registry**: [../config/provider-registry.tsx](../config/provider-registry.tsx)

---

**最后更新**: 2024年12月
**类型系统**: TypeScript 5.9
**架构模式**: 接口 + 类型守卫 + 工具类型
