# Config 模块 - 配置系统架构

## 📋 概述

Config 模块是 Dish AI Commit Gen 的配置管理核心，负责定义、验证和管理所有扩展配置。模块采用**声明式 Schema 设计**，支持 20+ 个 AI 提供商，100+ 个配置项，并提供完整的类型安全和自动化工具。

### 核心价值

- ✅ **声明式 Schema**: 基于 JSON Schema 的配置定义
- ✅ **类型安全**: 完整的 TypeScript 类型推导
- ✅ **自动化工具**: 自动生成配置键、验证器、元数据
- ✅ **多提供商支持**: 20+ AI 提供商，每个都有独立配置
- ✅ **配置迁移**: 从旧配置自动迁移到新 Profile 系统
- ✅ **验证机制**: 运行时配置验证和错误提示

## 🏗️ 架构设计

### 核心组件

```
Config Module
├── config-schema.ts              # 主配置 Schema (1000+行) ⭐
├── provider-definitions.ts       # 提供商定义 (300行) ⭐
├── workspace-config-schema.ts    # 工作区配置 Schema
├── default-config.ts             # 默认配置生成器
├── constants.ts                  # 常量定义
│
├── services/                     # 配置服务
│   ├── configuration-service.ts  # 配置服务 (100+行)
│   ├── configuration-change-handler.ts  # 配置变更处理器
│   ├── configuration-monitor.ts  # 配置监控
│   └── provider-config-validator.ts  # Provider 验证器
│
├── utils/                        # 配置工具
│   ├── config-builder.ts         # 配置构建器
│   ├── config-keys-generator.ts  # 配置键生成器
│   ├── config-metadata-generator.ts  # 元数据生成器
│   └── config-validation.ts      # 配置验证
│
├── generated/                    # 生成的文件
│   └── config-keys.ts            # 配置键常量 (自动生成)
│
└── types.ts                      # 类型定义
```

### 配置层次结构

```
Extension Configuration
├── base                           # 基础配置
│   ├── language                  # 语言
│   ├── provider                  # AI 提供商
│   └── model                     # AI 模型
│
├── providers                      # Provider 配置 (20+)
│   ├── openai                    # OpenAI 配置
│   │   ├── apiKey
│   │   ├── baseUrl
│   │   └── rateLimit*
│   ├── ollama                    # Ollama 配置
│   ├── xiaomi                    # Xiaomi MiMo 配置
│   ├── zhipu                     # Zhipu AI 配置
│   └── ... (更多提供商)
│
├── features                       # 功能配置
│   ├── codeAnalysis              # 代码分析
│   ├── commitFormat              # 提交格式
│   ├── commitMessage             # 提交消息
│   ├── weeklyReport              # 周报生成
│   ├── codeReview                # 代码审查
│   ├── branchName                # 分支名称
│   └── prSummary                 # PR 摘要
│
└── indexing                       # 索引配置 (Core 模块)
    ├── enabled                   # 是否启用
    ├── provider                  # 嵌入提供商
    ├── embeddingModel            # 嵌入模型
    ├── qdrantUrl                 # Qdrant 地址
    └── enableMultiRepoIndexing   # 多仓库索引
```

## 🎯 核心功能详解

### 1. 配置 Schema (config-schema.ts)

**文件**: `config-schema.ts` (1000+ 行)

**职责**: 定义所有配置项的结构、类型、默认值和描述

