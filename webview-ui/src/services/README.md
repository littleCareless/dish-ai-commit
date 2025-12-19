# Services 模块文档

## 📋 概述

Services 模块提供了与 VS Code 扩展通信的服务层，以及数据持久化功能。这些服务封装了所有外部交互逻辑。

## 📦 服务列表

### 1. ProfileManager (配置文件管理服务)

**文件**: `webview/profile-manager.ts` (~167 行)

**职责**:

- 管理配置文件的 CRUD 操作
- 处理与 VS Code 扩展的消息通信
- 提供配置文件导入/导出
- 管理提供商配置

**核心设计**:

```typescript
export class ProfileManager {
  // 无本地状态
  // 所有操作通过消息通信

  async loadProfiles(): Promise<{
    profiles: Profile[];
    activeProfileId: string;
  }>;

  async saveProfile(profile: Profile): Promise<void>;
  async deleteProfile(profileId: string): Promise<void>;
  async setActiveProfile(profileId: string): Promise<void>;
  async getAllProviders(): Promise<ProviderConfig[]>;
  async exportProfile(profileId: string): Promise<void>;
  async importProfile(): Promise<Profile>;
  async migrateSettings(): Promise<Profile | null>;
  async resetToDefaults(): Promise<void>;

  // 工具方法
  createDefaultProfile(name: string, description?: string): Profile;
  cloneProfile(profile: Profile, newName: string): Profile;
}
```

**消息映射**:

```typescript
const commandToResponse: Record<string, ExtensionResponse> = {
  "profile.loadAll": "profileAllLoaded",
  "profile.save": "profileSaved",
  "profile.delete": "profileDeleted",
  "profile.setActive": "profileActiveChanged",
  "profile.getAllProviders": "profileAllProvidersLoaded",
  "profile.export": "profileExported",
  "profile.import": "profileImported",
  "profile.migrateSettings": "profileSettingsMigrated",
  "profile.resetDefaults": "profileResetComplete",
};
```

**使用示例**:

```tsx
import { profileManager } from "@/services/webview/profile-manager";

// 加载配置文件
const { profiles, activeProfileId } = await profileManager.loadProfiles();

// 创建新配置
const newProfile = profileManager.createDefaultProfile(
  "开发环境",
  "用于本地开发测试",
);
await profileManager.saveProfile(newProfile);

// 激活配置
await profileManager.setActiveProfile(newProfile.id);

// 导出配置
await profileManager.exportProfile(newProfile.id);

// 导入配置
const importedProfile = await profileManager.importProfile();
```

**invoke 函数详解**:

```typescript
function invoke<T>(
  command: string,
  data?: Record<string, unknown>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const requestId = uuidv4();
    const expectedResponse = commandToResponse[command];

    if (!expectedResponse) {
      reject(new Error(`No response mapping found for command: ${command}`));
      return;
    }

    const handleResponse = (event: MessageEvent) => {
      const message = event.data as ExtensionResponseMessage;
      if (
        message.command === expectedResponse &&
        message.requestId === requestId
      ) {
        window.removeEventListener("message", handleResponse);
        if (message.error) {
          reject(new Error(message.error));
        } else {
          resolve(message.payload as T);
        }
      }
    };

    window.addEventListener("message", handleResponse);

    // 15秒超时
    setTimeout(() => {
      window.removeEventListener("message", handleResponse);
      reject(new Error(`Request for command '${command}' timed out.`));
    }, 15000);

    postMessage(command, { ...data, requestId });
  });
}
```

### 2. SecureStorage (安全存储服务)

**文件**: `secure-storage.ts` (~14420 行)

**职责**:

- 提供加密的本地存储
- 管理敏感数据（API Key 等）
- 支持多环境隔离

**存储结构**:

```typescript
interface SecureStorageData {
  encrypted: boolean;
  data: string; // 加密后的数据
  iv: string; // 初始化向量
  salt: string; // 盐值
  version: string;
  timestamp: number;
}

interface StoredData {
  profiles: Profile[];
  activeProfileId: string;
  preferences: UserPreferences;
  // ... 其他数据
}
```

**加密机制**:

```typescript
// 使用 Web Crypto API
async function encryptData(data: any, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(JSON.stringify(data));

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    dataBuffer,
  );

  return JSON.stringify({
    encrypted: true,
    data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(
      String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))),
    ),
    version: "1.0",
    timestamp: Date.now(),
  });
}
```

**使用示例**:

