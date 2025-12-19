# Config 模块文档

## 📋 概述

Config 模块提供了应用的配置管理功能，包括 AI 提供商注册表和配置设置。

## 📁 文件结构

```
config/
├── provider-registry.tsx  # AI 提供商注册表
└── README.md              # 本文档
```

## 🔧 核心组件

### 1. ProviderRegistry (提供商注册表)

**文件**: `provider-registry.tsx` (~53522 行)

**职责**:

- 管理所有支持的 AI 提供商
- 定义提供商的配置模板
- 提供提供商选择器
- 管理提供商特定的设置组件

**提供商类型**:

```typescript
type ProviderType =
  | "first-party" // Anthropic, OpenAI, Gemini
  | "aggregator" // OpenRouter, Glama, Unbound
  | "local" // Ollama, LMStudio
  | "cloud" // Bedrock, Vertex
  | "openai-compatible"; // 通用 OpenAI 兼容
```

**提供商配置接口**:

```typescript
interface ProviderDefinition {
  id: string;
  name: string;
  type: ProviderType;
  description: string;
  icon: string; // 图标名称或 URL
  website?: string;
  docs?: string;

  // 配置字段
  configFields: ConfigField[];

  // 默认配置
  defaultConfig: Partial<ProviderConfig>;

  // 模型列表
  models: ModelConfig[];

  // 验证规则
  validationRules: ValidationRules;

  // 特定设置组件
  settingsComponent?: React.ComponentType<ProviderSettingsProps>;

  // 连接测试
  testConnection?: (config: ProviderConfig) => Promise<ConnectionTestResult>;
}
```

**配置字段定义**:

```typescript
interface ConfigField {
  id: string;
  type: "text" | "password" | "number" | "select" | "toggle";
  label: string;
  placeholder?: string;
  required: boolean;
  defaultValue?: any;
  validation?: {
    pattern?: RegExp;
    min?: number;
    max?: number;
    custom?: (value: any) => string | null;
  };
  helpText?: string;
  dependsOn?: string; // 依赖的其他字段
}
```

## 📦 注册的提供商

### 1. OpenAI (第一方)

```typescript
{
  id: "openai",
  name: "OpenAI",
  type: "first-party",
  description: "OpenAI GPT 模型",
  icon: "openai",
  website: "https://openai.com",
  docs: "https://platform.openai.com/docs",

  configFields: [
    {
      id: "apiKey",
      type: "password",
      label: "API Key",
      required: true,
      placeholder: "sk-...",
      validation: {
        pattern: /^sk-/
      }
    },
    {
      id: "baseURL",
      type: "text",
      label: "Base URL",
      required: false,
      defaultValue: "https://api.openai.com/v1",
      helpText: "自定义 API 地址（可选）"
    }
  ],

  models: [
    { id: "gpt-4o", name: "GPT-4o", provider: "openai", maxTokens: { input: 128000, output: 4096 } },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", maxTokens: { input: 128000, output: 4096 } },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "openai", maxTokens: { input: 128000, output: 4096 } }
  ]
}
```

### 2. Anthropic (第一方)

```typescript
{
  id: "anthropic",
  name: "Anthropic",
  type: "first-party",
  description: "Claude 模型",
  icon: "anthropic",

  configFields: [
    {
      id: "apiKey",
      type: "password",
      label: "API Key",
      required: true,
      placeholder: "sk-ant-...",
      validation: {
        pattern: /^sk-ant-/
      }
    }
  ],

  models: [
    { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", provider: "anthropic", maxTokens: { input: 200000, output: 4096 } },
    { id: "claude-3-opus", name: "Claude 3 Opus", provider: "anthropic", maxTokens: { input: 200000, output: 4096 } }
  ]
}
```

### 3. Google Gemini (第一方)

```typescript
{
  id: "gemini",
  name: "Google Gemini",
  type: "first-party",
  description: "Google Gemini 模型",
  icon: "gemini",

  configFields: [
    {
      id: "apiKey",
      type: "password",
      label: "API Key",
      required: true,
      placeholder: "AIza..."
    }
  ],

  models: [
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "gemini", maxTokens: { input: 2000000, output: 8192 } },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "gemini", maxTokens: { input: 1000000, output: 8192 } }
  ]
}
```

### 4. Ollama (本地)

