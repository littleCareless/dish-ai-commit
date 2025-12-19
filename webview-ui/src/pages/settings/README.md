# Settings Pages 模块文档

## 📋 概述

Settings Pages 模块提供了设置功能的完整页面实现，包括配置文件管理、提供商配置、功能开关和偏好设置。

## 📁 文件结构

```
pages/settings/
├── SettingsPage.tsx          # 设置主页面（标签页容器）
├── FeaturesSettings.tsx      # 功能设置
├── ProvidersSettings.tsx     # 提供商设置
└── providers/                # 提供商特定页面（可选）
```

## 🎯 核心组件详解

### 1. SettingsPage (设置主页面)

**文件**: `SettingsPage.tsx` (~12944 行)

**职责**:

- 提供标签页导航结构
- 组织各设置模块
- 管理未保存更改警告

**架构设计**:

```tsx
export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("profiles");
  const { hasUnsavedChanges } = useSettings();

  // 离开前确认
  const handleTabChange = (newTab: string) => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm("有未保存的更改，是否放弃？");
      if (!confirm) return;
    }
    setActiveTab(newTab);
  };

  const tabs = [
    {
      id: "profiles",
      label: "配置文件",
      icon: "📁",
      component: <ProfileManager />,
    },
    {
      id: "providers",
      label: "AI 提供商",
      icon: "🤖",
      component: <ProvidersSettings />,
    },
    {
      id: "features",
      label: "功能设置",
      icon: "⚡",
      component: <FeaturesSettings />,
    },
    {
      id: "preferences",
      label: "偏好设置",
      icon: "⚙️",
      component: <PreferencesSettings />,
    },
    {
      id: "advanced",
      label: "高级设置",
      icon: "🔧",
      component: <AdvancedSettings />,
    },
  ];

  return (
    <PageLayout
      title="设置"
      description="管理应用配置和偏好"
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/settings/migration")}
          >
            迁移旧配置
          </Button>
          <Button variant="destructive" onClick={handleResetDefaults}>
            重置默认
          </Button>
        </div>
      }
    >
      <Tabs value={activeTab} onChange={handleTabChange}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsPane
              key={tab.id}
              value={tab.id}
              label={
                <span className="flex items-center gap-2">
                  {tab.icon} {tab.label}
                </span>
              }
            />
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            <div className="mt-6">{tab.component}</div>
          </TabsContent>
        ))}
      </Tabs>

      {/* 未保存更改提示 */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded shadow-lg">
          ⚠️ 有未保存的更改
        </div>
      )}
    </PageLayout>
  );
};
```

### 2. FeaturesSettings (功能设置)

**文件**: `FeaturesSettings.tsx` (~9609 行)

**职责**:

- 管理功能开关
- 配置功能参数
- 功能状态展示

**功能列表**:

```typescript
interface FeatureConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  requires?: string[]; // 依赖的功能
  settings?: Record<string, unknown>;
}

const defaultFeatures: FeatureConfig[] = [
  {
    id: "commit-chat",
    name: "提交聊天",
    description: "使用聊天界面生成提交信息",
    enabled: true,
  },
  {
    id: "code-indexing",
    name: "代码索引",
    description: "建立代码索引以提升 AI 理解",
    enabled: false,
  },
  {
    id: "weekly-report",
    name: "周报生成",
    description: "生成每周代码统计报告",
    enabled: true,
  },
  {
    id: "auto-commit",
    name: "自动提交",
    description: "自动检测并生成提交",
    enabled: false,
    requires: ["code-indexing"],
  },
];
```

**UI 实现**:

```tsx
export const FeaturesSettings: React.FC = () => {
  const { preferences, updatePreferences } = useSettings();
  const [features, setFeatures] = useState<FeatureConfig[]>([]);

  const toggleFeature = (featureId: string) => {
    const updated = features.map((f) =>
      f.id === featureId ? { ...f, enabled: !f.enabled } : f,
    );
    setFeatures(updated);
    updatePreferences({ features: updated });
  };

  return (
    <div className="space-y-6">
      {features.map((feature) => (
        <div key={feature.id} className="p-4 border rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold">{feature.name}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
              {feature.requires && (
                <p className="text-xs text-yellow-600 mt-1">
                  需要: {feature.requires.join(", ")}
                </p>
              )}
            </div>
            <Switch
              checked={feature.enabled}
              onCheckedChange={() => toggleFeature(feature.id)}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
```

### 3. ProvidersSettings (提供商设置)

**文件**: `ProvidersSettings.tsx` (~9384 行)

**职责**:

- 管理 AI 提供商列表
- 配置提供商参数
- 测试连接状态

**提供商管理**:

```tsx
export const ProvidersSettings: React.FC = () => {
  const { allProviders, activeProfile } = useSettings();
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(
    null,
  );

  const providers = Object.values(activeProfile?.providers || {});

  const handleTestConnection = async (provider: ProviderConfig) => {
    const result = await profileManager.testConnection(provider);

    if (result.success) {
      toast({
        title: "连接成功",
        description: `延迟: ${result.latency}ms`,
      });
    } else {
      toast({
        title: "连接失败",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 提供商列表 */}
      <div className="space-y-4">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            onEdit={() => setEditingProvider(provider)}
            onDelete={() => handleDelete(provider.id)}
            onTest={() => handleTestConnection(provider)}
          />
        ))}
      </div>

      {/* 添加/编辑表单 */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogTrigger asChild>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            添加提供商
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DynamicProviderForm
            provider={editingProvider}
            onSubmit={handleSaveProvider}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
```

