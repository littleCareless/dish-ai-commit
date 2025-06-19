import * as vscode from "vscode";
import { EmbeddingServiceManager } from "../core/indexing/embedding-service-manager";
import { SettingsViewHTMLProvider } from "./providers/settings-view-html-provider";
import { SettingsViewMessageHandler } from "./handlers/settings-view-message-handler";

export class SettingsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "dish-ai-commit.settingsView"; // 必须与 package.json 中的 id 匹配

  private _view?: vscode.WebviewView;
  private readonly _extensionUri: vscode.Uri;
  private readonly _htmlContentProvider: SettingsViewHTMLProvider;
  private readonly _messageHandler: SettingsViewMessageHandler;
  private _disposables: vscode.Disposable[] = [];

  constructor(extensionUri: vscode.Uri, extensionId: string, private readonly _extensionContext: vscode.ExtensionContext) {
    this._extensionUri = extensionUri;
    this._htmlContentProvider = new SettingsViewHTMLProvider(
      this._extensionUri
    );

    // 使用 EmbeddingServiceManager 获取 EmbeddingService 实例
    try {
      const embeddingServiceInstance =
        EmbeddingServiceManager.getInstance().getEmbeddingService();
      this._messageHandler = new SettingsViewMessageHandler(
        extensionId,
        embeddingServiceInstance,
        this._extensionContext
      );
    } catch (error) {
      console.error(
        "[SettingsViewProvider] Error getting EmbeddingService instance:",
        error
      );
      // 如果获取实例失败，创建一个空的消息处理器
      this._messageHandler = new SettingsViewMessageHandler(extensionId, null, this._extensionContext);
    }
  }

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    console.log("resolveWebviewView...");

    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "webview-ui-dist"),
      ],
    };

    webviewView.webview.html = this._htmlContentProvider.getWebviewContent(
      webviewView.webview
    );

    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        await this._messageHandler.handleMessage(message, webviewView.webview);
      },
      null,
      this._disposables
    );
  }
}
