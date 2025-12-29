# 独立存储架构文档

## 概述

新的独立存储架构将原本混合在 `Profile` 中的所有设置分离为独立的存储模块，每个模块负责特定的数据类型。这种架构提供了更好的职责分离、存储优化和维护性。

## 架构对比

### 旧架构（混合存储）
```
Profile (secrets)
├── providers (API keys) ✅
├── preferences (语言、温度等) ❌ 混合
└── features (功能开关) ❌ 混合

GlobalState
├── PreferencesSettingsManager ❌ 重复
├── FeaturesSettingsManager ❌ 重复
└── AdvancedSettingsManager ❌ 重复
```

### 新架构（独立存储）
```
Secrets (API敏感信息)
└── dish-ai-commit_api_config
    └── { providers, activeProviderId }

GlobalState (用户偏好)
├── dish-ai-commit_preferences
│   └── { language, temperature, skipRules, timeout, ... }
├── dish-ai-commit_features
│   └── { enableEmoji, enableLayeredCommit, ... }
└── dish-ai-commit_advanced
    └── { verbosity, rateLimit, retryAttempts, ... }
```

## 存储模块

### 1. ApiConfigStorage
**位置**: `secrets`
**用途**: 存储AI提供商的API密钥、baseUrl等敏感信息
**数据结构**:
```typescript
interface ApiConfigStorageData {
  providers: Record<string, ProviderConfig>;
  activeProviderId: string;
}
```

### 2. PreferencesStorage
**位置**: `globalState`
**用途**: 存储用户偏好设置
**数据结构**:
```typescript
interface PreferencesStorageData {
  language: string;
  commitTemperature: number;
  reviewTemperature: number;
  branchNameTemperature: number;
  weeklyReportTemperature: number;
  skipDiffFileExtensions: string[];
  skipDiffPathPatterns: string[];
  maxDiffFileSizeKB: number;
  autoDetectBinaryFiles: boolean;
  respectGitAttributes: boolean;
  timeout: number;
  retryAttempts: number;
  rateLimitSeconds: number;
  consecutiveMistakeLimit: number;
  maxTokens?: number;
}
```

### 3. FeaturesStorage
**位置**: `globalState`
**用途**: 存储功能开关
**数据结构**:
```typescript
interface FeaturesStorageData {
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

### 4. AdvancedStorage
**位置**: `globalState`
**用途**: 存储高级设置
**数据结构**:
```typescript
interface AdvancedStorageData {
  verbosity: number;
  rateLimitSeconds: number;
  timeout: number;
  retryAttempts: number;
  consecutiveMistakeLimit: number;
  maxTokens?: number;
}
```

## 使用示例

### 读取设置
```typescript
import { StorageManager } from "@/services/storage";

// 获取存储管理器实例
const storageManager = StorageManager.getInstance(context);

// 读取功能设置
const features = await storageManager.features.load();

// 读取偏好设置
const preferences = await storageManager.preferences.load();

// 读取API配置
const apiConfig = await storageManager.apiConfig.load();
```

### 保存设置
```typescript
// 保存功能设置
await storageManager.features.save({
  enableEmoji: true,
  enableLayeredCommit: false,
  // ...
});

// 保存偏好设置
await storageManager.preferences.save({
  language: "Simplified Chinese",
  commitTemperature: 0.7,
  // ...
});

// 更新单个提供者
await storageManager.apiConfig.updateProvider("openai", {
  id: "openai",
  name: "OpenAI",
  apiKey: "sk-...",
  baseUrl: "https://api.openai.com/v1",
  // ...
});
```

### 导出/导入
```typescript
// 导出所有配置
const allConfig = await storageManager.exportAll();

// 导入所有配置
await storageManager.importAll({
  apiConfig: { ... },
  preferences: { ... },
  features: { ... },
  advanced: { ... },
});

// 导出到文件
await storageManager.exportToFile();

// 从文件导入
await storageManager.importFromFile();
```

## 迁移服务

### 自动迁移
在扩展激活时，系统会自动检测旧配置并迁移到新架构：

```typescript
import { NewSettingsMigration } from "@/services/storage";

