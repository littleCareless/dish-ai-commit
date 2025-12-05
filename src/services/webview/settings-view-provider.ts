import * as vscode from "vscode";
import { EmbeddingService } from "@/core/indexing/embedding-service";
import { IndexingSettingsManager } from "@/services/settings/indexing-settings-manager";
import { SettingsViewMessageHandler } from "@/services/webview/handlers/settings-view-message-handler";
import { SettingsViewHTMLProvider } from "@/services/webview/providers/settings-view-html-provider";
import { getWorkspacePath } from "@/core/utils/path";
import { createHash } from "crypto";

export class SettingsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "dish-ai-commit.settingsView"; // 必须与 package.json 中的 id 匹配

  private _view?: vscode.WebviewView;
  private readonly _extensionUri: vscode.Uri;
  private readonly _htmlContentProvider: SettingsViewHTMLProvider;
  private readonly _messageHandler: SettingsViewMessageHandler;
  private _disposables: vscode.Disposable[] = [];

  constructor(
    extensionUri: vscode.Uri,
    extensionId: string,
    private readonly _extensionContext: vscode.ExtensionContext,
    embeddingService: EmbeddingService | null
  ) {
    this._extensionUri = extensionUri;
    this._htmlContentProvider = new SettingsViewHTMLProvider(
      this._extensionUri
    );
    this._messageHandler = new SettingsViewMessageHandler(
      extensionId,
      embeddingService,
      this._extensionContext
    );
  }

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "dist", "webview-ui-dist"),
      ],
    };

    // 从 IndexingSettingsManager 获取配置
    const indexingSettings = IndexingSettingsManager.getInstance(
      this._extensionContext
    ).getSettings();
    const qdrantUrl = indexingSettings.qdrantUrl;

    // Generate collection name from workspace path
    const workspacePath = getWorkspacePath();
    const hash = createHash("sha256").update(workspacePath).digest("hex");
    const qdrantCollectionName = `dish-${hash.substring(0, 16)}`;

    webviewView.webview.html =
      await this._htmlContentProvider.getWebviewContent(webviewView.webview, {
        viewType: "settingsPage",
        initialRoute: "/settings",
        qdrantUrl,
        qdrantCollectionName,
        language: vscode.env.language,
      });

    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        await this._messageHandler.handleMessage(message, webviewView.webview);
      },
      null,
      this._disposables
    );
  }
}
