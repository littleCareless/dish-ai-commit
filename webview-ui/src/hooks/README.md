# Hooks 模块文档

## 📋 概述

Hooks 模块提供了可复用的 React Hooks，用于管理状态、处理副作用、与 VS Code 通信等。这些 Hooks 是应用的核心逻辑抽象。

## 📦 Hook 列表

### 1. useCommitChatState (提交聊天状态管理)

**文件**: `useCommitChatState.ts` (~261 行)

**职责**:

- 管理聊天消息状态
- 处理草稿保存和加载
- 消息历史管理
- 导入/导出功能

**接口定义**:

```typescript
interface CommitChatState {
  messages: ChatMessage[];
  inputValue: string;
  isTyping: boolean;
  selectedImages: string[];
  draftMessage: string;
}

interface ChatMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  metadata?: {
    commitMessage?: string;
    suggestions?: string[];
    configuration?: Record<string, unknown>;
  };
}

interface CommitChatConfig {
  maxMessages: number; // 默认: 100
  autoSaveDraft: boolean; // 默认: true
  draftSaveInterval: number; // 默认: 2000ms
  enableHistory: boolean; // 默认: true
  maxHistorySize: number; // 默认: 50
}
```

**使用示例**:

```tsx
import { useCommitChatState } from "@/hooks/useCommitChatState";

function CommitChatView() {
  const {
    state,
    handleInputChange,
    handleSendMessage,
    clearMessages,
    exportHistory,
    importHistory,
    loadDraft,
    addMessage,
  } = useCommitChatState({
    maxMessages: 100,
    autoSaveDraft: true,
    draftSaveInterval: 2000,
  });

  // 组件加载时加载草稿
  useEffect(() => {
    loadDraft();
  }, []);

  return (
    <div>
      {/* 消息列表 */}
      <div className="messages">
        {state.messages.map((msg) => (
          <Message key={msg.id} message={msg} />
        ))}
      </div>

      {/* 输入区域 */}
      <textarea
        value={state.inputValue}
        onChange={handleInputChange}
        disabled={state.isTyping}
      />

      {/* 操作按钮 */}
      <div className="actions">
        <Button onClick={handleSendMessage} disabled={state.isTyping}>
          发送
        </Button>
        <Button variant="outline" onClick={clearMessages}>
          清空
        </Button>
        <Button variant="outline" onClick={exportHistory}>
          导出历史
        </Button>
      </div>
    </div>
  );
}
```

**核心功能**:

#### 草稿管理

```typescript
// 自动保存 (防抖)
useEffect(() => {
  if (autoSaveDraft && inputValue.trim()) {
    const timeout = setTimeout(() => {
      localStorage.setItem("commit-chat-draft", inputValue);
    }, draftSaveInterval);
    return () => clearTimeout(timeout);
  }
}, [inputValue]);

// 加载草稿
const loadDraft = useCallback(() => {
  const saved = localStorage.getItem("commit-chat-draft");
  if (saved) {
    setState((prev) => ({ ...prev, inputValue: saved }));
  }
}, []);
```

#### 消息管理

```typescript
// 添加消息（自动清理旧消息）
const addMessage = useCallback(
  (message: Omit<ChatMessage, "id" | "timestamp">) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `${message.type}-${Date.now()}`,
      timestamp: new Date(),
    };

    setState((prev) => {
      const newMessages = [...prev.messages, newMessage];

      // 限制消息数量
      if (newMessages.length > maxMessages) {
        return { ...prev, messages: newMessages.slice(-maxMessages) };
      }

      return { ...prev, messages: newMessages };
    });

    return newMessage;
  },
  [maxMessages],
);
```

#### 历史导入/导出

```typescript
// 导出
const exportHistory = useCallback(() => {
  const history = {
    messages: state.messages,
    exportTime: new Date().toISOString(),
    version: "1.0",
  };

  const blob = new Blob([JSON.stringify(history, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `commit-chat-history-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}, [state.messages]);

