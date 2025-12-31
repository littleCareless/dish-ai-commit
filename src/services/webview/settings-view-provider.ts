import * as vscode from "vscode";
import { EmbeddingService } from "@/core/indexing/embedding-service";
import { IndexingSettingsManager } from "@/services/settings/indexing-settings-manager";
import { SettingsViewMessageHandler } from "@/services/webview/handlers/settings-view-message-handler";
import { SettingsViewHTMLProvider } from "@/services/webview/providers/settings-view-html-provider";
import { getWorkspacePath } from "@/core/utils/path";
import { createHash } from "crypto";

export class SettingsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "dish-ai-commit.settingsView"; // 必须与 package.json 中的 id 匹配

  private _view?: vscode.WebviewView;
  private readonly _extensionUri: vscode.Uri;
  private readonly _htmlContentProvider: SettingsViewHTMLProvider;
  private readonly _messageHandler: SettingsViewMessageHandler;
  private _disposables: vscode.Disposable[] = [];

  constructor(
    extensionUri: vscode.Uri,
    extensionId: string,
    private readonly _extensionContext: vscode.ExtensionContext,
    embeddingService: EmbeddingService | null
  ) {
    this._extensionUri = extensionUri;
    this._htmlContentProvider = new SettingsViewHTMLProvider(
      this._extensionUri
    );
    this._messageHandler = new SettingsViewMessageHandler(
      extensionId,
      embeddingService,
      this._extensionContext
    );
  }

  /**
   * 检测是否为首次安装
   * 通过检查 onboarding.status 和 API 配置来判断
   */
  private isFirstInstall(): boolean {
    // 检查 onboarding 状态
    const onboardingStatus = this._extensionContext.globalState.get<{
      completed: boolean;
      completedAt?: number;
      skipped?: boolean;
    }>("onboarding.status");

    // 如果 onboarding 已完成或跳过，则不是首次安装
    if (onboardingStatus?.completed || onboardingStatus?.skipped) {
      return false;
    }

    // 检查是否有 API 配置（作为备用判断）
    const apiConfig = this._extensionContext.globalState.get<Record<string, any>>("api.config");
    const hasApiConfig = apiConfig && Object.keys(apiConfig).length > 0;

    // 如果没有 onboarding 状态且没有 API 配置，则是首次安装
    return !onboardingStatus && !hasApiConfig;
  }

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "dist", "webview-ui-dist"),
      ],
    };

    // 从 IndexingSettingsManager 获取配置
    const indexingSettings = IndexingSettingsManager.getInstance(
      this._extensionContext
    ).getSettings();
    const qdrantUrl = indexingSettings.qdrantUrl;

    // Generate collection name from workspace path
    const workspacePath = getWorkspacePath();
    const hash = createHash("sha256").update(workspacePath).digest("hex");
    const qdrantCollectionName = `dish-${hash.substring(0, 16)}`;

    // 检测是否为首次安装
    const isFirstInstall = this.isFirstInstall();
    const initialRoute = isFirstInstall ? "/" : "/settings";

    console.log(`[SettingsViewProvider] First install detected: ${isFirstInstall}, initial route: ${initialRoute}`);

    webviewView.webview.html =
      await this._htmlContentProvider.getWebviewContent(webviewView.webview, {
        viewType: "settingsPage",
        initialRoute,
        qdrantUrl,
        qdrantCollectionName,
        language: vscode.env.language,
        isFirstInstall, // 传递首次安装标志
      });

    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        await this._messageHandler.handleMessage(message, webviewView.webview);
      },
      null,
      this._disposables
    );
  }
}
