import * as vscode from "vscode";
import { exec } from "child_process";
import { WeeklyReportService } from "../services/weeklyReport";
import { Config } from "../types/weeklyReport";

export class WeeklyReportPanel {
  public static currentPanel: WeeklyReportPanel | undefined;
  readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel) {
    this._panel = panel;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = this._getWebviewContent();

    // 添加消息处理
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "generate":
            await this._generateReport();
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (WeeklyReportPanel.currentPanel) {
      WeeklyReportPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "weeklyReport",
      "周报生成器",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
      }
    );

    WeeklyReportPanel.currentPanel = new WeeklyReportPanel(panel);
  }

  private _getWebviewContent() {
    return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>周报生成器</title>
                <style>
                    body { padding: 15px; }
                    .form-group { margin-bottom: 15px; }
                    .table { width: 100%; border-collapse: collapse; }
                    .table td, .table th { border: 1px solid #ddd; padding: 8px; }
                </style>
            </head>
            <body>
                <h1>周报生成器</h1>
                <div id="app">
                    <div class="form-group">
                        <button onclick="generateReport()">生成周报</button>
                    </div>
                    <div id="report"></div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    async function generateReport() {
                        vscode.postMessage({ command: 'generate' });
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.command) {
                            case 'report':
                                displayReport(message.data);
                                break;
                        }
                    });

                    function displayReport(reportContent) {
                        const reportDiv = document.getElementById('report');
                        reportDiv.innerHTML = ''; // 清空现有内容

                        const pre = document.createElement('pre');
                        pre.textContent = reportContent;
                        reportDiv.appendChild(pre);
                    }
                </script>
            </body>
            </html>
        `;
  }

  private async _getCommitHistory(period: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return reject("没有打开的工作区");
      }

      const command = `git log --since="${period}" --pretty=format:"%h - %an, %ar : %s"`;
      exec(
        command,
        { cwd: workspaceFolders[0].uri.fsPath },
        (error, stdout, stderr) => {
          if (error) {
            reject(`获取commit历史记录失败: ${stderr}`);
          } else {
            resolve(stdout.split("\n"));
          }
        }
      );
    });
  }

  private async _generateReport() {
    try {
      const period = "1 week ago"; // 可以根据需要修改为其他时间段
      const commits = await this._getCommitHistory(period);

      // 输出获取到的 commit 到右下角
      vscode.window.showInformationMessage(
        `获取到的commit: ${commits.join("\n")}`
      );

      const service = new WeeklyReportService();
      const report = await service.generate(commits);

      this._panel.webview.postMessage({
        command: "report",
        data: report,
      });
    } catch (error) {
      vscode.window.showErrorMessage(`生成周报失败: ${error}`);
    }
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
