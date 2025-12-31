/**
 * 版本信息工具函数
 * 提供应用版本和构建信息的访问
 */

/**
 * 获取应用版本号
 * 从 Vite 注入的环境变量中获取
 * @returns 版本号字符串，如 "0.56.4"
 */
export function getAppVersion(): string {
  // Vite 会在构建时注入 process.env.PKG_VERSION
  if (typeof process !== "undefined" && process.env?.PKG_VERSION) {
    return process.env.PKG_VERSION;
  }

  // 开发环境可能通过 import.meta.env 注入
  if (import.meta.env?.PKG_VERSION) {
    return import.meta.env.PKG_VERSION;
  }

  // 开发环境回退到 package.json 中的版本
  if (import.meta.env?.DEV) {
    return "0.56.4"; // 开发环境默认值
  }

  // 如果无法获取，返回未知
  return "未知版本";
}

/**
 * 获取应用名称
 * @returns 应用显示名称
 */
export function getAppName(): string {
  if (typeof process !== "undefined" && process.env?.PKG_NAME) {
    return process.env.PKG_NAME;
  }
  if (import.meta.env?.PKG_NAME) {
    return import.meta.env.PKG_NAME;
  }
  return "Dish AI Commit Message Gen";
}

/**
 * 获取 Git SHA (如果可用)
 * @returns Git SHA 或 undefined
 */
export function getGitSha(): string | undefined {
  if (typeof process !== "undefined" && process.env?.PKG_SHA) {
    return process.env.PKG_SHA;
  }
  if (import.meta.env?.PKG_SHA) {
    return import.meta.env.PKG_SHA;
  }
  return undefined;
}

/**
 * 获取构建模式
 * @returns "production" 或 "development"
 */
export function getBuildMode(): string {
  if (typeof process !== "undefined" && process.env?.BUILD_MODE) {
    return process.env.BUILD_MODE;
  }
  if (import.meta.env?.BUILD_MODE) {
    return import.meta.env.BUILD_MODE;
  }
  return "development";
}

/**
 * 获取完整的版本信息字符串
 * @returns 格式化的版本信息，如 "v0.56.4 (dev)" 或 "v0.56.4 [abc1234]"
 */
export function getVersionInfo(): string {
  const version = getAppVersion();
  const mode = getBuildMode();
  const sha = getGitSha();

  let info = `v${version}`;

  if (mode === "development") {
    info += " (dev)";
  }

  if (sha) {
    info += ` [${sha.substring(0, 7)}]`;
  }

  return info;
}

/**
 * 检查是否为生产环境
 * @returns 是否为生产环境
 */
export function isProduction(): boolean {
  return getBuildMode() === "production";
}

/**
 * 检查是否为开发环境
 * @returns 是否为开发环境
 */
export function isDevelopment(): boolean {
  return getBuildMode() === "development";
}
