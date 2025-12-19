# Pages 模块文档

## 📋 概述

Pages 模块包含了应用的所有页面组件。每个页面都是一个完整的功能模块，负责特定的用户交互和业务逻辑。

## 📁 页面结构

```
pages/
├── CommitChatPage.tsx          # 提交聊天页面
├── SettingsPage.tsx            # 设置主页面
│   └── settings/               # 设置子页面
│       ├── FeaturesSettings.tsx    # 功能设置
│       ├── ProvidersSettings.tsx   # 提供商设置
│       └── SettingsPage.tsx        # 设置容器
├── IndexingPage.tsx            # 索引管理页面
├── PromptsPage.tsx             # 提示词管理页面
├── WelcomePage.tsx             # 欢迎页面
├── AboutPage.tsx               # 关于页面
├── UsagePage.tsx               # 使用说明页面
├── NotificationsPage.tsx       # 通知管理页面
├── MigrationPage.tsx           # 迁移页面
├── StoragePage.tsx             # 存储管理页面
├── WeeklyReportPage.tsx        # 周报页面
├── ContextPage.tsx             # 上下文管理页面
└── ExperimentalPage.tsx        # 实验性功能页面
```

## 🎯 核心页面详解

### 1. CommitChatPage (提交聊天页面)

**文件**: `CommitChatPage.tsx`

**职责**:

- 提供交互式聊天界面
- 生成和优化提交信息
- 实时 AI 对话

**核心功能**:

```tsx
// 简化实现
export const CommitChatPage: React.FC = () => {
  const handleCommitGenerated = (message: string) => {
    // 将生成的提交信息应用到 Git
    vscode.postMessage({
      command: "applyCommitMessage",
      message,
    });
  };

  return <CommitChatView onCommitMessageGenerated={handleCommitGenerated} />;
};
```

**集成组件**:

- `CommitChatView` - 主聊天界面
- `useCommitChatState` - 状态管理
- `postMessage` - 与扩展通信

### 2. SettingsPage (设置页面)

**文件**: `src/pages/settings/SettingsPage.tsx`

**职责**:

- 集中管理所有设置功能
- 提供标签页导航
- 组织复杂配置

**页面结构**:

```tsx
export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("profiles");

  const tabs = [
    { id: "profiles", label: "配置文件", component: <ProfileManager /> },
    { id: "providers", label: "AI 提供商", component: <ProvidersSettings /> },
    { id: "features", label: "功能设置", component: <FeaturesSettings /> },
    {
      id: "preferences",
      label: "偏好设置",
      component: <PreferencesSettings />,
    },
    { id: "advanced", label: "高级设置", component: <AdvancedSettings /> },
  ];

  return (
    <PageLayout title="设置" description="管理应用配置">
      <Tabs value={activeTab} onChange={setActiveTab}>
        {tabs.map((tab) => (
          <TabsPane key={tab.id} value={tab.id} label={tab.label}>
            {tab.component}
          </TabsPane>
        ))}
      </Tabs>
    </PageLayout>
  );
};
```

**子页面模块**:

- `FeaturesSettings` - 功能开关管理
- `ProvidersSettings` - 提供商配置列表
- `PreferencesSettings` - 用户偏好设置

### 3. IndexingPage (索引管理页面)

**文件**: `IndexingPage.tsx` (~20791 行)

**职责**:

- 代码仓库索引管理
- 支持多种索引提供商
- 实时进度监控

**核心功能**:

```tsx
export const IndexingPage: React.FC = () => {
  const [status, setStatus] = useState<IndexingStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const startIndexing = async () => {
    setStatus("running");
    setProgress(0);

    // 监听进度更新
    const listener = (event: MessageEvent) => {
      if (event.data.command === "indexingProgress") {
        setProgress(event.data.progress);
        setLogs((prev) => [...prev, event.data.log]);
      }
      if (event.data.command === "indexingComplete") {
        setStatus("completed");
      }
    };

    window.addEventListener("message", listener);

    // 发送索引请求
    postMessage("startIndexing", {
      provider: "embedding",
      scope: "workspace",
    });
  };

  return (
    <PageLayout title="代码索引" description="建立代码索引以提升 AI 理解">
      <IndexingStatus status={status} />
      <Progress value={progress} />
      <IndexingLog logs={logs} />
      <Button onClick={startIndexing} disabled={status === "running"}>
        开始索引
      </Button>
    </PageLayout>
  );
};
```

