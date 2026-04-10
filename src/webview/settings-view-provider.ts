import * as vscode from "vscode";
import { EmbeddingService } from "@/core/indexing/embedding-service";
import { SettingsViewHTMLProvider } from "@/services/webview/providers/settings-view-html-provider";
import { SettingsViewMessageHandler } from "@/services/webview/handlers/settings-view-message-handler";
import { IndexingSettingsManager } from "@/services/settings/indexing-settings-manager";
import { getWorkspacePath } from "@/core/utils/path";
import { createHash } from "crypto";
import { ConfigurationManager } from "@/config/configuration-manager";
import { ExtensionResponse } from "@shared/types/messages";

export class SettingsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "dish-ai-commit.settingsView";

  private _view?: vscode.WebviewView;
  private readonly _extensionUri: vscode.Uri;
  private readonly _htmlContentProvider: SettingsViewHTMLProvider;
  private readonly _messageHandler: SettingsViewMessageHandler;
  private _disposables: vscode.Disposable[] = [];

  constructor(
    extensionUri: vscode.Uri,
    extensionId: string,
    private readonly _extensionContext: vscode.ExtensionContext,
    embeddingService: EmbeddingService | null,
  ) {
    this._extensionUri = extensionUri;
    this._htmlContentProvider = new SettingsViewHTMLProvider(
      this._extensionUri,
    );
    this._messageHandler = new SettingsViewMessageHandler(
      extensionId,
      embeddingService,
      this._extensionContext,
    );
  }

  private isFirstInstall(): boolean {
    const onboardingStatus = this._extensionContext.globalState.get<{
      completed: boolean;
      completedAt?: number;
      skipped?: boolean;
    }>("onboarding.status");

    if (onboardingStatus?.completed || onboardingStatus?.skipped) {
      return false;
    }

    const apiConfig =
      this._extensionContext.globalState.get<Record<string, any>>("api.config");
    const hasApiConfig = apiConfig && Object.keys(apiConfig).length > 0;

    return !onboardingStatus && !hasApiConfig;
  }

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "dist", "webview-ui-dist"),
      ],
    };

    const indexingSettings = IndexingSettingsManager.getInstance(
      this._extensionContext,
    ).getSettings();
    const qdrantUrl = indexingSettings.qdrantUrl;

    const workspacePath = getWorkspacePath();
    const hash = createHash("sha256").update(workspacePath).digest("hex");
    const qdrantCollectionName = `dish-${hash.substring(0, 16)}`;

    const isFirstInstall = this.isFirstInstall();
    const initialRoute = isFirstInstall ? "/" : "/settings";

    console.log(
      `[SettingsViewProvider] First install detected: ${isFirstInstall}, initial route: ${initialRoute}`,
    );

    webviewView.webview.html =
      await this._htmlContentProvider.getWebviewContent(webviewView.webview, {
        viewType: "settingsPage",
        initialRoute,
        qdrantUrl,
        qdrantCollectionName,
        language: vscode.env.language,
        isFirstInstall,
      });

    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        await this._messageHandler.handleMessage(message, webviewView.webview);
      },
      null,
      this._disposables,
    );

    // Subscribe to external config changes and forward to webview
    const monitor = ConfigurationManager.getInstance().getConfigurationMonitor();
    monitor.onExternalFeaturesChange = (changedKeys: string[]) => {
      try {
        this._view?.webview.postMessage({
          command: ExtensionResponse.ExternalConfigChanged,
          data: { changedKeys },
        });
      } catch {
        // Webview may be disposed during shutdown
      }
    };
  }
}
