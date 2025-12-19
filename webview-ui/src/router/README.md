# Router 模块文档

## 📋 概述

Router 模块管理应用的页面路由和导航逻辑，使用 React Router 实现单页应用（SPA）的路由管理。

## 🏗️ 技术栈

- **React Router DOM**: v7.9.4
- **路由类型**: MemoryRouter (适用于 WebView)
- **导航钩子**: useNavigate, useLocation, useParams

## 📁 文件结构

```
router/
├── index.tsx          # 路由主配置
├── routes.ts          # 路由常量定义
└── README.md          # 本文档
```

## 🔧 核心组件

### 1. AppRouter (路由主组件)

**文件**: `index.tsx` (~118 行)

**职责**:

- 配置所有路由路径
- 处理路由守卫
- 管理主题应用
- 处理初始路由

**实现细节**:

```tsx
export const AppRouter: React.FC = () => {
  const { theme } = useTheme();
  const { isReady } = useVSCodeContext();

  // 应用主题到 document
  React.useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  // 获取初始路由
  const initialEntries = [
    (window as Window & { initialRoute?: string }).initialRoute || "/",
  ];

  // 路由守卫
  const RouteGuard: React.FC<{ children: React.ReactNode }> = ({
    children,
  }) => {
    if (!isReady) {
      return <LoadingPage />;
    }
    return <>{children}</>;
  };

  return (
    <ErrorBoundary>
      <MemoryRouter initialEntries={initialEntries}>
        <RouteGuard>
          <Routes>
            <Route
              path="/*"
              element={
                <Layout>
                  <Routes>
                    {/* 页面路由配置 */}
                    <Route path={routes.welcome} element={<WelcomePage />} />
                    <Route path={routes.settings} element={<SettingsPage />} />
                    {/* ... 更多路由 */}
                  </Routes>
                </Layout>
              }
            />
          </Routes>
        </RouteGuard>
      </MemoryRouter>
    </ErrorBoundary>
  );
};
```

### 2. RouteGuard (路由守卫)

**职责**:

- 检查应用是否准备就绪
- 显示加载状态
- 防止未就绪时渲染页面

**使用场景**:

```tsx
// 在 AppRouter 中
<RouteGuard>
  <Routes>{/* 只有 isReady 为 true 时才会渲染 */}</Routes>
</RouteGuard>;

// 自定义守卫
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeProfile } = useSettings();

  if (!activeProfile) {
    return <Navigate to="/settings" replace />;
  }

  return <>{children}</>;
};
```

### 3. 路由配置 (routes.ts)

**文件**: `routes.ts` (~434 行)

**职责**:

- 集中管理所有路由路径
- 防止硬编码路径
- 便于维护和重构

**配置**:

```typescript
export const routes = {
  // 欢迎和引导
  welcome: "/",
  onboarding: "/onboarding",

  // 设置相关
  settings: "/settings",
  settingsProfiles: "/settings/profiles",
  settingsProviders: "/settings/providers",
  settingsFeatures: "/settings/features",
  settingsPreferences: "/settings/preferences",
  settingsAdvanced: "/settings/advanced",

  // 核心功能
  commitChat: "/commit-chat",
  indexing: "/indexing",
  prompts: "/prompts",

  // 报告和分析
  weeklyReport: "/weekly-report",
  usage: "/usage",

  // 管理和工具
  notifications: "/notifications",
  migration: "/migration",
  storage: "/storage",
  context: "/context",
  experimental: "/experimental",
  about: "/about",

  // 404
  notFound: "*",
};
```

## 🎯 路由列表

### 1. 欢迎和引导路由

| 路径          | 组件           | 说明                 |
| ------------- | -------------- | -------------------- |
| `/`           | WelcomePage    | 欢迎页面，新用户引导 |
| `/onboarding` | OnboardingPage | 交互式引导流程       |

### 2. 设置路由

| 路径                    | 组件                | 说明                 |
| ----------------------- | ------------------- | -------------------- |
| `/settings`             | SettingsPage        | 设置主页面（标签页） |
| `/settings/profiles`    | ProfileManager      | 配置文件管理         |
| `/settings/providers`   | ProvidersSettings   | AI 提供商配置        |
| `/settings/features`    | FeaturesSettings    | 功能开关             |
| `/settings/preferences` | PreferencesSettings | 用户偏好             |
| `/settings/advanced`    | AdvancedSettings    | 高级设置             |

### 3. 核心功能路由

| 路径           | 组件           | 说明           |
| -------------- | -------------- | -------------- |
| `/commit-chat` | CommitChatPage | 提交聊天界面   |
| `/indexing`    | IndexingPage   | 代码索引管理   |
| `/prompts`     | PromptsPage    | 提示词模板管理 |