```typescript
import { SecureStorage } from "@/services/secure-storage";

const storage = new SecureStorage("my-app-v1");

// 保存数据
await storage.save("profiles", profiles);

// 加载数据
const profiles = await storage.load<Profile[]>("profiles");

// 删除数据
await storage.remove("profiles");

// 清空所有
await storage.clear();
```

## 🔧 消息通信协议

### Webview → Extension

```typescript
// 配置文件操作
interface ProfileLoadAllRequest {
  command: "profile.loadAll";
  requestId: string;
}

interface ProfileSaveRequest {
  command: "profile.save";
  requestId: string;
  profile: Profile;
}

interface ProfileDeleteRequest {
  command: "profile.delete";
  requestId: string;
  profileId: string;
}

interface ProfileSetActiveRequest {
  command: "profile.setActive";
  requestId: string;
  profileId: string;
}

interface ProfileGetAllProvidersRequest {
  command: "profile.getAllProviders";
  requestId: string;
}

interface ProfileExportRequest {
  command: "profile.export";
  requestId: string;
  profileId: string;
}

interface ProfileImportRequest {
  command: "profile.import";
  requestId: string;
}

interface ProfileMigrateRequest {
  command: "profile.migrateSettings";
  requestId: string;
}

interface ProfileResetRequest {
  command: "profile.resetDefaults";
  requestId: string;
}
```

### Extension → Webview

```typescript
// 成功响应
interface ProfileAllLoadedResponse {
  command: "profileAllLoaded";
  requestId: string;
  payload: {
    profiles: Profile[];
    activeProfileId: string;
  };
}

interface ProfileSavedResponse {
  command: "profileSaved";
  requestId: string;
  payload: void;
}

interface ProfileAllProvidersLoadedResponse {
  command: "profileAllProvidersLoaded";
  requestId: string;
  payload: ProviderConfig[];
}

interface ProfileImportedResponse {
  command: "profileImported";
  data: {
    profile: Profile;
    success: boolean;
    error?: string;
  };
}

// 错误响应
interface ErrorResponse {
  command: string;
  requestId: string;
  error: string;
}

// 广播消息
interface ProfilesUpdatedMessage {
  command: "profilesUpdated";
  payload: {
    profiles: Profile[];
    activeProfileId: string;
  };
}
```

## 🎯 服务组合模式

### 1. 服务层架构

```
UI Components
    ↓
Hooks (useSettings, useCommitChatState)
    ↓
Services (ProfileManager, SecureStorage)
    ↓
Message Communication (postMessage)
    ↓
VS Code Extension
    ↓
File System / API
```

### 2. 依赖注入模式

```typescript
// 服务工厂
class ServiceFactory {
  private static instances: Map<string, any> = new Map();

  static getProfileManager(): ProfileManager {
    if (!this.instances.has("ProfileManager")) {
      this.instances.set("ProfileManager", new ProfileManager());
    }
    return this.instances.get("ProfileManager");
  }

  static getSecureStorage(): SecureStorage {
    if (!this.instances.has("SecureStorage")) {
      this.instances.set("SecureStorage", new SecureStorage("dish-ai"));
    }
    return this.instances.get("SecureStorage");
  }
}

// 使用
const profileManager = ServiceFactory.getProfileManager();
const storage = ServiceFactory.getSecureStorage();
```

### 3. 服务组合

```typescript
// 高级服务组合
class ConfigurationService {
  constructor(
    private profileManager: ProfileManager,
    private storage: SecureStorage,
  ) {}

  async exportWithBackup(profileId: string): Promise<void> {
    // 1. 导出配置
    await this.profileManager.exportProfile(profileId);

    // 2. 创建本地备份
    const profile = await this.profileManager
      .loadProfiles()
      .then((data) => data.profiles.find((p) => p.id === profileId));

    if (profile) {
      await this.storage.save(`backup-${profileId}`, {
        profile,
        timestamp: Date.now(),
      });
    }
  }

  async importWithValidation(): Promise<Profile | null> {
    try {
      const profile = await this.profileManager.importProfile();

      // 验证配置
      const result = await this.validateProfile(profile);
      if (!result.isValid) {
        throw new Error(result.errors.join(", "));
      }

      return profile;
    } catch (error) {
      console.error("导入失败:", error);
      return null;
    }
  }

  private async validateProfile(profile: Profile): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (!profile.name) errors.push("名称不能为空");
    if (Object.keys(profile.providers).length === 0) {
      errors.push("至少需要一个提供商");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
```

## 🔧 错误处理

### 1. 超时处理

