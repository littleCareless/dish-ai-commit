# I18n 模块文档

## 📋 概述

I18n 模块提供了应用的国际化支持，支持多语言切换（中文、英文等），使用 i18next 作为核心库。

## 🏗️ 技术栈

- **i18next**: v25.6.0 - 核心国际化库
- **react-i18next**: v15.4.1 - React 集成
- **语言资源**: JSON 文件存储

## 📁 文件结构

```
i18n/
├── setup.ts              # i18n 配置和初始化
└── locales/              # 语言资源
    ├── en/               # 英语
    │   ├── context-page.json
    │   ├── experimental-page.json
    │   ├── features-settings.json
    │   ├── providers-settings.json
    │   ├── settings-page.json
    │   ├── weekly-report-page.json
    │   ├── about-page.json
    │   ├── prompts-page.json
    │   └── usage-page.json
    └── zh-cn/            # 简体中文
        ├── context-page.json
        ├── experimental-page.json
        ├── features-settings.json
        ├── settings-page.json
        ├── weekly-report-page.json
        ├── about-page.json
        ├── prompts-page.json
        ├── providers-settings.json
        └── usage-page.json
```

## 🔧 核心配置

### 1. i18n 初始化

**文件**: `setup.ts` (~3604 行)

**职责**:

- 配置 i18next 实例
- 设置语言检测
- 定义语言资源
- 集成到 React

**实现**:

```typescript
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// 语言资源导入
import en from "./locales/en/common.json";
import zhCN from "./locales/zh-cn/common.json";

// 页面级资源
import enSettings from "./locales/en/settings-page.json";
import zhSettings from "./locales/zh-cn/settings-page.json";

export const resources = {
  en: {
    translation: en,
    settings: enSettings,
    // ... 其他命名空间
  },
  "zh-cn": {
    translation: zhCN,
    settings: zhSettings,
    // ... 其他命名空间
  },
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: "zh-cn", // 默认语言
  fallbackLng: "en", // 回退语言
  interpolation: {
    escapeValue: false, // React 已处理 XSS
  },
  // 命名空间配置
  ns: ["translation", "settings", "features", "providers"],
  defaultNS: "translation",
  // 缓存配置
  cache: {
    enabled: true,
    prefix: "i18next_",
    expirationTime: 7 * 24 * 60 * 60 * 1000, // 7天
  },
  // 后端配置（如果需要动态加载）
  backend: {
    loadPath: "/locales/{{lng}}/{{ns}}.json",
  },
});

export default i18n;
```

### 2. 语言资源结构

#### 通用翻译 (common.json)

```json
{
  "app": {
    "name": "Dish AI Commit Gen",
    "version": "版本 {{version}}",
    "description": "智能化的提交信息生成工具"
  },
  "nav": {
    "home": "首页",
    "settings": "设置",
    "commit-chat": "提交聊天",
    "indexing": "代码索引",
    "prompts": "提示词",
    "reports": "周报",
    "usage": "使用说明",
    "about": "关于"
  },
  "button": {
    "save": "保存",
    "cancel": "取消",
    "delete": "删除",
    "create": "创建",
    "edit": "编辑",
    "confirm": "确认"
  },
  "status": {
    "loading": "加载中...",
    "success": "成功",
    "error": "错误",
    "warning": "警告"
  }
}
```

#### 设置页面 (settings-page.json)

```json
{
  "settings": {
    "title": "设置",
    "description": "管理应用配置和偏好",
    "tabs": {
      "profiles": "配置文件",
      "providers": "AI 提供商",
      "features": "功能设置",
      "preferences": "偏好设置",
      "advanced": "高级设置"
    },
    "profile": {
      "name": "配置文件名称",
      "description": "描述",
      "active": "当前活跃",
      "create": "创建配置文件",
      "edit": "编辑配置文件",
      "delete": "删除配置文件",
      "switch": "切换配置文件"
    }
  }
}
```

#### 功能设置 (features-settings.json)

```json
{
  "features": {
    "commit-chat": {
      "name": "提交聊天",
      "description": "使用聊天界面生成提交信息"
    },
    "code-indexing": {
      "name": "代码索引",
      "description": "建立代码索引以提升 AI 理解"
    },
    "weekly-report": {
      "name": "周报生成",
      "description": "生成每周代码统计报告"
    },
    "auto-commit": {
      "name": "自动提交",
      "description": "自动检测并生成提交"
    }
  }
}
```

## 🎯 使用方式

### 1. 在组件中使用

```tsx
import { useTranslation } from "react-i18next";

function SettingsPage() {
  const { t } = useTranslation("settings");

  return (
    <div>
      <h1>{t("settings.title")}</h1>
      <p>{t("settings.description")}</p>

      <Button>{t("button.save")}</Button>
    </div>
  );
}
```

### 2. 使用命名空间

```tsx
import { useTranslation } from "react-i18next";

function FeaturesSettings() {
  const { t } = useTranslation("features");

  return (
    <div>
      <h2>{t("features.commit-chat.name")}</h2>
      <p>{t("features.commit-chat.description")}</p>
    </div>
  );
}
```

