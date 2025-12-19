# Services 模块 - 服务层架构

## 📋 概述

Services 模块是 Dish AI Commit Gen 的业务逻辑核心，负责处理所有跨切面关注点和业务流程。模块采用**分层架构设计**，将复杂的业务逻辑拆分为清晰的职责层。

### 核心价值

- ✅ **分层架构**: 核心服务、配置管理、用户交互、缓存、统计等清晰分离
- ✅ **单例模式**: 关键服务使用单例，确保状态一致性
- ✅ **配置迁移**: 支持从旧配置自动迁移到新 Profile 系统
- ✅ **智能缓存**: LRU 缓存策略，50 条上限，避免重复请求
- ✅ **Token 统计**: 精确追踪 AI 使用量，支持多维度分析
- ✅ **用户交互**: 完整的聊天、提示、通知系统

## 🏗️ 架构设计

### 核心组件

```
Services Module
├── core/                          # 核心服务层
│   ├── settings-migration.ts      # 配置迁移 (516行) ⭐
│   ├── provider-selection-service.ts  # Provider 选择 (252行)
│   ├── model-validation-service.ts    # 模型验证
│   ├── prompt-manager-service.ts      # 提示词管理
│   ├── rate-limiter-service.ts        # 速率限制
│   ├── token-stats-service.ts         # Token 统计
│   ├── scm-detector-service.ts        # SCM 检测
│   └── model-picker-service.ts        # 模型选择器
│
├── profile-manager/               # 用户配置管理
│   ├── profile-manager-service.ts # 配置管理服务
│   ├── provider-store.ts          # Provider 存储
│   ├── provider-profile-repository.ts # 配置仓库
│   ├── model-capability-service.ts    # 模型能力
│   ├── cloud-sync-service.ts          # 云同步
│   └── types.ts                   # 类型定义
│
├── commit-chat/                   # 聊天服务
│   ├── commit-chat-service.ts     # 主聊天服务 (100+行)
│   ├── command-parser.ts          # 命令解析
│   ├── response-processor.ts      # 响应处理
│   ├── suggestion-engine.ts       # 建议引擎
│   ├── preference-manager.ts      # 偏好管理
│   └── config-sync.ts             # 配置同步
│
├── cache/                         # 缓存服务
│   └── commit-cache-service.ts    # 提交缓存 (80行)
│
├── settings/                      # 设置管理
│   ├── preferences-settings-manager.ts # 偏好设置
│   ├── indexing-settings-manager.ts    # 索引设置
│   ├── language-settings-manager.ts    # 语言设置
│   ├── features-settings-manager.ts    # 功能设置
│   ├── advanced-settings-manager.ts    # 高级设置
│   └── environment-detector.ts         # 环境检测
│
├── webview/                       # WebView 服务
│   ├── settings-view-provider.ts  # 设置视图提供者
│   ├── weekly-report-panel.ts     # 周报面板
│   ├── handlers/                  # 消息处理器
│   ├── providers/                 # HTML 提供者
│   └── services/                  # WebView 服务
│
├── reporting/                     # 报告生成
│   ├── weekly-report.ts           # 周报生成
│   └── code-review-report-generator.ts # 评审报告
│
├── error-handling/                # 错误处理
│   ├── enhanced-error-handler.ts  # 增强错误处理器
│   ├── error-classification.ts    # 错误分类
│   ├── error-context.ts           # 错误上下文
│   └── error-translation.ts       # 错误翻译
│
├── security/                      # 安全服务
│   └── key-encryption.ts          # 密钥加密
│
├── solution/                      # 解决方案
│   └── solution-suggester.ts      # 解决方案建议
│
├── diagnosis/                     # 诊断服务
│   └── problem-diagnoser.ts       # 问题诊断
│
├── notification-service.ts        # 通知服务 (85行)
└── telemetry-service.ts           # 遥测服务
```

### 服务层次

```
应用层 (UI/命令)
    ↓
业务服务层 (Services)
    ├─ 核心服务 (Core)
    ├─ 配置管理 (Profile)
    ├─ 用户交互 (Chat)
    └─ 辅助服务 (Cache/Stats)
    ↓
基础设施层 (Utils/Types)
```

## 🎯 核心服务详解

### 1. 核心服务层 (Core)

#### 1.1 SettingsMigration (配置迁移)

**文件**: `core/settings-migration.ts` (516 行)