```typescript
const invokeWithRetry = async <T>(
  command: string,
  data?: Record<string, unknown>,
  retries = 3,
): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await invoke<T>(command, data);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error("Max retries exceeded");
};
```

### 2. 网络错误处理

```typescript
class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: any,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

// 使用
try {
  await profileManager.saveProfile(profile);
} catch (error) {
  if (error.message.includes("timed out")) {
    throw new ServiceError("连接超时，请检查网络", "NETWORK_TIMEOUT", error);
  }
  throw error;
}
```

## 🎯 最佳实践

### 1. 服务单例模式

```typescript
// ✅ 推荐：导出单例实例
export const profileManager = new ProfileManager();

// 使用
import { profileManager } from "@/services/webview/profile-manager";
await profileManager.loadProfiles();

// ❌ 避免：多次实例化
const manager1 = new ProfileManager();
const manager2 = new ProfileManager(); // 不必要的实例
```

### 2. 异步操作封装

```typescript
// ✅ 推荐：使用 try-catch 包装
async function safeOperation<T>(
  operation: () => Promise<T>,
  errorHandler: (error: any) => void,
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    errorHandler(error);
    return null;
  }
}

// 使用
const profile = await safeOperation(
  () => profileManager.loadProfiles(),
  (error) => toast({ title: "加载失败", variant: "destructive" }),
);
```

### 3. 数据验证

```typescript
// ✅ 推荐：在服务层验证
async function saveProfileWithValidation(profile: Profile) {
  // 前置验证
  if (!profile.name.trim()) {
    throw new Error("配置文件名称不能为空");
  }

  if (Object.keys(profile.providers).length === 0) {
    throw new Error("至少需要配置一个提供商");
  }

  // 保存
  await profileManager.saveProfile(profile);
}
```

## 🔍 故障排除

### 常见问题

#### 1. 消息超时

**问题**: `invoke` 函数超时
**解决方案**:

```typescript
// 检查扩展是否正确监听
// 在扩展端：
context.subscriptions.push(
  vscode.window.onDidReceiveMessage(async (message) => {
    // 处理消息
  }),
);

// 增加超时时间
const result = await invoke("profile.loadAll", {}, 30000); // 30秒
```

#### 2. 消息丢失

**问题**: 发送消息但没有响应
**解决方案**:

```typescript
// 确保消息格式正确
postMessage("profile.save", {
  profile: profile,
  requestId: uuidv4(), // 必须包含 requestId
});

// 检查监听器是否正确添加
window.addEventListener("message", handleResponse);
```

#### 3. 数据不一致

**问题**: Webview 和扩展状态不同步
**解决方案**:

```typescript
// 定期同步
useEffect(() => {
  const sync = async () => {
    await profileManager.loadProfiles();
  };

  const interval = setInterval(sync, 30000); // 每30秒同步
  return () => clearInterval(interval);
}, []);
```

## 📊 性能监控

### 1. 服务调用统计

```typescript
interface ServiceMetrics {
  command: string;
  duration: number;
  success: boolean;
  timestamp: Date;
}

const metrics: ServiceMetrics[] = [];

const invokeWithMetrics = async <T>(
  command: string,
  data?: Record<string, unknown>,
): Promise<T> => {
  const start = performance.now();

  try {
    const result = await invoke<T>(command, data);
    const duration = performance.now() - start;

    metrics.push({
      command,
      duration,
      success: true,
      timestamp: new Date(),
    });

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    metrics.push({
      command,
      duration,
      success: false,
      timestamp: new Date(),
    });

    throw error;
  }
};
```

### 2. 缓存优化

```typescript
class CachedProfileManager extends ProfileManager {
  private cache = new Map<string, any>();
  private cacheTTL = 5 * 60 * 1000; // 5分钟

  async loadProfiles(): Promise<{
    profiles: Profile[];
    activeProfileId: string;
  }> {
    const cacheKey = "profiles";
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    const result = await super.loadProfiles();
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return result;
  }

  invalidateCache() {
    this.cache.clear();
  }
}
```

## 📚 相关文档

- **Hooks**: [../hooks/README.md](../hooks/README.md)
- **Contexts**: [../contexts/README.md](../contexts/README.md)
- **组件**: [../components/settings/README.md](../components/settings/README.md)
- **类型定义**: [../types/settings.ts](../types/settings.ts)

---

**最后更新**: 2024年12月
**服务数量**: 2 个核心服务
**架构模式**: 服务层 + 消息通信
**数据安全**: 加密存储 + 请求响应
