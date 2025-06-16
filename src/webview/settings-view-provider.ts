import * as vscode from "vscode";
import * as path from "path";
import { VectorStore } from "../core/indexing/vector-store";
import { EmbeddingService } from "../core/indexing/embedding-service";
import { AIProviderFactory } from "../ai/ai-provider-factory"; // 修正大小写
import { AIProvider } from "../ai/types"; // 修正大小写

// --- SettingsViewHTMLProvider ---
class SettingsViewHTMLProvider {
  private readonly _extensionUri: vscode.Uri;

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
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

  public getWebviewContent(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "webview-ui-dist", "index.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "webview-ui-dist", "index.css")
    );
    const nonce = this.getNonce();

    // 定义 CSP 策略
    // 参考: https://code.visualstudio.com/api/extension-guides/webview#content-security-policy
    const csp = [
      `default-src 'none'`, // 默认情况下，不允许任何内容
      `style-src ${webview.cspSource} 'unsafe-inline'`, // 允许来自扩展的 CSS 文件和内联样式 (例如 <style> 标签或 style 属性)
      `script-src 'nonce-${nonce}'`, // 只允许带有特定 nonce 的脚本执行 (包括内联脚本和 <script src="..."> 标签)
      `img-src ${webview.cspSource} data:`, // 允许来自扩展的图片和 base64 编码的图片 (data: URIs)
      `font-src ${webview.cspSource}`, // 允许来自扩展的字体文件
    ].join("; ");

