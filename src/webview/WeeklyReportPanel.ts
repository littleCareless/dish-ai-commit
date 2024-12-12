import * as vscode from "vscode";
import { WeeklyReportService } from "../services/weeklyReport";
import { Config } from "../types/weeklyReport";

export class WeeklyReportPanel {
  public static currentPanel: WeeklyReportPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
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

                    function displayReport(items) {
                        const reportDiv = document.getElementById('report');
                        reportDiv.innerHTML = ''; // 清空现有内容

                        const table = document.createElement('table');
                        table.className = 'table';
                        
                        // 添加表头
                        const thead = table.createTHead();
                        const headerRow = thead.insertRow();
                        ['工作内容', '工时', '工作描述'].forEach(text => {
                            const th = document.createElement('th');
                            th.textContent = text;
                            headerRow.appendChild(th);
                        });

                        // 添加数据行
                        const tbody = table.createTBody();
                        items.forEach(item => {
                            const row = tbody.insertRow();
                            ['content', 'time', 'description'].forEach(key => {
                                const cell = row.insertCell();
                                cell.textContent = item[key];
                            });
                        });

                        reportDiv.appendChild(table);
                        
                        // 添加总工时统计
                        const totalHours = items.reduce((sum, item) => 
                            sum + parseFloat(item.time.replace('h', '')), 0);
                        
                        const summary = document.createElement('p');
                        summary.textContent = \`总计工时：\$\{totalHours.toFixed(
                          1
                        )}h\`;
                        reportDiv.appendChild(summary);
                    }
                </script>
            </body>
            </html>
        `;
  }

  private async _generateReport() {
    try {
      const service = new WeeklyReportService();
      const report = await service.generate();

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
