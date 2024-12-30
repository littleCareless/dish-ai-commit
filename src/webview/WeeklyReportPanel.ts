import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
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

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly _context: vscode.ExtensionContext,
    private readonly _extensionPath: string
  ) {
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
      "weeklyReport",
      await LocalizationManager.getInstance().getMessage("weeklyReport.title"),
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true, // 保持 webview 内容
        localResourceRoots: [
          vscode.Uri.file(
            path.join(extensionUri.fsPath, "src/webview-ui/dist")
          ),
        ],
        // 添加额外的安全策略
        enableForms: true,
        enableCommandUris: true,
      }
    );

    WeeklyReportPanel.currentPanel = new WeeklyReportPanel(
      panel,
      context,
      extensionUri.fsPath
    );
  }

  private _getWebviewContent() {
    const webviewDir = path.join(this._extensionPath, "src/webview-ui/dist");
    let html = fs.readFileSync(path.join(webviewDir, "index.html"), "utf-8");

    // 更新 CSP
    const nonce = this.getNonce();
    const csp = `
      <meta http-equiv="Content-Security-Policy" 
            content="default-src 'self' ${this._panel.webview.cspSource};
                     img-src ${this._panel.webview.cspSource} https: data:;
                     script-src ${this._panel.webview.cspSource} 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval';
                     style-src ${this._panel.webview.cspSource} 'unsafe-inline';
                     font-src ${this._panel.webview.cspSource} data:;
                     frame-src ${this._panel.webview.cspSource};">
    `;

    // 为所有脚本添加 nonce
    html = html.replace(/<script/g, `<script nonce="${nonce}"`);

    // 注入基础路径
    const baseUri = this._panel.webview
      .asWebviewUri(vscode.Uri.file(webviewDir))
      .toString();
    const baseTag = `<base href="${baseUri}/">`;
    html = html.replace("</head>", `${baseTag}${csp}</head>`);

    // 替换所有资源路径
    html = html.replace(/(src|href)="(\.?\/[^"]*)"/g, (match, attr, value) => {
      const uri = this._panel.webview.asWebviewUri(
        vscode.Uri.file(path.join(webviewDir, value.replace(/^\.?\//, "")))
      );
      return `${attr}="${uri}"`;
    });

    return html;
  }

  // 生成随机 nonce
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
                  const workItems = await service.generate(message.period);
                  const author = await service.getCurrentAuthor(); // 新增：获取当前提交人

                  const { aiProvider, selectedModel } =
                    await this.getModelAndUpdateConfiguration();

                  const response = await aiProvider.generateWeeklyReport(
                    workItems.map((item) => item.content),
                    selectedModel
                  );

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