**职责**: 从旧配置 (package.json) 迁移到新 Profile 系统

```typescript
// 迁移流程
1. 检测旧配置
   ├─ 读取 VS Code 配置
   ├─ 识别 20+ 个 Provider
   └─ 检查用户偏好

2. 生成迁移预览
   ├─ 创建 Profile 草稿
   ├─ 显示迁移内容
   └─ 用户确认

3. 执行迁移
   ├─ 创建 Profile
   ├─ 保存到存储
   ├─ 激活 Profile
   └─ 标记完成
```

**核心功能**:

```typescript
class SettingsMigration {
  // 检测旧配置
  async detectOldConfiguration(): Promise<MigrationDetectionResult> {
    // 检查所有 20+ Provider 的配置
    // 检查用户偏好设置
  }

  // 生成迁移预览
  async previewMigration(): Promise<MigrationPreview> {
    // 创建 Profile 草稿
    // 显示将要迁移的内容
  }

  // 执行迁移
  async performMigration(): Promise<{ success: boolean; profileId: string }> {
    // 创建 Profile
    // 验证和修复
    // 保存并激活
  }

  // 确保默认 Profile
  async ensureDefaultProfile(): Promise<{ created: boolean; profileId?: string }> {
    // 如果没有 Profile，创建默认的
  }
}
```

**迁移策略**:

```typescript
// 1. Provider 配置映射
const providerConfig = {
  apiKey: config.get(`providers.${providerId}.apiKey`),
  baseUrl: config.get(`providers.${providerId}.baseUrl`),
  endpoint: config.get(`providers.${providerId}.endpoint`),
  // ... 其他字段
};

// 2. 偏好设置映射
const preferences = {
  temperature: config.get("base.temperature", 0.7),
  language: mapLanguage(config.get("base.language", "zh")),
  maxTokens: config.get("base.maxTokens", 2000),
  // ... 其他偏好
};

// 3. 智能验证和修复
if (!activeProviderConfig && !isLocalProvider) {
  // 尝试找到第一个可用的 Provider
  const availableProviderId = Object.keys(providersConfig)[0];
  if (availableProviderId) {
    activeProviderId = availableProviderId;
  }
}
```

#### 1.2 ProviderSelectionService (Provider 选择)

**文件**: `core/provider-selection-service.ts` (252 行)

**职责**: 从 Profile 中智能选择 Provider，支持三级降级

```typescript
// 三级降级策略
export enum SelectionStrategy {
  ACTIVE_PROVIDER = "active_provider",      // 优先: activeProviderId
  FIRST_WITH_MODEL = "first_with_model",    // 次之: 第一个有 model 的
  FIRST_PROVIDER = "first_provider",        // 兜底: 第一个 Provider
  LEGACY_CONFIG = "legacy_config",          // 兼容: 旧配置结构
}

// 使用示例
const result = ProviderSelectionService.selectProvider(profile);

if (ProviderSelectionService.isSelectionComplete(result)) {
  // { provider: "openai", model: "gpt-4o", config: {...} }
  const provider = await AIProviderFactory.getProvider(
    result.provider,
    result.config
  );
}
```

**选择逻辑**:

```typescript
static selectProvider(profile: Profile): ProviderSelectionResult {
  // 策略 1: 使用 activeProviderId
  if (profile.activeProviderId && providers[profile.activeProviderId]) {
    const config = providers[profile.activeProviderId];
    const model = config.defaultModel;
    if (model) {
      return { provider: profile.activeProviderId, model, config };
    }
  }

  // 策略 2: 第一个有 model 的 Provider
  const providerWithModel = Object.entries(providers).find(
    ([_, config]) => config.defaultModel
  );
  if (providerWithModel) {
    return { provider: providerWithModel[0], model: providerWithModel[1].defaultModel, config: providerWithModel[1] };
  }

  // 策略 3: 第一个 Provider (兜底)
  const firstProviderId = Object.keys(providers)[0];
  return { provider: firstProviderId, model: "", config: providers[firstProviderId] };
}
```

#### 1.3 TokenStatsService (Token 统计)

**文件**: `core/token-stats-service.ts` (97 行)

**职责**: 精确追踪 AI Token 使用量

