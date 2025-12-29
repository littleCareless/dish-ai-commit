# 存储架构使用示例

## 基础使用

### 1. 初始化存储管理器
```typescript
import { StorageManager } from "@/services/storage";
import * as vscode from "vscode";

// 在扩展激活时
export async function activate(context: vscode.ExtensionContext) {
  const storageManager = StorageManager.getInstance(context);

  // 可选：检查是否需要迁移
  const migration = new NewSettingsMigration(context);
  const detection = await migration.detectOldConfiguration();

  if (detection.migrationNeeded) {
    const result = await migration.autoMigrate();
    console.log(result.message);
  }
}
```

### 2. 读取配置
```typescript
// 获取存储管理器实例
const storageManager = StorageManager.getInstance(context);

// 读取功能设置
const features = await storageManager.features.load();
console.log("表情符号启用:", features.enableEmoji);

// 读取偏好设置
const preferences = await storageManager.preferences.load();
console.log("语言:", preferences.language);

// 读取API配置
const apiConfig = await storageManager.apiConfig.load();
console.log("活跃提供者:", apiConfig?.activeProviderId);

// 读取高级设置
const advanced = await storageManager.advanced.load();
console.log("详细程度:", advanced.verbosity);
```

### 3. 保存配置
```typescript
// 保存功能设置
await storageManager.features.save({
  enableEmoji: true,
  enableMergeCommit: false,
  enableBody: true,
  enableLayeredCommit: false,
  enableGlobalContext: true,
  useRecentCommitsAsReference: false,
  simplifyDiff: false,
  autoDetectStaged: true,
  fallbackToAll: true,
  diffTarget: "auto",
  suppressNonCriticalWarnings: true,
  weeklyReport: true,
  codeReview: true,
  generateBranchName: true,
  generatePRSummary: true,
});

// 保存偏好设置
await storageManager.preferences.save({
  language: "Simplified Chinese",
  commitTemperature: 0.7,
  reviewTemperature: 0.8,
  branchNameTemperature: 0.7,
  weeklyReportTemperature: 0.9,
  skipDiffFileExtensions: [".png", ".jpg", ".pdf"],
  skipDiffPathPatterns: ["node_modules/**", "dist/**"],
  maxDiffFileSizeKB: 500,
  autoDetectBinaryFiles: true,
  respectGitAttributes: true,
  timeout: 30000,
  retryAttempts: 3,
  rateLimitSeconds: 5,
  consecutiveMistakeLimit: 3,
  maxTokens: 4000,
});
```

## 高级使用

### 1. API提供者管理
```typescript
const storageManager = StorageManager.getInstance(context);

// 添加新的提供者
await storageManager.apiConfig.updateProvider("anthropic", {
  id: "anthropic",
  name: "Anthropic",
  type: "first-party",
  apiKey: "sk-ant-api03-...",
  baseUrl: "https://api.anthropic.com/v1",
  defaultModel: "claude-3-haiku-20240307",
  createdAt: new Date(),
  updatedAt: new Date(),
});

// 设置活跃提供者
await storageManager.apiConfig.setActiveProviderId("anthropic");

// 获取活跃提供者
const activeProvider = await storageManager.apiConfig.getActiveProvider();
console.log("当前使用:", activeProvider?.name);

// 删除提供者
await storageManager.apiConfig.deleteProvider("old-provider");
```

### 2. 单个设置更新
```typescript
// 功能开关
await storageManager.features.enable("enableEmoji");
await storageManager.features.disable("enableLayeredCommit");
const newStatus = await storageManager.features.toggle("weeklyReport");

// 偏好设置
await storageManager.preferences.set("language", "English");
const temp = await storageManager.preferences.get("commitTemperature");

// 高级设置
await storageManager.advanced.setDebugMode(true);
const isDebug = await storageManager.advanced.isDebugMode();
```