const migration = new NewSettingsMigration(context);
const detection = await migration.detectOldConfiguration();

if (detection.migrationNeeded) {
  const result = await migration.performMigration();
  console.log(`迁移结果: ${result.success}, 块: ${result.migratedBlocks}`);
}
```

### 手动迁移
```typescript
const migration = new MigrationService(context);

// 检测
const detection = await migration.detectOldConfiguration();

// 预览
const preview = await migration.previewMigration();

// 执行
const result = await migration.performMigration();

// 清理旧数据
await migration.cleanupLegacyStorage();
```

### 迁移状态检查
```typescript
const migration = new NewSettingsMigration(context);

// 检查是否需要迁移
const status = await migration.getMigrationStatus();
if (status.needed && !status.completed) {
  // 执行迁移
  const result = await migration.autoMigrate();
  console.log(result.message);
}
```

## 优势

1. **职责分离**: 每个模块只负责自己的数据
2. **存储优化**: 敏感信息用secrets，普通设置用globalState
3. **简化逻辑**: 无需复杂的合并逻辑
4. **易于维护**: 每个块独立演化
5. **性能提升**: 减少数据读取和解析

## 向后兼容

### ProfileManagerService
提供了向后兼容的接口：
- `getAllProfiles()`: 返回类似旧Profile结构的数据
- `getActiveProviderConfig()`: 异步获取活跃提供者
- `getFeatureSettings()`: 异步获取功能设置
- `getPreferences()`: 新增，获取偏好设置
- `getAdvancedSettings()`: 新增，获取高级设置

### StorageManager
统一管理器也提供向后兼容方法：
- `getActiveProviderConfig()`
- `getFeatureSettings()`
- `getPreferences()`
- `getAdvancedSettings()`

## 注意事项

1. **异步方法**: 新架构使用异步方法，需要使用 `await`
2. **初始化顺序**: 确保在使用前调用 `StorageManager.getInstance(context)`
3. **迁移状态**: 迁移完成后会标记状态，避免重复迁移
4. **数据安全**: API密钥存储在secrets中，不会出现在日志或设置文件中
5. **向后兼容**: 旧的设置管理器仍然可用，但推荐使用新的存储架构

## 文件结构

```
src/services/storage/
├── api-config-storage.ts      # API配置存储
├── preferences-storage.ts     # 偏好设置存储
├── features-storage.ts        # 功能开关存储
├── advanced-storage.ts        # 高级设置存储
├── storage-manager.ts         # 统一管理器
├── migration-service.ts       # 迁移服务
├── new-settings-migration.ts  # 新迁移系统
└── index.ts                   # 导出
```

## 扩展激活时的迁移流程

```typescript
// 在扩展激活时
export async function activate(context: vscode.ExtensionContext) {
  // 1. 自动迁移
  const migration = new NewSettingsMigration(context);
  const detection = await migration.detectOldConfiguration();

  if (detection.migrationNeeded) {
    const result = await migration.autoMigrate();
    if (result.success) {
      console.log(`成功迁移 ${result.migratedBlocks} 个配置块`);
    } else {
      console.error("迁移失败:", result.message);
    }
  }

  // 2. 初始化存储管理器
  const storageManager = StorageManager.getInstance(context);

  // 3. 现在可以安全使用存储功能
  const features = await storageManager.features.load();
  // ...
}
```

## 更新日志

### v3.0 - 独立存储架构
- 将Profile中的设置分离为独立存储模块
- 每个模块职责单一，易于维护
- 优化存储位置（敏感信息用secrets）
- 提供完整的迁移工具
- 保持向后兼容
- 新增导出/导入功能
- 新增统一的StorageManager

### v2.0 - 混合架构
- Profile中混合存储API配置和用户偏好
- 存在重复的设置管理器
- 迁移逻辑复杂

### v1.0 - 基础架构
- 简单的配置存储
- 基本的Profile管理