### 4. 报告和分析路由

| 路径             | 组件             | 说明           |
| ---------------- | ---------------- | -------------- |
| `/weekly-report` | WeeklyReportPage | 周报生成       |
| `/usage`         | UsagePage        | 使用统计和指南 |

### 5. 管理和工具路由

| 路径             | 组件              | 说明       |
| ---------------- | ----------------- | ---------- |
| `/notifications` | NotificationsPage | 通知管理   |
| `/migration`     | MigrationPage     | 配置迁移   |
| `/storage`       | StoragePage       | 存储管理   |
| `/context`       | ContextPage       | 上下文管理 |
| `/experimental`  | ExperimentalPage  | 实验性功能 |
| `/about`         | AboutPage         | 关于应用   |

## 🧭 导航钩子

### 1. useNavigate (编程式导航)

```tsx
import { useNavigate } from "react-router-dom";

function MyComponent() {
  const navigate = useNavigate();

  const handleNavigation = () => {
    // 前往页面
    navigate("/settings");

    // 带状态
    navigate("/settings", { state: { from: "home" } });

    // 替换当前页面
    navigate("/commit-chat", { replace: true });

    // 返回上一页
    navigate(-1);

    // 前进
    navigate(1);
  };

  return <button onClick={handleNavigation}>前往设置</button>;
}
```

### 2. useLocation (获取当前位置)

```tsx
import { useLocation } from "react-router-dom";

function CurrentPage() {
  const location = useLocation();

  return (
    <div>
      <p>当前路径: {location.pathname}</p>
      <p>查询参数: {location.search}</p>
      <p>状态: {JSON.stringify(location.state)}</p>
    </div>
  );
}
```

### 3. useParams (获取路由参数)

```tsx
import { useParams } from "react-router-dom";

// 路由配置: <Route path="/profile/:id" element={<ProfilePage />} />

function ProfilePage() {
  const { id } = useParams();

  useEffect(() => {
    // 根据 id 加载数据
    loadProfile(id);
  }, [id]);

  return <div>Profile ID: {id}</div>;
}
```

### 4. useSearchParams (查询参数)

```tsx
import { useSearchParams } from "react-router-dom";

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get("q");
  const page = searchParams.get("page") || "1";

  const updateSearch = (newQuery: string) => {
    setSearchParams({ q: newQuery, page: "1" });
  };

  return (
    <div>
      <input
        value={query || ""}
        onChange={(e) => updateSearch(e.target.value)}
      />
      <p>当前页: {page}</p>
    </div>
  );
}
```

## 🎨 布局集成

### 1. 嵌套路由结构

```tsx
// 主路由
<Route
  path="/*"
  element={
    <Layout>
      {" "}
      {/* 侧边栏 + 内容区域 */}
      <Routes>
        {/* 页面路由 */}
        <Route path={routes.welcome} element={<WelcomePage />} />
        <Route path={routes.settings} element={<SettingsPage />} />
        {/* ... */}
      </Routes>
    </Layout>
  }
/>
```

### 2. 页面内路由

```tsx
// SettingsPage 内部
function SettingsPage() {
  return (
    <PageLayout title="设置">
      <Tabs>
        <Routes>
          <Route path="profiles" element={<ProfileManager />} />
          <Route path="providers" element={<ProvidersSettings />} />
          <Route path="features" element={<FeaturesSettings />} />
        </Routes>
      </Tabs>
    </PageLayout>
  );
}
```

## 🔧 路由守卫模式

### 1. 认证守卫

```tsx
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeProfile } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    if (!activeProfile) {
      navigate(routes.settings, { replace: true });
    }
  }, [activeProfile, navigate]);

  if (!activeProfile) {
    return <LoadingPage message="检查配置..." />;
  }

  return <>{children}</>;
};

// 使用
<Route
  path="/commit-chat"
  element={
    <AuthGuard>
      <CommitChatPage />
    </AuthGuard>
  }
/>;
```

### 2. 功能守卫

```tsx
const FeatureGuard: React.FC<{
  children: React.ReactNode;
  feature: string;
}> = ({ children, feature }) => {
  const { activeProfile } = useSettings();
  const navigate = useNavigate();

  const isEnabled = activeProfile?.preferences?.features?.[feature];

  useEffect(() => {
    if (!isEnabled) {
      navigate(routes.settings, { replace: true });
    }
  }, [isEnabled, navigate]);

  if (!isEnabled) {
    return (
      <div className="p-8 text-center">
        <h2>功能未启用</h2>
        <Button onClick={() => navigate(routes.settings)}>去设置启用</Button>
      </div>
    );
  }

  return <>{children}</>;
};

// 使用
<Route
  path="/indexing"
  element={
    <FeatureGuard feature="code-indexing">
      <IndexingPage />
    </FeatureGuard>
  }
/>;
```

