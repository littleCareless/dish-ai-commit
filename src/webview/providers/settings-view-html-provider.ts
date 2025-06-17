import * as vscode from "vscode";

export class SettingsViewHTMLProvider {
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
                    window.qdrantUrl = window.initialData.qdrantUrl;
                    window.qdrantCollectionName = window.initialData.qdrantCollectionName;
                </script>
                <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
  }
}