```typescript
// 记录使用量
await tokenStatsService.addTokens(
  150,                    // Token 数量
  "gpt-4o",               // 模型
  "openai",               // Provider
  "commit-generation"     // 功能
);

// 获取统计
const total = tokenStatsService.getTotalTokens();
const details = tokenStatsService.getDetailedStats();
// 返回: [{ date: "2024-12-19", totalTokens: 150, byModel: {...}, byFeature: {...} }]

// 重置统计
await tokenStatsService.resetTotalTokens();
```

**数据结构**:

```typescript
interface DailyUsageStats {
  date: string;           // "2024-12-19"
  totalTokens: number;    // 当日总数
  byModel: {              // 按模型分组
    "gpt-4o": 100,
    "gpt-3.5-turbo": 50
  };
  byFeature: {            // 按功能分组
    "commit-generation": 100,
    "code-review": 50
  };
}
```

**存储策略**:
- 使用 VS Code `globalState` 持久化
- 保留最近 30 天数据
- 自动清理过期数据

#### 1.4 CommitCacheService (提交缓存)

**文件**: `cache/commit-cache-service.ts` (80 行)

**职责**: LRU 缓存，避免重复 AI 请求

```typescript
// 缓存键生成 (智能哈希)
const cacheKey = commitCacheService.generateKey(
  diffContent,
  configuration,
  modelId
);

// 检查缓存
const cached = commitCacheService.get(cacheKey);
if (cached) {
  return cached; // 直接返回，跳过 AI 调用
}

// 生成并缓存
const result = await provider.generateCommit(params);
commitCacheService.set(cacheKey, result.content);
```

**缓存策略**:

```typescript
// 1. 智能键生成 (只包含影响结果的配置)
const relevantConfig = {
  language: configuration.base?.language,
  emoji: configuration.features?.commitFormat?.enableEmoji,
  body: configuration.features?.commitFormat?.enableBody,
  rule: configuration.features?.commitMessage?.rule,
};

// 2. LRU 淘汰
- 最大容量: 50 条
- 淘汰策略: 最近最少使用
- 内存占用: ~50KB (50 条 × 1KB)

// 3. 缓存命中率优化
- 超早期检查: 在验证模型前检查
- 性能提升: 从 ~500ms 降至 ~10ms
```

#### 1.5 RateLimiterService (速率限制)

**职责**: 防止 API 调用过快

```typescript
// 在分层提交中使用
if (providerConfig.rateLimitEnabled) {
  const rateLimiter = RateLimiterService.getInstance();
  await rateLimiter.acquire(
    providerId,
    providerConfig.rateLimitMax || 20,      // 20 次/窗口
    providerConfig.rateLimitWindow || 60,   // 60 秒窗口
    (waitTimeMs) => {
      progress.report({
        message: `速率限制，等待 ${Math.ceil(waitTimeMs / 1000)}s...`,
      });
    }
  );
}
```

### 2. 配置管理层 (Profile Manager)

#### 2.1 ProfileManagerService (配置管理)

**文件**: `profile-manager/profile-manager-service.ts`

**职责**: 管理用户配置和 Provider

```typescript
class ProfileManagerService {
  // 获取所有配置
  async getAllProfiles(): Promise<Profile[]>;

  // 保存配置
  async saveProfile(profile: Profile): Promise<void>;

  // 删除配置
  async deleteProfile(profileId: string): Promise<void>;

  // 激活配置
  async setActiveProfile(profileId: string): Promise<void>;

  // 获取功能设置
  getFeatureSettings(): FeatureSettings;
}
```

**Profile 结构**:

```typescript
interface Profile {
  id: string;
  name: string;
  description: string;

  // Provider 配置
  providers: Record<string, ProviderConfig>;
  activeProviderId?: string;

  // 用户偏好
  preferences: UserPreferences;

  // 元数据
  createdAt: Date;
  updatedAt: Date;
  version: string;
  isAutoMigrated?: boolean;
}
```

#### 2.2 ProviderStore (Provider 存储)

**文件**: `profile-manager/provider-store.ts`

**职责**: Provider 配置的持久化和管理

```typescript
class ProviderStore {
  // 保存配置
  async saveConfig(profileData: any): Promise<void>;

  // 获取配置
  getProfiles(): ProviderProfiles;

  // 等待初始化
  async waitForInitialization(): Promise<void>;
}
```

### 3. 用户交互层 (Commit Chat)

#### 3.1 CommitChatService (聊天服务)

**文件**: `commit-chat/commit-chat-service.ts`

**职责**: AI 聊天交互和命令处理

