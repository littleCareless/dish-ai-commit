import * as vscode from "vscode";
import { WORKSPACE_CONFIG_PATHS } from "../../config/workspace-config-schema";
import { EmbeddingService } from "../../core/indexing/embedding-service";
import { stateManager } from "../../utils/state/state-manager";
import { SettingsViewMessageHandler } from "./handlers/settings-view-message-handler";
import { SettingsViewHTMLProvider } from "./providers/settings-view-html-provider";

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
        vscode.Uri.joinPath(this._extensionUri, "..", "webview-ui-dist"),
      ],
    };

    const qdrantUrl = stateManager.getWorkspace<string>(
      WORKSPACE_CONFIG_PATHS.experimental.codeIndex.qdrantUrl
    );
    const qdrantCollectionName = stateManager.getWorkspace<string>(
      WORKSPACE_CONFIG_PATHS.experimental.codeIndex.qdrantCollectionName
    );

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
