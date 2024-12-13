import * as vscode from "vscode";
import { exec } from "child_process";
import { WeeklyReportService } from "../services/weeklyReport";
import { Config } from "../types/weeklyReport";
import { AIProviderFactory } from "../ai/AIProviderFactory";
import { ProgressHandler } from "../utils/ProgressHandler";
import { NotificationHandler } from "../utils/NotificationHandler";
import { LocalizationManager } from "../utils/LocalizationManager";

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
        await this.handleMessages(message);
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
                select, button { padding: 8px; margin: 5px; }
                .editor-container { 
                    margin-top: 20px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
                .editor {
                    width: 100%;
                    min-height: 400px;
                    padding: 15px;
                    outline: none;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    font-size: 14px;
                    line-height: 1.6;
                    white-space: pre-wrap;
                }
                .toolbar {
                    padding: 8px;
                    border-bottom: 1px solid #ddd;
                    background: #f5f5f5;
                }
                .toolbar button {
                    margin: 0 4px;
                    padding: 4px 8px;
                    background: #fff;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .toolbar button:hover {
                    background: #e9e9e9;
                }
            </style>
        </head>
        <body>
            <h1>周报生成器</h1>
            <div id="app">
                <div class="form-group">
                    <select id="period">
                        <option value="1 week ago">本周</option>
                        <option value="2 weeks ago">上一周</option>
                        <option value="3 weeks ago">上两周</option>
                    </select>
                    <button onclick="generateReport()">生成周报</button>
                </div>
                <div class="editor-container">
                    <div class="toolbar">
                        <button onclick="execCommand('bold')">粗体</button>
                        <button onclick="execCommand('italic')">斜体</button>
                        <button onclick="execCommand('underline')">下划线</button>
                        <button onclick="execCommand('insertOrderedList')">有序列表</button>
                        <button onclick="execCommand('insertUnorderedList')">无序列表</button>
                        <button onclick="copyContent()">复制内容</button>
                    </div>
                    <div id="editor" class="editor" contenteditable="true"></div>
                </div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                
                function execCommand(command) {
                    document.execCommand(command, false, null);
                }

                function copyContent() {
                    const editor = document.getElementById('editor');
                    navigator.clipboard.writeText(editor.textContent)
                        .then(() => {
                            vscode.postMessage({ 
                                command: 'notification',
                                text: 'weeklyReport.copy.success'
                            });
                        })
                        .catch(err => {
                            vscode.postMessage({ 
                                command: 'notification',
                                text: 'weeklyReport.copy.failed',
                                args: [err?.message || err]
                            });
                        });
                }
                
                async function generateReport() {
                    const period = document.getElementById('period').value;
                    vscode.postMessage({ 
                        command: 'generate',
                        period: period
                    });
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
                    const editor = document.getElementById('editor');
                    editor.innerHTML = reportContent.replace(/\\n/g, '<br>');
                    editor.focus();
                }
            </script>
        </body>
        </html>
    `;
  }

  private async handleMessages(message: any) {
    switch (message.command) {
      case "generate":
        try {
          await ProgressHandler.withProgress(
            await LocalizationManager.getInstance().getMessage(
              "weeklyReport.generating"
            ),
            async () => {
              const service = new WeeklyReportService();
              await service.initialize();
              const workItems = await service.generate(message.period);

              const aiProvider = AIProviderFactory.getProvider("ZHIPUAI");
              const response = await aiProvider.generateWeeklyReport(
                workItems.map((item) => item.content)
              );

              if (response?.content) {
                this._panel.webview.postMessage({
                  command: "report",
                  data: response.content,
                });
                await NotificationHandler.info(
                  "weeklyReport.generation.success"
                );
              } else {
                await NotificationHandler.error("weeklyReport.empty.response");
              }
            }
          );
        } catch (error) {
          await NotificationHandler.error(
            "weeklyReport.generation.failed",
            error
          );
        }
        break;
      case "notification":
        if (message.text) {
          await NotificationHandler.info(message.text, ...(message.args || []));
        }
        break;
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
