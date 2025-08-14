/**
 * SCM统一日志工具类
 * 提供统一的日志记录接口，避免在多个文件中重复定义Logger
 */

/** 日志级别枚举 */
export enum LogLevel {
  Info = "info",
  Warning = "warning", 
  Error = "error",
  Debug = "debug"
}

/** 日志配置接口 */
interface LogConfig {
  /** 是否启用日志 */
  enabled: boolean;
  /** 最小日志级别 */
  minLevel: LogLevel;
  /** 是否在生产环境输出info级别日志 */
  showInfoInProduction: boolean;
}

/**
 * SCM日志管理器
 * 统一管理所有SCM相关的日志输出
 */
export class SCMLogger {
  private static config: LogConfig = {
    enabled: true,
    minLevel: LogLevel.Info,
    showInfoInProduction: false
  };

  /**
   * 设置日志配置
   */
  static configure(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 记录信息日志
   */
  static info(message: string, ...args: any[]): void {
    this.log(LogLevel.Info, message, ...args);
  }

  /**
   * 记录警告日志
   */
  static warn(message: string, ...args: any[]): void {
    this.log(LogLevel.Warning, message, ...args);
  }

  /**
   * 记录错误日志
   */
  static error(message: string, ...args: any[]): void {
    this.log(LogLevel.Error, message, ...args);
  }

  /**
   * 记录调试日志
   */
  static debug(message: string, ...args: any[]): void {
    this.log(LogLevel.Debug, message, ...args);
  }

  /**
   * 核心日志记录方法
   */
  private static log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.config.enabled) {
      return;
    }

    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[SCM][${timestamp}][${level.toUpperCase()}]`;
    const fullMessage = `${prefix} ${message}`;

    switch (level) {
      case LogLevel.Info:
        // 在生产环境中，可以根据配置决定是否输出info级别日志
        if (process.env.NODE_ENV !== "production" || this.config.showInfoInProduction) {
          console.log(fullMessage, ...args);
        }
        break;
      case LogLevel.Warning:
        console.warn(fullMessage, ...args);
        break;
      case LogLevel.Error:
        console.error(fullMessage, ...args);
        break;
      case LogLevel.Debug:
        if (process.env.NODE_ENV !== "production") {
          console.debug(fullMessage, ...args);
        }
        break;
    }
  }

  /**
   * 判断是否应该记录指定级别的日志
   */
  private static shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.Debug, LogLevel.Info, LogLevel.Warning, LogLevel.Error];
    const currentLevelIndex = levels.indexOf(this.config.minLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * 记录带有上下文的日志
   */
  static logWithContext(
    level: LogLevel,
    context: string,
    message: string,
    ...args: any[]
  ): void {
    const contextualMessage = `[${context}] ${message}`;
    this.log(level, contextualMessage, ...args);
  }

  /**
   * 记录性能日志
   */
  static logPerformance(operation: string, durationMs: number): void {
    this.info(`Performance: ${operation} completed in ${durationMs}ms`);
  }

  /**
   * 创建带有上下文的logger
   */
  static createContextLogger(context: string) {
    return {
      info: (message: string, ...args: any[]) => 
        SCMLogger.logWithContext(LogLevel.Info, context, message, ...args),
      warn: (message: string, ...args: any[]) => 
        SCMLogger.logWithContext(LogLevel.Warning, context, message, ...args),
      error: (message: string, ...args: any[]) => 
        SCMLogger.logWithContext(LogLevel.Error, context, message, ...args),
      debug: (message: string, ...args: any[]) => 
        SCMLogger.logWithContext(LogLevel.Debug, context, message, ...args),
    };
  }

  /**
   * 测量和记录操作执行时间
   */
  static async measureTime<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      this.logPerformance(operationName, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.error(`${operationName} failed after ${duration}ms:`, error);
      throw error;
    }
  }
}