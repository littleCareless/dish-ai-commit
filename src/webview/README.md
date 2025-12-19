# Webview 模块 - UI 架构与交互系统

## 📋 概述

Webview 模块是 Dish AI Commit Gen 的用户界面核心，提供现代化的交互式设置界面、聊天界面和可视化工具。模块采用 **React + TypeScript** 技术栈，通过 **VS Code Webview API** 与扩展后端通信，实现无缝的原生应用体验。

### 核心价值

- ✅ **现代化 UI**: 基于 React 18 + Tailwind CSS + Arco Design 的现代化界面
- ✅ **双向通信**: Webview 与 Extension 的实时消息通信机制
- ✅ **多视图支持**: 设置面板、周报面板、聊天界面等多种视图类型
- ✅ **状态同步**: 自动同步 VS Code 配置与 Webview 状态
- ✅ **主题适配**: 完美适配 VS Code 的所有主题（亮色/暗色/高对比度）
- ✅ **类型安全**: 完整的 TypeScript 类型定义和消息协议

## 🏗️ 架构设计

### 整体架构

```
VS Code Extension (Backend)
    ↓↑ postMessage/onDidReceiveMessage
Webview (Frontend - React App)
    ↓
UI Components (Arco Design + Tailwind)
```

### 核心组件

```
Webview Module
├── src/webview/ (Extension Side - TypeScript)
│   ├── settings-view-provider.ts          # 设置视图提供者 (60行) ⭐
│   ├── weekly-report-panel.ts             # 周报面板 (83行) ⭐
│   ├── providers/
│   │   ├── settings-view-html-provider.ts # HTML 生成器 (123行)
│   │   └── weekly-report-view-provider.ts # 周报 HTML 生成器
│   └── handlers/
│       ├── settings-view-message-handler.ts # 设置消息处理器 (456行) ⭐
│       └── weekly-report-message-handler.ts # 周报消息处理器
│
└── webview-ui/src/ (Frontend Side - React)
    ├── App.tsx                            # 根组件 (77行)
    ├── main.tsx                           # 入口点
    ├── router/                            # 路由系统
    │   └── routes.ts                      # 路由配置
    ├── contexts/                          # React Contexts
    │   ├── VSCodeContext.tsx              # VS Code 上下文
    │   ├── SettingsContext.tsx            # 设置上下文
    │   └── ExtensionStateContext.tsx      # 扩展状态上下文
    ├── hooks/                             # 自定义 Hooks
    │   ├── useCommitChatState.ts          # 聊天状态管理 (261行) ⭐
    │   ├── useSettings.ts                 # 设置管理
    │   ├── useVSCodeMessage.ts            # 消息通信
    │   └── useTheme.ts                    # 主题管理
    ├── components/                        # UI 组件
    │   ├── commit-chat/                   # 聊天组件
    │   │   ├── CommitChatView.tsx         # 主聊天界面 (326行)
    │   │   ├── UserMessage.tsx            # 用户消息
    │   │   ├── AIMessage.tsx              # AI 响应
    │   │   └── CommitTextArea.tsx         # 输入框
    │   ├── settings/                      # 设置组件
    │   │   ├── ProviderConfigForm.tsx     # Provider 配置表单
    │   │   ├── ProfileForm.tsx            # Profile 表单
    │   │   ├── PreferencesSettings.tsx    # 偏好设置
    │   │   ├── AdvancedSettings.tsx       # 高级设置
    │   │   └── indexing/                  # 索引设置
    │   │       ├── IndexingLog.tsx        # 索引日志
    │   │       └── repository-status.tsx  # 仓库状态
    │   ├── welcome/                       # 欢迎页面
    │   │   ├── WelcomeHero.tsx            # 欢迎英雄区
    │   │   ├── SetupWizard.tsx            # 设置向导
    │   │   └── QuickStartGuide.tsx        # 快速开始
    │   └── ui/                            # 通用 UI 组件
    │       ├── button.tsx                 # 按钮
    │       ├── dialog.tsx                 # 对话框
    │       ├── toast.tsx                  # 通知
    │       └── ... (30+ 组件)
    ├── pages/                             # 页面组件
    │   ├── CommitChatPage.tsx             # 聊天页面
    │   ├── settings-page.tsx              # 设置页面
    │   ├── indexing-page.tsx              # 索引页面
    │   ├── prompts-page.tsx               # 提示词页面
    │   └── ... (10+ 页面)
    ├── services/                          # 业务服务
    │   ├── webview/profile-manager.ts     # Profile 管理
    │   └── secure-storage.ts              # 安全存储
    └── utils/                             # 工具函数
        ├── vscode.ts                      # VS Code 通信
        ├── config-validator.ts            # 配置验证
        └── validation-engine.ts           # 验证引擎
```