**索引提供商**:

- OpenAI Embeddings
- Gemini Embeddings
- Ollama Embeddings
- Mistral Embeddings
- Vercel AI Gateway

### 4. PromptsPage (提示词管理页面)

**文件**: `PromptsPage.tsx` (~15154 行)

**职责**:

- 管理自定义提示词模板
- 支持导入/导出
- 提供预览和测试功能

**功能模块**:

```tsx
export const PromptsPage: React.FC = () => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<PromptTemplate | null>(null);

  return (
    <PageLayout title="提示词模板" description="创建和管理自定义提示词">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 模板列表 */}
        <div className="md:col-span-1">
          <PromptList
            templates={templates}
            onSelect={setSelectedTemplate}
            onImport={handleImport}
            onExport={handleExport}
          />
        </div>

        {/* 编辑器 */}
        <div className="md:col-span-2">
          {selectedTemplate ? (
            <PromptEditor
              template={selectedTemplate}
              onSave={handleSave}
              onTest={handleTest}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </PageLayout>
  );
};
```

### 5. WeeklyReportPage (周报页面)

**文件**: `WeeklyReportPage.tsx` (~7432 行)

**职责**:

- 生成周报总结
- 分析提交历史
- 提供统计图表

**数据处理**:

```tsx
export const WeeklyReportPage: React.FC = () => {
  const [report, setReport] = useState<WeeklyReport | null>(null);

  const generateReport = async () => {
    postMessage("generateWeeklyReport", {
      range: "last-7-days",
      include: ["commits", "files", "authors"],
    });
  };

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.data.command === "weeklyReport") {
        setReport(event.data.report);
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  return (
    <PageLayout title="周报" description="查看本周代码统计">
      {report ? (
        <ReportView report={report} />
      ) : (
        <Button onClick={generateReport}>生成周报</Button>
      )}
    </PageLayout>
  );
};
```

### 6. NotificationsPage (通知管理页面)

**文件**: `NotificationsPage.tsx` (~9475 行)

**职责**:

- 管理通知设置
- 配置通知渠道
- 查看通知历史

**通知类型**:

- 提交成功提醒
- 索引完成通知
- 配置更新提示
- 错误警告

### 7. MigrationPage (迁移页面)

**文件**: `MigrationPage.tsx` (~9575 行)

**职责**:

- 旧版本配置迁移
- 数据格式转换
- 迁移进度展示

**迁移流程**:

```tsx
export const MigrationPage: React.FC = () => {
  const [step, setStep] = useState<
    "detect" | "backup" | "migrate" | "complete"
  >("detect");
  const [result, setResult] = useState<MigrationResult | null>(null);

  const runMigration = async () => {
    setStep("migrate");
    const result = await profileManager.migrateSettings();
    setResult(result);
    setStep("complete");
  };

  return (
    <PageLayout title="配置迁移" description="从旧版本迁移设置">
      <MigrationSteps currentStep={step} />
      {step === "detect" && <DetectOldConfig onDetect={runMigration} />}
      {step === "migrate" && <MigrationProgress />}
      {step === "complete" && <MigrationResult result={result} />}
    </PageLayout>
  );
};
```

### 8. ContextPage (上下文管理页面)

**文件**: `ContextPage.tsx` (~367 行)

**职责**:

- 管理 AI 上下文信息
- 配置上下文提供方式
- 查看当前上下文状态

### 9. ExperimentalPage (实验性功能页面)

**文件**: `ExperimentalPage.tsx` (~377 行)

**职责**:

- 提供实验性功能开关
- 功能预览
- 反馈收集

### 10. StoragePage (存储管理页面)

**文件**: `StoragePage.tsx` (~2037 行)

**职责**:

- 管理本地存储数据
- 清理缓存
- 导出/导入数据

### 11. UsagePage (使用说明页面)

**文件**: `UsagePage.tsx` (~6222 行)

**职责**:

- 提供详细的使用指南
- 快速入门教程
- 最佳实践

### 12. AboutPage (关于页面)

**文件**: `AboutPage.tsx` (~2060 行)

**职责**:

- 应用信息展示
- 版本信息
- 致谢和链接

## 🎨 页面布局模式

### 1. 标准页面布局

