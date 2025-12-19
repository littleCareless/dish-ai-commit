# Layout 组件文档

## 📋 概述

Layout 模块提供了应用的整体布局结构，包括侧边导航栏和主内容区域。该模块确保了应用的一致性用户体验，并支持响应式设计。

## 🏗️ 架构设计

### 组件层次

```
AppRouter
└── Layout
    ├── Navigation (侧边导航栏)
    │   ├── NavItem (导航项)
    │   └── NavGroup (导航分组)
    └── 主内容区域 (children)
```

### 核心组件

#### 1. Layout (主布局组件)

**文件**: `Layout.tsx`

**职责**:

- 提供应用的整体容器结构
- 管理侧边导航栏的显示/隐藏
- 处理主题应用
- 响应式布局管理

**关键特性**:

- ✅ 自动应用主题到 document 元素
- ✅ 某些页面可隐藏导航栏（如 onboarding）
- ✅ 全屏高度布局，支持内容滚动
- ✅ 卡片式背景，支持毛玻璃效果

**接口**:

```typescript
interface LayoutProps {
  children: React.ReactNode;
}
```

#### 2. Navigation (导航栏组件)

**文件**: `Navigation.tsx`

**职责**:

- 提供页面导航功能
- 显示当前激活的导航项
- 支持多语言导航标签

**导航项配置**:

```typescript
interface NavItem {
  icon: React.ElementType; // 图标组件
  label: string; // 导航标签
  path: string; // 路由路径
  description?: string; // 描述文本
  hidden?: boolean; // 是否隐藏
}
```

#### 3. PageLayout (页面布局组件)

**文件**: `PageLayout.tsx`

**职责**:

- 为单个页面提供一致的布局结构
- 支持页面标题、描述和操作按钮
- 提供内容区域的容器

**接口**:

```typescript
interface PageLayoutProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}
```

#### 4. BlankLayout (空白布局)

**文件**: `BlankLayout.tsx`

**职责**:

- 提供无导航的纯净布局
- 用于特殊页面（如欢迎页）

## 🎨 UI 设计

### 布局结构

```
┌─────────────────────────────────────────┐
│  侧边栏 (46px) │                         │
│                 │                         │
│  🏠 首页        │  主内容区域              │
│  ⚙️ 设置        │  (可滚动)                │
│  📊 索引        │                         │
│                 │                         │
└─────────────────────────────────────────┘
```

### 样式特性

- **侧边栏**:
  - 宽度: 46px
  - 背景: 卡片 + 50% 不透明度
  - 支持毛玻璃效果 (backdrop-filter)
  - 右侧边框

- **主内容区域**:
  - 自动填充剩余空间
  - 内容可滚动
  - 背景色跟随主题

## 🚀 使用示例

### 基本用法

```tsx
import { Layout } from "@/components/layout/Layout";

function App() {
  return (
    <Layout>
      <div>你的页面内容</div>
    </Layout>
  );
}
```

### 在路由中使用

```tsx
// router/index.tsx
export const AppRouter: React.FC = () => {
  return (
    <MemoryRouter>
      <Routes>
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </MemoryRouter>
  );
};
```

### 隐藏导航栏

```tsx
const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  // 特定页面隐藏导航
  const hideNavigation = ["/onboarding"].includes(location.pathname);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex flex-col h-screen">
        <div className="flex flex-1 overflow-hidden">
          {!hideNavigation && (
            <div className="w-46 border-r bg-card/50 backdrop-blur">
              <Navigation />
            </div>
          )}
          <main className="flex-1 overflow-auto bg-background">
            <div className="h-full">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
};
```

## 🧩 组件详解

### Navigation 组件结构

```tsx
export const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const navItems = [
    { icon: Home, label: t("nav.home"), path: "/" },
    { icon: Settings, label: t("nav.settings"), path: "/settings" },
    { icon: Database, label: t("nav.indexing"), path: "/indexing" },
    // ... 更多导航项
  ];

  return (
    <nav className="py-4">
      {navItems.map((item) => (
        <NavItem
          key={item.path}
          icon={item.icon}
          label={item.label}
          path={item.path}
          isActive={location.pathname === item.path}
          onClick={() => navigate(item.path)}
        />
      ))}
    </nav>
  );
};
```

### PageLayout 使用示例

```tsx
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";

function SettingsPage() {
  const handleSave = () => {
    // 保存逻辑
  };

  return (
    <PageLayout
      title="设置"
      description="管理你的配置和偏好设置"
      actions={
        <Button onClick={handleSave} variant="default">
          保存更改
        </Button>
      }
    >
      <div className="space-y-6">{/* 页面内容 */}</div>
    </PageLayout>
  );
}
```

## 🔧 主题集成

Layout 组件自动处理主题应用：

```tsx
const AppRouter: React.FC = () => {
  const { theme } = useTheme();

  React.useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  return (
    // ... 路由配置
  );
};
```

## 📱 响应式设计

### 桌面端 (≥ 768px)

- 侧边栏固定显示
- 宽度: 46px
- 主内容区域自适应

### 移动端 (< 768px)

- 侧边栏可折叠（需扩展实现）
- 全屏主内容区域

## 🎯 最佳实践

### 1. 布局一致性

```tsx
// ✅ 推荐：使用 PageLayout 包装页面
<PageLayout title="页面标题" description="描述">
  {/* 内容 */}
</PageLayout>

// ❌ 避免：直接写布局结构
<div className="p-6">
  <h1>页面标题</h1>
  {/* 内容 */}
</div>
```

### 2. 导航管理

```tsx
// ✅ 推荐：使用路由配置管理导航
<Route path="/settings" element={<SettingsPage />} />;

// ❌ 避免：硬编码导航逻辑
if (location.pathname === "/settings") {
  // ...
}
```

### 3. 滚动处理

```tsx
// ✅ 推荐：利用原生滚动
<main className="flex-1 overflow-auto">
  <div className="h-full">{children}</div>
</main>;

// ❌ 避免：手动管理滚动位置
const handleScroll = () => {
  /* ... */
};
```

## 🔍 故障排除

### 常见问题

#### 1. 导航栏不显示

**问题**: 侧边导航栏消失
**解决方案**:

- 检查当前路径是否在 `hideNavigation` 数组中
- 确认 `Layout` 组件正确包裹路由
- 查看浏览器控制台是否有错误

#### 2. 主题不生效

**问题**: 样式没有正确应用
**解决方案**:

- 检查 `useTheme()` hook 是否正常工作
- 确认 `document.documentElement.className` 已设置
- 验证 Tailwind CSS 配置

#### 3. 内容溢出布局

**问题**: 页面内容超出视口
**解决方案**:

- 确保使用 `overflow-auto` 或 `overflow-hidden`
- 检查父容器的高度设置
- 验证 `min-h-screen` 和 `h-full` 类

## 📚 相关文档

- **路由系统**: [../router/README.md](../router/README.md)
- **主题管理**: [../hooks/README.md#useTheme](../hooks/README.md#useTheme)
- **UI 组件**: [../ui/README.md](../ui/README.md)
- **主应用**: [../../App.tsx](../../App.tsx)

---

**最后更新**: 2024年12月
**组件版本**: v0.56.1
**架构模式**: React + React Router + Tailwind CSS
