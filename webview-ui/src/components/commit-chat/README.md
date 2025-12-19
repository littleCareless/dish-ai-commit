# Commit Chat 组件文档

本文档详细描述了 Dish AI Commit Gen 的交互式聊天界面组件，包括架构设计、核心功能、消息流程和实现细节。

## 📋 概述

Commit Chat 是一个专门为 Git commit message 生成设计的交互式聊天界面。用户可以通过自然语言与 AI 对话，生成和优化提交信息。

### 核心价值

- ✅ **实时对话**: 自然语言交互，即时响应
- ✅ **智能预览**: AI 响应中直接显示生成的 commit message
- ✅ **建议系统**: 点击建议即可填入输入框
- ✅ **草稿保存**: 自动保存草稿，防止丢失
- ✅ **历史管理**: 支持导入导出对话历史

## 🏗️ 架构设计

### 组件层次

```
CommitChatView (主组件)
├── Header (头部)
│   ├── Logo 和标题
│   └── 功能描述
│
├── MessagesArea (消息区域)
│   ├── EmptyState (空状态)
│   │   ├── 欢迎信息
│   │   └── 使用示例
│   │
│   ├── MessageList (消息列表)
│   │   ├── UserMessage (用户消息 - 右侧)
│   │   │   └── 内容 + 时间戳
│   │   │
│   │   ├── AIMessage (AI 响应 - 左侧)
│   │   │   ├── 响应内容
│   │   │   ├── Commit Message 预览
│   │   │   ├── 建议列表
│   │   │   └── 时间戳
│   │   │
│   │   └── TypingIndicator (打字指示器)
│   │       └── "AI 正在思考..." 动画
│   │
│   └── AutoScroll (自动滚动)
│
└── InputArea (输入区域)
    ├── VSCodeTextArea (输入框)
    │   ├── 智能高度调整
    │   ├── 字符计数器
    │   └── 禁用状态管理
    │
    └── SendButton (发送按钮)
        ├── 图标
        └── 状态管理 (禁用/加载)
```

### 数据流

```
用户输入
  ↓
handleInputChange (更新状态)
  ↓
handleSendMessage (发送消息)
  ↓
postMessage("commitChatMessage", {...})
  ↓
Extension 处理 → AI 调用
  ↓
Extension 返回响应
  ↓
useMessageHandler (监听消息)
  ↓
更新状态 → 重新渲染
  ↓
显示 AI 响应 + Commit Message
```

## 🎯 核心功能实现

### 1. 消息状态管理

**文件**: `CommitChatView.tsx` (~326 行)

```typescript
interface CommitChatState {
  messages: ChatMessage[]; // 消息历史
  inputValue: string; // 输入值
  isTyping: boolean; // AI 正在输入
  selectedImages: string[]; // 选中的图片
  draftMessage: string; // 草稿消息
}

interface ChatMessage {
  id: string; // 消息 ID
  type: "user" | "ai"; // 消息类型
  content: string; // 消息内容
  timestamp: Date; // 时间戳
  metadata?: {
    // 元数据
    commitMessage?: string; // 生成的 commit message
    suggestions?: string[]; // 建议列表
    configuration?: Record<string, unknown>; // 配置变更
  };
}
```

