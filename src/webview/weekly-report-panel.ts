import { WeeklyReportMessageHandler } from "@/services/webview/handlers/weekly-report-message-handler";
import { WeeklyReportViewProvider } from "@/services/webview/providers/weekly-report-view-provider";
import * as vscode from "vscode";
export class WeeklyReportPanel {
  public static readonly viewType = "dish-ai-commit.weeklyReportView";
  public static currentPanel: WeeklyReportPanel | undefined;

  private _view?: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _htmlContentProvider: WeeklyReportViewProvider;
  private readonly _messageHandler: WeeklyReportMessageHandler;
  private _disposables: vscode.Disposable[] = [];

  private constructor(
    extensionUri: vscode.Uri,
    extensionContext: vscode.ExtensionContext,
  ) {
    this._extensionUri = extensionUri;
    this._htmlContentProvider = new WeeklyReportViewProvider(
      this._extensionUri,
    );
    this._messageHandler = new WeeklyReportMessageHandler(extensionContext);
  }

  private async setupWebview(panel: vscode.WebviewPanel) {
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "dist", "webview-ui-dist"),
      ],
    };

    panel.webview.html = await this._htmlContentProvider.getWebviewContent(
      panel.webview,
      {
        viewType: "weeklyReport",
        initialRoute: "/weekly-report",
        language: vscode.env.language,
        isFirstInstall: true,
      },
    );

    panel.webview.onDidReceiveMessage(
      async (message) => {
        if (message.command === "webview.handshake") {
          panel.webview.postMessage({
            command: "webview.handshake.ack",
            sessionId: message.sessionId,
            timestamp: Date.now(),
          });
          return;
        }
        await this._messageHandler.handleMessage(message, panel.webview);
      },
      null,
      this._disposables,
    );
  }

  public async resolveWebviewView(
    webviewView: vscode.WebviewPanel,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;
    await this.setupWebview(webviewView);
  }

  public static async createOrShow(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
  ): Promise<void> {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (WeeklyReportPanel.currentPanel) {
      WeeklyReportPanel.currentPanel._view?.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      WeeklyReportPanel.viewType,
      "Weekly Report",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "dist", "webview-ui-dist"),
        ],
      },
    );

    WeeklyReportPanel.currentPanel = new WeeklyReportPanel(
      extensionUri,
      context,
    );

    WeeklyReportPanel.currentPanel._view = panel as any;

    await WeeklyReportPanel.currentPanel.setupWebview(panel);

    panel.onDidDispose(
      () => {
        WeeklyReportPanel.currentPanel?.dispose();
      },
      null,
      WeeklyReportPanel.currentPanel._disposables,
    );
  }

  public dispose(): void {
    WeeklyReportPanel.currentPanel = undefined;

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
