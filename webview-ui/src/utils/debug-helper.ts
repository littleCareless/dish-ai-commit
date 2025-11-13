/**
 * 调试辅助工具
 * 用于诊断配置创建和保存问题
 */

export class DebugHelper {
  private static instance: DebugHelper;
  private debugLog: Array<{
    timestamp: string;
    level: string;
    message: string;
    data?: any;
  }> = [];

  static getInstance(): DebugHelper {
    if (!DebugHelper.instance) {
      DebugHelper.instance = new DebugHelper();
    }
    return DebugHelper.instance;
  }

  /**
   * 记录调试信息
   */
  log(level: "info" | "warn" | "error", message: string, data?: any): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };

    this.debugLog.push(entry);
    console[level](`[DebugHelper] ${message}`, data || "");

    // 保持日志大小在合理范围内
    if (this.debugLog.length > 100) {
      this.debugLog = this.debugLog.slice(-50);
    }
  }

  /**
   * 记录配置创建过程
   */
  logProfileCreation(step: string, data?: any): void {
    this.log("info", `Profile Creation - ${step}`, data);
  }

  /**
   * 记录配置保存过程
   */
  logProfileSave(step: string, data?: any): void {
    this.log("info", `Profile Save - ${step}`, data);
  }

  /**
   * 记录验证过程
   */
  logValidation(field: string, result: any): void {
    this.log("info", `Validation - ${field}`, result);
  }

  /**
   * 记录错误
   */
  logError(context: string, error: any): void {
    this.log("error", `Error in ${context}`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
    });
  }

  /**
   * 获取调试日志
   */
  getDebugLog(): Array<{
    timestamp: string;
    level: string;
    message: string;
    data?: any;
  }> {
    return [...this.debugLog];
  }

  /**
   * 清除调试日志
   */
  clearLog(): void {
    this.debugLog = [];
  }

  /**
   * 导出调试信息
   */
  exportDebugInfo(): string {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      logs: this.debugLog,
      localStorage: this.getLocalStorageInfo(),
      memory: this.getMemoryInfo(),
    };

    return JSON.stringify(debugInfo, null, 2);
  }

  /**
   * 获取 localStorage 信息
   */
  private getLocalStorageInfo(): Record<string, any> {
    const info: Record<string, any> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          // 只记录配置相关的键，避免敏感信息
          if (
            key.includes("config") ||
            key.includes("profile") ||
            key.includes("provider")
          ) {
            try {
              info[key] = value ? JSON.parse(value) : value;
            } catch {
              info[key] = value;
            }
          }
        }
      }
    } catch (error) {
      info.error = "Failed to read localStorage";
    }
    return info;
  }

  /**
   * 获取内存信息
   */
  private getMemoryInfo(): any {
    if ("memory" in performance) {
      return (performance as any).memory;
    }
    return { available: "Memory API not available" };
  }

  /**
   * 检查配置创建环境
   */
  checkEnvironment(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // 检查 VSCode API
    if (typeof window !== "undefined" && !(window as any).vscode) {
      issues.push("VSCode API not available - using localStorage fallback");
    }

    // 检查 localStorage
    try {
      localStorage.setItem("debug-test", "test");
      localStorage.removeItem("debug-test");
    } catch (error) {
      issues.push("localStorage not available");
    }

    // 检查必要的依赖
    if (typeof Promise === "undefined") {
      issues.push("Promise not available");
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

// 导出单例实例
export const debugHelper = DebugHelper.getInstance();

// 导出便捷函数
export const logDebug = (
  level: "info" | "warn" | "error",
  message: string,
  data?: any,
) => debugHelper.log(level, message, data);

export const logProfileCreation = (step: string, data?: any) =>
  debugHelper.logProfileCreation(step, data);

export const logProfileSave = (step: string, data?: any) =>
  debugHelper.logProfileSave(step, data);

export const logValidation = (field: string, result: any) =>
  debugHelper.logValidation(field, result);

export const logError = (context: string, error: any) =>
  debugHelper.logError(context, error);