### 视图类型

```
1. Settings View (WebviewView)
   - 类型: 侧边栏视图
   - 提供者: SettingsViewProvider
   - 用途: 配置管理、索引控制、Provider 设置
   - 生命周期: 随 VS Code 窗口持久化

2. Weekly Report Panel (WebviewPanel)
   - 类型: 独立面板
   - 提供者: WeeklyReportPanel
   - 用途: 周报生成和展示
   - 生命周期: 单例模式，可创建/销毁

3. Commit Chat (WebviewPanel)
   - 类型: 独立面板
   - 提供者: 待实现
   - 用途: 交互式聊天生成 Commit Message
   - 生命周期: 可创建多个实例
```

## 🎯 核心功能详解

### 1. Webview 提供者模式

#### 1.1 SettingsViewProvider (侧边栏视图)

**文件**: `settings-view-provider.ts` (60 行)

**职责**: 管理 VS Code 侧边栏中的设置视图

```typescript
export class SettingsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "dish-ai-commit.settingsView";

  async resolveWebviewView(webviewView, context, token) {
    // 1. 配置 Webview 选项
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "webview-ui-dist"),
      ],
    };

    // 2. 生成 HTML 内容
    webviewView.webview.html = this._htmlContentProvider.getWebviewContent(
      webviewView.webview
    );

    // 3. 监听消息
    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        await this._messageHandler.handleMessage(message, webviewView.webview);
      },
      null,
      this._disposables
    );
  }
}
```

**特点**:
- ✅ 与 VS Code 深度集成
- ✅ 自动持久化状态
- ✅ 适合配置类界面

#### 1.2 WeeklyReportPanel (独立面板)

**文件**: `weekly-report-panel.ts` (83 行)

**职责**: 管理独立的周报面板

```typescript
export class WeeklyReportPanel {
  public static currentPanel: WeeklyReportPanel | undefined;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._viewProvider = new WeeklyReportViewProvider(extensionUri);
    this._messageHandler = new WeeklyReportMessageHandler();

    // 配置 Webview
    this._panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(extensionUri, "webview-ui-dist"),
      ],
    };

    this._panel.webview.html = this._viewProvider.getWebviewContent(
      this._panel.webview
    );

    // 监听消息和销毁
    this._panel.webview.onDidReceiveMessage(/* ... */);
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public static async createOrShow(extensionUri, context) {
    if (WeeklyReportPanel.currentPanel) {
      WeeklyReportPanel.currentPanel._panel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      WeeklyReportPanel.viewType,
      getMessage("weeklyReport.title"),
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "webview-ui-dist"),
        ],
      }
    );

    WeeklyReportPanel.currentPanel = new WeeklyReportPanel(panel, extensionUri);
  }
}
```

**特点**:
- ✅ 单例模式（同一时间只有一个实例）
- ✅ `retainContextWhenHidden: true` 保持状态
- ✅ 可创建/销毁的独立窗口

### 2. HTML 内容提供者

**文件**: `providers/settings-view-html-provider.ts` (123 行)

**职责**: 生成安全的 Webview HTML，处理主题和 CSP

