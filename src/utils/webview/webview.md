# Webview 工具说明文档

本文档介绍如何在 VS Code 插件开发中使用 `getUri` 和 `getNonce` 工具函数，这两个函数分别用于生成 webview 可使用的资源 URI 以及生成符合 Content Security Policy 要求的随机 nonce 值。

---

## 1. getUri 函数

### 功能说明

`getUri` 用于将本地资源路径转换为 webview 可使用的 URI。该函数接收以下参数：

- **webview**：一个 Webview 实例。
- **extensionPath**：插件根目录路径。
- **pathList**：资源路径片段列表，该列表会与插件根路径拼接得到资源的绝对路径。

### 使用示例

```typescript
// ...existing code...
import { getUri } from "./webview";

// 假设有一个 webview 实例和插件根目录路径
const webviewInstance = /* ...existing code... */;
const extensionRoot = "/Users/yourname/your-extension";

// 使用 getUri 获取图片资源的 webview URI
const imageUri = getUri(webviewInstance, extensionRoot, ["resources", "images", "logo.png"]);
// imageUri 可以在 webview 中作为 <img> 标签的 src 使用
```

---

## 2. getNonce 函数

### 功能说明

`getNonce` 用于生成一个长度为 32 的随机字符串，它由大小写字母与数字组合而成。该 nonce 通常用于 Content Security Policy 中，以确保 webview 的安全性。

### 使用示例

```typescript
// ...existing code...
import { getNonce } from "./webview";

// 在生成 webview 内容时使用 nonce
const nonce = getNonce();

// 在构造 HTML 时，将 nonce 嵌入到 script 标签中，例：
const htmlContent = `
  <!DOCTYPE html>
  <html lang="zh-cn">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}';">
      <title>示例 Webview</title>
    </head>
    <body>
      <!-- 页面内容 -->
      <script nonce="${nonce}">
        // 此处放置安全执行的 JS 代码
        console.log("Hello, webview!");
      </script>
    </body>
  </html>
`;

// 将 htmlContent 设置到 webview 中
// webviewInstance.html = htmlContent;
```

---

## 3. 综合示例

下面展示了如何将 getUri 与 getNonce 组合使用，构造一个包含本地资源和安全 JS 脚本的 webview 页面：

```typescript
// ...existing code...
import { getUri, getNonce } from "./webview";

// 获取插件根目录和 webview 实例（假设均已定义）
const extensionRoot = "/Users/yourname/your-extension";
const webviewInstance = /* ...existing代码... */;

// 获取本地图片资源的 URI
const logoUri = getUri(webviewInstance, extensionRoot, ["resources", "images", "logo.png"]);

// 生成随机 nonce
const nonce = getNonce();

// 构造 HTML 内容
const htmlContent = `
  <!DOCTYPE html>
  <html lang="zh-cn">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webviewInstance.cspSource}; script-src 'nonce-${nonce}';">
      <title>Webview 示例</title>
    </head>
    <body>
      <h1>欢迎使用 Webview 示例</h1>
      <img src="${logoUri}" alt="Logo">
      <script nonce="${nonce}">
        console.log("安全的 Webview 脚本执行");
      </script>
    </body>
  </html>
`;

// 将 HTML 内容设置给 webview
// webviewInstance.html = htmlContent;
```

---

通过以上示例，其他开发者可以清晰地了解如何利用 `getUri` 和 `getNonce` 来便捷、安全地构造 Webview 页面。
