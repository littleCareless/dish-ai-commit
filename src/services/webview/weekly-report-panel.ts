import * as vscode from "vscode";
import { getMessage } from "../../utils/i18n";
import { WeeklyReportMessageHandler } from "./handlers/weekly-report-message-handler";
import { SettingsViewHTMLProvider } from "./providers/settings-view-html-provider";

export class WeeklyReportPanel {
  public static readonly viewType = "weeklyReport.view";
  public static currentPanel: WeeklyReportPanel | undefined;

  private readonly _panel: vscode.WebviewPanel;
  private readonly _viewProvider: SettingsViewHTMLProvider;
  private readonly _messageHandler: WeeklyReportMessageHandler;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._viewProvider = new SettingsViewHTMLProvider(extensionUri);
    this._messageHandler = new WeeklyReportMessageHandler();

    this._panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(extensionUri, "webview-ui-dist"),
      ],
    };

    this._updateWebviewContent();

    this._panel.webview.onDidReceiveMessage(
      async (message: { command: string; payload: unknown }) => {
        await this._messageHandler.handleMessage(message, this._panel.webview);
      },
      null,
      this._disposables
    );

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  private async _updateWebviewContent() {
    this._panel.webview.html = await this._viewProvider.getWebviewContent(
      this._panel.webview,
      {
        viewType: "weeklyReport",
        initialRoute: "/weekly-report",
        language: vscode.env.language,
      }
    );
  }

  public static async createOrShow(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (WeeklyReportPanel.currentPanel) {
      WeeklyReportPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      WeeklyReportPanel.viewType,
      getMessage("weeklyReport.title"),
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "..", "webview-ui-dist"),
        ],
      }
    );

    WeeklyReportPanel.currentPanel = new WeeklyReportPanel(panel, extensionUri);
  }

  public dispose() {
    WeeklyReportPanel.currentPanel = undefined;
    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
