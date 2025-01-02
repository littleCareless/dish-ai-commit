import { Webview, Uri } from "vscode";
import * as path from "path";

export function getUri(
  webview: Webview,
  extensionPath: string,
  pathList: string[]
) {
  return webview.asWebviewUri(Uri.file(path.join(extensionPath, ...pathList)));
}

export function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
