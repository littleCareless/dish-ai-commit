# WebView UI

## 📋 项目概述

WebView UI 是 Dish AI Commit Gen 的前端界面，基于 React + TypeScript + Tailwind CSS 构建。该模块提供了完整的用户交互界面，包括配置管理、AI 聊天、代码索引等功能。

## 🏗️ 技术栈

| 技术         | 版本    | 用途       |
| ------------ | ------- | ---------- |
| React        | 18.3.1  | UI 框架    |
| TypeScript   | 5.9.3   | 类型系统   |
| Tailwind CSS | 4.1.16  | 样式框架   |
| React Router | 7.9.4   | 路由管理   |
| i18next      | 25.6.0  | 国际化     |
| Radix UI     | Various | 无头组件库 |
| React Query  | 5.90.5  | 状态管理   |
| Vite         | 7.1.12  | 构建工具   |

## 📁 项目结构

```
webview-ui/
├── src/
│   ├── components/          # UI 组件
│   │   ├── commit-chat/     # 提交聊天组件
│   │   ├── layout/          # 布局组件
│   │   ├── settings/        # 设置组件
│   │   ├── ui/              # 基础 UI 组件库
│   │   ├── common/          # 通用组件
│   │   ├── prompts/         # 提示词组件
│   │   └── welcome/         # 欢迎组件
│   │
│   ├── pages/               # 页面组件
│   │   ├── settings/        # 设置子页面
│   │   ├── CommitChatPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── IndexingPage.tsx
│   │   ├── PromptsPage.tsx
│   │   ├── WelcomePage.tsx
│   │   ├── AboutPage.tsx
│   │   ├── UsagePage.tsx
│   │   ├── NotificationsPage.tsx
│   │   ├── MigrationPage.tsx
│   │   ├── StoragePage.tsx
│   │   ├── WeeklyReportPage.tsx
│   │   ├── ContextPage.tsx
│   │   └── ExperimentalPage.tsx
│   │
│   ├── hooks/               # React Hooks
│   │   ├── useCommitChatState.ts
│   │   ├── useSettings.ts
│   │   ├── useTheme.ts
│   │   ├── useToast.ts
│   │   ├── useOnboarding.ts
│   │   └── useVscodeMessage.ts
│   │
│   ├── contexts/            # React Contexts
│   │   ├── SettingsContext.tsx
│   │   ├── VSCodeContext.tsx
│   │   └── settings-context-type.ts
│   │
│   ├── services/            # 服务层
│   │   ├── webview/
│   │   │   └── profile-manager.ts
│   │   └── secure-storage.ts
│   │
│   ├── router/              # 路由管理
│   │   ├── index.tsx
│   │   └── routes.ts
│   │
│   ├── utils/               # 工具函数
│   │   ├── config-validator.ts
│   │   ├── validation-engine.ts
│   │   ├── validation-helpers.ts
│   │   ├── vscode.ts
│   │   ├── debug-helper.ts
│   │   └── textMateToHljs.ts
│   │
│   ├── i18n/                # 国际化
│   │   ├── setup.ts
│   │   └── locales/
│   │       ├── en/          # 英语资源
│   │       └── zh-cn/       # 中文资源
│   │
│   ├── config/              # 配置管理
│   │   └── provider-registry.tsx
│   │
│   ├── types/               # 类型定义
│   │   └── settings.ts
│   │
│   ├── context/             # 扩展状态上下文
│   │   └── ExtensionStateContext.tsx
│   │
│   ├── App.tsx              # 应用入口
│   ├── main.tsx             # React 渲染入口
│   └── index.css            # 全局样式
│
├── public/                  # 静态资源
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🎯 核心功能模块

### 1. 提交聊天 (Commit Chat)

- **路径**: `src/components/commit-chat/`, `src/pages/CommitChatPage.tsx`
- **功能**: AI 对话式生成提交信息，支持实时预览和建议
- **文档**: [组件文档](src/components/commit-chat/README.md)

### 2. 配置管理 (Settings)

- **路径**: `src/components/settings/`, `src/pages/settings/`
- **功能**: 配置文件管理、AI 提供商配置、用户偏好设置
- **文档**:
  - [设置组件](src/components/settings/README.md)
  - [设置页面](src/pages/settings/README.md)

### 3. 代码索引 (Indexing)

- **路径**: `src/pages/indexing.tsx`
- **功能**: 建立代码索引，提升 AI 对项目上下文的理解
- **支持提供商**: OpenAI, Gemini, Ollama, Mistral 等

### 4. 提示词管理 (Prompts)

- **路径**: `src/components/prompts/`, `src/pages/prompts-page.tsx`
- **功能**: 创建、编辑和管理自定义提示词模板，支持变量替换

### 5. 周报生成 (Weekly Report)

- **路径**: `src/pages/weekly-report-page.tsx`
- **功能**: 生成每周代码统计报告，分析提交历史

## 📖 模块文档索引

### 组件模块

| 模块        | 路径                      | 文档                                              |
| ----------- | ------------------------- | ------------------------------------------------- |
| Commit Chat | `components/commit-chat/` | [README.md](src/components/commit-chat/README.md) |
| Layout      | `components/layout/`      | [README.md](src/components/layout/README.md)      |
| Settings    | `components/settings/`    | [README.md](src/components/settings/README.md)    |
| UI 库       | `components/ui/`          | [README.md](src/components/ui/README.md)          |
| Common      | `components/common/`      | [README.md](src/components/common/README.md)      |
| Prompts     | `components/prompts/`     | [README.md](src/components/prompts/README.md)     |
| Welcome     | `components/welcome/`     | [README.md](src/components/welcome/README.md)     |

### 页面模块

| 模块           | 路径              | 文档                                      |
| -------------- | ----------------- | ----------------------------------------- |
| Pages 总览     | `pages/`          | [README.md](src/pages/README.md)          |
| Settings Pages | `pages/settings/` | [README.md](src/pages/settings/README.md) |

### 功能模块

| 模块     | 路径        | 文档                                |
| -------- | ----------- | ----------------------------------- |
| Hooks    | `hooks/`    | [README.md](src/hooks/README.md)    |
| Contexts | `contexts/` | [README.md](src/contexts/README.md) |
| Services | `services/` | [README.md](src/services/README.md) |
| Router   | `router/`   | [README.md](src/router/README.md)   |
| Utils    | `utils/`    | [README.md](src/utils/README.md)    |
| I18n     | `i18n/`     | [README.md](src/i18n/README.md)     |
| Config   | `config/`   | [README.md](src/config/README.md)   |
| Types    | `types/`    | [README.md](src/types/README.md)    |

## 🚀 快速开始

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 类型检查
npm run check-types

# 代码检查
npm run lint

# 构建
npm run build
```