```typescript
{
  id: "ollama",
  name: "Ollama",
  type: "local",
  description: "本地运行的开源模型",
  icon: "ollama",

  configFields: [
    {
      id: "baseURL",
      type: "text",
      label: "Ollama URL",
      required: true,
      defaultValue: "http://localhost:11434",
      validation: {
        custom: (value) => {
          try {
            new URL(value);
            return null;
          } catch {
            return "必须是有效的 URL";
          }
        }
      }
    }
  ],

  models: [
    { id: "llama3.2", name: "Llama 3.2", provider: "ollama", maxTokens: { input: 128000, output: 4096 } },
    { id: "llama3.1", name: "Llama 3.1", provider: "ollama", maxTokens: { input: 128000, output: 4096 } },
    { id: "codegemma", name: "CodeGemma", provider: "ollama", maxTokens: { input: 8192, output: 2048 } }
  ]
}
```

### 5. OpenAI 兼容服务

```typescript
{
  id: "openai-compatible",
  name: "OpenAI 兼容",
  type: "openai-compatible",
  description: "任何 OpenAI 兼容的 API",
  icon: "link",

  configFields: [
    {
      id: "name",
      type: "text",
      label: "服务名称",
      required: true,
      placeholder: "例如: Custom API"
    },
    {
      id: "apiKey",
      type: "password",
      label: "API Key",
      required: true
    },
    {
      id: "baseURL",
      type: "text",
      label: "Base URL",
      required: true,
      placeholder: "https://api.example.com/v1"
    }
  ],

  models: [
    // 动态模型，由用户配置
  ]
}
```

### 6. OpenRouter (聚合器)

```typescript
{
  id: "openrouter",
  name: "OpenRouter",
  type: "aggregator",
  description: "统一的模型访问接口",
  icon: "openrouter",

  configFields: [
    {
      id: "apiKey",
      type: "password",
      label: "API Key",
      required: true
    }
  ],

  models: [
    // 通过 API 获取最新模型列表
  ]
}
```

## 🎯 使用示例

### 1. 获取所有提供商

```tsx
import { providerRegistry } from "@/config/provider-registry";

function ProviderSelector() {
  const providers = providerRegistry.getAllProviders();

  return (
    <div>
      {providers.map((provider) => (
        <div key={provider.id} className="provider-card">
          <img src={provider.icon} alt={provider.name} />
          <h3>{provider.name}</h3>
          <p>{provider.description}</p>
        </div>
      ))}
    </div>
  );
}
```

### 2. 获取特定提供商

```typescript
const openai = providerRegistry.getProvider("openai");
console.log(openai.configFields); // OpenAI 配置字段
console.log(openai.models); // OpenAI 模型列表
```

### 3. 生成默认配置

```typescript
const openai = providerRegistry.getProvider("openai");
const defaultConfig = openai.defaultConfig;

// 结果:
// {
//   id: "openai",
//   name: "OpenAI",
//   type: "first-party",
//   baseURL: "https://api.openai.com/v1",
//   models: [...],
//   isActive: false
// }
```

### 4. 验证配置

```typescript
const openai = providerRegistry.getProvider("openai");
const config = {
  apiKey: "sk-123",
  baseURL: "https://api.openai.com/v1",
};

const validation = openai.validationRules.validate(config);
if (!validation.isValid) {
  console.error(validation.errors);
}
```

### 5. 渲染提供商设置表单

```tsx
import { providerRegistry } from "@/config/provider-registry";

function ProviderSettings({ providerId }: { providerId: string }) {
  const provider = providerRegistry.getProvider(providerId);

  if (!provider) {
    return <div>未知的提供商</div>;
  }

  // 使用动态表单组件
  return (
    <DynamicProviderForm
      provider={provider}
      config={currentConfig}
      onChange={handleConfigChange}
    />
  );
}
```

## 🔧 提供商管理

### 1. 注册新提供商

```typescript
import { providerRegistry } from "@/config/provider-registry";

// 定义新提供商
const customProvider: ProviderDefinition = {
  id: "custom-ai",
  name: "Custom AI",
  type: "openai-compatible",
  description: "自定义 AI 服务",
  icon: "🤖",

  configFields: [
    {
      id: "apiKey",
      type: "password",
      label: "API Key",
      required: true,
    },
    {
      id: "baseURL",
      type: "text",
      label: "Base URL",
      required: true,
    },
  ],

  models: [
    {
      id: "custom-model",
      name: "Custom Model",
      provider: "custom-ai",
      maxTokens: { input: 8192, output: 2048 },
    },
  ],
};

// 注册
providerRegistry.registerProvider(customProvider);
```

