import * as vscode from "vscode";

/**
 * 日志上下文信息接口
 */
export interface LogContext {
  /** 错误对象 */
  error?: Error;
  /** 额外的上下文数据 */
  data?: Record<string, unknown>;
  /** 操作标识符 */
  operation?: string;
  /** 用户ID或会话ID */
  userId?: string;
  /** 请求ID或追踪ID */
  requestId?: string;
  /** 时间戳 */
  timestamp?: Date;
}

/**
 * 日志级别枚举
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * A logger class that writes to a VS Code LogOutputChannel.
 * This utilizes the native logging capabilities of VS Code for different log levels.
 * Enhanced with support for structured logging, error objects, and context information.
 */
export class Logger {
  private static _instance: Logger;
  private readonly _outputChannel: vscode.LogOutputChannel;

  private constructor(channelName: string) {
    this._outputChannel = vscode.window.createOutputChannel(channelName, {
      log: true,
    });
  }

  public static getInstance(channelName: string): Logger {
    if (!Logger._instance) {
      Logger._instance = new Logger(channelName);
    }
    return Logger._instance;
  }

  /**
   * 格式化日志消息，包含上下文信息
   * @param message 基础消息
   * @param context 上下文信息
   * @returns 格式化后的消息
   */
  private formatMessage(message: string, context?: LogContext): string {
    if (!context) {
      return message;
    }

    const parts: string[] = [message];
    
    // 添加操作信息
    if (context.operation) {
      parts.push(`[操作: ${context.operation}]`);
    }
    
    // 添加用户信息
    if (context.userId) {
      parts.push(`[用户: ${context.userId}]`);
    }
    
    // 添加请求ID
    if (context.requestId) {
      parts.push(`[请求ID: ${context.requestId}]`);
    }
    
    // 添加时间戳
    if (context.timestamp) {
      parts.push(`[时间: ${context.timestamp.toISOString()}]`);
    }
    
    // 添加错误信息
    if (context.error) {
      parts.push(`[错误: ${context.error.name}: ${context.error.message}]`);
      if (context.error.stack) {
        parts.push(`[堆栈: ${context.error.stack}]`);
      }
    }
    
    // 添加额外数据
    if (context.data && Object.keys(context.data).length > 0) {
      try {
        const dataStr = JSON.stringify(context.data, null, 2);
        parts.push(`[数据: ${dataStr}]`);
      } catch (e) {
        parts.push(`[数据: 无法序列化]`);
      }
    }
    
    return parts.join(' ');
  }

  /**
   * 通用日志方法
   * @param level 日志级别
   * @param message 消息
   * @param context 上下文信息
   */
  private logWithLevel(level: LogLevel, message: string, context?: LogContext): void {
    const formattedMessage = this.formatMessage(message, context);
    
    switch (level) {
      case LogLevel.TRACE:
        this._outputChannel.trace(formattedMessage);
        break;
      case LogLevel.DEBUG:
        this._outputChannel.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        this._outputChannel.info(formattedMessage);
        break;
      case LogLevel.WARN:
        this._outputChannel.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        this._outputChannel.error(formattedMessage);
        break;
    }
  }

  /**
   * Appends a message with a 'Trace' level.
   * Use for detailed debugging information.
   * @param message The message to log.
   * @param context Optional context information including error objects and additional data.
   */
  public trace(message: string, context?: LogContext): void {
    this.logWithLevel(LogLevel.TRACE, message, context);
  }

  /**
   * Appends a message with a 'Debug' level.
   * Use for debugging information.
   * @param message The message to log.
   * @param context Optional context information including error objects and additional data.
   */
  public debug(message: string, context?: LogContext): void {
    this.logWithLevel(LogLevel.DEBUG, message, context);
  }

  /**
   * Appends a message with an 'Info' level.
   * This is the general-purpose log method.
   * @param message The message to log.
   * @param context Optional context information including error objects and additional data.
   */
  public log(message: string, context?: LogContext): void {
    this.logWithLevel(LogLevel.INFO, message, context);
  }