```typescript
export class SettingsViewHTMLProvider {
  public getWebviewContent(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "webview-ui-dist", "index.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "webview-ui-dist", "index.css")
    );
    const nonce = this.getNonce(); // 安全随机数

    // Content Security Policy
    const csp = [
      `default-src 'none'`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
      `img-src ${webview.cspSource} data:`,
      `font-src ${webview.cspSource}`,
    ].join("; ");

    return `<!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="${csp}">
        <link href="${styleUri}" rel="stylesheet">
        <title>插件设置</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}">
          // 主题处理逻辑
          function getVSCodeTheme() { /* ... */ }
          function applyTheme() { /* ... */ }

          // 监听主题变化
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                applyTheme();
              }
            });
          });

          // 初始化
          document.addEventListener('DOMContentLoaded', () => {
            applyTheme();
            observer.observe(document.body, { attributes: true });
          });

          // 传递初始数据
          window.initialData = {
            viewType: 'settingsPage',
            vscodeTheme: getVSCodeTheme()
          };
        </script>
        <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }
}
```

**安全特性**:
- ✅ **CSP 策略**: 严格的内容安全策略
- ✅ **Nonce 验证**: 脚本执行权限控制
- ✅ **主题同步**: 自动应用 VS Code 主题
- ✅ **资源隔离**: 仅加载扩展内部资源

### 3. 消息处理器

#### 3.1 SettingsViewMessageHandler

**文件**: `handlers/settings-view-message-handler.ts` (456 行)

**职责**: 处理设置视图的所有消息请求

```typescript
export class SettingsViewMessageHandler {
  public async handleMessage(message: any, webview: vscode.Webview): Promise<void> {
    switch (message.command) {
      case "testConnection":
        await this.handleTestConnection(
          message.data.service,
          message.data.url,
          message.data.key,
          webview
        );
        break;

      case "startIndexing":
        await this.startIndexing(0, webview, !!message.data.clearIndex);
        break;

      case "clearIndex":
        await this.handleClearIndex(webview);
        break;

      case "getSettings":
        await this.handleGetSettings(webview);
        break;

      case "saveSettings":
        await this.handleSaveSettings(message.data, webview);
        break;

      case "getModelsForProvider":
        await this.handleGetModelsForProvider(message.data, webview);
        break;
    }
  }

  // 连接测试
  private async handleTestConnection(service: string, url: string, key: string, webview: vscode.Webview) {
    try {
      let testUrl = url;
      if (service === "ollama") {
        testUrl = new URL("/api/version", url).toString();
      } else if (service === "qdrant") {
        testUrl = new URL("/", url).toString();
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(testUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) {
        webview.postMessage({
          command: "testConnectionResult",
          data: { success: true, service, key },
        });
      } else {
        throw new Error(`Server returned status ${response.status}`);
      }
    } catch (error) {
      webview.postMessage({
        command: "testConnectionResult",
        data: { success: false, error: error.message, service, key },
      });
    }
  }

  // 索引管理
  private async startIndexing(startIndex: number, webview: vscode.Webview, clearIndex: boolean = false) {
    if (!this._embeddingService) {
      webview.postMessage({
        command: "indexingFailed",
        data: { message: "EmbeddingService 未初始化" },
      });
      return;
    }

    if (clearIndex) {
      await this._embeddingService.clearIndex();
    }

    try {
      await this._embeddingService.scanProjectFiles(startIndex, webview);
      const isIndexed = await this._embeddingService.isIndexed();
      webview.postMessage({
        command: "indexingFinished",
        data: { message: "索引完成!", isIndexed },
      });
    } catch (error) {
      // 错误处理...
    }
  }
}
```

**消息协议示例**:

```typescript
// Webview → Extension
{
  command: "testConnection",
  data: { service: "ollama", url: "http://localhost:11434", key: "" }
}

// Extension → Webview
{
  command: "testConnectionResult",
  data: { success: true, service: "ollama", key: "" }
}
```

### 4. 前端 React 架构

#### 4.1 应用入口与提供者

**文件**: `webview-ui/src/App.tsx` (77 行)

```typescript
const App: React.FC = () => {
  useVSCodeContext(); // 确保在 Provider 内部使用

  const onMessage = useCallback((e: MessageEvent) => {
    console.log("Received message:", e.data);
  }, []);

  useEvent("message", onMessage);

  useEffect(() => {
    postMessage("webviewDidLaunch", {}); // 通知扩展 Webview 已启动
  }, []);

  return (
    <>
      <AppRouter />
      <Toaster />
    </>
  );
};

const queryClient = new QueryClient();

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

export default AppWithProviders;
```

**提供者层次**:
1. **ConfigProvider** - Arco Design 配置
2. **ErrorBoundary** - 错误捕获
3. **I18nextProvider** - 国际化
4. **VSCodeProvider** - VS Code 上下文
5. **SettingsProvider** - 设置状态
6. **ExtensionStateContextProvider** - 扩展状态
7. **QueryClientProvider** - TanStack Query
8. **TooltipProvider** - 工具提示

#### 4.2 VS Code 上下文

**文件**: `webview-ui/src/contexts/VSCodeContext.tsx`

```typescript
export const VSCodeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ExtensionStateContextProvider>{children}</ExtensionStateContextProvider>
  );
};

