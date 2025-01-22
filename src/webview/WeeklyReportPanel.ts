import * as vscode from "vscode";
import * as path from "path";
import { WeeklyReportService } from "../services/weeklyReport";
import { AIProviderFactory } from "../ai/AIProviderFactory";
import { ProgressHandler } from "../utils/ProgressHandler";
import { NotificationHandler } from "../utils/NotificationHandler";
import { LocalizationManager } from "../utils/LocalizationManager";
import { ConfigurationManager } from "../config/ConfigurationManager";
import { ModelPickerService } from "../services/ModelPickerService";

/**
 * @class WeeklyReportPanel
 * @description Manages a WebView panel that displays and generates weekly reports.
 * Handles the UI interaction and communication between the extension and WebView.
 */
export class WeeklyReportPanel {
  /** @static {string} Unique identifier for the weekly report webview type */
  public static readonly viewType = "weeklyReport.view";

  /** @static {WeeklyReportPanel | undefined} Reference to the current panel instance */
  public static currentPanel: WeeklyReportPanel | undefined;

  /** @private {vscode.WebviewPanel} The VS Code webview panel instance */
  private readonly _panel: vscode.WebviewPanel;

  /** @private {vscode.Disposable[]} Array of disposable resources */
  private _disposables: vscode.Disposable[] = [];

  /**
   * @private
   * @constructor
   * @param {vscode.WebviewPanel} panel - The webview panel instance
   * @param {vscode.Uri} extensionUri - The URI of the extension
   */
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;

    // 设置 WebView 内容
    this._panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(extensionUri, "webview-ui-dist"),
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

  /**
   * @static
   * @description Creates a new panel or reveals an existing one
   * @param {vscode.Uri} extensionUri - The URI of the extension
   * @param {vscode.ExtensionContext} context - The extension context
   * @returns {Promise<void>}
   */
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
          vscode.Uri.joinPath(extensionUri, "webview-ui-dist"),
        ],
      }
    );

    WeeklyReportPanel.currentPanel = new WeeklyReportPanel(panel, extensionUri);
  }

  /**
   * @private
   * @description Generates the HTML content for the webview
   * @param {vscode.Webview} webview - The webview instance
   * @param {vscode.Uri} extensionUri - The URI of the extension
   * @returns {string} The HTML content
   */
  private _getHtmlForWebview(
    webview: vscode.Webview,
    extensionUri: vscode.Uri
  ) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "webview-ui-dist", "index.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "webview-ui-dist", "index.css")
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
          <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }

  /**
   * @private
   * @description Generates a random nonce for Content Security Policy
   * @returns {string} A random 32-character string
   */
  private getNonce() {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * @private
   * @description Formats a period string into a date range
   * @param {string} period - Number of weeks to look back
   * @returns {string} Formatted date range string
   */
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

  /**
   * @private
   * @description Handles messages received from the webview
   * @param {any} message - The message received from the webview
   * @returns {Promise<void>}
   */
  private async handleMessages(message: any) {
    switch (message.command) {
      case "generate":
        try {
          // Create a promise to handle progress indication
          await new Promise<void>(async (resolve, reject) => {
            // Show progress while generating report
            await ProgressHandler.withProgress(
              await LocalizationManager.getInstance().getMessage(
                "weeklyReport.generating"
              ),
              async (progress) => {
                try {
                  // Initialize weekly report service and generate work items
                  const service = new WeeklyReportService();
                  await service.initialize();
                  const workItems = await service.generate(message.data.period);
                  const author = await service.getCurrentAuthor();

                  // Get AI provider and selected model
                  const { aiProvider, selectedModel } =
                    await this.getModelAndUpdateConfiguration();

                  // Generate report using AI provider
                  const response = await aiProvider.generateWeeklyReport(
                    workItems.map((item) => item.content),
                    selectedModel
                  );

                  // Handle successful response
                  if (response?.content) {
                    this._panel.webview.postMessage({
                      command: "report",
                      data: response.content,
                    });
                    resolve();

                    // Format period and show success notification
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

  /**
   * @private
   * @description Selects an AI model and updates the configuration
   * @param {string} [provider="Ollama"] - The AI provider name
   * @param {string} [model="Ollama"] - The model name
   * @returns {Promise<{provider: string, model: string} | undefined>}
   */
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

  /**
   * @private
   * @description Gets the AI provider and model based on configuration
   * @returns {Promise<{aiProvider: any, selectedModel: any}>}
   * @throws {Error} When model selection is cancelled or model is not found
   */
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

  /**
   * @public
   * @description Disposes of the panel and its resources
   */
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