  /**
   * Appends a message with an 'Info' level.
   * @param message The message to log.
   * @param context Optional context information including error objects and additional data.
   */
  public info(message: string, context?: LogContext): void {
    this.logWithLevel(LogLevel.INFO, message, context);
  }

  /**
   * Appends a message with a 'Warning' level.
   * @param message The message to log.
   * @param context Optional context information including error objects and additional data.
   */
  public warn(message: string, context?: LogContext): void {
    this.logWithLevel(LogLevel.WARN, message, context);
  }

  /**
   * Appends a message with an 'Error' level.
   * @param message The message to log.
   * @param context Optional context information including error objects and additional data.
   */
  public error(message: string, context?: LogContext): void {
    this.logWithLevel(LogLevel.ERROR, message, context);
  }

  /**
   * 便捷方法：记录错误对象
   * @param error 错误对象
   * @param message 可选的额外消息
   * @param additionalContext 额外的上下文信息
   */
  public logError(error: Error, message?: string, additionalContext?: Omit<LogContext, 'error'>): void {
    const context: LogContext = {
      error,
      ...additionalContext,
      timestamp: new Date()
    };
    
    const logMessage = message || `发生错误: ${error.message}`;
    this.logWithLevel(LogLevel.ERROR, logMessage, context);
  }

  /**
   * 便捷方法：记录操作开始
   * @param operation 操作名称
   * @param context 可选的上下文信息
   */
  public logOperationStart(operation: string, context?: Omit<LogContext, 'operation'>): void {
    const logContext: LogContext = {
      operation,
      ...context,
      timestamp: new Date()
    };
    this.logWithLevel(LogLevel.INFO, `开始执行操作: ${operation}`, logContext);
  }

  /**
   * 便捷方法：记录操作完成
   * @param operation 操作名称
   * @param duration 操作耗时（毫秒）
   * @param context 可选的上下文信息
   */
  public logOperationEnd(operation: string, duration?: number, context?: Omit<LogContext, 'operation'>): void {
    const logContext: LogContext = {
      operation,
      ...context,
      timestamp: new Date(),
      data: duration ? { duration } : undefined
    };
    const message = duration 
      ? `操作完成: ${operation} (耗时: ${duration}ms)`
      : `操作完成: ${operation}`;
    this.logWithLevel(LogLevel.INFO, message, logContext);
  }

  /**
   * Reveals the output channel in the UI.
   */
  public show(): void {
    this._outputChannel.show();
  }

  /**
   * Hides the output channel from the UI.
   */
  public hide(): void {
    this._outputChannel.hide();
  }

  /**
   * Clears the output channel.
   */
  public clear(): void {
    this._outputChannel.clear();
  }

  /**
   * Disposes the output channel.
   */
  public dispose(): void {
    this._outputChannel.dispose();
  }
}

/**
 * 使用示例：
 * 
 * ```typescript
 * const logger = Logger.getInstance('MyExtension');
 * 
 * // 基本用法
 * logger.info('用户登录成功');
 * 
 * // 带错误对象的日志
 * try {
 *   // 一些可能出错的操作
 * } catch (error) {
 *   logger.logError(error as Error, '用户登录失败', {
 *     userId: 'user123',
 *     operation: 'login',
 *     data: { attemptCount: 3 }
 *   });
 * }
 * 
 * // 带上下文的日志
 * logger.debug('处理用户请求', {
 *   operation: 'processRequest',
 *   userId: 'user123',
 *   requestId: 'req-456',
 *   data: { requestType: 'commit', fileCount: 5 }
 * });
 * 
 * // 操作追踪
 * logger.logOperationStart('generateCommitMessage');
 * // ... 执行操作 ...
 * logger.logOperationEnd('generateCommitMessage', 150); // 150ms
 * 
 * // 警告日志
 * logger.warn('API 响应时间过长', {
 *   operation: 'apiCall',
 *   data: { responseTime: 5000, threshold: 3000 }
 * });
 * ```
 */