export const useVSCodeContext = () => {
  const state = useExtensionState();
  const { didHydrateState, ...initialData } = state;

  return {
    isReady: didHydrateState,
    initialData: initialData as ExtensionState,
  };
};
```

#### 4.3 路由系统

**文件**: `webview-ui/src/router/routes.ts`

```typescript
export const routes = {
  welcome: "/",
  settings: "/settings",
  notifications: "/notifications",
  context: "/context",
  prompts: "/prompts",
  experimental: "/experimental",
  about: "/about",
  indexing: "/indexing",
  profiles: "/profiles",
  migration: "/migration",
} as const;

export type RouteKey = keyof typeof routes;
```

### 5. 聊天功能深度解析

#### 5.1 CommitChatView (主组件)

**文件**: `webview-ui/src/components/commit-chat/CommitChatView.tsx` (326 行)

**状态管理**:
```typescript
interface CommitChatState {
  messages: ChatMessage[];        // 消息历史
  inputValue: string;             // 输入值
  isTyping: boolean;              // AI 正在输入
  selectedImages: string[];       // 选中的图片
  draftMessage: string;           // 草稿消息
}

interface ChatMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  metadata?: {
    commitMessage?: string;       // 生成的 commit message
    suggestions?: string[];       // 建议列表
    configuration?: Record<string, unknown>;
  };
}
```

**消息发送流程**:
```typescript
const handleSendMessage = async () => {
  // 1. 验证输入
  if (!state.inputValue.trim() || state.isTyping) return;

  // 2. 创建用户消息
  const userMessage: ChatMessage = {
    id: `user-${Date.now()}`,
    type: "user",
    content: state.inputValue.trim(),
    timestamp: new Date(),
  };

  // 3. 更新状态
  setState(prev => ({
    ...prev,
    messages: [...prev.messages, userMessage],
    inputValue: "",
    isTyping: true,
  }));

  // 4. 发送到后端
  try {
    postMessage("commitChatMessage", {
      message: userMessage.content,
      context: {
        messages: state.messages,
        selectedImages: state.selectedImages,
      },
    });
  } catch (error) {
    console.error("发送消息失败:", error);
    setState(prev => ({ ...prev, isTyping: false }));
  }
};
```

**实时响应处理**:
```typescript
useMessageHandler(
  useCallback((event: MessageEvent) => {
    const message = event.data;

    if (message.command === "commitChatResponse") {
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        type: "ai",
        content: message.data.response,
        timestamp: new Date(),
        metadata: message.data.metadata,
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, aiMessage],
        isTyping: false,
      }));

      // 通知父组件
      if (message.data.metadata?.commitMessage && onCommitMessageGenerated) {
        onCommitMessageGenerated(message.data.metadata.commitMessage);
      }
    }
  }, [onCommitMessageGenerated]),
);
```

#### 5.2 useCommitChatState Hook

**文件**: `webview-ui/src/hooks/useCommitChatState.ts` (261 行)

**配置接口**:
```typescript
interface CommitChatConfig {
  maxMessages: number;           // 最大消息数 (默认 100)
  autoSaveDraft: boolean;        // 自动保存草稿 (默认 true)
  draftSaveInterval: number;     // 草稿保存间隔 (默认 2000ms)
  enableHistory: boolean;        // 启用历史记录 (默认 true)
  maxHistorySize: number;        // 最大历史大小 (默认 50)
}
```

**核心功能**:

1. **草稿管理** (2秒防抖):
```typescript
useEffect(() => {
  if (finalConfig.autoSaveDraft && state.inputValue.trim()) {
    const timeout = setTimeout(() => {
      localStorage.setItem("commit-chat-draft", state.inputValue);
    }, finalConfig.draftSaveInterval);
    return () => clearTimeout(timeout);
  }
}, [state.inputValue, finalConfig.autoSaveDraft, finalConfig.draftSaveInterval]);
```

2. **消息管理** (自动清理):
```typescript
const addMessage = useCallback((message: Omit<ChatMessage, "id" | "timestamp">) => {
  const newMessage: ChatMessage = {
    ...message,
    id: `${message.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
  };

  setState(prev => {
    const newMessages = [...prev.messages, newMessage];

    // 限制消息数量，防止内存泄漏
    if (newMessages.length > finalConfig.maxMessages) {
      return { ...prev, messages: newMessages.slice(-finalConfig.maxMessages) };
    }

    return { ...prev, messages: newMessages };
  });

  return newMessage;
}, [finalConfig.maxMessages]);
```

3. **导入导出**:
```typescript
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
  a.download = `commit-chat-history-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}, [state.messages]);
```

### 6. 消息通信协议

#### 6.1 Webview → Extension

```typescript
// 发送聊天消息
postMessage("commitChatMessage", {
  message: "添加用户登录功能",
  context: {
    messages: [...],        // 历史消息
    selectedImages: [],     // 选中的图片
  },
});

// 请求设置
postMessage("getSettings");

// 保存设置
postMessage("saveSettings", [
  { key: "base.language", value: "English" },
  { key: "providers.openai.apiKey", value: "sk-..." }
]);

// 开始索引
postMessage("startIndexing", { clearIndex: true });

// 测试连接
postMessage("testConnection", {
  service: "ollama",
  url: "http://localhost:11434",
  key: ""
});
```

#### 6.2 Extension → Webview

```typescript
// AI 响应
{
  command: "commitChatResponse",
  data: {
    response: "我已经为你生成了 commit message...",
    metadata: {
      commitMessage: "feat: add user login feature",
      suggestions: [
        "feat: user-auth",
        "feat: login-system",
        "feat: auth-module"
      ],
    },
  },
}

// 设置加载
{
  command: "loadSettings",
  data: {
    schema: [...],           // 所有设置项
    isIndexed: 150,          // 索引数量
    indexStatusError: null,  // 错误信息
    embeddingModels: [...],  // 嵌入模型列表
  },
}

// 索引状态
{
  command: "indexingFinished",
  data: { message: "索引完成!", isIndexed: 150 }
}

// 错误处理
{
  command: "indexingFailed",
  data: { message: "索引失败", source: "qdrant", type: "connection" }
}
```

## 📦 导出的 API

### Extension Side

```typescript
// 视图提供者
export { SettingsViewProvider } from "./settings-view-provider";
export { WeeklyReportPanel } from "./weekly-report-panel";

// HTML 提供者
export { SettingsViewHTMLProvider } from "./providers/settings-view-html-provider";
export { WeeklyReportViewProvider } from "./providers/weekly-report-view-provider";

// 消息处理器
export { SettingsViewMessageHandler } from "./handlers/settings-view-message-handler";
export { WeeklyReportMessageHandler } from "./handlers/weekly-report-message-handler";
```

### Frontend Side

```typescript
// Contexts
export { VSCodeProvider, useVSCodeContext } from "./contexts/VSCodeContext";
export { SettingsProvider, useSettings } from "./contexts/SettingsContext";
export { ExtensionStateContextProvider, useExtensionState } from "./context/ExtensionStateContext";

// Hooks
export { useCommitChatState } from "./hooks/useCommitChatState";
export { useVSCodeMessage } from "./hooks/useVSCodeMessage";
export { useTheme } from "./hooks/useTheme";
export { useToast } from "./hooks/use-toast";

// Components
export { CommitChatView } from "./components/commit-chat/CommitChatView";
export { WelcomeHero } from "./components/welcome/WelcomeHero";
export { SetupWizard } from "./components/welcome/SetupWizard";

// Utilities
export { postMessage } from "./utils/vscode";
export { validateConfig } from "./utils/config-validator";
```

## 🔧 使用示例

### 示例 1: 注册设置视图

```typescript
// extension.ts
import { SettingsViewProvider } from "./src/webview/settings-view-provider";

export function activate(context: vscode.ExtensionContext) {
  // 注册侧边栏视图
  const settingsProvider = new SettingsViewProvider(
    context.extensionUri,
    "dish-ai-commit",
    context,
    embeddingService
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SettingsViewProvider.viewType,
      settingsProvider
    )
  );
}
```

### 示例 2: 创建周报面板

```typescript
// commands/weekly-report.ts
import { WeeklyReportPanel } from "./src/webview/weekly-report-panel";