```typescript
export const CONFIG_SCHEMA = {
  base: {
    language: {
      type: "string",
      default: "Simplified Chinese",
      description: "Commit message language",
      enum: [
        "Simplified Chinese",
        "Traditional Chinese",
        "Japanese",
        "Korean",
        "English",
        // ... 15+ 语言
      ],
    },
    provider: {
      type: "string",
      default: "OpenAI",
      enum: getAllProviderDisplayNames(), // 从 provider-definitions 动态获取
      description: "AI provider",
    },
    model: {
      type: "string",
      default: "gpt-3.5-turbo",
      description: "AI model",
      scope: "machine",
    },
  },

  providers: {
    // OpenAI 配置
    openai: {
      apiKey: {
        type: "string",
        default: "",
        description: "OpenAI API Key",
      },
      baseUrl: {
        type: "string",
        default: "https://api.openai.com/v1",
        description: "OpenAI API Base URL",
      },
      rateLimitEnabled: {
        type: "boolean",
        default: false,
        description: "Enable Rate Limiting",
      },
      rateLimitMax: {
        type: "number",
        default: 20,
        description: "Max Requests per Window",
      },
      rateLimitWindow: {
        type: "number",
        default: 60,
        description: "Time Window (seconds)",
      },
    },

    // Ollama 配置 (本地，无 API Key)
    ollama: {
      baseUrl: {
        type: "string",
        default: "http://localhost:11434",
        description: "Ollama API Base URL",
      },
      rateLimitEnabled: {
        type: "boolean",
        default: false,
        description: "Enable Rate Limiting",
      },
      // ... 其他配置
    },

    // Azure OpenAI 配置 (需要额外字段)
    azureOpenai: {
      apiKey: {
        type: "string",
        default: "",
        description: "Azure OpenAI API Key",
      },
      endpoint: {
        type: "string",
        default: "",
        description: "Azure OpenAI Endpoint",
      },
      apiVersion: {
        type: "string",
        default: "",
        description: "Azure OpenAI API Version",
      },
      orgId: {
        type: "string",
        default: "",
        description: "Azure OpenAI Organization ID",
      },
      // ... 速率限制配置
    },

    // OpenAI 兼容 (自定义配置)
    "openai-compatible": {
      apiKey: {
        type: "string",
        default: "",
        description: "API Key",
      },
      baseUrl: {
        type: "string",
        default: "",
        description: "API Base URL",
      },
      model: {
        type: "string",
        default: "gpt-3.5-turbo",
        description: "Model ID",
      },
      enableR1Models: {
        type: "boolean",
        default: false,
        description: "Enable R1 Model Parameters",
      },
      customHeaders: {
        type: "object",
        default: {},
        description: "Custom HTTP Headers",
      },
      // ... 更多高级配置
    },
  },

  features: {
    // 代码分析配置
    codeAnalysis: {
      diffTarget: {
        type: "string",
        default: "auto",
        enum: ["staged", "all", "auto"],
        description: "Specify the target for git diff",
      },
      autoDetectStaged: {
        type: "boolean",
        default: true,
        description: "Automatically detect staged content",
      },
      simplifyDiff: {
        type: "boolean",
        default: false,
        description: "Enable diff content simplification",
      },
    },

    // 提交格式配置
    commitFormat: {
      enableEmoji: {
        type: "boolean",
        default: true,
        description: "Use emoji in commit messages",
      },
      enableMergeCommit: {
        type: "boolean",
        default: false,
        description: "Allow merging changes from multiple files",
      },
      enableBody: {
        type: "boolean",
        default: true,
        description: "Include body content in commit messages",
      },
      enableLayeredCommit: {
        type: "boolean",
        default: false,
        description: "Generate layered commit messages",
      },
      enableGlobalContext: {
        type: "boolean",
        default: true,
        description: "Extract global context for file descriptions",
      },
    },

    // 提交消息配置
    commitMessage: {
      systemPrompt: {
        type: "string",
        default: "",
        description: "Custom system prompt for commit message generation",
      },
      useRecentCommitsAsReference: {
        type: "boolean",
        default: false,
        description: "Use recent commits as reference",
      },
    },

    // PR 摘要配置
    prSummary: {
      baseBranch: {
        type: "string",
        default: "origin/main",
        description: "Base branch for PR summary",
      },
      headBranch: {
        type: "string",
        default: "HEAD",
        description: "Head branch for PR summary",
      },
      systemPrompt: {
        type: "string",
        default: "",
        description: "Custom system prompt for PR summary",
      },
      commitLogLimit: {
        type: "number",
        default: 20,
        description: "Max commit logs for SVN",
      },
    },
  },
} as const;
```

### 2. 提供商定义 (provider-definitions.ts)

**文件**: `provider-definitions.ts` (300 行)

**职责**: 集中管理所有 AI 提供商的元数据

