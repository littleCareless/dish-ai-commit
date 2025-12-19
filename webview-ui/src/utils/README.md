# Utils 模块文档

## 📋 概述

Utils 模块提供了各种工具函数，包括配置验证、VS Code 通信、调试辅助等功能。

## 📦 工具列表

### 1. ConfigValidator (配置验证器)

**文件**: `config-validator.ts` (~4395 行)

**职责**:

- 验证配置文件的完整性
- 检查提供商配置的有效性
- 提供验证错误和警告
- 支持自定义验证规则

**验证规则**:

#### 配置文件验证

```typescript
interface ProfileValidationRules {
  name: {
    required: true;
    minLength: 3;
    maxLength: 50;
  };
  providers: {
    minCount: 1;
    atLeastOneActive: true;
  };
  preferences: {
    required: true;
    temperature: { min: 0; max: 2 };
  };
}
```

#### 提供商验证

```typescript
const providerRules = {
  openai: {
    apiKey: { required: true, pattern: /^sk-/ },
    baseURL: { optional: true, format: "url" },
    models: { minCount: 1 },
  },
  gemini: {
    apiKey: { required: true },
    baseURL: { optional: true },
  },
  ollama: {
    baseURL: { required: true, default: "http://localhost:11434" },
    models: { minCount: 1 },
  },
};
```

**使用示例**:

```typescript
import { configValidator } from "@/utils/config-validator";

// 验证配置文件
const profile: Profile = {
  id: "profile-1",
  name: "开发环境",
  providers: {
    openai: {
      id: "openai-1",
      name: "OpenAI",
      type: "first-party",
      apiKey: "sk-...",
      models: [
        {
          id: "gpt-4o",
          name: "GPT-4o",
          provider: "openai",
          maxTokens: { input: 128000, output: 4096 },
        },
      ],
    },
  },
  preferences: DEFAULT_USER_PREFERENCES,
  createdAt: new Date(),
  updatedAt: new Date(),
  version: "1.0.0",
};

const result = await configValidator.validateProfile(profile);

if (!result.isValid) {
  console.error("验证失败:", result.errors);
  // 输出: ["至少需要一个提供商", "温度必须在 0-2 之间"]
}

if (result.warnings.length > 0) {
  console.warn("验证警告:", result.warnings);
  // 输出: ["建议配置多个提供商以提高可用性"]
}
```

**验证引擎核心**:

```typescript
export class ValidationEngine {
  validate<T>(data: T, rules: ValidationRules): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = (data as any)[field];

      // 必填验证
      if (
        rule.required &&
        (value === undefined || value === null || value === "")
      ) {
        errors.push(`${field} 是必填项`);
        continue;
      }

      // 最小长度
      if (
        rule.minLength &&
        typeof value === "string" &&
        value.length < rule.minLength
      ) {
        errors.push(`${field} 至少需要 ${rule.minLength} 个字符`);
      }

      // 最大长度
      if (
        rule.maxLength &&
        typeof value === "string" &&
        value.length > rule.maxLength
      ) {
        errors.push(`${field} 不能超过 ${rule.maxLength} 个字符`);
      }

      // 范围验证
      if (rule.min !== undefined && rule.max !== undefined) {
        if (value < rule.min || value > rule.max) {
          errors.push(`${field} 必须在 ${rule.min}-${rule.max} 之间`);
        }
      }

      // 正则匹配
      if (rule.pattern && typeof value === "string") {
        if (!rule.pattern.test(value)) {
          errors.push(`${field} 格式不正确`);
        }
      }

      // URL 格式
      if (rule.format === "url" && value) {
        try {
          new URL(value);
        } catch {
          errors.push(`${field} 必须是有效的 URL`);
        }
      }

      // 自定义验证器
      if (rule.customValidator) {
        const customResult = rule.customValidator(value, data);
        if (customResult.error) {
          errors.push(customResult.error);
        }
        if (customResult.warning) {
          warnings.push(customResult.warning);
        }
      }

      // 警告（非阻塞）
      if (rule.warning && value === undefined) {
        warnings.push(rule.warning);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
```