async function showWeeklyReport() {
  await WeeklyReportPanel.createOrShow(
    context.extensionUri,
    context
  );
}

// 注册命令
vscode.commands.registerCommand(
  "dish-ai-commit.showWeeklyReport",
  showWeeklyReport
);
```

### 示例 3: 在 Webview 中使用聊天组件

```tsx
// pages/CommitChatPage.tsx
import { CommitChatView } from "@/components/commit-chat/CommitChatView";
import { useVSCodeContext } from "@/contexts/VSCodeContext";

export const CommitChatPage: React.FC = () => {
  const { isReady } = useVSCodeContext();

  if (!isReady) {
    return <LoadingPage />;
  }

  const handleCommitGenerated = (message: string) => {
    // 应用到 Git SCM
    postMessage("applyCommitMessage", { message });
  };

  return (
    <PageLayout title="Commit Message Chat">
      <CommitChatView
        onCommitMessageGenerated={handleCommitGenerated}
      />
    </PageLayout>
  );
};
```

### 示例 4: 自定义消息处理器

```typescript
// handlers/custom-message-handler.ts
export class CustomMessageHandler {
  async handleMessage(message: any, webview: vscode.Webview): Promise<void> {
    switch (message.command) {
      case "customAction":
        await this.handleCustomAction(message.data, webview);
        break;

      case "getCustomData":
        await this.handleGetCustomData(webview);
        break;
    }
  }