## 🚀 导航最佳实践

### 1. 类型安全的导航

```typescript
// 创建导航辅助函数
class NavigationHelper {
  static toSettings(tab?: string) {
    const navigate = useNavigate();
    return () => {
      if (tab) {
        navigate(`/settings#${tab}`);
      } else {
        navigate("/settings");
      }
    };
  }

  static toCommitChat() {
    const navigate = useNavigate();
    return () => navigate("/commit-chat");
  }
}

// 使用
function MyComponent() {
  const toSettings = NavigationHelper.toSettings("providers");

  return <button onClick={toSettings}>前往提供商设置</button>;
}
```

### 2. 状态传递

```tsx
// 发送状态
const navigate = useNavigate();

const handleAction = () => {
  navigate("/profile/edit", {
    state: {
      profileId: "profile-123",
      mode: "edit",
    },
  });
};

// 接收状态
function EditProfile() {
  const location = useLocation();
  const { profileId, mode } = location.state || {};

  return (
    <div>
      编辑 {profileId} 模式: {mode}
    </div>
  );
}
```

### 3. 防止重复导航

```tsx
const navigate = useNavigate();
const location = useLocation();

const safeNavigate = (to: string) => {
  if (location.pathname !== to) {
    navigate(to);
  }
};
```

## 🔍 故障排除

### 常见问题

#### 1. 页面不渲染

**问题**: 路由配置正确但页面空白
**解决方案**:

```tsx
// 检查路径匹配
console.log("当前路径:", location.pathname);
console.log("路由配置:", routes.settings);

// 确保路径前缀正确
<Route path="/settings/*" element={<SettingsPage />} />;
```

#### 2. 路由守卫无限循环

**问题**: 守卫不断重定向
**解决方案**:

```tsx
// 使用 replace 防止历史堆积
navigate(routes.settings, { replace: true });

// 添加依赖数组
useEffect(() => {
  if (!condition) {
    navigate(to);
  }
}, [condition, navigate]); // 正确的依赖
```

#### 3. MemoryRouter 状态丢失

**问题**: WebView 重新加载后路由状态丢失
**解决方案**:

```tsx
// 在 App.tsx 中保存/恢复路由状态
const initialRoute = localStorage.getItem("lastRoute") || "/";

const App = () => {
  useEffect(() => {
    const unlisten = history.listen((location) => {
      localStorage.setItem("lastRoute", location.pathname);
    });
    return unlisten;
  }, []);
};
```

## 📊 路由统计

| 类别      | 路由数量 | 说明       |
| --------- | -------- | ---------- |
| 欢迎/引导 | 2        | 新用户引导 |
| 设置      | 6        | 配置管理   |
| 核心功能  | 3        | 主要功能   |
| 报告/分析 | 2        | 数据统计   |
| 管理/工具 | 6        | 辅助功能   |
| **总计**  | **19**   | 完整路由表 |

## 🎯 性能优化

### 1. 路由懒加载

```tsx
import { lazy, Suspense } from "react";

const CommitChatPage = lazy(() => import("@/pages/CommitChatPage"));
const IndexingPage = lazy(() => import("@/pages/IndexingPage"));

const AppRouter: React.FC = () => {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        <Route path="/commit-chat" element={<CommitChatPage />} />
        <Route path="/indexing" element={<IndexingPage />} />
      </Routes>
    </Suspense>
  );
};
```

### 2. 路由预加载

```tsx
// 在用户悬停时预加载
const preloadRoute = (path: string) => {
  switch (path) {
    case "/commit-chat":
      import("@/pages/CommitChatPage");
      break;
    case "/indexing":
      import("@/pages/IndexingPage");
      break;
  }
};

// 使用
<button
  onMouseEnter={() => preloadRoute("/commit-chat")}
  onClick={() => navigate("/commit-chat")}
>
  提交聊天
</button>;
```

## 📚 相关文档

- **组件**: [../components/layout/README.md](../components/layout/README.md)
- **页面**: [../pages/README.md](../pages/README.md)
- **Hooks**: [../hooks/README.md](../hooks/README.md)
- **React Router 文档**: https://reactrouter.com/

---

**最后更新**: 2024年12月
**路由数量**: 19 个
**架构模式**: React Router v7 + MemoryRouter
**导航方式**: 编程式 + 声明式
