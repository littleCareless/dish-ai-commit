# Contexts 模块文档

## 📋 概述

Contexts 模块提供了应用级别的状态管理，通过 React Context API 实现跨组件的数据共享。这些 Context 是应用状态的核心，负责管理配置、VS Code 连接和扩展状态。

## 📦 Context 列表

### 1. SettingsContext (设置上下文)

**文件**: `SettingsContext.tsx` (~294 行)

**职责**:

- 管理所有设置相关状态
- 处理配置文件的 CRUD 操作
- 与 VS Code 扩展通信
- 管理未保存更改状态

**Context 结构**:

```typescript
interface SettingsContextType {
  // 数据状态
  allProviders: ProviderConfig[];
  availableProfiles: Profile[];
  activeProfile: Profile | null;
  editingProfile: Profile | null;
  preferences: UserPreferences | null;

  // 状态标志
  hasUnsavedChanges: boolean;
  isLoading: boolean;
  error: string | null;

  // 操作方法
  saveProfile: (profile: Profile) => Promise<void>;
  activateProfile: (profileId: string) => Promise<void>;
  setEditingProfile: (profileId: string) => void;
  updateEditingProfile: (profile: Profile) => void;
  createProfile: (name: string, description?: string) => Promise<Profile>;
  deleteProfile: (profileId: string) => Promise<void>;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
}
```

**Provider 实现**:

```tsx
export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
}) => {
  // 状态定义
  const [allProviders, setAllProviders] = useState<ProviderConfig[]>([]);
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [editingProfile, setEditingProfileState] = useState<Profile | null>(
    null,
  );
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 计算活跃配置文件
  const activeProfile = useMemo(() => {
    return availableProfiles.find((p) => p.id === activeProfileId) || null;
  }, [availableProfiles, activeProfileId]);

  // 数据加载
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [initialData, providers] = await Promise.all([
        profileManager.loadProfiles(),
        profileManager.getAllProviders(),
      ]);

      setAllProviders(providers);
      handleProfilesUpdate(initialData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 监听消息更新
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.command === "profilesUpdated") {
        handleProfilesUpdate(event.data.payload);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleProfilesUpdate]);

  // 组件挂载时加载数据
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 操作方法
  const saveProfile = useCallback(
    async (profile: Profile) => {
      try {
        setError(null);
        await profileManager.saveProfile(profile);

        // 乐观更新
        setAvailableProfiles((prev) =>
          prev.map((p) => (p.id === profile.id ? { ...profile } : p)),
        );

        if (profile.id === editingProfile?.id) {
          setEditingProfileState({ ...profile });
          setHasUnsavedChanges(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
        throw err;
      }
    },
    [editingProfile?.id],
  );

  const activateProfile = useCallback(
    async (profileId: string) => {
      try {
        setError(null);

        const profileToActivate = availableProfiles.find(
          (p) => p.id === profileId,
        );
        if (!profileToActivate) {
          throw new Error(`Profile not found: ${profileId}`);
        }

        // 保存未更改
        if (profileId === editingProfile?.id && hasUnsavedChanges) {
          await profileManager.saveProfile(editingProfile);
          setHasUnsavedChanges(false);
        }

        await profileManager.setActiveProfile(profileId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to activate");
        throw err;
      }
    },
    [availableProfiles, editingProfile, hasUnsavedChanges],
  );

  // Context 值
  const value: SettingsContextType = {
    allProviders,
    availableProfiles,
    activeProfile,
    editingProfile,
    preferences,
    hasUnsavedChanges,
    isLoading,
    error,
    saveProfile,
    activateProfile,
    setEditingProfile,
    updateEditingProfile,
    createProfile,
    deleteProfile,
    updatePreferences: updatePreferencesHandler,
    setHasUnsavedChanges,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
```

**使用示例**:

```tsx
// 在 App.tsx 中包裹
<SettingsProvider>
  <AppRouter />
</SettingsProvider>;

// 在任何组件中使用
function AnyComponent() {
  const { activeProfile, saveProfile } = useSettings();

  return (
    <div>
      {activeProfile?.name}
      <button onClick={() => saveProfile(activeProfile)}>保存</button>
    </div>
  );
}
```

### 2. VSCodeContext (VS Code 上下文)

**文件**: `VSCodeContext.tsx` (~38 行)

**职责**:

- 提供 VS Code 扩展状态访问
- 简化上下文使用
- 兼容性包装

**实现**:

