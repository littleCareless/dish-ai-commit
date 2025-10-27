export const DEFAULT_EXTENSION_ID = "svn-commit-gen";

// 从 URL 参数中获取插件 ID
export function getExtensionId(): string {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("extensionId") || DEFAULT_EXTENSION_ID;
}

// 生成消息类型
export function getMessageType(type: string): string {
  return `${getExtensionId()}.${type}`;
}