    return `<!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="${csp}">
                <link href="${styleUri}" rel="stylesheet">
                <title>插件设置</title>
            </head>
            <body>
                <div id="root">
                    <!-- webview-ui (例如 React/Vue/Svelte 应用) 将会挂载到这里 -->
                    <!-- 确保 webview-ui 应用能够找到并使用这个 div -->
                </div>
                
                <script nonce="${nonce}">
                    // 向 webview-ui 传递初始数据
                    // webview-ui/src/App.tsx 或类似入口文件应读取此数据以确定渲染内容
                    window.initialData = {
                        viewType: 'settingsPage'
                        // 你可以在这里传递更多初始数据给 webview UI, 例如：
                        // vscodeTheme: document.body.className // 用于同步 VS Code 主题
                    };
                    // 用于调试：在 webview 的开发者工具控制台中检查此对象
                    console.log('SettingsViewProvider: initialData set', window.initialData);
                </script>
                <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
  }
}

// --- SettingsViewMessageHandler ---
class SettingsViewMessageHandler {
  private readonly _extensionId: string;

  constructor(
    extensionId: string,
    private readonly _embeddingService: EmbeddingService
  ) {
    this._extensionId = extensionId;
  }

  public async handleMessage(
    message: any,
    webview: vscode.Webview
  ): Promise<void> {
    switch (message.command) {
      case "startIndexing": {
        const startIndex = message?.data?.startIndex ?? 0;
        console.log(
          `[SettingsViewProvider] Received startIndexing message with startIndex: ${startIndex}`
        );
        this.startIndexing(startIndex, webview);
        break;
      }
      case "getSettings": {
        const config = vscode.workspace.getConfiguration("dish-ai-commit");
        const extensionPackageJSON = vscode.extensions.getExtension(
          this._extensionId
        )!.packageJSON;

        // 确保 contributes 和 configuration 存在
        const configProperties =
          extensionPackageJSON?.contributes?.configuration?.properties;
        if (!configProperties) {
          webview.postMessage({
            command: "loadSettingsError",
            error: "无法加载配置定义。",
          });
          return;
        }

        const detailedSettings: any[] = [];
        for (const key in configProperties) {
          // 确保 key 是 package.json 中定义的配置项，通常带有插件前缀
          if (
            Object.prototype.hasOwnProperty.call(configProperties, key) &&
            key.startsWith("dish-ai-commit.")
          ) {
            const prop = configProperties[key];
            const configKeyWithoutPrefix = key.substring(
              "dish-ai-commit.".length
            );
            const value = config.get(configKeyWithoutPrefix);

            detailedSettings.push({
              key: configKeyWithoutPrefix,
              type: prop.type,
              default: prop.default,
              description: prop.description || prop.markdownDescription || "",
              enum: prop.enum,
              value: value,
            });
          }
        }
        // 获取索引状态
        const isIndexed = await this._embeddingService.isIndexed();

        webview.postMessage({
          command: "loadSettings",
          data: { schema: detailedSettings, isIndexed: isIndexed }, // 将索引状态添加到消息中
        });
        break;
      }
      case "saveSettings": {
        const newSettings = message.data;
        const config = vscode.workspace.getConfiguration("dish-ai-commit");
        try {
          for (const setting of newSettings) {
            if (setting.key && setting.value !== undefined) {
              await config.update(
                setting.key,
                setting.value,
                vscode.ConfigurationTarget.Global
              );
            }
          }
          vscode.window.showInformationMessage("设置已成功保存！");
          // 可选：重新加载配置以显示更新后的值
          webview.postMessage({ command: "settingsSaved" });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`保存设置失败: ${errorMessage}`);
          webview.postMessage({
            command: "saveSettingsError",
            error: `保存设置失败: ${errorMessage}`,
          });
        }
        break;
      }
      case "getModelsForProvider": {
        const { providerId, modelSettingKey, providerContextKey } =
          message.data;
        if (!providerId || !modelSettingKey || !providerContextKey) {
          webview.postMessage({
            command: "getModelsForProviderError",
            data: {
              modelSettingKey,
              error:
                "Missing providerId, modelSettingKey, or providerContextKey in request.",
            },
          });
          return;
        }

        try {
          // console.log(`[SettingsViewProvider] Received getModelsForProvider for providerId: ${providerId}, context: ${providerContextKey}`);

          // 获取特定 provider 的配置，因为 getModels 可能需要 API key 等
          // providerContextKey 应该是类似 "providers.openai" 这样的键
          const config = vscode.workspace.getConfiguration("dish-ai-commit");
          const providerSettings = config.get(providerContextKey);

          // console.log(`[SettingsViewProvider] Provider settings for ${providerContextKey}:`, providerSettings);

          // 使用 AiProviderFactory 获取 provider 实例
          // AiProviderFactory 可能需要调整以接受配置或自动读取
          // 这里简化处理，假设 AiProviderFactory.createProvider 可以处理
          // 如果 AiProviderFactory.createProvider 需要完整的配置对象，需要传递
          // 或者 AiProviderFactory 有一个 getProvider(id, config) 的方法

          // 查找 provider 的定义，以确定是否需要传递特定配置给 factory
          const extensionPackageJSON = vscode.extensions.getExtension(
            this._extensionId
          )!.packageJSON;
          const configProperties =
            extensionPackageJSON?.contributes?.configuration?.properties;

          let providerInstance: AIProvider | undefined;

          // 尝试基于 providerId (通常是枚举值，如 'openai', 'ollama') 创建 provider
          // AiProviderFactory 可能需要一个方法来创建基于 provider 类型字符串的实例
          // 而不是基于配置中的 'provider' 字段的值（那可能是具体的模型名称或更详细的标识）
          // 假设 providerId 就是我们需要的类型标识符

          // 确保 providerId 是一个有效的类型，而不是一个具体的模型名称
          // 通常 providerId 会是 'openai', 'ollama' 等
          // 我们需要一个方法来获取这个 provider 的实例
          // AiProviderFactory.createProvider 可能需要 provider 的类型和该 provider 的配置

          // 简化：假设 AiProviderFactory 有一个方法可以根据 providerId (如 'openai') 获取实例
          // 并且它能自行处理配置的获取，或者我们传递必要的配置
          // 这里的 providerId 是从 webview 的 provider type setting 的 value 传过来的

          providerInstance = AIProviderFactory.getProvider(providerId); // 只传递 providerId

          if (!providerInstance) {
            throw new Error(
              `Unsupported or unknown provider ID: ${providerId}`
            );
          }

          if (typeof providerInstance.getModels !== "function") {
            // console.warn(`[SettingsViewProvider] Provider ${providerId} does not implement getModels(). Sending empty list.`);
            webview.postMessage({
              command: "modelsForProviderLoaded",
              data: { modelSettingKey, models: [] },
            });
            return;
          }

          const models = await providerInstance.getModels(); // 移除参数
          // console.log(`[SettingsViewProvider] Models for ${providerId} (${modelSettingKey}):`, models);
          webview.postMessage({
            command: "modelsForProviderLoaded",
            data: { modelSettingKey, models: models || [] },
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          // console.error(`[SettingsViewProvider] Error getting models for ${providerId} (${modelSettingKey}):`, errorMessage);
          webview.postMessage({
            command: "getModelsForProviderError",
            data: { modelSettingKey, error: errorMessage },
          });
        }
        break;
      }
    }
  }

  private async startIndexing(
    startIndex: number,
    webview: vscode.Webview
  ): Promise<void> {
    // 调用 EmbeddingService 的方法，并将 startIndex 传递给它
    try {
      await this._embeddingService.scanProjectFiles(startIndex, webview);
      webview.postMessage({
        command: "indexingFinished",
        data: { message: "索引完成!" },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[SettingsViewMessageHandler] Error during indexing: ${errorMessage}`
      );
      webview.postMessage({
        command: "indexingFailed",
        data: { message: `索引失败: ${errorMessage}` },
      });
    }
  }
}