```tsx
import {
  useExtensionState,
  ExtensionStateContextProvider,
} from "../context/ExtensionStateContext";

export const useVSCodeContext = () => {
  const state = useExtensionState();
  const { didHydrateState, ...initialData } = state;

  return {
    isReady: didHydrateState,
    initialData: initialData as ExtensionState,
  };
};

export const VSCodeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <ExtensionStateContextProvider>{children}</ExtensionStateContextProvider>
  );
};
```

**ExtensionState 结构**:

```typescript
interface ExtensionState {
  didHydrateState: boolean; // 是否已完成状态恢复
  version: string; // 扩展版本
  workspaceRoot?: string; // 工作区根路径
  hasExistingConfig?: boolean; // 是否有现有配置
  hasData?: boolean; // 是否有数据
  // ... 其他扩展状态
}
```

**使用示例**:

```tsx
import { useVSCodeContext } from "@/contexts/VSCodeContext";

function App() {
  const { isReady, initialData } = useVSCodeContext();

  if (!isReady) {
    return <LoadingPage message="正在初始化..." />;
  }

  return (
    <div>
      <p>版本: {initialData.version}</p>
      <p>工作区: {initialData.workspaceRoot}</p>
    </div>
  );
}
```

### 3. ExtensionStateContext (扩展状态上下文)

**文件**: `context/ExtensionStateContext.tsx`

**职责**:

- 管理来自 VS Code 扩展的原始状态
- 处理状态恢复和同步
- 提供状态更新机制

**核心功能**:

```typescript
interface ExtensionStateContextType {
  didHydrateState: boolean;
  // ... 其他状态字段
  updateState: (newState: Partial<ExtensionState>) => void;
}

export const ExtensionStateContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ExtensionState>({
    didHydrateState: false,
    version: "0.0.0"
  });

  // 监听初始状态消息
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.data.command === "init") {
        setState({
          ...event.data.state,
          didHydrateState: true
        });
      }
    };

    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  const updateState = useCallback((newState: Partial<ExtensionState>) => {
    setState(prev => ({ ...prev, ...newState }));
  }, []);

  return (
    <ExtensionStateContext.Provider value={{ ...state, updateState }}>
      {children}
    </ExtensionStateContext.Provider>
  );
};
```

## 🏗️ Context 层级结构

```
AppWithProviders
├── ConfigProvider (Arco Design)
├── ErrorBoundary
│   └── I18nextProvider
│       └── VSCodeProvider
│           └── SettingsProvider
│               └── ExtensionStateContextProvider
│                   └── QueryClientProvider
│                       └── TooltipProvider
│                           └── App
│                               └── AppRouter
│                                   └── 页面组件
```

## 🎯 Context 组合模式

### 1. 提供者组合

```tsx
const AppWithProviders = () => (
  <ConfigProvider>
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <VSCodeProvider>
          <SettingsProvider>
            <ExtensionStateContextProvider>
              <QueryClientProvider client={queryClient}>
                <TooltipProvider delayDuration={300}>
                  <App />
                </TooltipProvider>
              </QueryClientProvider>
            </ExtensionStateContextProvider>
          </SettingsProvider>
        </VSCodeProvider>
      </I18nextProvider>
    </ErrorBoundary>
  </ConfigProvider>
);
```

### 2. 按需使用 Context

```tsx
// 只需要设置
function SettingsComponent() {
  const settings = useSettings();
  // ...
}

// 只需要 VS Code 上下文
function VSCodeComponent() {
  const { isReady } = useVSCodeContext();
  // ...
}

// 需要多个 Context
function SmartComponent() {
  const settings = useSettings();
  const { isReady } = useVSCodeContext();
  const { theme } = useTheme();
  // ...
}
```

## 🔧 消息通信流程

### 1. 初始化流程

```
VS Code 扩展
    ↓
postMessage("init", { state })
    ↓
ExtensionStateContext 监听
    ↓
更新状态 (didHydrateState = true)
    ↓
SettingsContext 加载数据
    ↓
应用就绪
```

### 2. 配置更新流程

```
用户操作 (保存配置)
    ↓
SettingsContext.saveProfile()
    ↓
postMessage("profile.save", { profile })
    ↓
VS Code 扩展处理
    ↓
保存到存储
    ↓
postMessage("profilesUpdated", { profiles, activeProfileId })
    ↓
SettingsContext 监听并更新
    ↓
UI 重新渲染
```

### 3. 错误处理流程