### 2. ValidationHelpers (验证辅助函数)

**文件**: `validation-helpers.ts` (~5149 行)

**职责**:

- 提供常用的验证函数
- 简化复杂验证逻辑
- 支持链式验证

**常用函数**:

#### 基础验证

```typescript
// 空值检查
export const isRequired = (value: any): boolean => {
  return value !== undefined && value !== null && value !== "";
};

// 字符串长度
export const minLength = (value: string, min: number): boolean => {
  return value.length >= min;
};

export const maxLength = (value: string, max: number): boolean => {
  return value.length <= max;
};

// 数字范围
export const inRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

// URL 验证
export const isValidURL = (value: string): boolean => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

// API Key 验证
export const isValidApiKey = (value: string, provider: string): boolean => {
  const patterns = {
    openai: /^sk-/,
    anthropic: /^sk-/,
    gemini: /^[A-Za-z0-9_-]+$/,
    ollama: /^ollama_/,
  };

  return patterns[provider]?.test(value) ?? value.length > 10;
};
```

#### 高级验证

```typescript
// 配置完整性检查
export const isProfileComplete = (profile: Profile): boolean => {
  if (!profile.name || profile.name.length < 3) return false;
  if (Object.keys(profile.providers).length === 0) return false;

  // 检查至少一个提供商配置完整
  const hasValidProvider = Object.values(profile.providers).some((provider) => {
    return provider.apiKey && provider.models.length > 0;
  });

  return hasValidProvider;
};

// 提供商配置检查
export const isProviderConfigured = (provider: ProviderConfig): boolean => {
  if (!provider.apiKey && provider.type !== "local") return false;
  if (provider.models.length === 0) return false;
  return true;
};

// 温度值验证
export const isValidTemperature = (temp: number): boolean => {
  return temp >= 0 && temp <= 2;
};
```

### 3. VS Code 工具函数

**文件**: `vscode.ts` (~2894 行)

**职责**:

- 简化与 VS Code 的消息通信
- 提供类型安全的消息发送
- 处理消息队列

**核心函数**:

#### postMessage

```typescript
interface VSCodeMessage {
  command: string;
  data?: any;
  requestId?: string;
}

export const postMessage = (command: string, data?: any): void => {
  const message: VSCodeMessage = {
    command,
    data,
    requestId: data?.requestId,
  };

  // 在 WebView 环境中
  if (typeof acquireVsCodeApi !== "undefined") {
    const vscode = acquireVsCodeApi();
    vscode.postMessage(message);
  } else {
    // 开发环境下的回退
    console.log("[VSCode] 发送消息:", message);
  }
};
```

#### 消息监听

```typescript
export const addMessageListener = (
  command: string,
  callback: (data: any) => void,
): void => {
  const handler = (event: MessageEvent) => {
    if (event.data.command === command) {
      callback(event.data.data);
    }
  };

  window.addEventListener("message", handler);

  // 返回清理函数
  return () => window.removeEventListener("message", handler);
};

// 使用
const cleanup = addMessageListener("profileUpdated", (data) => {
  console.log("配置已更新:", data);
});

// 在组件卸载时调用 cleanup();
```

#### 消息等待

```typescript
export const waitForMessage = (
  command: string,
  timeout: number = 10000,
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent) => {
      if (event.data.command === command) {
        window.removeEventListener("message", handler);
        resolve(event.data.data);
      }
    };

    window.addEventListener("message", handler);

    setTimeout(() => {
      window.removeEventListener("message", handler);
      reject(new Error(`等待消息 ${command} 超时`));
    }, timeout);
  });
};

// 使用
try {
  const result = await waitForMessage("profileSaved", 5000);
  console.log("保存成功:", result);
} catch (error) {
  console.error("保存失败:", error);
}
```

### 4. DebugHelper (调试辅助)

**文件**: `debug-helper.ts` (~4774 行)

**职责**:

- 提供调试日志功能
- 性能监控
- 错误追踪
- 开发环境工具

**调试级别**:

```typescript
export enum DebugLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

const DEBUG_LEVEL = import.meta.env.DEV ? DebugLevel.DEBUG : DebugLevel.ERROR;
```