// --- SettingsViewProvider ---
export class SettingsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "dish-ai-commit.settingsView"; // 必须与 package.json 中的 id 匹配

  private _view?: vscode.WebviewView;
  private readonly _extensionUri: vscode.Uri;
  private readonly _htmlContentProvider: SettingsViewHTMLProvider;
  private readonly _messageHandler: SettingsViewMessageHandler;
  private _disposables: vscode.Disposable[] = [];

  constructor(extensionUri: vscode.Uri, extensionId: string) {
    this._extensionUri = extensionUri;
    this._htmlContentProvider = new SettingsViewHTMLProvider(
      this._extensionUri
    );

    // 初始化 embeddingServiceInstance
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const projectRoot = workspaceFolders[0].uri.fsPath;
      const projectName = path.basename(projectRoot);

      // TODO: 从配置中获取 Qdrant URL 和集合名称
      const vectorStore = new VectorStore(
        "http://localhost:6333",
        `code_semantic_blocks_${projectName}`
      );
      this.embeddingServiceInstance = new EmbeddingService(
        vectorStore,
        projectName,
        projectRoot
      );
    } else {
      console.warn(
        "No workspace folder found. Embedding service will not be initialized."
      );
      // notify.warn(getMessage("embedding.service.no.workspace")); // "No workspace folder found. Embedding service disabled."
    }

    this._messageHandler = new SettingsViewMessageHandler(
      extensionId,
      this.embeddingServiceInstance
    );
  }

  public embeddingServiceInstance: any;

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    console.log("resolveWebviewView...");

    this._view = webviewView;

    (vscode.window as any).embeddingServiceInstance =
      this.embeddingServiceInstance;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "webview-ui-dist"),
      ],
    };
    // this._htmlContentProvider.getWebviewContent(
    //   webviewView.webview
    // );

    // webviewView.webview.html = `<html><body><h1>Hello Webview</h1></body></html>`;

    webviewView.webview.html = this._htmlContentProvider.getWebviewContent(
      webviewView.webview
    );

    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        await this._messageHandler.handleMessage(message, webviewView.webview);
      },
      null,
      this._disposables
    );
  }
}