**提供商卡片组件**:

```tsx
const ProviderCard: React.FC<{
  provider: ProviderConfig;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
}> = ({ provider, onEdit, onDelete, onTest }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{provider.name}</CardTitle>
            <CardDescription>
              {provider.type} • {provider.models.length} 个模型
            </CardDescription>
          </div>
          <Badge variant={provider.isActive ? "default" : "secondary"}>
            {provider.isActive ? "活跃" : "未激活"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm space-y-1">
          <div>API Key: {provider.apiKey ? "已配置" : "未配置"}</div>
          {provider.baseURL && <div>Base URL: {provider.baseURL}</div>}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button size="sm" onClick={onEdit}>
          编辑
        </Button>
        <Button size="sm" variant="outline" onClick={onTest}>
          测试连接
        </Button>
        <Button size="sm" variant="destructive" onClick={onDelete}>
          删除
        </Button>
      </CardFooter>
    </Card>
  );
};
```

## 🔧 数据流

### 配置更新流程

```
用户操作 (切换开关/编辑表单)
    ↓
本地状态更新 (useState)
    ↓
标记未保存状态 (setHasUnsavedChanges)
    ↓
用户点击保存
    ↓
调用 profileManager.saveProfile()
    ↓
发送消息到扩展 (postMessage)
    ↓
扩展保存到存储
    ↓
广播更新消息 (profilesUpdated)
    ↓
SettingsContext 更新状态
    ↓
UI 重新渲染
```

### 连接测试流程

```
用户点击测试连接
    ↓
调用 profileManager.testConnection()
    ↓
发送测试请求到扩展
    ↓
扩展调用 AI API
    ↓
返回测试结果
    ↓
显示 Toast 通知
```

## 🎨 最佳实践

### 1. 配置文件管理

```tsx
// ✅ 推荐：使用配置文件隔离不同环境
const devProfile = {
  name: "开发环境",
  providers: {
    openai: { apiKey: "dev-key", model: "gpt-4o-mini" },
  },
};

const prodProfile = {
  name: "生产环境",
  providers: {
    openai: { apiKey: "prod-key", model: "gpt-4o" },
  },
};

// 快速切换
await activateProfile(devProfile.id);
```

### 2. 提供商配置

```tsx
// ✅ 推荐：先测试再保存
const handleSave = async (config: ProviderConfig) => {
  // 1. 测试连接
  const testResult = await testConnection(config);
  if (!testResult.success) {
    alert(`测试失败: ${testResult.error}`);
    return;
  }

  // 2. 保存配置
  await saveProvider(config);

  // 3. 显示成功
  toast({ title: "配置已保存" });
};
```

### 3. 功能开关

```tsx
// ✅ 推荐：检查依赖
const canEnableAutoCommit = (features: FeatureConfig[]) => {
  const indexingEnabled = features.find(
    (f) => f.id === "code-indexing",
  )?.enabled;
  return indexingEnabled;
};

// 使用
if (!canEnableAutoCommit(features)) {
  toast({
    title: "无法启用",
    description: "需要先启用代码索引功能",
    variant: "warning",
  });
}
```

## 🔍 故障排除

### 常见问题

#### 1. 保存后状态未更新

**问题**: 修改后 UI 没有变化
**解决方案**:

```tsx
// 确保监听了消息
useEffect(() => {
  const listener = (event: MessageEvent) => {
    if (event.data.command === "profilesUpdated") {
      // 更新本地状态
      handleProfilesUpdate(event.data.payload);
    }
  };
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}, []);
```

#### 2. 连接测试超时

**问题**: 测试一直等待
**解决方案**:

```tsx
// 设置超时
const testConnection = async (config: ProviderConfig) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const result = await fetch(config.baseURL + "/health", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return { success: result.ok };
  } catch (error) {
    clearTimeout(timeout);
    return { success: false, error: "连接超时" };
  }
};
```

#### 3. 标签页切换丢失数据

**问题**: 切换标签页时未保存的更改丢失
**解决方案**:

```tsx
// 使用全局状态管理
const SettingsPage: React.FC = () => {
  const { hasUnsavedChanges } = useSettings();

  const handleTabChange = (newTab: string) => {
    if (hasUnsavedChanges) {
      if (!confirm("放弃未保存的更改？")) {
        return;
      }
      // 重置未保存状态
      setHasUnsavedChanges(false);
    }
    setActiveTab(newTab);
  };
};
```

## 📊 统计和指标

### 配置文件统计

```typescript
interface ProfileStats {
  totalProfiles: number;
  activeProfile: string;
  providerCount: number;
  featureCount: number;
  lastUpdated: Date;
}

// 在 About 页面显示
const stats: ProfileStats = {
  totalProfiles: availableProfiles.length,
  activeProfile: activeProfile?.name || "无",
  providerCount: Object.keys(activeProfile?.providers || {}).length,
  featureCount: Object.values(activeProfile?.preferences || {}).length,
  lastUpdated: activeProfile?.updatedAt,
};
```

## 📚 相关文档

- **组件**: [../../components/settings/README.md](../../components/settings/README.md)
- **Hooks**: [../../hooks/README.md](../../hooks/README.md)
- **Context**: [../../contexts/README.md](../../contexts/README.md)
- **Services**: [../../services/README.md](../../services/README.md)
- **类型定义**: [../../types/settings.ts](../../types/settings.ts)

---

**最后更新**: 2024年12月
**组件版本**: v0.56.1
**架构模式**: React + Context + 标签页
**状态管理**: 集中式 + 消息通信
