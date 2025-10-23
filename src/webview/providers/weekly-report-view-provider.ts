import * as vscode from "vscode";

export class WeeklyReportViewProvider {
  constructor(private readonly extensionUri: vscode.Uri) {}

  public getWebviewContent(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "webview-ui-dist", "index.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "webview-ui-dist", "index.css")
    );

    const nonce = this.getNonce();

    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; 
            img-src ${webview.cspSource} https: data:;
            script-src ${webview.cspSource} 'nonce-${nonce}';
            style-src ${webview.cspSource} 'unsafe-inline';
            font-src ${webview.cspSource} data:;">
          <link href="${styleUri}" rel="stylesheet">
          <title>Weekly Report</title>
        </head>
        <body>
          <div id="root"></div>
          <script nonce="${nonce}">
            window.initialData = { viewType: 'weeklyReportPage' };
          </script>
          <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }

  private getNonce(): string {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