```
操作失败
    ↓
SettingsContext.catch()
    ↓
setError(error message)
    ↓
UI 显示错误
    ↓
用户重试或取消
```

## 🎨 最佳实践

### 1. Context 拆分原则

```typescript
// ✅ 推荐：按功能拆分 Context
<SettingsProvider>      // 设置相关
<VSCodeProvider>        // VS Code 相关
<I18nextProvider>       // 国际化相关

// ❌ 避免：单个巨大 Context
<EverythingProvider>    // 所有状态混在一起
```

### 2. 性能优化

```typescript
// ✅ 推荐：使用 useMemo 优化 Context 值
const value = useMemo(
  () => ({
    allProviders,
    activeProfile,
    // ... 其他状态
    saveProfile,
    activateProfile,
    // ... 其他方法
  }),
  [
    allProviders,
    activeProfile,
    // ... 依赖项
  ],
);

// ✅ 推荐：拆分细粒度 Hook
const useSettings = () => useContext(SettingsContext);
const useProfiles = () => {
  const { availableProfiles, activeProfile } = useContext(SettingsContext);
  return { availableProfiles, activeProfile };
};
```

### 3. 错误边界

```tsx
// ✅ 推荐：Context 层级的错误处理
const SettingsProvider: React.FC = ({ children }) => {
  const [error, setError] = useState(null);

  const saveProfile = useCallback(async (profile) => {
    try {
      await profileManager.saveProfile(profile);
    } catch (err) {
      setError(err.message);
      // 可以在这里上报到监控
      console.error("保存失败:", err);
      throw err;
    }
  }, []);

  if (error) {
    return <ErrorFallback error={new Error(error)} />;
  }

  return (
    <SettingsContext.Provider value={{ saveProfile /* ... */ }}>
      {children}
    </SettingsContext.Provider>
  );
};
```

## 🔍 故障排除

### 常见问题

#### 1. Context 值未更新

**问题**: 组件没有响应 Context 变化
**解决方案**:

```tsx
// 检查是否正确使用 Context
const { activeProfile } = useSettings();

// 确保组件在 Provider 内
<SettingsProvider>
  <MyComponent /> {/* ✅ 可以访问 */}
</SettingsProvider>;

// 检查依赖
useEffect(() => {
  // 使用 activeProfile
}, [activeProfile]); // ✅ 正确的依赖
```

#### 2. 多个 Provider 实例

**问题**: 状态不一致
**解决方案**:

```tsx
// ✅ 确保 Provider 只在顶层创建一次
// App.tsx
const AppWithProviders = () => (
  <SettingsProvider>
    <App />
  </SettingsProvider>
);

// ❌ 不要在组件内部创建 Provider
function Component() {
  return (
    <SettingsProvider>
      {" "}
      {/* ❌ 每次渲染都创建新实例 */}
      <Child />
    </SettingsProvider>
  );
}
```

#### 3. 循环依赖

**问题**: Context A 依赖 Context B，B 又依赖 A
**解决方案**:

```tsx
// ✅ 重构为独立的 Hook
// 之前
const useA = () => {
  const b = useB(); // ❌ 循环
  return { a, b };
};

// 之后
const useA = () => {
  const { data } = useContext(AContext);
  return data;
};

const useB = () => {
  const { data } = useContext(BContext);
  return data;
};

const useAB = () => {
  const a = useA();
  const b = useB();
  return { a, b };
};
```

## 📊 状态管理对比

### Context vs Redux vs Zustand

| 特性     | Context    | Redux    | Zustand    |
| -------- | ---------- | -------- | ---------- |
| 学习曲线 | 低         | 高       | 中         |
| 样板代码 | 少         | 多       | 少         |
| 性能     | 中等       | 好       | 好         |
| 适用场景 | 中小型应用 | 大型应用 | 中小型应用 |
| DevTools | 无         | 有       | 有         |

**本项目选择 Context 的原因**:

- ✅ 无需额外依赖
- ✅ 足够满足当前需求
- ✅ 与 VS Code 集成简单
- ✅ 学习成本低

## 📚 相关文档

- **Hooks**: [../hooks/README.md](../hooks/README.md)
- **组件**: [../components/README.md](../components/README.md)
- **Services**: [../services/README.md](../services/README.md)
- **App.tsx**: [../../App.tsx](../../App.tsx)

---

**最后更新**: 2024年12月
**Context 数量**: 3 个核心 Context
**架构模式**: React Context API + Hooks
**状态管理**: 集中式 + 消息驱动
