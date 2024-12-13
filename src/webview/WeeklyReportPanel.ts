import * as vscode from "vscode";
import { exec } from "child_process";
import { WeeklyReportService } from "../services/weeklyReport";
import { Config } from "../types/weeklyReport";
import { AIProviderFactory } from "../ai/AIProviderFactory";
import { ProgressHandler } from "../utils/ProgressHandler";
import { NotificationHandler } from "../utils/NotificationHandler";
import { LocalizationManager } from "../utils/LocalizationManager";
import { ConfigurationManager } from "../config/ConfigurationManager";
import { ModelPickerService } from "../services/ModelPickerService";

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

  public static async createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (WeeklyReportPanel.currentPanel) {
      WeeklyReportPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "weeklyReport",
      await LocalizationManager.getInstance().getMessage("weeklyReport.title"),
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
      }
    );

    WeeklyReportPanel.currentPanel = new WeeklyReportPanel(panel);
  }

  private _getWebviewContent() {
    const l10n = LocalizationManager.getInstance();
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${l10n.getMessage("weeklyReport.title")}</title>
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
            <h1>${l10n.getMessage("weeklyReport.title")}</h1>
            <div id="app">
                <div class="form-group">
                    <select id="period">
                        <option value="1 week ago">${l10n.getMessage(
                          "weeklyReport.period.current"
                        )}</option>
                        <option value="2 weeks ago">${l10n.getMessage(
                          "weeklyReport.period.lastWeek"
                        )}</option>
                        <option value="3 weeks ago">${l10n.getMessage(
                          "weeklyReport.period.twoWeeksAgo"
                        )}</option>
                    </select>
                    <button onclick="generateReport()">${l10n.getMessage(
                      "weeklyReport.generate.button"
                    )}</button>
                </div>
                <div class="editor-container">
                    <div class="toolbar">
                        <button onclick="execCommand('bold')">${l10n.getMessage(
                          "editor.format.bold"
                        )}</button>
                        <button onclick="execCommand('italic')">${l10n.getMessage(
                          "editor.format.italic"
                        )}</button>
                        <button onclick="execCommand('underline')">${l10n.getMessage(
                          "editor.format.underline"
                        )}</button>
                        <button onclick="execCommand('insertOrderedList')">${l10n.getMessage(
                          "editor.format.orderedList"
                        )}</button>
                        <button onclick="execCommand('insertUnorderedList')">${l10n.getMessage(
                          "editor.format.unorderedList"
                        )}</button>
                        <button onclick="copyContent()">${l10n.getMessage(
                          "editor.copy"
                        )}</button>
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

              // 获取配置并确保选择了模型
              const { aiProvider, selectedModel } =
                await this.getModelAndUpdateConfiguration();

              // 使用选定的模型生成周报
              const response = await aiProvider.generateWeeklyReport(
                workItems.map((item) => item.content),
                selectedModel // 传入选定的模型
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

  // 封装选择模型并更新配置的函数
  private async selectAndUpdateModelConfiguration(
    provider = "Ollama",
    model = "Ollama"
  ) {
    const modelSelection = await ModelPickerService.showModelPicker(
      provider,
      model
    );
    if (!modelSelection) {
      return;
    }

    const config = ConfigurationManager.getInstance();
    await config.updateAIConfiguration(
      modelSelection.provider,
      modelSelection.model
    );

    return { provider: modelSelection.provider, model: modelSelection.model };
  }

  private async getModelAndUpdateConfiguration(
    provider = "Ollama",
    model = "Ollama"
  ) {
    const locManager = LocalizationManager.getInstance();
    let aiProvider = AIProviderFactory.getProvider(provider);
    let models = await aiProvider.getModels();

    if (!models || models.length === 0) {
      const result = await this.selectAndUpdateModelConfiguration(
        provider,
        model
      );
      if (!result) {
        throw new Error(locManager.getMessage("model.selection.cancelled"));
      }
      provider = result.provider;
      model = result.model;

      aiProvider = AIProviderFactory.getProvider(provider);
      models = await aiProvider.getModels();

      if (!models || models.length === 0) {
        throw new Error(locManager.getMessage("model.list.empty"));
      }
    }

    let selectedModel = models.find((m) => m.name === model);
    if (!selectedModel) {
      const result = await this.selectAndUpdateModelConfiguration(
        provider,
        model
      );
      if (!result) {
        throw new Error(locManager.getMessage("model.selection.cancelled"));
      }
      provider = result.provider;
      model = result.model;

      aiProvider = AIProviderFactory.getProvider(provider);
      models = await aiProvider.getModels();
      selectedModel = models.find((m) => m.name === model);

      if (!selectedModel) {
        throw new Error(locManager.getMessage("model.notFound"));
      }
    }

    return { aiProvider, selectedModel };
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