### 3. 导出和导入
```typescript
// 导出到对象
const allConfig = await storageManager.exportAll();
console.log(JSON.stringify(allConfig, null, 2));

// 导出到JSON字符串
const json = await storageManager.exportToJson();

// 导出到文件
const filePath = await storageManager.exportToFile();
console.log("配置已导出到:", filePath);

// 从对象导入
await storageManager.importAll({
  apiConfig: { /* ... */ },
  preferences: { /* ... */ },
  features: { /* ... */ },
  advanced: { /* ... */ },
});

// 从JSON字符串导入
await storageManager.importFromJson(jsonString);

// 从文件导入
await storageManager.importFromFile();
```

### 4. 重置设置
```typescript
// 重置所有设置
await storageManager.resetAll();

// 重置单个模块
await storageManager.preferences.reset();
await storageManager.features.reset();
await storageManager.advanced.reset();
await storageManager.apiConfig.clear();
```

## 迁移相关

### 1. 检测和预览
```typescript
const migration = new NewSettingsMigration(context);

// 检测是否需要迁移
const detection = await migration.detectOldConfiguration();
if (detection.migrationNeeded) {
  console.log("需要迁移:", detection.details);
}

// 预览迁移结果
const preview = await migration.previewMigration();
if (preview) {
  console.log("旧数据:", preview.oldData);
  console.log("新数据:", preview.newData);
  console.log("变更:", preview.changes);
}
```

### 2. 执行迁移
```typescript
// 自动迁移
const result = await migration.autoMigrate();
if (result.success) {
  console.log(`成功迁移 ${result.migratedBlocks} 个块`);
} else {
  console.error("迁移失败:", result.message);
}

// 手动迁移
const manualResult = await migration.performMigration();
if (manualResult.success) {
  await migration.cleanupLegacyStorage();
}
```

### 3. 迁移状态
```typescript
const status = await migration.getMigrationStatus();
console.log("需要迁移:", status.needed);
console.log("已完成:", status.completed);
console.log("详情:", status.details);

const completed = await migration.isMigrationCompleted();
```

## 向后兼容

### 1. ProfileManagerService
```typescript
import { ProfileManagerService } from "@/services/profile-manager";

const profileManager = await ProfileManagerService.create(context);

// 获取所有配置（向后兼容）
const profiles = await profileManager.getAllProfiles();

// 获取活跃提供者（向后兼容）
const provider = await profileManager.getProfileForMode();

// 获取功能设置（向后兼容）
const features = profileManager.getFeatureSettings();

// 新增方法
const preferences = await profileManager.getPreferences();
const advanced = await profileManager.getAdvancedSettings();
```

### 2. 旧设置管理器（仍然可用）
```typescript
import { PreferencesSettingsManager } from "@/services/settings/preferences-settings-manager";
import { FeaturesSettingsManager } from "@/services/settings/features-settings-manager";
import { AdvancedSettingsManager } from "@/services/settings/advanced-settings-manager";

// 仍然可以使用，但推荐使用新的存储架构
const prefsManager = PreferencesSettingsManager.getInstance(context);
const featuresManager = FeaturesSettingsManager.getInstance(context);
const advancedManager = AdvancedSettingsManager.getInstance(context);

await prefsManager.initialize();
const prefs = prefsManager.getSettings();
```

## 实际应用场景

### 1. 扩展激活时的完整流程
```typescript
export async function activate(context: vscode.ExtensionContext) {
  // 1. 自动迁移
  const migration = new NewSettingsMigration(context);
  const detection = await migration.detectOldConfiguration();

  if (detection.migrationNeeded) {
    const result = await migration.autoMigrate();
    if (result.success) {
      console.log(`配置迁移成功: ${result.migratedBlocks} 个块`);
    } else {
      console.error("配置迁移失败:", result.message);
    }
  }

  // 2. 初始化存储管理器
  const storageManager = StorageManager.getInstance(context);

  // 3. 加载当前配置
  const [features, preferences, apiConfig] = await Promise.all([
    storageManager.features.load(),
    storageManager.preferences.load(),
    storageManager.apiConfig.load(),
  ]);

  // 4. 验证配置
  if (!apiConfig || Object.keys(apiConfig.providers).length === 0) {
    // 引导用户配置API
    await showApiConfigurationWizard();
  }

  // 5. 注册命令和提供者
  // ...
}
```