**日志函数**:

```typescript
export const logger = {
  error: (message: string, ...args: any[]) => {
    if (DEBUG_LEVEL >= DebugLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },

  warn: (message: string, ...args: any[]) => {
    if (DEBUG_LEVEL >= DebugLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  info: (message: string, ...args: any[]) => {
    if (DEBUG_LEVEL >= DebugLevel.INFO) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },

  debug: (message: string, ...args: any[]) => {
    if (DEBUG_LEVEL >= DebugLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  trace: (message: string, ...args: any[]) => {
    if (DEBUG_LEVEL >= DebugLevel.TRACE) {
      console.log(`[TRACE] ${message}`, ...args);
      console.trace();
    }
  },
};

// 使用
logger.debug("用户点击保存按钮", { profileId: "123" });
logger.error("保存失败", error);
```

**性能监控**:

```typescript
export const perf = {
  start: (label: string): PerformanceTimer => {
    const start = performance.now();
    return {
      label,
      start,
      end: () => {
        const duration = performance.now() - start;
        logger.info(`${label} 耗时: ${duration.toFixed(2)}ms`);
        return duration;
      },
    };
  },

  measure: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    const timer = perf.start(label);
    try {
      const result = await fn();
      timer.end();
      return result;
    } catch (error) {
      timer.end();
      throw error;
    }
  },
};

interface PerformanceTimer {
  label: string;
  start: number;
  end: () => number;
}

// 使用
// 方式 1
const timer = perf.start("加载配置");
await loadConfig();
timer.end();

// 方式 2
const result = await perf.measure("保存配置", async () => {
  await saveProfile(profile);
  return "success";
});
```

**错误边界工具**:

```typescript
export const tryCatch = async <T>(
  fn: () => Promise<T>,
  errorHandler?: (error: any) => void,
): Promise<T | null> => {
  try {
    return await fn();
  } catch (error) {
    logger.error("操作失败", error);
    errorHandler?.(error);
    return null;
  }
};

export const tryCatchSync = <T>(
  fn: () => T,
  errorHandler?: (error: any) => void,
): T | null => {
  try {
    return fn();
  } catch (error) {
    logger.error("操作失败", error);
    errorHandler?.(error);
    return null;
  }
};

// 使用
const profile = await tryCatch(
  () => profileManager.loadProfiles(),
  (error) => {
    // 自定义错误处理
    toast({ title: "加载失败", variant: "destructive" });
  },
);
```

### 5. TextMate 语法转换器

**文件**: `textMateToHljs.ts` (~79 行)

**职责**:

- 将 TextMate 语法转换为 Highlight.js 格式
- 用于代码高亮显示

**使用示例**:

```typescript
import { convertTextMateToHljs } from "@/utils/textMateToHljs";

const textMateGrammar = {
  patterns: [
    {
      match: "\\b(function|const|let|var)\\b",
      name: "keyword.control",
    },
  ],
};

const hljsGrammar = convertTextMateToHljs(textMateGrammar);
// 用于 highlight.js 的自定义语法
```

## 🎯 工具组合模式

### 1. 验证 + 调试

```typescript
import { configValidator } from "@/utils/config-validator";
import { logger, tryCatch } from "@/utils/debug-helper";

async function saveProfileWithValidation(profile: Profile) {
  return tryCatch(
    async () => {
      // 1. 验证
      const validation = await configValidator.validateProfile(profile);

      if (!validation.isValid) {
        logger.error("验证失败", validation.errors);
        throw new Error(validation.errors.join(", "));
      }

      if (validation.warnings.length > 0) {
        logger.warn("验证警告", validation.warnings);
      }

      // 2. 保存
      logger.debug("开始保存配置", { profileId: profile.id });
      await profileManager.saveProfile(profile);
      logger.info("配置保存成功", { profileId: profile.id });

      return profile;
    },
    (error) => {
      logger.error("保存流程失败", error);
    },
  );
}
```

### 2. VS Code 通信 + 性能监控