### 2. 获取模型列表

```typescript
// 获取所有模型
const allModels = providerRegistry.getAllModels();

// 按提供商过滤
const openaiModels = providerRegistry.getModelsByProvider("openai");

// 按类型过滤
const localModels = providerRegistry.getModelsByType("local");
```

### 3. 搜索提供商

```typescript
// 按名称搜索
const results = providerRegistry.searchProviders("open");

// 结果: [{ id: "openai", ... }, { id: "openrouter", ... }]

// 按类型搜索
const localProviders = providerRegistry.searchProvidersByType("local");
// 结果: [{ id: "ollama", ... }]
```

## 🎨 最佳实践

### 1. 提供商选择流程

```typescript
// ✅ 推荐：分步选择
async function selectProvider() {
  // 1. 显示提供商列表
  const providers = providerRegistry.getAllProviders();

  // 2. 用户选择
  const selectedId = await showProviderSelector(providers);

  // 3. 获取配置模板
  const provider = providerRegistry.getProvider(selectedId);

  // 4. 显示配置表单
  const config = await showConfigForm(provider.configFields);

  // 5. 验证
  const validation = provider.validationRules.validate(config);

  if (!validation.isValid) {
    throw new Error(validation.errors.join(", "));
  }

  return config;
}
```

### 2. 模型管理

```typescript
// ✅ 推荐：使用模型选择器
function ModelSelector({ providerId }: { providerId: string }) {
  const models = providerRegistry.getModelsByProvider(providerId);

  return (
    <select>
      {models.map(model => (
        <option key={model.id} value={model.id}>
          {model.name} ({model.maxTokens.input / 1000}k 上下文)
        </option>
      ))}
    </select>
  );
}
```

### 3. 配置迁移

```typescript
// ✅ 推荐：支持旧配置迁移
function migrateOldConfig(oldConfig: any): ProviderConfig {
  const provider = providerRegistry.getProvider(oldConfig.type);

  return {
    id: oldConfig.id,
    name: oldConfig.name,
    type: provider.type,
    apiKey: oldConfig.apiKey,
    baseURL: oldConfig.baseURL || provider.defaultConfig.baseURL,
    models: oldConfig.models || provider.models,
    isActive: oldConfig.isActive || false,
  };
}
```

## 🔍 故障排除

### 常见问题

#### 1. 提供商未找到

**问题**: `getProvider` 返回 undefined
**解决方案**:

```typescript
// 检查提供商 ID 是否正确
const provider = providerRegistry.getProvider("openai");

// 查看所有可用提供商
console.log(providerRegistry.getAllProviders());

// 确保已注册
if (!provider) {
  // 注册或报错
  throw new Error("Provider not registered");
}
```

#### 2. 模型列表为空

**问题**: 某些提供商没有模型
**解决方案**:

```typescript
// 检查提供商定义
const provider = providerRegistry.getProvider("openrouter");

// OpenRouter 可能需要动态获取
if (provider.models.length === 0) {
  // 从 API 获取
  const models = await fetchOpenRouterModels();
  providerRegistry.updateModels("openrouter", models);
}
```

#### 3. 配置字段不匹配

**问题**: 表单字段与配置不匹配
**解决方案**:

```typescript
// 确保字段 ID 一致
const provider = providerRegistry.getProvider("openai");

provider.configFields.forEach((field) => {
  // 字段 ID 必须与 ProviderConfig 的属性名匹配
  console.log(field.id); // "apiKey", "baseURL", etc.
});
```

## 📊 提供商统计

| 类型     | 提供商数量 | 示例                      |
| -------- | ---------- | ------------------------- |
| 第一方   | 3          | OpenAI, Anthropic, Gemini |
| 聚合器   | 2          | OpenRouter, Glama         |
| 本地     | 2          | Ollama, LMStudio          |
| 云服务   | 2          | Bedrock, Vertex           |
| 兼容     | 1          | OpenAI 兼容               |
| **总计** | **10+**    | -                         |

## 📚 相关文档

- **组件**: [../components/settings/README.md](../components/settings/README.md)
- **Services**: [../services/README.md](../services/README.md)
- **类型定义**: [../types/settings.ts](../types/settings.ts)
- **验证工具**: [../utils/config-validator.ts](../utils/config-validator.ts)

---

**最后更新**: 2024年12月
**注册提供商**: 10+ 个
**架构模式**: 注册表 + 工厂模式
**配置管理**: 动态表单 + 验证