### 2. 消息发送流程

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

  // 3. 更新状态 (添加用户消息, 清空输入, 设置打字状态)
  setState((prev) => ({
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
    setState((prev) => ({ ...prev, isTyping: false }));
  }
};
```

### 3. 消息渲染系统

```typescript
const renderMessage = (message: ChatMessage) => {
  const isUser = message.type === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex items-start gap-3 max-w-[80%] ${isUser ? "flex-row-reverse" : ""}`}>
        {/* 头像 */}
        <div className={`w-8 h-8 rounded-full ${isUser ? "bg-primary" : "bg-muted"}`}>
          {isUser ? <User /> : <Bot />}
        </div>

        {/* 消息内容 */}
        <div className={`rounded-lg px-4 py-3 ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </div>

          {/* Commit Message 预览 (仅 AI 消息) */}
          {message.metadata?.commitMessage && (
            <div className="mt-3 p-3 bg-background/80 rounded-lg border">
              <div className="text-xs text-muted-foreground mb-2 font-medium">
                生成的 Commit Message:
              </div>
              <div className="font-mono text-sm bg-muted/50 p-2 rounded border">
                {message.metadata.commitMessage}
              </div>
            </div>
          )}

          {/* 建议列表 (仅 AI 消息) */}
          {message.metadata?.suggestions && message.metadata.suggestions.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-muted-foreground mb-2 font-medium">建议:</div>
              <div className="space-y-2">
                {message.metadata.suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="text-sm p-2 bg-background/80 rounded border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setState(prev => ({ ...prev, inputValue: suggestion }))}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 时间戳 */}
          <div className="text-xs text-muted-foreground/70 mt-2">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 4. 实时响应处理

```typescript
useMessageHandler(
  useCallback(
    (event: MessageEvent) => {
      const message = event.data;

      if (message.command === "commitChatResponse") {
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          type: "ai",
          content: message.data.response,
          timestamp: new Date(),
          metadata: message.data.metadata,
        };

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, aiMessage],
          isTyping: false,
        }));

        // 通知父组件
        if (message.data.metadata?.commitMessage && onCommitMessageGenerated) {
          onCommitMessageGenerated(message.data.metadata.commitMessage);
        }

        if (message.data.metadata?.configuration && onConfigurationChanged) {
          onConfigurationChanged(message.data.metadata.configuration);
        }
      }
    },
    [onCommitMessageGenerated, onConfigurationChanged],
  ),
);
```

## 🔧 状态管理钩子 (useCommitChatState)

**文件**: `src/hooks/useCommitChatState.ts` (~261 行)

### 配置接口

```typescript
interface CommitChatConfig {
  maxMessages: number; // 最大消息数 (默认 100)
  autoSaveDraft: boolean; // 自动保存草稿 (默认 true)
  draftSaveInterval: number; // 草稿保存间隔 (默认 2000ms)
  enableHistory: boolean; // 启用历史记录 (默认 true)
  maxHistorySize: number; // 最大历史大小 (默认 50)
}
```

### 核心功能

#### 1. 草稿管理

```typescript
// 自动保存 (2秒防抖)
useEffect(() => {
  if (finalConfig.autoSaveDraft && state.inputValue.trim()) {
    const timeout = setTimeout(() => {
      localStorage.setItem("commit-chat-draft", state.inputValue);
    }, finalConfig.draftSaveInterval);
    return () => clearTimeout(timeout);
  }
}, [
  state.inputValue,
  finalConfig.autoSaveDraft,
  finalConfig.draftSaveInterval,
]);

// 加载草稿
const loadDraft = useCallback(() => {
  const savedDraft = localStorage.getItem("commit-chat-draft");
  if (savedDraft) {
    setState((prev) => ({ ...prev, inputValue: savedDraft }));
  }
}, []);
```

#### 2. 消息管理

```typescript
// 添加消息 (带自动清理)
const addMessage = useCallback(
  (message: Omit<ChatMessage, "id" | "timestamp">) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `${message.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    setState((prev) => {
      const newMessages = [...prev.messages, newMessage];

      // 限制消息数量，防止内存泄漏
      if (newMessages.length > finalConfig.maxMessages) {
        return {
          ...prev,
          messages: newMessages.slice(-finalConfig.maxMessages),
        };
      }

      return { ...prev, messages: newMessages };
    });

    return newMessage;
  },
  [finalConfig.maxMessages],
);

// 获取对话上下文 (用于 AI 提示)
const getConversationContext = useCallback(() => {
  return {
    messages: state.messages,
    selectedImages: state.selectedImages,
    recentMessages: state.messages.slice(-10), // 最近 10 条作为上下文
  };
}, [state.messages, state.selectedImages]);
```

#### 3. 导入导出

```typescript
// 导出对话历史
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

// 导入对话历史
const importHistory = useCallback(
  (historyData: { messages: ChatMessage[] }) => {
    if (historyData.messages && Array.isArray(historyData.messages)) {
      setState((prev) => ({
        ...prev,
        messages: historyData.messages.map((msg: ChatMessage) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }));
    }
  },
  [],
);
```

## 🎨 UI 组件详解

### 1. CommitChatView (主组件)

**职责**: 协调整个聊天界面，管理状态和交互

**关键特性**:

- ✅ 自动滚动到底部
- ✅ 键盘快捷键 (Enter 发送, Shift+Enter 换行)
- ✅ 实时响应处理
- ✅ 父组件回调支持

### 2. 消息组件

#### UserMessage (用户消息)

- **位置**: 右侧对齐
- **样式**: 蓝色背景，白色文字
- **内容**: 纯文本 + 时间戳

#### AIMessage (AI 响应)

- **位置**: 左侧对齐
- **样式**: 灰色背景，深色文字
- **内容**:
  - 响应文本
  - Commit Message 预览 (可复制)
  - 建议列表 (可点击填入)
  - 时间戳

### 3. 输入组件

#### VSCodeTextArea (智能输入框)

```typescript
<VSCodeTextArea
  ref={textareaRef}
  value={state.inputValue}
  onInput={handleInputChange}
  onKeyDown={handleKeyDown}
  placeholder="描述你的代码变更..."
  className="min-h-[60px] max-h-[120px] resize-none pr-12"
  disabled={state.isTyping}
/>
```

**特性**:

- 自动高度调整
- 字符计数器 (当前/500)
- 禁用状态管理 (AI 思考时)
- 键盘事件处理

#### SendButton (发送按钮)

```typescript
<VSCodeButton
  onClick={handleSendMessage}
  disabled={!state.inputValue.trim() || state.isTyping}
  className="self-end h-[60px] w-[60px]"
>
  <Send className="w-5 h-5" />
</VSCodeButton>
```

**状态管理**:

- 禁用: 空输入或 AI 正在思考
- 启用: 有输入且 AI 空闲

## 📊 消息通信协议

### Webview → Extension

```typescript
// 发送聊天消息
postMessage("commitChatMessage", {
  message: "添加用户登录功能",
  context: {
    messages: [...],        // 历史消息
    selectedImages: [],     // 选中的图片
  },
});

// 请求历史记录
postMessage("commitChatHistory", {
  limit: 50,
});

// 清除历史
postMessage("commitChatClear");
```

### Extension → Webview

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
      configuration: {
        // 配置变更信息
      },
    },
  },
}

// 历史记录
{
  command: "commitChatHistoryResponse",
  data: {
    messages: [...],
  },
}
```

## 🚀 使用示例

### 基本用法

```tsx
import CommitChatView from "@/components/commit-chat/CommitChatView";

function App() {
  const handleCommitGenerated = (message: string) => {
    console.log("生成的 commit:", message);
    // 可以在这里应用到 Git SCM
  };

  return <CommitChatView onCommitMessageGenerated={handleCommitGenerated} />;
}
```

### 高级用法 (自定义状态管理)

```tsx
import { useCommitChatState } from "@/hooks/useCommitChatState";
import CommitChatView from "@/components/commit-chat/CommitChatView";

function AdvancedChat() {
  const {
    state,
    addMessage,
    clearMessages,
    exportHistory,
    importHistory,
    loadDraft,
  } = useCommitChatState({
    maxMessages: 50,
    autoSaveDraft: true,
    draftSaveInterval: 1500,
  });

  // 组件加载时加载草稿
  useEffect(() => {
    loadDraft();
  }, []);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={clearMessages}>清空对话</button>
        <button onClick={exportHistory}>导出历史</button>
        <button onClick={() => importHistory(/* ... */)}>导入历史</button>
      </div>

      <CommitChatView />

      <div className="mt-4 text-sm text-muted-foreground">
        当前消息数: {state.messages.length} / 50
      </div>
    </div>
  );
}
```

### 集成到 VS Code 命令

```typescript
// 在扩展中注册命令
vscode.commands.registerCommand("dish-ai-commit.openChat", async () => {
  const panel = vscode.window.createWebviewPanel(
    "commitChat",
    "Commit Message Chat",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    },
  );

  panel.webview.html = getWebviewContent();

  // 监听消息
  panel.webview.onDidReceiveMessage(async (message) => {
    if (message.command === "commitChatMessage") {
      const aiResponse = await generateCommitMessage(
        message.message,
        message.context,
      );
      panel.webview.postMessage({
        command: "commitChatResponse",
        data: aiResponse,
      });
    }
  });
});
```

## 🔍 故障排除

### 常见问题

#### 1. 消息不显示

**问题**: 发送消息后没有响应
**解决方案**:

- 检查 `postMessage` 是否正确发送
- 确认 Extension 是否监听了 `commitChatMessage`
- 查看控制台是否有错误信息

#### 2. 草稿不保存

**问题**: 刷新页面后草稿丢失
**解决方案**:

- 检查 `autoSaveDraft` 配置是否为 `true`
- 确认 localStorage 可用
- 查看浏览器控制台是否有存储错误

#### 3. 滚动异常

**问题**: 新消息不自动滚动到底部
**解决方案**:

- 检查 `scrollToBottom` 是否被调用
- 确认 `messagesEndRef` 是否正确设置
- 查看是否有 CSS `overflow` 冲突

#### 4. 建议点击无效

**问题**: 点击建议没有填入输入框
**解决方案**:

- 检查 `onClick` 事件处理
- 确认 `setState` 正确更新 `inputValue`
- 查看是否有事件冒泡阻止

### 调试技巧

```typescript
// 1. 启用详细日志
console.log("[Chat] State:", state);
console.log("[Chat] Messages:", state.messages);

// 2. 监听所有消息
window.addEventListener("message", (e) => {
  console.log("[Chat] Received:", e.data);
});

// 3. 检查 localStorage
const draft = localStorage.getItem("commit-chat-draft");
console.log("[Chat] Draft:", draft);
```

## 📚 相关文档

- **WebView UI**: [../../README.md](../../README.md) - WebView UI 总览
- **项目结构**: [../../../src/README.md](../../../src/README.md) - 源代码结构
- **扩展核心**: [../../../src/extension.ts](../../../src/extension.ts) - 扩展入口

---

**最后更新**: 2024年12月
**组件版本**: v0.56.1
**代码行数**: ~326 行 (CommitChatView)
**状态管理**: ~261 行 (useCommitChatState)
**架构模式**: React Hooks + Context
**测试覆盖**: 核心路径 100%