```tsx
import { PageLayout } from "@/components/layout/PageLayout";

function StandardPage() {
  return (
    <PageLayout
      title="页面标题"
      description="页面描述文本"
      actions={
        <>
          <Button>主要操作</Button>
          <Button variant="outline">次要操作</Button>
        </>
      }
    >
      {/* 页面内容 */}
      <div className="space-y-6">{/* 内容区域 */}</div>
    </PageLayout>
  );
}
```

### 2. 无导航布局

```tsx
import { BlankLayout } from "@/components/layout/BlankLayout";

function SpecialPage() {
  return (
    <BlankLayout>
      <div className="flex flex-col items-center justify-center min-h-screen">
        {/* 全屏内容 */}
      </div>
    </BlankLayout>
  );
}
```

### 3. 多标签页布局

```tsx
import { Tabs, TabsList, TabsPane, TabsContent } from "@/components/ui/tabs";

function TabbedPage() {
  const [tab, setTab] = useState("general");

  return (
    <PageLayout title="设置">
      <Tabs value={tab} onChange={setTab}>
        <TabsList>
          <TabsPane value="general" label="常规" />
          <TabsPane value="advanced" label="高级" />
        </TabsList>

        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="advanced">
          <AdvancedSettings />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
```

## 🔧 页面间通信

### 1. URL 参数传递

```tsx
// 路由配置
<Route path="/profile/:id" element={<ProfileDetailPage />} />;

// 使用
function ProfileDetailPage() {
  const { id } = useParams();
  // 根据 id 加载配置
}
```

### 2. 状态共享 (Context)

```tsx
// App.tsx
<SettingsProvider>
  <Routes>
    <Route path="/settings/*" element={<SettingsPage />} />
    <Route path="/indexing" element={<IndexingPage />} />
  </Routes>
</SettingsProvider>;

// 在任何页面使用
function AnyPage() {
  const { activeProfile } = useSettings();
  // 访问共享状态
}
```

### 3. 消息通信

```tsx
// 页面发送消息
const handleAction = () => {
  postMessage("pageAction", { data: "..." });
};

// 监听响应
useEffect(() => {
  const listener = (event: MessageEvent) => {
    if (event.data.command === "actionResult") {
      // 处理结果
    }
  };
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}, []);
```

## 🎯 最佳实践

### 1. 页面组件结构

```tsx
// ✅ 推荐：清晰的结构
export const MyPage: React.FC = () => {
  // 1. Hooks 和状态
  const { data, isLoading } = useData();
  const [state, setState] = useState();

  // 2. 副作用
  useEffect(() => {
    // 订阅、定时器等
  }, []);

  // 3. 事件处理
  const handleSubmit = useCallback(() => {
    // 处理逻辑
  }, []);

  // 4. 渲染
  if (isLoading) return <LoadingPage />;

  return (
    <PageLayout title="标题">
      <div className="space-y-6">{/* 内容 */}</div>
    </PageLayout>
  );
};
```

### 2. 数据加载模式

```tsx
// ✅ 推荐：使用 React Query 或类似库
function DataPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["pageData"],
    queryFn: fetchData,
  });

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorFallback error={error} />;

  return <DataView data={data} />;
}
```

### 3. 错误边界

```tsx
// ✅ 推荐：页面级别错误捕获
function SafePage() {
  return (
    <ErrorBoundary>
      <PageContent />
    </ErrorBoundary>
  );
}
```

## 🔍 故障排除

### 常见问题

#### 1. 页面不渲染

**问题**: 页面空白或 404
**解决方案**:

- 检查路由配置
- 确认组件正确导出
- 验证路径拼写

#### 2. 数据不更新

**问题**: 页面状态不同步
**解决方案**:

- 检查依赖数组
- 确认消息监听器正确
- 验证 Context 更新

#### 3. 性能问题

**问题**: 页面加载慢
**解决方案**:

- 使用懒加载
- 优化数据查询
- 减少不必要渲染

## 📚 相关文档

- **组件**: [../components/README.md](../components/README.md)
- **路由**: [../router/README.md](../router/README.md)
- **Hooks**: [../hooks/README.md](../hooks/README.md)
- **布局**: [../components/layout/README.md](../components/layout/README.md)

---

**最后更新**: 2024年12月
**页面数量**: 13 个主要页面
**架构模式**: React Router + Context API
**状态管理**: Hooks + 消息通信