### 2. 设置界面的实现
```typescript
// 读取当前设置
const storageManager = StorageManager.getInstance(context);
const features = await storageManager.features.load();
const preferences = await storageManager.preferences.load();

// 显示在UI上
ui.updateFeatureToggles(features);
ui.updatePreferenceInputs(preferences);

// 用户修改后保存
ui.onFeatureToggle(async (feature, value) => {
  await storageManager.features.set(feature, value);
});

ui.onPreferenceChange(async (preference, value) => {
  await storageManager.preferences.set(preference, value);
});
```

### 3. 配置验证
```typescript
async function validateConfiguration(storageManager: StorageManager) {
  const errors: string[] = [];

  // 检查API配置
  const apiConfig = await storageManager.apiConfig.load();
  if (!apiConfig || !apiConfig.activeProviderId) {
    errors.push("未配置AI提供者");
  } else {
    const activeProvider = await storageManager.apiConfig.getActiveProvider();
    if (!activeProvider?.apiKey) {
      errors.push("当前提供者未配置API密钥");
    }
  }

  // 检查偏好设置
  const preferences = await storageManager.preferences.load();
  if (preferences.timeout < 1000) {
    errors.push("超时时间不能小于1秒");
  }

  return errors;
}
```

## 性能优化

### 1. 批量操作
```typescript
// 使用Promise.all进行并行加载
const [features, preferences, advanced, apiConfig] = await Promise.all([
  storageManager.features.load(),
  storageManager.preferences.load(),
  storageManager.advanced.load(),
  storageManager.apiConfig.load(),
]);
```

### 2. 选择性更新
```typescript
// 只更新变化的部分
const currentFeatures = await storageManager.features.load();
const changes: Partial<FeaturesStorageData> = {};

if (currentFeatures.enableEmoji !== newSettings.enableEmoji) {
  changes.enableEmoji = newSettings.enableEmoji;
}

if (Object.keys(changes).length > 0) {
  await storageManager.features.update(changes);
}
```

### 3. 缓存策略
```typescript
class CachedStorageManager {
  private cache = new Map<string, any>();

  constructor(private storageManager: StorageManager) {}

  async getFeatures(): Promise<FeaturesStorageData> {
    const cached = this.cache.get('features');
    if (cached) return cached;

    const data = await this.storageManager.features.load();
    this.cache.set('features', data);
    return data;
  }

  invalidateCache() {
    this.cache.clear();
  }
}
```

## 错误处理

```typescript
try {
  await storageManager.features.save(newFeatures);
} catch (error) {
  console.error("保存失败:", error);
  // 显示用户友好的错误信息
  vscode.window.showErrorMessage("无法保存功能设置，请重试");
}

// 或者使用更详细的错误处理
try {
  await storageManager.apiConfig.updateProvider("openai", config);
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes("secrets")) {
      vscode.window.showErrorMessage("无法访问安全存储，请检查VSCode权限");
    } else {
      vscode.window.showErrorMessage(`保存失败: ${error.message}`);
    }
  }
}
```

## 最佳实践

1. **总是使用异步方法**: 新架构的所有方法都是异步的
2. **错误处理**: 始终处理可能的存储错误
3. **迁移检查**: 在扩展启动时检查并执行迁移
4. **向后兼容**: 为使用旧API的代码提供过渡期
5. **数据验证**: 在保存前验证数据的有效性
6. **性能优化**: 使用Promise.all进行并行操作
7. **安全考虑**: API密钥始终存储在secrets中