// 导入
const importHistory = useCallback(
  (historyData: { messages: ChatMessage[] }) => {
    if (historyData.messages && Array.isArray(historyData.messages)) {
      setState((prev) => ({
        ...prev,
        messages: historyData.messages.map((msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }));
    }
  },
  [],
);
```

### 2. useSettings (设置相关 Hooks)

**文件**: `useSettings.ts` (~180 行)

**职责**:

- 访问设置上下文
- 提供多种专用 Hook
- 管理配置文件、提供商、偏好

**导出的 Hooks**:

#### useSettings (完整上下文)

```tsx
import { useSettings } from "@/hooks/useSettings";

function SettingsComponent() {
  const {
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
    updatePreferences,
  } = useSettings();

  // 使用所有设置功能
}
```

#### useProfiles (配置文件管理)

```tsx
import { useProfiles } from "@/hooks/useSettings";

function ProfileManager() {
  const {
    availableProfiles,
    activeProfile,
    editingProfile,
    hasUnsavedChanges,
    createProfile,
    deleteProfile,
    saveProfile,
    activateProfile,
    setEditingProfile,
    setHasUnsavedChanges,
  } = useProfiles();

  return (
    <div>
      {availableProfiles.map((profile) => (
        <div key={profile.id}>
          <span>{profile.name}</span>
          <button onClick={() => activateProfile(profile.id)}>激活</button>
        </div>
      ))}
    </div>
  );
}
```

#### usePreferences (偏好设置)

```tsx
import { usePreferences } from "@/hooks/useSettings";

function PreferencesEditor() {
  const { preferences, updatePreferences } = usePreferences();

  const handleTemperatureChange = (value: number) => {
    updatePreferences({ temperature: value });
  };

  return (
    <div>
      <label>温度: {preferences?.temperature}</label>
      <input
        type="range"
        min="0"
        max="2"
        step="0.1"
        value={preferences?.temperature || 0}
        onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
      />
    </div>
  );
}
```

#### useSettingsLoading (加载状态)

```tsx
import { useSettingsLoading } from "@/hooks/useSettings";

function SettingsPage() {
  const { isLoading, error } = useSettingsLoading();

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorFallback error={new Error(error)} />;

  return <SettingsContent />;
}
```

#### useActiveProfile (活跃配置)

```tsx
import { useActiveProfile } from "@/hooks/useSettings";

function CurrentProfile() {
  const activeProfile = useActiveProfile();

  if (!activeProfile) {
    return <p>未选择配置文件</p>;
  }

  return (
    <div>
      <h3>{activeProfile.name}</h3>
      <p>{activeProfile.description}</p>
      <p>提供商: {Object.keys(activeProfile.providers).length}</p>
    </div>
  );
}
```

#### useEditingProfile (编辑中配置)

```tsx
import { useEditingProfile } from "@/hooks/useSettings";

function ProfileEditor() {
  const { profile, hasUnsavedChanges, saveProfile, setHasChanges } =
    useEditingProfile();

  const handleSave = async () => {
    await saveProfile(profile);
  };

  return (
    <div>
      {hasUnsavedChanges && <p>⚠️ 有未保存的更改</p>}
      <button onClick={handleSave}>保存</button>
    </div>
  );
}
```

#### useProfileManagement (配置文件管理操作)

```tsx
import { useProfileManagement } from "@/hooks/useSettings";

function ProfileActions() {
  const { switchProfile, activateProfile, createProfile, deleteProfile } =
    useProfileManagement();

  const handleCreate = async () => {
    const name = prompt("配置文件名称:");
    if (name) {
      await createProfile(name);
    }
  };

  return (
    <div>
      <button onClick={handleCreate}>创建配置</button>
      <button onClick={() => switchProfile("profile-id")}>编辑配置</button>
      <button onClick={() => activateProfile("profile-id")}>激活配置</button>
      <button onClick={() => deleteProfile("profile-id")}>删除配置</button>
    </div>
  );
}
```

### 3. useTheme (主题管理)

**文件**: `useTheme.ts` (~894 行)

**职责**:

- 管理应用主题（light/dark/auto）
- 与 VS Code 主题同步
- 持久化主题偏好

**使用示例**:

```tsx
import { useTheme } from "@/hooks/useTheme";

function ThemeSwitcher() {
  const { theme, setTheme, isDark } = useTheme();

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <div>
      <p>当前主题: {theme}</p>
      <Button onClick={toggleTheme}>切换到 {isDark ? "浅色" : "深色"}</Button>
    </div>
  );
}
```

**实现细节**:

```typescript
export const useTheme = () => {
  const [theme, setTheme] = useState<"light" | "dark" | "auto">("auto");

  // 监听 VS Code 主题变化
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.data.command === "themeChanged") {
        const vsTheme = event.data.theme; // "light" or "dark"
        if (theme === "auto") {
          document.documentElement.className = vsTheme;
        }
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [theme]);

  // 应用主题
  useEffect(() => {
    if (theme === "auto") {
      // 从 VS Code 获取主题
      postMessage("getTheme");
    } else {
      document.documentElement.className = theme;
    }
  }, [theme]);

  const isDark =
    theme === "dark" ||
    (theme === "auto" && document.documentElement.classList.contains("dark"));

  return { theme, setTheme, isDark };
};
```

### 4. useToast (通知提示)

**文件**: `useToast.ts` (~4053 行)

**职责**:

- 显示全局通知
- 支持多种类型（成功、错误、警告、信息）
- 自动消失和手动关闭

**使用示例**:

```tsx
import { useToast } from "@/hooks/use-toast";