```typescript
import { postMessage } from "@/utils/vscode";
import { perf } from "@/utils/debug-helper";

async function loadDataWithMetrics() {
  return perf.measure("加载数据", async () => {
    return new Promise((resolve, reject) => {
      const requestId = uuidv4();

      const handler = (event: MessageEvent) => {
        if (
          event.data.command === "dataLoaded" &&
          event.data.requestId === requestId
        ) {
          window.removeEventListener("message", handler);
          resolve(event.data.data);
        }
      };

      window.addEventListener("message", handler);

      postMessage("loadData", { requestId });

      setTimeout(() => {
        window.removeEventListener("message", handler);
        reject(new Error("加载超时"));
      }, 10000);
    });
  });
}
```

## 🔧 最佳实践

### 1. 验证优先

```typescript
// ✅ 推荐：先验证再操作
async function handleSave(profile: Profile) {
  const validation = await configValidator.validateProfile(profile);

  if (!validation.isValid) {
    toast({
      title: "配置无效",
      description: validation.errors[0],
      variant: "destructive",
    });
    return;
  }

  await profileManager.saveProfile(profile);
}

// ❌ 避免：不验证直接操作
async function handleSave(profile: Profile) {
  await profileManager.saveProfile(profile); // 可能保存无效数据
}
```

### 2. 日志分级

```typescript
// ✅ 推荐：根据级别输出
logger.debug("用户操作", data); // 开发时可见
logger.info("操作成功", result); // 始终可见
logger.error("操作失败", error); // 始终可见

// ❌ 避免：全部使用 console.log
console.log("调试信息", data); // 生产环境也会输出
```

### 3. 错误处理

```typescript
// ✅ 推荐：使用 tryCatch 包装
const result = await tryCatch(
  async () => {
    const data = await fetchData();
    const validated = await validateData(data);
    return validated;
  },
  (error) => {
    // 统一错误处理
    logger.error("数据处理失败", error);
    toast({ title: "操作失败", variant: "destructive" });
  },
);

// ❌ 避免：分散的错误处理
try {
  const data = await fetchData();
} catch (error) {
  console.error(error);
}

try {
  const validated = await validateData(data);
} catch (error) {
  console.error(error);
}
```

## 🔍 故障排除

### 常见问题

#### 1. 验证规则不生效

**问题**: 验证总是通过
**解决方案**:

```typescript
// 检查规则定义
const rules = {
  name: {
    required: true, // 必须为 true
    minLength: 3, // 必须定义
  },
};

// 检查数据格式
const data = { name: "test" }; // 确保字段名匹配
```

#### 2. VS Code 消息未发送

**问题**: postMessage 不工作
**解决方案**:

```typescript
// 检查环境
if (typeof acquireVsCodeApi !== "undefined") {
  // 在 WebView 中
  const vscode = acquireVsCodeApi();
  vscode.postMessage(message);
} else {
  // 开发环境
  console.log("开发模式，消息:", message);
}
```

#### 3. 调试日志太多

**问题**: 控制台信息过载
**解决方案**:

```typescript
// 调整调试级别
const DEBUG_LEVEL = import.meta.env.PROD ? DebugLevel.ERROR : DebugLevel.DEBUG;

// 或者临时调整
logger.debug = () => {}; // 禁用 debug 日志
```

## 📊 工具统计

| 工具               | 文件大小 | 主要功能 |
| ------------------ | -------- | -------- |
| config-validator   | ~4395 行 | 配置验证 |
| validation-helpers | ~5149 行 | 验证辅助 |
| vscode             | ~2894 行 | 消息通信 |
| debug-helper       | ~4774 行 | 调试工具 |
| textMateToHljs     | ~79 行   | 语法转换 |

## 📚 相关文档

- **组件**: [../components/settings/README.md](../components/settings/README.md)
- **Services**: [../services/README.md](../services/README.md)
- **Hooks**: [../hooks/README.md](../hooks/README.md)
- **类型定义**: [../types/settings.ts](../types/settings.ts)

---

**最后更新**: 2024年12月
**工具数量**: 5 个工具模块
**架构模式**: 纯函数 + 类
**使用场景**: 验证、通信、调试