```typescript
export interface ProviderDefinition {
  id: string;              // 标准小写标识符
  displayName: string;     // 显示名称
  enumKey: string;         // 枚举键（大写下划线）
  aliases?: string[];      // 别名列表
  custom?: boolean;        // 是否为自定义提供商
}

export const PROVIDER_DEFINITIONS: Record<string, ProviderDefinition> = {
  // === 第一方提供商 ===
  openai: {
    id: "openai",
    displayName: "OpenAI",
    enumKey: "OPENAI",
    aliases: ["open-ai"],
  },
  anthropic: {
    id: "anthropic",
    displayName: "Anthropic",
    enumKey: "ANTHROPIC",
  },
  gemini: {
    id: "gemini",
    displayName: "Gemini",
    enumKey: "GEMINI",
  },

  // === 国产模型 ===
  zhipu: {
    id: "zhipu",
    displayName: "Zhipu",
    enumKey: "ZHIPU",
  },
  xiaomi: {
    id: "xiaomi",
    displayName: "Xiaomi",
    enumKey: "XIAOMI",
    aliases: ["mimo", "xiaomi-mimo"],
  },
  dashscope: {
    id: "dashscope",
    displayName: "DashScope",
    enumKey: "DASHSCOPE",
  },
  doubao: {
    id: "doubao",
    displayName: "Doubao",
    enumKey: "DOUBAO",
  },
  deepseek: {
    id: "deepseek",
    displayName: "Deepseek",
    enumKey: "DEEPSEEK",
  },
  siliconflow: {
    id: "siliconflow",
    displayName: "Siliconflow",
    enumKey: "SILICONFLOW",
    aliases: ["silicon-flow", "silicon_flow"],
  },

  // === 本地模型 ===
  ollama: {
    id: "ollama",
    displayName: "Ollama",
    enumKey: "OLLAMA",
  },
  lmstudio: {
    id: "lmstudio",
    displayName: "LMStudio",
    enumKey: "LMSTUDIO",
    aliases: ["lm-studio", "lm_studio"],
  },

  // === 聚合服务 ===
  openrouter: {
    id: "openrouter",
    displayName: "OpenRouter",
    enumKey: "OPENROUTER",
    aliases: ["open-router", "open_router"],
  },
  together: {
    id: "together",
    displayName: "Together",
    enumKey: "TOGETHER",
  },
  groq: {
    id: "groq",
    displayName: "Groq",
    enumKey: "GROQ",
  },

  // === 云服务 ===
  "azure-openai": {
    id: "azure-openai",
    displayName: "Azure OpenAI",
    enumKey: "AZURE_OPENAI",
    aliases: ["azure_openai", "azureopenai"],
  },
  vertexai: {
    id: "vertexai",
    displayName: "VertexAI",
    enumKey: "VERTEXAI",
    aliases: ["vertex-ai", "vertex_ai"],
  },
  cloudflare: {
    id: "cloudflare",
    displayName: "Cloudflare",
    enumKey: "CLOUDFLARE",
    aliases: ["cloudflare-workersai"],
  },

  // === 兼容层 ===
  "openai-compatible": {
    id: "openai-compatible",
    displayName: "OpenAI Compatible",
    enumKey: "OPENAI_COMPATIBLE",
    aliases: ["openai_compatible"],
    custom: true,
  },
} as const;
```

**核心工具函数**:

```typescript
// 获取提供商定义
getProviderDefinition("openai");
// 返回: { id: "openai", displayName: "OpenAI", enumKey: "OPENAI", ... }

// 规范化提供商类型
normalizeProviderType("vs-code");
// 返回: "VS_CODE_PROVIDED"

// 生成规范化映射表
generateNormalizationMap();
// 返回: { "openai": "openai", "open-ai": "openai", "OPENAI": "openai", ... }

// 获取所有提供商 ID
getAllProviderIds();
// 返回: ["openai", "anthropic", "gemini", "zhipu", "xiaomi", ...]
```

### 3. 配置服务 (ConfigurationService)

**文件**: `services/configuration-service.ts`

**职责**: 配置的获取、更新和管理