function MyComponent() {
  const { toast } = useToast();

  const handleSuccess = () => {
    toast({
      title: "操作成功",
      description: "您的更改已保存",
      variant: "default",
      duration: 3000,
    });
  };

  const handleError = () => {
    toast({
      title: "错误",
      description: "操作失败，请重试",
      variant: "destructive",
      duration: 5000,
    });
  };

  const handleInfo = () => {
    toast({
      title: "提示",
      description: "这是一条信息",
      action: <Button onClick={() => console.log("点击了操作")}>操作</Button>,
    });
  };

  return (
    <div>
      <Button onClick={handleSuccess}>成功</Button>
      <Button onClick={handleError}>错误</Button>
      <Button onClick={handleInfo}>信息</Button>
    </div>
  );
}
```

**Toast 配置**:

```typescript
interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;  // 毫秒
  action?: React.ReactNode;
}

// 在 App.tsx 中渲染 Toaster
function App() {
  return (
    <>
      <AppRouter />
      <Toaster />
    </>
  );
}
```

### 5. useOnboarding (新用户引导)

**文件**: `useOnboarding.ts` (~6335 行)

**职责**:

- 管理新用户引导流程
- 跟踪引导步骤
- 持久化引导状态

**引导流程**:

```typescript
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType;
  required?: boolean;
}

const steps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "欢迎",
    description: "了解核心功能",
    component: WelcomeStep,
  },
  {
    id: "provider",
    title: "配置提供商",
    description: "设置 AI 提供商",
    component: ProviderStep,
    required: true,
  },
  {
    id: "test",
    title: "测试连接",
    description: "验证配置是否正常",
    component: TestStep,
    required: true,
  },
  {
    id: "complete",
    title: "完成",
    description: "开始使用",
    component: CompleteStep,
  },
];
```

**使用示例**:

```tsx
import { useOnboarding } from "@/hooks/useOnboarding";

function OnboardingWizard() {
  const {
    currentStep,
    isCompleted,
    isSkipped,
    nextStep,
    prevStep,
    skipOnboarding,
    completeOnboarding,
    goToStep,
  } = useOnboarding();

  if (isCompleted || isSkipped) {
    return <WelcomePage />;
  }

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="onboarding-container">
      <Progress value={((currentStep + 1) / steps.length) * 100} />

      <CurrentStepComponent />

      <div className="actions">
        <Button onClick={prevStep} disabled={currentStep === 0}>
          上一步
        </Button>
        {currentStep < steps.length - 1 ? (
          <Button onClick={nextStep}>下一步</Button>
        ) : (
          <Button onClick={completeOnboarding}>完成</Button>
        )}
        <Button variant="outline" onClick={skipOnboarding}>
          跳过引导
        </Button>
      </div>
    </div>
  );
}
```

### 6. useVscodeMessage (VS Code 消息通信)

**文件**: `useVscodeMessage.ts` (~479 行)

**职责**:

- 简化与 VS Code 扩展的消息通信
- 提供类型安全的消息发送和接收

**使用示例**:

```tsx
import { useVscodeMessage } from "@/hooks/useVscodeMessage";