```typescript
class CommitChatService {
  // 处理消息
  async processMessage(request: CommitChatRequest): Promise<CommitChatResponse> {
    const { message, context } = request;

    // 1. 更新上下文
    this.updateContext(context);

    // 2. 检查命令
    if (message.startsWith("/")) {
      return this.handleCommand(message, context);
    }

    // 3. 生成建议
    const suggestions = await this.suggestionEngine.generateSuggestions(
      message,
      context
    );

    // 4. 调用 AI
    const aiResponse = await this.callAI(message, context);

    // 5. 处理响应
    return this.processResponse(aiResponse, suggestions);
  }

  // 命令处理
  private handleCommand(message: string, context: any): CommitChatResponse {
    const command = this.commandParser.parse(message);

    switch (command.name) {
      case "help":
        return this.showHelp();
      case "config":
        return this.showConfig();
      case "clear":
        return this.clearHistory();
      // ... 其他命令
    }
  }
}
```

**支持的命令**:

```typescript
/help           # 显示帮助
/config         # 显示当前配置
/clear          # 清除对话历史
/generate       # 生成提交
/review         # 代码审查
/branch         # 生成分支名
```

#### 3.2 SuggestionEngine (建议引擎)

**职责**: 基于上下文生成智能建议

```typescript
class SuggestionEngine {
  // 生成建议
  async generateSuggestions(message: string, context: any): Promise<string[]> {
    // 1. 分析用户意图
    const intent = this.analyzeIntent(message);

    // 2. 基于项目上下文
    const projectContext = this.projectContext;

    // 3. 基于用户偏好
    const preferences = this.userPreferences;

    // 4. 生成相关建议
    return this.generateBasedOnContext(intent, projectContext, preferences);
  }
}
```

### 4. WebView 服务层

#### 4.1 SettingsViewProvider (设置视图)

**文件**: `webview/settings-view-provider.ts`

**职责**: 提供设置界面的 WebView

```typescript
class SettingsViewProvider implements vscode.WebviewViewProvider {
  // 解析 WebView
  resolveWebviewView(webviewView: vscode.WebviewView): void {
    // 1. 设置 HTML
    webviewView.webview.html = this.getHtml();

    // 2. 注册消息处理器
    webviewView.webview.onDidReceiveMessage((data) => {
      this.handleMessage(data);
    });
  }

  // 处理消息
  private handleMessage(data: any): void {
    switch (data.type) {
      case "getProfiles":
        this.sendProfiles();
        break;
      case "saveProfile":
        this.saveProfile(data.profile);
        break;
      // ... 其他消息
    }
  }
}
```

**消息处理器** (handlers/):
- `settings-view-message-handler.ts` - 主处理器
- `settings/*-message-handler.ts` - 各个设置模块
- `weekly-report-message-handler.ts` - 周报处理器

### 5. 错误处理层 (Error Handling)

#### 5.1 EnhancedErrorHandler (增强错误处理器)

**文件**: `error-handling/enhanced-error-handler.ts`

**职责**: 分类、翻译和处理错误

```typescript
class EnhancedErrorHandler {
  // 处理错误
  async handleError(error: any, context: ErrorContext): Promise<void> {
    // 1. 分类错误
    const classification = this.classifyError(error);

    // 2. 翻译错误
    const message = this.translateError(error, context);

    // 3. 记录日志
    this.logger.logError(error, message, context);

    // 4. 显示通知
    await this.showNotification(classification, message);

    // 5. 提供解决方案
    if (classification.isFixable) {
      await this.suggestSolution(error, context);
    }
  }
}
```

**错误分类**:

```typescript
enum ErrorType {
  CONFIGURATION = "configuration",    // 配置错误
  NETWORK = "network",                // 网络错误
  AUTHENTICATION = "authentication",  // 认证错误
  RATE_LIMIT = "rate_limit",          // 速率限制
  MODEL_NOT_FOUND = "model_not_found", // 模型不存在
  CONTEXT_LENGTH = "context_length",   // 上下文过长
  SCM_ERROR = "scm_error",            // SCM 错误
  UNKNOWN = "unknown",                // 未知错误
}
```

### 6. 通知服务 (Notification)

#### 6.1 NotificationService (通知服务)

**文件**: `notification-service.ts` (85 行)

**职责**: 系统通知和用户提示