```typescript
class ConfigurationService {
  private configuration: vscode.WorkspaceConfiguration;
  private configurationInProgress: boolean = false;

  constructor() {
    this.configuration = stateManager.getWorkspaceConfiguration(EXTENSION_NAME);
  }

  // 刷新配置
  refreshConfiguration(): void {
    this.configuration = stateManager.getWorkspaceConfiguration(EXTENSION_NAME);
  }

  // 获取配置值（类型安全）
  getConfig<K extends ConfigKey>(key: K): ConfigurationValueType[K] {
    const configKey = ConfigKeys[key].replace("dish-ai-commit.", "");
    const value = this.configuration.get<string>(configKey);
    return value as ConfigurationValueType[K];
  }

  // 获取完整配置
  getConfiguration(skipSystemPrompt: boolean = false): ExtensionConfiguration {
    if (this.configurationInProgress) {
      // 防止递归，返回基本配置
      return this.generateBasicConfig();
    }

    try {
      this.configurationInProgress = true;

      // 使用 Schema 生成完整配置
      const config = generateConfiguration(CONFIG_SCHEMA, (key: string) => {
        return this.configuration.get<any>(`${key}`);
      });

      // 按需生成系统提示
      if (!skipSystemPrompt && !config.features.commitMessage.systemPrompt) {
        config.features.commitMessage.systemPrompt = this.generateSystemPrompt(config);
      }

      return config;
    } finally {
      this.configurationInProgress = false;
    }
  }

  // 生成系统提示
  private generateSystemPrompt(config: any): string {
    const currentScm = SCMFactory.getCurrentSCMType() || "git";
    const promptConfig = {
      ...config.base,
      ...config.features.commitFormat,
      ...config.features.codeAnalysis,
      scm: currentScm,
      diff: "",
      additionalContext: "",
      model: {},
    };

    return getSystemPrompt(promptConfig);
  }

  // 更新配置
  async updateConfig(key: string, value: any): Promise<void> {
    await this.configuration.update(key, value, vscode.ConfigurationTarget.Workspace);
    this.refreshConfiguration();
  }
}
```

### 4. 配置构建器 (ConfigBuilder)

**文件**: `utils/config-builder.ts`

**职责**: 根据 Schema 自动化生成配置

```typescript
// 生成完整配置
export function generateConfiguration(
  schema: any,
  getter: (key: string) => any
): ExtensionConfiguration {
  const config: any = {};

  function traverse(schemaObj: any, path: string = "") {
    for (const [key, value] of Object.entries(schemaObj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (value && typeof value === "object" && "type" in value) {
        // 配置项，使用 getter 获取值
        config[currentPath] = getter(currentPath) ?? value.default;
      } else {
        // 嵌套对象，递归处理
        traverse(value, currentPath);
      }
    }
  }

  traverse(schema);
  return config;
}

// 获取所有配置路径
export function getAllConfigPaths(schema: any): string[] {
  const paths: string[] = [];

  function traverse(schemaObj: any, path: string = "") {
    for (const [key, value] of Object.entries(schemaObj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (value && typeof value === "object" && "type" in value) {
        paths.push(currentPath);
      } else {
        traverse(value, currentPath);
      }
    }
  }

  traverse(schema);
  return paths;
}
```

### 5. 配置键生成器 (ConfigKeysGenerator)

**文件**: `utils/config-keys-generator.ts`

**职责**: 自动生成配置键常量

```typescript
// 生成配置键常量
export function generateConfigKeys(schema: any): Record<string, string> {
  const keys: Record<string, string> = {};

  function traverse(schemaObj: any, path: string = "", keyPath: string = "") {
    for (const [key, value] of Object.entries(schemaObj)) {
      const currentPath = path ? `${path}.${key}` : key;
      const currentKeyPath = keyPath ? `${keyPath}_${key.toUpperCase()}` : key.toUpperCase();

      if (value && typeof value === "object" && "type" in value) {
        keys[currentKeyPath] = `dish-ai-commit.${currentPath}`;
      } else {
        traverse(value, currentPath, currentKeyPath);
      }
    }
  }

  traverse(schema);
  return keys;
}

// 生成的示例输出
// {
//   "BASE_LANGUAGE": "dish-ai-commit.base.language",
//   "BASE_PROVIDER": "dish-ai-commit.base.provider",
//   "PROVIDERS_OPENAI_APIKEY": "dish-ai-commit.providers.openai.apiKey",
//   "FEATURES_COMMITFORMAT_ENABLEEMOJI": "dish-ai-commit.features.commitFormat.enableEmoji",
//   ...
// }
```

### 6. 配置验证器 (ProviderConfigValidator)

**文件**: `services/provider-config-validator.ts`

**职责**: 验证 Provider 配置的有效性