function DataComponent() {
  const { postMessage, addListener, removeListener } = useVscodeMessage();

  useEffect(() => {
    const handler = (data: any) => {
      console.log("收到消息:", data);
    };

    addListener("dataUpdate", handler);

    return () => removeListener("dataUpdate", handler);
  }, []);

  const handleAction = () => {
    postMessage("userAction", {
      action: "save",
      data: {
        /* ... */
      },
    });
  };

  return <button onClick={handleAction}>发送消息</button>;
}
```

## 🔧 自定义 Hooks

### 创建自定义 Hook

```typescript
// 示例：使用设置的自定义 Hook
import { useSettings } from "@/hooks/useSettings";

export function useActiveProvider() {
  const { activeProfile } = useSettings();

  const activeProvider = useMemo(() => {
    if (!activeProfile || !activeProfile.activeProviderId) {
      return null;
    }
    return activeProfile.providers[activeProfile.activeProviderId];
  }, [activeProfile]);

  return activeProvider;
}

// 使用
function ProviderInfo() {
  const provider = useActiveProvider();

  if (!provider) return <p>未配置提供商</p>;

  return <p>当前使用: {provider.name}</p>;
}
```

## 🎯 最佳实践

### 1. Hook 组合

```tsx
// ✅ 推荐：组合多个 Hook
function SmartComponent() {
  const { activeProfile } = useActiveProfile();
  const { theme } = useTheme();
  const { toast } = useToast();

  useEffect(() => {
    if (activeProfile) {
      toast({
        title: "配置已加载",
        description: `当前使用: ${activeProfile.name}`,
      });
    }
  }, [activeProfile]);

  return <div className={`theme-${theme}`}>...</div>;
}
```

### 2. 性能优化

```tsx
// ✅ 推荐：使用 useCallback 和 useMemo
function OptimizedComponent() {
  const { updateEditingProfile } = useSettings();

  // 使用 useCallback 避免重新创建
  const handleUpdate = useCallback(
    (profile: Profile) => {
      updateEditingProfile(profile);
    },
    [updateEditingProfile],
  );

  // 使用 useMemo 避免重复计算
  const derivedValue = useMemo(() => {
    return expensiveCalculation(profile);
  }, [profile]);

  return <div>{derivedValue}</div>;
}
```

### 3. 错误处理

```tsx
// ✅ 推荐：Hook 内部处理错误
function SafeHookComponent() {
  const { activeProfile, error } = useSettings();

  if (error) {
    return <ErrorFallback error={new Error(error)} />;
  }

  if (!activeProfile) {
    return <p>请选择配置文件</p>;
  }

  return <div>{activeProfile.name}</div>;
}
```

## 🔍 故障排除

### 常见问题

#### 1. Hook 在 Provider 外使用

**问题**: `useSettings must be used within SettingsProvider`
**解决方案**:

```tsx
// ✅ 确保在 Provider 内使用
<SettingsProvider>
  <MyComponent />  {/* 可以使用 useSettings */}
</SettingsProvider>

// ❌ 不要在 Provider 外使用
<SettingsProvider>
  <div>
    <OtherComponent />  {/* 可以使用 */}
  </div>
</SettingsProvider>
<MyComponent />  {/* ❌ 不能使用 */}
```

#### 2. 状态不同步

**问题**: Hook 返回的值不是最新的
**解决方案**:

```tsx
// 检查依赖数组
const { activeProfile } = useSettings();

useEffect(() => {
  // 使用最新的 activeProfile
  console.log(activeProfile);
}, [activeProfile]); // ✅ 正确的依赖
```

#### 3. 内存泄漏

**问题**: 组件卸载后仍然更新状态
**解决方案**:

```tsx
// ✅ 在 useEffect 中清理
useEffect(() => {
  const listener = (event) => {
    // 处理消息
  };

  window.addEventListener("message", listener);

  return () => {
    window.removeEventListener("message", listener); // 清理
  };
}, []);
```

## 📚 相关文档

- **Contexts**: [../contexts/README.md](../contexts/README.md)
- **组件**: [../components/README.md](../components/README.md)
- **页面**: [../pages/README.md](../pages/README.md)
- **Services**: [../services/README.md](../services/README.md)

---

**最后更新**: 2024年12月
**Hook 数量**: 6 个核心 Hooks
**架构模式**: React Hooks + Context API
**状态管理**: 集中式 + 本地状态