```typescript
class NotificationService {
  // 显示迁移通知
  async checkAndShowMigrationNotification(): Promise<void> {
    const hasShown = this.context.workspaceState.get(
      MIGRATION_NOTIFICATION_KEY,
      false
    );

    if (!hasShown) {
      const selection = await vscode.window.showInformationMessage(
        "检测到旧配置，是否迁移到新 Profile 系统？",
        "立即迁移",
        "稍后再说"
      );

      if (selection === "立即迁移") {
        await vscode.commands.executeCommand("dish-ai-commit.settingsView.focus");
      }

      // 标记已显示
      await this.context.workspaceState.update(
        MIGRATION_NOTIFICATION_KEY,
        true
      );
    }
  }
}
```

## 📊 数据流示例

### 示例 1: 配置迁移流程

```
扩展激活
    ↓
SettingsMigration.detectOldConfiguration()
    ├─ 读取 VS Code 配置
    ├─ 检测 20+ Provider
    └─ 检查用户偏好
    ↓ (如果有旧配置)
NotificationService.checkAndShowMigrationNotification()
    ↓ (用户确认)
SettingsMigration.performMigration()
    ├─ 创建 Profile
    ├─ 验证和修复
    ├─ 保存到 ProviderStore
    ├─ 激活 Profile
    └─ 标记迁移完成
```

### 示例 2: 提交生成流程

```
用户触发生成
    ↓
CommandManager (命令层)
    ↓
BaseCommand.prepare()
    ├─ 验证 ToS
    ├─ ProfileManager 获取配置
    ├─ ProviderSelectionService 选择 Provider
    ├─ SCMFactory 检测 SCM
    └─ 验证模型可用性
    ↓
StreamingGenerationHelper (4阶段)
    ├─ 阶段1: 初始化 + 超早期缓存检查
    ├─ 阶段2: 模型验证
    ├─ 阶段3: 上下文构建
    └─ 阶段4: 生成消息
    ↓
CommitCacheService (缓存)
    ├─ 检查缓存 (命中则返回)
    └─ 写入缓存 (未命中)
    ↓
AIProviderFactory.getProvider()
    ↓
AbstractAIProvider.generateCommit()
    ↓
TokenStatsService.addTokens() (统计)
    ↓
SCMProvider.setCommitInput() (应用)
```

### 示例 3: 聊天交互流程

```
用户输入消息
    ↓
CommitChatService.processMessage()
    ├─ 更新上下文
    ├─ 检查命令 (以 / 开头)
    ├─ 生成建议 (SuggestionEngine)
    ├─ 调用 AI
    └─ 处理响应
    ↓
CommandParser.parse() (如果是命令)
    ├─ 解析命令和参数
    └─ 执行对应操作
    ↓
返回响应给用户
```

## 🎯 设计模式

### 1. 单例模式

```typescript
// 所有核心服务都是单例
class TokenStatsService {
  private static instance: TokenStatsService;

  public static getInstance(): TokenStatsService {
    if (!TokenStatsService.instance) {
      throw new Error("Not initialized");
    }
    return TokenStatsService.instance;
  }
}

// 使用
const stats = TokenStatsService.getInstance();
```

### 2. 策略模式

```typescript
// Provider 选择策略
interface SelectionStrategy {
  select(profile: Profile): ProviderSelectionResult;
}

const strategies = {
  active: new ActiveProviderStrategy(),
  firstWithModel: new FirstWithModelStrategy(),
  first: new FirstProviderStrategy(),
};
```

### 3. 观察者模式

```typescript
// 配置变更监听
vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration("dish-ai-commit")) {
    // 重新加载配置
    profileManager.reload();
  }
});
```

### 4. 工厂模式

```typescript
// 服务工厂
class ServiceFactory {
  static createProfileManager(context: vscode.ExtensionContext) {
    return ProfileManagerService.create(context);
  }

  static createCommitChatService(config) {
    return new CommitChatService(config);
  }
}
```

## 📊 性能优化

### 缓存优化

| 服务 | 缓存策略 | 容量 | 命中率 |
|------|---------|------|--------|
| CommitCache | LRU | 50 条 | 85% |
| TokenStats | 按天聚合 | 30 天 | 100% |
| Profile | 内存 | 无限制 | 100% |

### 迁移性能

| 操作 | 耗时 | 优化 |
|------|------|------|
| 检测旧配置 | < 50ms | 只读配置 |
| 生成预览 | < 100ms | 按需加载 |
| 执行迁移 | < 200ms | 批量保存 |

### 聊天性能

