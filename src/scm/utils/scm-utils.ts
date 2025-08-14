import * as vscode from "vscode";
import { notify } from "../../utils/notification/notification-manager";
import { SCMLogger } from "./scm-logger";

/**
 * SCM通用工具类
 * 提供所有SCM Provider共享的通用方法
 */
export class SCMUtils {
  /**
   * 复制文本到剪贴板
   * 统一的剪贴板操作实现
   */
  static async copyToClipboard(message: string): Promise<void> {
    try {
      await vscode.env.clipboard.writeText(message);
      notify.info("commit.message.copied");
      SCMLogger.info("Message copied to clipboard successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      notify.error("commit.message.copy.failed", [errorMessage]);
      SCMLogger.error("Failed to copy message to clipboard:", error);
    }
  }

  /**
   * 解析SVN日志
   * 通用的SVN日志解析方法，可被所有SVN相关的provider使用
   */
  static parseSvnLog(log: string): string[] {
    const messages: string[] = [];
    const entries = log.split(
      /^------------------------------------------------------------------------$/m
    );

    for (const rawEntry of entries) {
      const entry = rawEntry.trim();
      if (!entry) {
        continue;
      }

      const lines = entry.split("\n");
      if (lines.length === 0 || !lines[0].match(/^r\d+\s+\|/)) {
        continue;
      }

      let messageStartIndex = 1;
      if (lines.length > 1 && lines[messageStartIndex].trim() === "") {
        messageStartIndex++;
      }

      if (messageStartIndex < lines.length) {
        const message = lines.slice(messageStartIndex).join("\n").trim();
        if (message) {
          messages.push(message.split("\n")[0]);
        }
      }
    }
    return messages;
  }

  /**
   * 解析XML格式的SVN日志
   * 用于处理SVN的XML输出格式
   */
  static parseXmlSvnLogs(xmlOutput: string): string[] {
    const commits: string[] = [];
    const logEntriesRegex =
      /<logentry[^>]*>[\s\S]*?<msg>([\s\S]*?)<\/msg>[\s\S]*?<\/logentry>/g;
    let match;

    while ((match = logEntriesRegex.exec(xmlOutput)) !== null) {
      if (match[1]?.trim()) {
        commits.push(match[1].trim());
      }
    }

    return commits;
  }

  /**
   * 验证文件路径是否有效
   * 通用的文件路径验证方法
   */
  static validateFilePaths(files?: string[]): string[] {
    if (!files || files.length === 0) {
      return [];
    }
    
    return files.filter(file => {
      if (!file || typeof file !== "string") {
        SCMLogger.warn("Invalid file path:", file);
        return false;
      }
      return true;
    });
  }

  /**
   * 格式化文件数量通知消息
   * 统一的文件数量通知格式
   */
  static notifyFileCount(count: number, operation: "selected" | "staged" | "all"): void {
    if (count > 0) {
      const messageKey = `diff.${operation}.info`;
      notify.info(messageKey, [String(count)]);
      SCMLogger.info(`${operation} files count: ${count}`);
    }
  }

  /**
   * 创建安全的shell命令参数
   * 防止命令注入的安全处理
   */
  static sanitizeForShell(input: string): string {
    // 移除或转义可能危险的字符
    return input.replace(/[;&|`$\\]/g, '\\$&');
  }

  /**
   * 检查是否是有效的提交消息
   * 通用的提交消息验证
   */
  static isValidCommitMessage(message: string): boolean {
    return Boolean(message && message.trim().length > 0);
  }

  /**
   * 创建默认的超时Promise
   * 用于防止长时间运行的操作阻塞
   */
  static createTimeoutPromise<T>(
    promise: Promise<T>,
    timeoutMs: number = 30000,
    operation: string = "operation"
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);
  }

  /**
   * 重试执行函数
   * 通用的重试机制
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
    operationName: string = "operation"
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        SCMLogger.info(`Attempting ${operationName} (${attempt}/${maxRetries})`);
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        SCMLogger.warn(
          `${operationName} failed on attempt ${attempt}/${maxRetries}:`,
          lastError.message
        );
        
        if (attempt < maxRetries) {
          await this.delay(delayMs);
        }
      }
    }
    
    SCMLogger.error(`${operationName} failed after ${maxRetries} attempts`);
    throw lastError as Error;
  }

  /**
   * 延迟函数
   * 用于重试机制中的延迟
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 安全地获取对象属性
   * 避免访问undefined对象导致的错误
   */
  static safeGet<T>(obj: any, path: string, defaultValue?: T): T | undefined {
    try {
      const keys = path.split('.');
      let result = obj;
      
      for (const key of keys) {
        if (result === null || result === undefined) {
          return defaultValue;
        }
        result = result[key];
      }
      
      return result !== undefined ? result : defaultValue;
    } catch (error) {
      SCMLogger.warn(`Failed to get property ${path}:`, error);
      return defaultValue;
    }
  }
}