  private async handleCustomAction(data: any, webview: vscode.Webview) {
    // 处理自定义逻辑
    const result = await this.performAction(data);

    webview.postMessage({
      command: "customActionResult",
      data: result,
    });
  }
}
```

## 🎓 设计模式

### 1. 提供者模式 (Provider Pattern)

```typescript
// Webview 提供者基类
interface WebviewProvider {
  getWebviewContent(webview: vscode.Webview): string;
}

// HTML 提供者
class SettingsViewHTMLProvider implements WebviewProvider {
  getWebviewContent(webview: vscode.Webview): string {
    // 生成 HTML
  }
}

// 消息处理器
class SettingsViewMessageHandler {
  handleMessage(message: any, webview: vscode.Webview): Promise<void> {
    // 处理消息
  }
}
```

### 2. 单例模式 (Singleton Pattern)

```typescript
// 周报面板单例
export class WeeklyReportPanel {
  public static currentPanel: WeeklyReportPanel | undefined;

  public static async createOrShow(extensionUri: vscode.Uri) {
    if (WeeklyReportPanel.currentPanel) {
      WeeklyReportPanel.currentPanel._panel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(/* ... */);
    WeeklyReportPanel.currentPanel = new WeeklyReportPanel(panel, extensionUri);
  }

  public dispose() {
    WeeklyReportPanel.currentPanel = undefined;
    // 清理资源
  }
}
```

### 3. 观察者模式 (Observer Pattern)

```typescript
// React Context 监听
const SettingsContext = createContext();

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState({});

