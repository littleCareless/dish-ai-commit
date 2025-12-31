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

  public async getWebviewContent(
    webview: vscode.Webview,
    initialData: {
      viewType: string;
      initialRoute: string;
      qdrantUrl?: string;
      qdrantCollectionName?: string;
      language?: string;
      isFirstInstall?: boolean;
    }
  ): Promise<string> {
    const webviewUiDistPath = vscode.Uri.joinPath(
      this._extensionUri,
      "dist",
      "webview-ui-dist"
    );
    const htmlPath = vscode.Uri.joinPath(webviewUiDistPath, "index.html");

    const uint8Array = await vscode.workspace.fs.readFile(htmlPath);
    const htmlContent = new TextDecoder().decode(uint8Array);

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(webviewUiDistPath, "assets", "index.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(webviewUiDistPath, "assets", "index.css")
    );
    const faviconUri = webview.asWebviewUri(
      vscode.Uri.joinPath(webviewUiDistPath, "favicon.svg")
    );
    const localesBaseUri = webview.asWebviewUri(
      vscode.Uri.joinPath(webviewUiDistPath, "locales")
    );

    const nonce = this.getNonce();

    const csp = [
      `default-src 'none'`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
      `img-src ${webview.cspSource} data:`,
      `font-src ${webview.cspSource}`,
      `connect-src ${webview.cspSource}`,
    ].join("; ");

    return htmlContent
      .replace(/<title>.*?<\/title>/, "<title>插件设置</title>")
      .replace(
        "</head>",
        `<meta http-equiv="Content-Security-Policy" content="${csp}">
<script nonce="${nonce}">
  // 关键：在所有脚本加载之前，同步设置好初始数据
  window.initialData = {
    viewType: "${initialData.viewType}",
    qdrantUrl: "${initialData.qdrantUrl || ""}",
    qdrantCollectionName: "${initialData.qdrantCollectionName || ""}",
    language: "${initialData.language?.toLowerCase() || "en"}",
    localesBaseUri: "${localesBaseUri.toString()}",
    isFirstInstall: ${initialData.isFirstInstall ? "true" : "false"}
  };
  window.initialRoute = "${initialData.initialRoute}";
  console.log('SettingsViewProvider: initialData synchronously set', window.initialData);

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

  // 页面加载完成后初始化主题和补充数据
  document.addEventListener('DOMContentLoaded', () => {
      applyTheme();
      // 开始监听body的class变化
      observer.observe(document.body, {
          attributes: true,
          attributeFilter: ['class']
      });

      // 向 webview-ui 补充 vscodeTheme
      if (window.initialData) {
        window.initialData.vscodeTheme = getVSCodeTheme();
      }
      
      console.log('SettingsViewProvider: DOMContentLoaded, full initialData:', window.initialData);
      window.dispatchEvent(new CustomEvent('initial-data-ready'));
  });
</script>
</head>`
      )
      .replace('href="/assets/index.css"', `href="${styleUri}"`)
      .replace('src="/assets/index.js"', `src="${scriptUri}" nonce="${nonce}"`);
  }
}
