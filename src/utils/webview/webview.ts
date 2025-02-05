import { Webview, Uri } from "vscode";
import * as path from "path";

/**
 * 将本地资源路径转换为 webview 可以使用的 URI
 * @param webview Webview 实例
 * @param extensionPath 插件根目录路径
 * @param pathList 资源路径片段列表
 * @returns Webview 可用的资源 URI
 */
export function getUri(
  webview: Webview,
  extensionPath: string,
  pathList: string[]
) {
  return webview.asWebviewUri(Uri.file(path.join(extensionPath, ...pathList)));
}

/**
 * 生成一个随机的 nonce 值用于 Content Security Policy
 * @returns 32位随机字符串,由大小写字母和数字组成
 */
export function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