  // 监听 VS Code 消息
  useMessageHandler((event) => {
    if (event.data.command === "settingsUpdated") {
      setSettings(event.data.settings);
    }
  });

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
```

### 4. 工厂模式 (Factory Pattern)

```typescript
// 消息处理器工厂
class MessageHandlerFactory {
  static create(viewType: string): MessageHandler {
    switch (viewType) {
      case "settings":
        return new SettingsViewMessageHandler();
      case "weeklyReport":
        return new WeeklyReportMessageHandler();
      default:
        throw new Error(`Unknown view type: ${viewType}`);
    }
  }
}
```

## 📊 性能指标

### Webview 加载性能

| 阶段 | 目标耗时 | 说明 |
|------|---------|------|
| HTML 生成 | < 10ms | 仅字符串拼接 |
| 资源加载 | < 100ms | JS/CSS 文件 |
| React 挂载 | < 50ms | 首次渲染 |
| 状态恢复 | < 30ms | Context Hydration |
| **总计** | **< 200ms** | 端到端加载 |

### 消息通信性能

| 操作 | 耗时 | 说明 |
|------|------|------|
| 单向消息 | < 5ms | postMessage |
| 请求-响应 | < 50ms | 包含处理时间 |
| 批量更新 | < 100ms | 多个设置项 |
| 索引进度 | < 20ms | 实时更新 |

### 内存使用

| 组件 | 内存占用 | 优化策略 |
|------|---------|----------|
| 消息历史 | < 5MB | LRU 限制 100 条 |
| React 实例 | < 10MB | 生产构建 |
| Webview DOM | < 5MB | 虚拟化列表 |
| **总计** | **< 20MB** | 可接受范围 |

## 🔍 故障排除

### 常见问题

#### 1. Webview 白屏

**问题**: 打开 Webview 显示空白

**解决方案**:
```typescript
// 1. 检查 HTML 生成
const html = provider.getWebviewContent(webview);
console.log("HTML:", html);

// 2. 检查资源路径
const scriptUri = webview.asWebviewUri(
  vscode.Uri.joinPath(extensionUri, "webview-ui-dist", "index.js")
);
console.log("Script URI:", scriptUri.toString());

// 3. 检查 CSP
// 确保 script-src 包含 nonce
// 确保 style-src 包含 webview.cspSource
```

#### 2. 消息不响应

**问题**: Webview 发送消息后无响应

**解决方案**:
```typescript
// 1. 检查消息监听
webviewView.webview.onDidReceiveMessage(
  async (message) => {
    console.log("Received:", message); // 调试日志
    await handler.handleMessage(message, webview);
  },
  null,
  disposables
);

// 2. 检查消息格式
// 必须包含 command 字段
postMessage("testCommand", { data: "test" });

// 3. 检查 Webview 是否已销毁
if (!webviewView.visible) {
  console.warn("Webview not visible");
}
```

#### 3. 主题不同步

**问题**: Webview 主题与 VS Code 不一致

**解决方案**:
```typescript
// 1. 检查主题监听脚本
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      applyTheme();
    }
  });
});

// 2. 确保 body class 被 VS Code 设置
// VS Code 会自动添加: vscode-dark / vscode-light / vscode-high-contrast

// 3. 手动触发初始应用
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
});
```

#### 4. React 组件不渲染

**问题**: React 应用未挂载

**解决方案**:
```typescript
// 1. 检查挂载点
<div id="root"></div>

// 2. 检查构建输出
// 确保 webview-ui-dist/index.js 存在

// 3. 检查模块类型
<script type="module" src="..."></script>

// 4. 查看控制台错误
// 在 Webview Developer Tools 中查看
```

#### 5. 状态丢失

**问题**: 切换视图后状态丢失

**解决方案**:
```typescript
// 1. 使用 retainContextWhenHidden
const panel = vscode.window.createWebviewPanel(
  viewType,
  title,
  column,
  {
    enableScripts: true,
    retainContextWhenHidden: true, // 关键
  }
);

// 2. 或使用状态持久化
// 在 Webview 中使用 localStorage
localStorage.setItem("state", JSON.stringify(state));

// 3. 或发送状态到 Extension 保存
postMessage("saveState", { state });
```

### 调试技巧

```typescript
// 1. 启用详细日志
console.log("[Webview] State:", state);
console.log("[Webview] Message:", message);

// 2. 监听所有消息
window.addEventListener("message", (e) => {
  console.log("[Webview] Received:", e.data);
});

