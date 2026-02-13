# Webview 模块

## 职责划分

### src/webview/

**职责：VS Code Webview API 层**

- WebviewView/WebviewPanel 的创建与配置
- VS Code Extension 上下文管理
- Webview 生命周期管理
- 作为 Extension 的入口点
- 路由消息到服务层

**核心文件：**

- `settings-view-provider.ts` - 设置视图提供者
- `weekly-report-panel.ts` - 周报面板
- `index.ts` - 导出接口

### src/services/webview/

**职责：Webview 业务逻辑层**

- 消息处理与业务逻辑
- 状态管理
- 数据转换与验证
- 与其他服务层交互

**核心目录：**

- `handlers/` - 消息处理器
- `providers/` - HTML 内容提供者
- `services/` - 业务服务
- `core/` - 核心管理器
- `config/` - 配置管理

## 依赖关系

```
Extension (extension.ts)
    ↓
src/webview/ (API 层)
    ↓
src/services/webview/ (业务层)
    ↓
其他服务层 (ai, core, config, etc.)
```

## 使用示例

### 1. 创建新的 Webview 视图

```typescript
// src/webview/my-view-provider.ts
export class MyViewProvider implements vscode.WebviewViewProvider {
  private readonly _messageHandler: MyMessageHandler;
  private readonly _htmlProvider: MyHTMLProvider;

  constructor(/* ... */) {
    this._messageHandler = new MyMessageHandler(/* ... */);
    this._htmlProvider = new MyHTMLProvider(/* ... */);
  }

  resolveWebviewView(webviewView, context, token) {
    webviewView.webview.html = this._htmlProvider.getWebviewContent(
      webviewView.webview,
    );
    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        await this._messageHandler.handleMessage(message, webviewView.webview);
      },
      null,
      this._disposables,
    );
  }
}
```

### 2. 创建新的消息处理器

```typescript
// src/services/webview/handlers/my-message-handler.ts
export class MyMessageHandler {
  constructor(private _extensionContext: vscode.ExtensionContext) {}

  async handleMessage(message: any, webview: vscode.Webview) {
    switch (message.command) {
      case "myAction":
        await this.handleMyAction(message.data, webview);
        break;
    }
  }

  private async handleMyAction(data: any, webview: vscode.Webview) {
    // 业务逻辑
    const result = await this.processData(data);

    // 响应 Webview
    webview.postMessage({
      command: "myActionResult",
      data: result,
    });
  }
}
```