```typescript
class ProviderConfigValidator {
  // 验证 Provider 配置
  static validateProviderConfig(
    providerId: string,
    config: any
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查必需字段
    const requiredFields = this.getRequiredFields(providerId);
    for (const field of requiredFields) {
      if (!config[field] || config[field].trim() === "") {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // 检查 URL 格式
    if (config.baseUrl && !this.isValidUrl(config.baseUrl)) {
      errors.push("Invalid baseUrl format");
    }

    // 检查 API 密钥格式（如果适用）
    if (config.apiKey && !this.isValidApiKey(config.apiKey)) {
      errors.push("Invalid API key format");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // 获取必需字段
  private static getRequiredFields(providerId: string): string[] {
    const localProviders = ["ollama", "lmstudio"];
    if (localProviders.includes(providerId)) {
      return []; // 本地 Provider 不需要 API Key
    }

    if (providerId === "azure-openai") {
      return ["apiKey", "endpoint"];
    }

    if (providerId === "vertexai") {
      return ["projectId", "location"];
    }

    return ["apiKey"];
  }

  // 验证 URL
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // 验证 API 密钥
  private static isValidApiKey(key: string): boolean {
    // 基本检查：非空且长度合理
    return key.trim().length > 10;
  }
}
```

## 📊 配置类型系统

### 类型定义 (types.ts)

```typescript
// 基础配置类型
interface BaseConfig {
  language: string;
  provider: string;
  model: string;
}

// Provider 配置类型
interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  apiKey?: string;
  baseUrl?: string;
  endpoint?: string;
  apiVersion?: string;
  orgId?: string;
  accountId?: string;
  projectId?: string;
  location?: string;
  apiEndpoint?: string;
  googleAuthOptions?: string;
  rateLimitEnabled?: boolean;
  rateLimitMax?: number;
  rateLimitWindow?: number;
  createdAt: Date;
  updatedAt: Date;
}

// 功能配置类型
interface FeaturesConfig {
  codeAnalysis: {
    diffTarget: "staged" | "all" | "auto";
    autoDetectStaged: boolean;
    fallbackToAll: boolean;
    simplifyDiff: boolean;
  };
  commitFormat: {
    enableEmoji: boolean;
    enableMergeCommit: boolean;
    enableBody: boolean;
    enableLayeredCommit: boolean;
    enableGlobalContext: boolean;
  };
  commitMessage: {
    systemPrompt: string;
    useRecentCommitsAsReference: boolean;
  };
  prSummary: {
    baseBranch: string;
    headBranch: string;
    systemPrompt: string;
    commitLogLimit: number;
  };
  // ... 其他功能
}

// 完整配置类型
interface ExtensionConfiguration {
  base: BaseConfig;
  providers: Record<string, ProviderConfig>;
  features: FeaturesConfig;
  indexing?: IndexingSettings;
}
```

## 🎯 使用示例

### 示例 1: 获取配置

```typescript
import { ConfigurationService } from "@/config/services/configuration-service";

const configService = new ConfigurationService();

// 获取完整配置
const config = configService.getConfiguration();

console.log(config.base.language); // "Simplified Chinese"
console.log(config.base.provider); // "OpenAI"
console.log(config.providers.openai.apiKey); // "sk-..."

// 获取特定配置值
const language = configService.getConfig("BASE_LANGUAGE");
const apiKey = configService.getConfig("PROVIDERS_OPENAI_APIKEY");
```

### 示例 2: 更新配置

```typescript
// 更新语言
await configService.updateConfig("base.language", "English");

// 更新 Provider
await configService.updateConfig("base.provider", "Xiaomi");

// 更新 API Key
await configService.updateConfig("providers.xiaomi.apiKey", "your-api-key");
```

### 示例 3: 验证配置

```typescript
import { ProviderConfigValidator } from "@/config/services/provider-config-validator";

const config = {
  apiKey: "your-api-key",
  baseUrl: "https://api.xiaomimimo.com/v1",
};

const result = ProviderConfigValidator.validateProviderConfig("xiaomi", config);

if (!result.valid) {
  console.error("配置验证失败:", result.errors);
  // ["Missing required field: apiKey"]
} else {
  console.log("配置验证通过");
}
```

### 示例 4: 生成配置键