// 3. 检查 VS Code 输出
// 查看 "Output" 面板中的 "Dish AI Commit Gen" 通道

// 4. 使用 Webview Developer Tools
// Command Palette: "Developer: Open Webview Developer Tools"

// 5. 检查资源加载
// Network 面板查看 JS/CSS 加载情况
```

## 🤝 开发指南

### 添加新视图

```typescript
// 1. 创建视图提供者 (Extension Side)
export class MyViewProvider implements vscode.WebviewViewProvider {
  async resolveWebviewView(webviewView, context, token) {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.getHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage(this.handleMessage);
  }

  private getHtml(webview: vscode.Webview): string {
    // 使用 HTML 提供者生成
  }

  private async handleMessage(message: any) {
    // 处理消息
  }
}

// 2. 注册视图 (extension.ts)
context.subscriptions.push(
  vscode.window.registerWebviewViewProvider(
    "myView.viewType",
    new MyViewProvider(context.extensionUri)
  )
);

// 3. 创建页面 (Frontend Side)
// webview-ui/src/pages/MyPage.tsx
export const MyPage: React.FC = () => {
  return <div>My View</div>;
};

// 4. 添加路由
// webview-ui/src/router/routes.ts
export const routes = {
  // ... existing
  myView: "/my-view",
};

// 5. 更新 App Router
// webview-ui/src/router/index.tsx
<Route path="/my-view" element={<MyPage />} />
```

### 添加新消息类型

```typescript
// 1. 定义消息类型 (Extension Side)
type MyMessage = {
  command: "myAction";
  data: { value: string };
};

// 2. 在处理器中添加 case
class MyMessageHandler {
  async handleMessage(message: any, webview: vscode.Webview) {
    switch (message.command) {
      case "myAction":
        await this.handleMyAction(message.data, webview);
        break;
    }
  }

  private async handleMyAction(data: any, webview: vscode.Webview) {
    const result = await this.process(data);
    webview.postMessage({
      command: "myActionResult",
      data: result,
    });
  }
}

// 3. 在 Webview 中发送
postMessage("myAction", { value: "test" });

// 4. 在 Webview 中接收
useMessageHandler((event) => {
  if (event.data.command === "myActionResult") {
    // 处理结果
  }
});
```

### 测试策略

```typescript
// Extension Side 测试
describe("SettingsViewMessageHandler", () => {
  it("should handle testConnection", async () => {
    const handler = new SettingsViewMessageHandler(/* ... */);
    const mockWebview = { postMessage: jest.fn() };

    await handler.handleMessage(
      { command: "testConnection", data: { service: "ollama", url: "http://localhost:11434", key: "" } },
      mockWebview
    );

    expect(mockWebview.postMessage).toHaveBeenCalled();
  });
});

// Frontend Side 测试
describe("CommitChatView", () => {
  it("should send message on button click", () => {
    const mockPostMessage = jest.fn();
    jest.mock("@/utils/vscode", () => ({
      postMessage: mockPostMessage,
    }));

    render(<CommitChatView />);
    fireEvent.change(screen.getByPlaceholderText("描述你的代码变更..."), {
      target: { value: "test message" },
    });
    fireEvent.click(screen.getByRole("button", { name: /发送/i }));

    expect(mockPostMessage).toHaveBeenCalledWith("commitChatMessage", {
      message: "test message",
      context: expect.any(Object),
    });
  });
});
```

## 📚 相关文档

- **主 README**: [../README.md](../README.md) - 项目总览
- **AI 模块**: [../ai/README.md](../ai/README.md) - AI 提供商
- **服务模块**: [../services/README.md](../services/README.md) - 服务层
- **配置系统**: [../config/README.md](../config/README.md) - 配置定义
- **WebView UI**: [../../webview-ui/README.md](../../webview-ui/README.md) - 前端架构

---

**最后更新**: 2024年12月
**模块版本**: v0.56.1
**代码行数**: 456+ (Extension) / 326+ (Frontend)
**组件数量**: 50+
**架构模式**: 提供者模式、单例模式、观察者模式、工厂模式
**技术栈**: React 18 + TypeScript + Tailwind CSS + Arco Design