### 开发流程

```typescript
// 1. 创建新组件
// src/components/new-feature/MyComponent.tsx
export const MyComponent: React.FC = () => {
  return <div>My Component</div>;
};

// 2. 创建页面
// src/pages/MyPage.tsx
export const MyPage: React.FC = () => {
  return (
    <PageLayout title="我的页面">
      <MyComponent />
    </PageLayout>
  );
};

// 3. 添加路由
// src/router/routes.ts
export const routes = {
  myPage: "/my-page"
};

// src/router/index.tsx
<Route path={routes.myPage} element={<MyPage />} />
```

## 🎨 设计系统

### 组件层次

```
AppWithProviders
├── ErrorBoundary          # 错误捕获
├── I18nextProvider        # 国际化
├── VSCodeProvider         # VS Code 状态
├── SettingsProvider       # 设置上下文
├── QueryClientProvider    # 数据查询
├── TooltipProvider        # 工具提示
└── AppRouter              # 路由系统
    └── Layout             # 主布局
        ├── Navigation     # 侧边导航
        └── 页面内容
```

### 数据流

```
用户操作
    ↓
组件事件 (onClick, onSubmit)
    ↓
Hook 处理 (useSettings, useCommitChatState)
    ↓
Context 更新 (SettingsContext)
    ↓
消息通信 (postMessage)
    ↓
VS Code 扩展
    ↓
持久化/外部操作
    ↓
广播更新 (profilesUpdated)
    ↓
UI 重新渲染
```

## 🔧 开发指南

### 1. 添加新功能

```typescript
// 步骤 1: 定义类型
interface NewFeatureConfig {
  id: string;
  name: string;
  enabled: boolean;
}

// 步骤 2: 创建组件
const NewFeature: React.FC = () => {
  const { preferences, updatePreferences } = useSettings();

  return (
    <Switch
      checked={preferences.newFeature}
      onCheckedChange={(checked) => {
        updatePreferences({ newFeature: checked });
      }}
    />
  );
};

// 步骤 3: 添加到页面
function SettingsPage() {
  return (
    <PageLayout title="设置">
      <NewFeature />
    </PageLayout>
  );
}
```

### 2. 国际化

```typescript
// 1. 添加翻译
// src/i18n/locales/en/settings-page.json
{
  "newFeature": {
    "name": "New Feature",
    "description": "Enable new feature"
  }
}

// 2. 在组件中使用
const { t } = useTranslation("settings");
<h2>{t("newFeature.name")}</h2>
```

### 3. 路由守卫

```tsx
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeProfile } = useSettings();

  if (!activeProfile) {
    return <Navigate to="/settings" replace />;
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

## 🧪 测试

```bash
# 运行测试（如果有）
npm test

# 类型检查
npm run check-types

# 代码规范
npm run lint
```

## 📦 构建和部署

```bash
# 构建生产版本
npm run build

# 输出到
# dist/
#   ├── assets/
#   ├── index.html
#   └── 其他静态资源
```

构建后的文件会被 VS Code 扩展加载。

## 🔍 故障排除

### 常见问题

#### 1. 类型错误

```bash
# 检查类型
npm run check-types

# 修复自动可修复的错误
npm run lint -- --fix
```

#### 2. 样式不生效

- 检查 Tailwind CSS 类名是否正确
- 确认构建过程完成
- 清除缓存：`npm run clean`

#### 3. 路由不工作

- 检查路径拼写
- 确认组件正确导出
- 查看浏览器控制台错误

## 🤝 贡献指南

### 代码规范

- 使用 TypeScript
- 遵循 React 最佳实践
- 组件使用函数式声明
- Hooks 命名以 `use` 开头
- 保持代码简洁，避免过度抽象

### 提交规范

```
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
refactor: 重构代码
style: 代码格式调整
chore: 构建/工具变动
```

## 📊 项目统计

| 指标          | 数值      |
| ------------- | --------- |
| 组件数量      | 50+       |
| 页面数量      | 13        |
| Hooks 数量    | 6         |
| Contexts 数量 | 3         |
| 服务数量      | 2         |
| 语言支持      | 2 (中/英) |

## 📚 相关链接

- **项目主页**: [Dish AI Commit Gen](https://github.com/your-username/dish-ai-commit-gen)
- **VS Code 扩展**: [../src/README.md](../src/README.md)
- **核心引擎**: [../src/ai/README.md](../src/ai/README.md)
- **SCM 支持**: [../src/scm/README.md](../src/scm/README.md)

## 📄 许可证

MIT License

---

**最后更新**: 2024年12月
**版本**: 0.56.1
**架构**: React 18 + TypeScript + Tailwind CSS
**构建工具**: Vite