```typescript
import { generateConfigKeys } from "@/config/config-schema";

const keys = generateConfigKeys(CONFIG_SCHEMA);

console.log(keys);
// {
//   "BASE_LANGUAGE": "dish-ai-commit.base.language",
//   "PROVIDERS_OPENAI_APIKEY": "dish-ai-commit.providers.openai.apiKey",
//   "FEATURES_COMMITFORMAT_ENABLEEMOJI": "dish-ai-commit.features.commitFormat.enableEmoji",
//   ...
// }
```

### 示例 5: 提供商定义工具

```typescript
import {
  getProviderDefinition,
  normalizeProviderType,
  getAllProviderIds,
} from "@/config/provider-definitions";

// 获取提供商定义
const openaiDef = getProviderDefinition("openai");
// { id: "openai", displayName: "OpenAI", enumKey: "OPENAI", ... }

// 规范化类型
const normalized = normalizeProviderType("vs-code");
// "VS_CODE_PROVIDED"

// 获取所有提供商 ID
const allIds = getAllProviderIds();
// ["openai", "anthropic", "gemini", "zhipu", "xiaomi", ...]
```

## 🎓 设计模式

### 1. 声明式配置

```typescript
// 配置定义与实现分离
export const CONFIG_SCHEMA = {
  base: {
    language: {
      type: "string",
      default: "Simplified Chinese",
      enum: [...],
    },
  },
};

// 自动生成配置
const config = generateConfiguration(CONFIG_SCHEMA, getter);
```

### 2. 工厂模式

```typescript
// 配置服务工厂
export function getConfigurationService(): ConfigurationService {
  if (!instance) {
    instance = new ConfigurationService();
  }
  return instance;
}
```

### 3. 策略模式

```typescript
// 不同的验证策略
interface ValidationStrategy {
  validate(config: any): boolean;
}

class ApiKeyStrategy implements ValidationStrategy {
  validate(config: any) {
    return config.apiKey && config.apiKey.length > 10;
  }
}

class LocalProviderStrategy implements ValidationStrategy {
  validate(config: any) {
    return true; // 本地 Provider 不需要验证
  }
}
```

### 4. 观察者模式

```typescript
// 配置变更监听
vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration("dish-ai-commit")) {
    configurationService.refreshConfiguration();
    // 通知其他组件
    onConfigurationChanged();
  }
});
```

## 🔍 配置迁移

### 从旧配置迁移到 Profile

```typescript
// SettingsMigration 检测旧配置
const detection = await settingsMigration.detectOldConfiguration();

if (detection.hasOldConfig) {
  // 显示迁移预览
  const preview = await settingsMigration.previewMigration();

  // 执行迁移
  const result = await settingsMigration.performMigration();

  console.log(`迁移完成，Profile ID: ${result.profileId}`);
}
```

**迁移流程**:
1. 检测旧配置 (package.json/settings.json)
2. 提取 Provider 配置和用户偏好
3. 创建新 Profile
4. 验证和修复配置
5. 保存并激活 Profile
6. 标记迁移完成

## 📊 配置统计

| 类别 | 配置项数量 | 说明 |
|------|-----------|------|
| **基础配置** | 3 | 语言、Provider、模型 |
| **Provider 配置** | 20+ | 每个 Provider 5-10 个字段 |
| **功能配置** | 20+ | 各种功能开关和参数 |
| **索引配置** | 5+ | 代码索引相关 |
| **总计** | 100+ | 完整配置覆盖 |

### Provider 支持详情

| Provider | 配置项 | 特殊字段 |
|---------|--------|---------|
| OpenAI | 5 | apiKey, baseUrl, rateLimit |
| Azure OpenAI | 8 | apiKey, endpoint, apiVersion, orgId |
| Ollama | 4 | baseUrl, rateLimit (无 apiKey) |
| Vertex AI | 7 | projectId, location, apiEndpoint, googleAuthOptions |
| OpenAI Compatible | 12 | 自定义字段最多 |
| 其他 | 5 | apiKey, baseUrl, rateLimit |

## 🔍 故障排除

### 常见问题

#### 1. 配置未生效

**问题**: 修改配置后，扩展仍然使用旧配置

**解决方案**:
```typescript
// 1. 刷新配置服务
const configService = new ConfigurationService();
configService.refreshConfiguration();

// 2. 重新获取配置
const config = configService.getConfiguration();

// 3. 检查 VS Code 配置
const vscodeConfig = vscode.workspace.getConfiguration("dish-ai-commit");
console.log("VS Code Config:", vscodeConfig);
```

