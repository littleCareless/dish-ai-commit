import * as vscode from "vscode";
import * as path from "path";
import { WeeklyReportService } from "../services/weeklyReport";
import { AIProviderFactory } from "../ai/AIProviderFactory";
import { ProgressHandler } from "../utils/ProgressHandler";
import { NotificationHandler } from "../utils/NotificationHandler";
import { LocalizationManager } from "../utils/LocalizationManager";
import { ConfigurationManager } from "../config/ConfigurationManager";
import { ModelPickerService } from "../services/ModelPickerService";

export class WeeklyReportPanel {
  public static readonly viewType = "weeklyReport.view";
  public static currentPanel: WeeklyReportPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;

    // 设置 WebView 内容
    this._panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(extensionUri, "src", "webview-ui", "dist"),
      ],
    };

    // 设置 HTML 内容
    this._panel.webview.html = this._getHtmlForWebview(
      this._panel.webview,
      extensionUri
    );

    // 处理消息
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        console.log("Received message from webview:", message);
        console.log("Message command:", message.command);
        console.log("Message data:", message.data);
        await this.handleMessages(message);
      },
      null,
      this._disposables
    );

    // 处理面板关闭
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
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
      await LocalizationManager.getInstance().getMessage("weeklyReport.title"),
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "src", "webview-ui", "dist"),
        ],
      }
    );

    WeeklyReportPanel.currentPanel = new WeeklyReportPanel(panel, extensionUri);
  }

  private _getHtmlForWebview(
    webview: vscode.Webview,
    extensionUri: vscode.Uri
  ) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "src", "webview-ui", "dist", "index.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        extensionUri,
        "src",
        "webview-ui",
        "dist",
        "index.css"
      )
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
          <script>
                        const vscode = acquireVsCodeApi();
                        console.log('vscode', vscode);
                        window.onload = function() {
                            vscode.postMessage({ command: 'get-data' });
                            console.log('Ready to accept data.');
                        };
                    </script>
          <script nonce="${nonce}" src="${scriptUri}"></script>
                             
        </body>
      </html>
    `;
  }

  private getNonce() {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private formatPeriod(period: string): string {
    const now = new Date();
    const weeks = parseInt(period);
    const pastDate = new Date(now.setDate(now.getDate() - weeks * 7));

    const formatDate = (date: Date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy} ${mm} ${dd}`;
    };

    const endDate = formatDate(new Date());
    const startDate = formatDate(pastDate);
    return `${startDate} - ${endDate}`;
  }

  private async handleMessages(message: any) {
    switch (message.command) {
      case "generate":
        try {
          // 使用 withProgress 方法，但通过 resolve 来提前结束进度提示
          await new Promise<void>(async (resolve, reject) => {
            await ProgressHandler.withProgress(
              await LocalizationManager.getInstance().getMessage(
                "weeklyReport.generating"
              ),
              async (progress) => {
                try {
                  const service = new WeeklyReportService();
                  await service.initialize();
                  console.log("service initialized", message);
                  const workItems = await service.generate(message.data.period);
                  const author = await service.getCurrentAuthor(); // 新增：获取当前提交人

                  const { aiProvider, selectedModel } =
                    await this.getModelAndUpdateConfiguration();
                  console.log("aiProvider", aiProvider);

                  console.log("selectedModel", selectedModel);
                  const response = await aiProvider.generateWeeklyReport(
                    workItems.map((item) => item.content),
                    selectedModel
                  );
                  console.log("response", response.content);
                  if (response?.content) {
                    // 更新 UI 并提前结束进度条
                    this._panel.webview.postMessage({
                      command: "report",
                      data: response.content,
                    });
                    resolve(); // 提前结束进度提示
                    const formattedPeriod = this.formatPeriod(
                      message.period.split(" ")[0]
                    );
                    NotificationHandler.info(
                      "weeklyReport.generation.success",
                      undefined,
                      formattedPeriod,
                      author
                    );
                    progress.report({ message: "Done", increment: 100 });
                  } else {
                    reject(
                      new Error(
                        LocalizationManager.getInstance().getMessage(
                          "weeklyReport.empty.response"
                        )
                      )
                    );
                  }
                } catch (error) {
                  reject(error);
                }
              }
            );
          });
        } catch (error) {
          NotificationHandler.error(
            "weeklyReport.generation.failed",
            3000,
            error
          );
        }
        break;

      case "notification":
        if (message.text) {
          NotificationHandler.info(message.text, ...(message.args || []));
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

  private async getModelAndUpdateConfiguration() {
    const locManager = LocalizationManager.getInstance();
    const config = ConfigurationManager.getInstance();
    const configuration = config.getConfiguration();

    // 从用户配置中获取当前的 provider 和 model
    let provider = configuration.base.provider;
    let model = configuration.base.model;

    let aiProvider = AIProviderFactory.getProvider(provider);
    let models = await aiProvider.getModels();

    // 当前模型列表不为空，且配置的模型存在时，直接使用
    if (models && models.length > 0) {
      const selectedModel = models.find((m) => m.name === model);
      if (selectedModel) {
        return { aiProvider, selectedModel };
      }
    }

    // 只有当模型不可用时，才触发选择流程
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

    const selectedModel = models.find((m) => m.name === model);
    if (!selectedModel) {
      throw new Error(locManager.getMessage("model.notFound"));
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