### 3. 带参数的翻译

```tsx
function App() {
  const { t } = useTranslation();
  const version = "0.56.1";

  return (
    <div>
      <p>{t("app.version", { version })}</p>
      {/* 输出: "版本 0.56.1" */}
    </div>
  );
}
```

### 4. 复数处理

```json
{
  "messages": {
    "count": "{{count}} 条消息",
    "count_plural": "{{count}} 条消息",
    "count_zero": "暂无消息"
  }
}
```

```tsx
const { t } = useTranslation();
const count = 5;

<p>{t("messages.count", { count })}</p>;
// 输出: "5 条消息"
```

### 5. 动态语言切换

```tsx
import { useTranslation } from "react-i18next";
import i18n from "@/i18n/setup";

function LanguageSwitcher() {
  const { i18n: i18nInstance } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18nInstance.changeLanguage(lng);
    // 保存到 localStorage
    localStorage.setItem("language", lng);
  };

  return (
    <div>
      <button onClick={() => changeLanguage("zh-cn")}>中文</button>
      <button onClick={() => changeLanguage("en")}>English</button>
    </div>
  );
}
```

## 🌐 语言检测

### 自动检测策略

```typescript
// setup.ts 中的配置
i18n.init({
  // 检测顺序
  detection: {
    // 1. URL 查询参数 ?lang=zh
    order: ["querystring", "localStorage", "navigator", "htmlTag"],

    // 2. localStorage 缓存
    caches: ["localStorage"],

    // 3. 查询参数键名
    lookupQuerystring: "lang",

    // 4. localStorage 键名
    lookupLocalStorage: "i18nextLng",

    // 5. HTML 标签 lang 属性
    htmlTag: document.documentElement,
  },
});
```

### 手动检测

```typescript
// 在 App 启动时
const detectLanguage = (): string => {
  // 1. 检查 localStorage
  const saved = localStorage.getItem("i18nextLng");
  if (saved) return saved;

  // 2. 检查浏览器语言
  const browserLang = navigator.language;
  if (browserLang.startsWith("zh")) return "zh-cn";
  if (browserLang.startsWith("en")) return "en";

  // 3. 默认
  return "zh-cn";
};

i18n.changeLanguage(detectLanguage());
```

## 📦 命名空间策略

### 1. 按页面组织

```
common.json          # 通用翻译（按钮、状态等）
settings-page.json   # 设置页面
features-settings.json  # 功能设置
providers-settings.json # 提供商设置
prompts-page.json    # 提示词页面
weekly-report.json   # 周报页面
usage-page.json      # 使用说明
about-page.json      # 关于页面
context-page.json    # 上下文页面
experimental-page.json # 实验性功能
```

### 2. 按功能组织

```typescript
// 按功能模块划分
const namespaces = {
  // 核心功能
  commitChat: "commit-chat",
  indexing: "indexing",
  prompts: "prompts",

  // 设置
  settings: "settings",
  providers: "providers",
  features: "features",

  // 报告
  reports: "reports",
  weekly: "weekly-report",

  // 辅助
  about: "about",
  usage: "usage",
  context: "context",
};
```

## 🎨 最佳实践

### 1. 键名命名规范

```typescript
// ✅ 推荐：使用层级结构
{
  "page": {
    "section": {
      "title": "标题",
      "description": "描述",
      "button": {
        "save": "保存",
        "cancel": "取消"
      }
    }
  }
}

// ❌ 避免：扁平化命名
{
  "page-section-title": "标题",
  "page-section-description": "描述",
  "page-section-button-save": "保存"
}
```

### 2. 保持翻译一致性

```typescript
// ✅ 推荐：统一术语
{
  "button": {
    "save": "保存",
    "save_all": "保存全部"
  }
}

// ❌ 避免：不一致的翻译
{
  "button": {
    "save": "保存",
    "save_all": "储存全部"  // "保存" vs "储存"
  }
}
```

### 3. 使用变量

```typescript
// ✅ 推荐：使用变量
{
  "user": {
    "welcome": "欢迎，{{name}}",
    "messages": "{{count}} 条消息"
  }
}

// 使用
t("user.welcome", { name: "张三" })
// 输出: "欢迎，张三"
```

### 4. 条件翻译

```tsx
// ✅ 推荐：根据状态选择翻译
function StatusDisplay({ status }: { status: "success" | "error" }) {
  const { t } = useTranslation();

  const statusText = {
    success: t("status.success"),
    error: t("status.error"),
  }[status];

  return <span>{statusText}</span>;
}
```

## 🔧 高级用法

### 1. 语言资源动态加载

