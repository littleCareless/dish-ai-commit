import type { WebviewApi } from "vscode-webview";

declare global {
  interface Window {
    /**
     * The global VS Code API instance provided by the webview.
     */
    vscode: WebviewApi<unknown>;
  }
}