#### 2. Provider 配置验证失败

**问题**: 保存 Provider 配置时提示字段缺失

**解决方案**:
```typescript
// 1. 检查必需字段
const requiredFields = ProviderConfigValidator.getRequiredFields("azure-openai");
// ["apiKey", "endpoint"]

// 2. 验证配置
const result = ProviderConfigValidator.validateProviderConfig("azure-openai", config);

if (!result.valid) {
  console.error("错误:", result.errors);
  // 显示具体错误给用户
}
```

#### 3. 配置键生成错误

**问题**: 自动生成的配置键不正确

**解决方案**:
```typescript
// 1. 检查 Schema 结构
console.log(CONFIG_SCHEMA.providers.openai.apiKey);

// 2. 重新生成配置键
const keys = generateConfigKeys(CONFIG_SCHEMA);
console.log("PROVIDERS_OPENAI_APIKEY:", keys.PROVIDERS_OPENAI_APIKEY);

// 3. 检查生成的文件
// src/config/generated/config-keys.ts
```

#### 4. 类型推导失败

**问题**: TypeScript 无法正确推导配置类型

**解决方案**:
```typescript
// 1. 确保使用正确的类型
import type { ExtensionConfiguration } from "@/config/types";

const config: ExtensionConfiguration = configService.getConfiguration();

// 2. 检查类型定义
// src/config/types.ts

// 3. 重新生成类型
// 运行配置生成脚本
```

## 🤝 开发指南

### 添加新的配置项

```typescript
// 1. 在 config-schema.ts 中添加
export const CONFIG_SCHEMA = {
  features: {
    // 现有配置...
    newFeature: {
      enabled: {
        type: "boolean",
        default: false,
        description: "Enable new feature",
      },
      option: {
        type: "string",
        default: "default",
        enum: ["default", "advanced"],
        description: "Feature option",
      },
    },
  },
};

// 2. 重新生成配置键
// npm run generate-config

// 3. 更新类型定义
// src/config/types.ts 会自动更新

// 4. 使用新配置
const config = configService.getConfiguration();
const enabled = config.features.newFeature.enabled;
```

### 添加新的 Provider

```typescript
// 1. 在 provider-definitions.ts 中添加
export const PROVIDER_DEFINITIONS = {
  // 现有 Provider...
  myprovider: {
    id: "myprovider",
    displayName: "My Provider",
    enumKey: "MYPROVIDER",
    aliases: ["my-provider"],
  },
};

// 2. 在 config-schema.ts 中添加配置
export const CONFIG_SCHEMA = {
  providers: {
    // 现有配置...
    myprovider: {
      apiKey: {
        type: "string",
        default: "",
        description: "My Provider API Key",
      },
      baseUrl: {
        type: "string",
        default: "https://api.myprovider.com/v1",
        description: "My Provider Base URL",
      },
      // ... 其他配置
    },
  },
};

// 3. 重新生成配置键
// npm run generate-config
```

### 自定义配置验证

```typescript
// 在 provider-config-validator.ts 中添加
class ProviderConfigValidator {
  private static getRequiredFields(providerId: string): string[] {
    // 现有逻辑...
    if (providerId === "myprovider") {
      return ["apiKey", "baseUrl"];
    }
    return ["apiKey"];
  }

  // 可以添加自定义验证
  private static customValidation(providerId: string, config: any): string[] {
    const errors: string[] = [];

    if (providerId === "myprovider") {
      // 自定义验证逻辑
      if (config.baseUrl && !config.baseUrl.endsWith("/v1")) {
        errors.push("My Provider baseUrl must end with /v1");
      }
    }

    return errors;
  }
}
```

## 📚 相关文档

- **主 README**: [../README.md](../README.md) - 项目总览
- **服务模块**: [../services/README.md](../services/README.md) - 配置迁移服务
- **AI 模块**: [../ai/README.md](../ai/README.md) - Provider 实现
- **类型系统**: [../types/README.md](../types/README.md) - 类型定义

---

**最后更新**: 2024年12月
**模块版本**: v0.56.1
**配置项数量**: 100+
**支持 Provider**: 20+
**代码质量**: ⭐⭐⭐⭐⭐