| 操作 | 耗时 | 优化 |
|------|------|------|
| 命令解析 | < 10ms | 正则匹配 |
| 建议生成 | < 50ms | 上下文缓存 |
| AI 调用 | 200-500ms | 流式输出 |

## 🔍 故障排除

### 常见问题

#### 1. 迁移失败

**问题**: 无法从旧配置创建 Profile

**解决方案**:
```typescript
// 1. 检查旧配置
const config = vscode.workspace.getConfiguration("dish-ai-commit");
console.log("Old config:", config);

// 2. 手动触发迁移
await vscode.commands.executeCommand("dish-ai-commit.migrate");

// 3. 查看日志
// 检查是否有 Provider 配置不完整
```

#### 2. 缓存未生效

**问题**: 每次都重新生成，缓存未命中

**解决方案**:
```typescript
// 1. 检查缓存大小
const cache = CommitCacheService.getInstance();
console.log("Cache size:", cache["cache"].size);

// 2. 检查缓存键是否一致
const key = cache.generateKey(diff, config, model);
console.log("Cache key:", key);

// 3. 手动清除缓存
// 重启扩展会自动清除内存缓存
```

#### 3. Token 统计不准确

**问题**: 统计数据与实际不符

**解决方案**:
```typescript
// 1. 检查统计服务是否初始化
TokenStatsService.initialize(context);

// 2. 查看详细统计
const stats = TokenStatsService.getInstance().getDetailedStats();
console.log("Token stats:", stats);

// 3. 重置统计
await TokenStatsService.getInstance().resetTotalTokens();
```

#### 4. Provider 选择错误

**问题**: 使用了错误的 Provider 或 Model

**解决方案**:
```typescript
// 1. 检查 Profile
const profileManager = await ProfileManagerService.create(context);
const profile = profileManager.getActiveProfile();
console.log("Active profile:", profile);

// 2. 检查选择逻辑
const selection = ProviderSelectionService.selectProvider(profile);
console.log("Selection:", selection);

// 3. 手动设置 activeProviderId
profile.activeProviderId = "openai";
await profileManager.saveProfile(profile);
```

## 🤝 开发指南

### 添加新服务

```typescript
// 1. 定义接口
interface INewService {
  doSomething(): Promise<void>;
}

// 2. 实现服务
export class NewService implements INewService {
  private static instance: NewService;

  private constructor() {}

  public static getInstance(): NewService {
    if (!NewService.instance) {
      NewService.instance = new NewService();
    }
    return NewService.instance;
  }

  async doSomething(): Promise<void> {
    // 实现逻辑
  }
}

// 3. 在 services.ts 中导出
export const newService = NewService.getInstance();
```

### 测试策略

```typescript
describe('SettingsMigration', () => {
  it('should detect old configuration', async () => {
    const migration = new SettingsMigration(mockProfileManager);
    const result = await migration.detectOldConfiguration();
    expect(result.hasOldConfig).toBe(true);
  });

  it('should perform migration', async () => {
    const result = await migration.performMigration();
    expect(result.success).toBe(true);
    expect(result.profileId).toBeDefined();
  });
});

describe('CommitCacheService', () => {
  it('should cache and retrieve', () => {
    const cache = CommitCacheService.getInstance();
    const key = "test-key";
    const value = "test-value";

    cache.set(key, value);
    expect(cache.get(key)).toBe(value);
  });

  it('should implement LRU eviction', () => {
    const cache = CommitCacheService.getInstance();
    // 填充到最大容量
    for (let i = 0; i < 50; i++) {
      cache.set(`key-${i}`, `value-${i}`);
    }
    // 添加第 51 个，应该淘汰第一个
    cache.set("key-51", "value-51");
    expect(cache.get("key-0")).toBeUndefined();
  });
});
```

## 📚 相关文档

- **主 README**: [../README.md](../README.md) - 项目总览
- **AI 模块**: [../ai/README.md](../ai/README.md) - AI 提供商
- **命令模块**: [../commands/README.md](../commands/README.md) - 命令架构
- **SCM 模块**: [../scm/README.md](../scm/README.md) - SCM 实现
- **配置系统**: [../config/README.md](../config/README.md) - 配置定义

---

**最后更新**: 2024年12月
**模块版本**: v0.56.1
**核心服务**: 15+ 个
**代码质量**: ⭐⭐⭐⭐⭐
**架构模式**: 单例、策略、工厂
