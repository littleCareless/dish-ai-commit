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
                    // 获取当前VSCode主题
                    function getVSCodeTheme() {
                        const body = document.body;
                        if (body.classList.contains('vscode-dark')) {
                            return 'dark';
                        } else if (body.classList.contains('vscode-light')) {
                            return 'light';
                        } else if (body.classList.contains('vscode-high-contrast')) {
                            return 'high-contrast';
                        }
                        return 'light'; // 默认为浅色主题
                    }

                    // 应用主题到根元素
                    function applyTheme() {
                        const theme = getVSCodeTheme();
                        const root = document.documentElement;
                        const body = document.body;
                        
                        // 移除所有主题类
                        root.classList.remove('light', 'dark', 'high-contrast');
                        // 添加当前主题类
                        root.classList.add(theme);
                        
                        // 设置Arco Design主题
                        if (theme === 'dark' || theme === 'high-contrast') {
                            body.setAttribute('arco-theme', 'dark');
                        } else {
                            body.removeAttribute('arco-theme');
                        }
                        
                        // 触发主题变更事件
                        window.dispatchEvent(new CustomEvent('vscode-theme-changed', { detail: theme }));
                    }

                    // 监听主题变化
                    const observer = new MutationObserver((mutations) => {
                        mutations.forEach((mutation) => {
                            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                                applyTheme();
                            }
                        });
                    });

                    // 页面加载完成后初始化主题
                    document.addEventListener('DOMContentLoaded', () => {
                        applyTheme();
                        // 开始监听body的class变化
                        observer.observe(document.body, {
                            attributes: true,
                            attributeFilter: ['class']
                        });
                    });

                    // 向 webview-ui 传递初始数据
                    window.initialData = {
                        viewType: 'commitChatPage',
                        vscodeTheme: getVSCodeTheme()
                    };
                    
                    console.log('SettingsViewProvider: initialData set', window.initialData);
                    window.qdrantUrl = window.initialData.qdrantUrl;
                    window.qdrantCollectionName = window.initialData.qdrantCollectionName;
                </script>
                <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
  }
}