```typescript
// 懒加载语言资源
const loadLanguage = async (lng: string) => {
  const modules = await Promise.all([
    import(`./locales/${lng}/common.json`),
    import(`./locales/${lng}/settings-page.json`),
    import(`./locales/${lng}/features-settings.json`),
  ]);

  modules.forEach((module, index) => {
    const namespaces = ["translation", "settings", "features"];
    i18n.addResourceBundle(lng, namespaces[index], module.default);
  });
};

// 使用
await loadLanguage("en");
```

### 2. 自定义翻译函数

```typescript
import { useTranslation } from "react-i18next";

function useCustomTranslation() {
  const { t, i18n } = useTranslation();

  const formatDateTime = (date: Date): string => {
    const locale = i18n.language === "zh-cn" ? "zh-CN" : "en-US";
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(date);
  };

  const formatNumber = (num: number): string => {
    const locale = i18n.language === "zh-cn" ? "zh-CN" : "en-US";
    return new Intl.NumberFormat(locale).format(num);
  };

  return {
    t,
    formatDateTime,
    formatNumber,
    currentLanguage: i18n.language
  };
}

// 使用
function MyComponent() {
  const { t, formatDateTime, currentLanguage } = useCustomTranslation();

  return (
    <div>
      <p>{t("hello")}</p>
      <p>{formatDateTime(new Date())}</p>
      <p>当前语言: {currentLanguage}</p>
    </div>
  );
}
```

### 3. 在 App.tsx 中使用

```tsx
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

const App: React.FC = () => {
  const { i18n } = useTranslation();

  // 监听语言变化
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      console.log("语言已切换:", lng);
      // 保存到 localStorage
      localStorage.setItem("language", lng);
    };

    i18n.on("languageChanged", handleLanguageChange);

    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, [i18n]);

  return (
    <>
      <AppRouter />
      <Toaster />
    </>
  );
};

// 包裹 Provider
const AppWithProviders = () => (
  <I18nextProvider i18n={i18n}>
    <App />
  </I18nextProvider>
);
```

## 📊 语言资源管理

### 1. 翻译文件组织

```json
// en/settings-page.json
{
  "settings": {
    "title": "Settings",
    "description": "Manage application configuration",
    "tabs": {
      "profiles": "Profiles",
      "providers": "Providers",
      "features": "Features"
    }
  }
}

// zh-cn/settings-page.json
{
  "settings": {
    "title": "设置",
    "description": "管理应用配置",
    "tabs": {
      "profiles": "配置文件",
      "providers": "AI 提供商",
      "features": "功能设置"
    }
  }
}
```

### 2. 翻译完整性检查

```typescript
function checkTranslationCompleteness(
  baseLang: Record<string, any>,
  targetLang: Record<string, any>,
  path: string = "",
): string[] {
  const missing: string[] = [];

  for (const key in baseLang) {
    const currentPath = path ? `${path}.${key}` : key;

    if (typeof baseLang[key] === "object") {
      if (!targetLang[key]) {
        missing.push(`${currentPath} (缺少整个对象)`);
      } else {
        missing.push(
          ...checkTranslationCompleteness(
            baseLang[key],
            targetLang[key],
            currentPath,
          ),
        );
      }
    } else if (targetLang[key] === undefined) {
      missing.push(currentPath);
    }
  }

  return missing;
}

// 使用
const en = require("./locales/en/settings-page.json");
const zh = require("./locales/zh-cn/settings-page.json");

const missing = checkTranslationCompleteness(en, zh);
if (missing.length > 0) {
  console.error("缺失的翻译:", missing);
}
```

## 🔍 故障排除

### 常见问题

#### 1. 翻译不显示

**问题**: 显示键名而不是翻译文本
**解决方案**:

```typescript
// 检查命名空间
const { t } = useTranslation("settings"); // 确保命名空间正确

// 检查键路径
t("settings.title"); // ✅ 正确
t("title"); // ❌ 错误，如果不在 settings 命名空间

// 检查资源是否加载
console.log(i18n.store.data); // 查看已加载的资源
```

#### 2. 语言切换不生效

**问题**: 切换语言后 UI 没有更新
**解决方案**:

```typescript
// 确保使用 useTranslation
const { t, i18n } = useTranslation();

// 切换语言
await i18n.changeLanguage("en");

// 强制重新渲染（如果需要）
// React 会自动处理，因为 i18n 是响应式的
```

#### 3. 命名空间未加载

**问题**: 某些翻译返回 undefined
**解决方案**:

```typescript
// 预加载命名空间
i18n.loadNamespaces(["settings", "features"]).then(() => {
  // 现在可以使用这些命名空间
});

// 或者在初始化时指定
i18n.init({
  ns: ["translation", "settings", "features"],
  defaultNS: "translation",
});
```

## 📚 相关文档

- **i18next 文档**: https://www.i18next.com/
- **react-i18next 文档**: https://react.i18next.com/
- **App.tsx**: [../../App.tsx](../../App.tsx)
- **组件**: [../components/README.md](../components/README.md)

---

**最后更新**: 2024年12月
**支持语言**: 中文 (zh-cn), 英文 (en)
**命名空间数量**: 10+
**架构模式**: i18next + React Context
