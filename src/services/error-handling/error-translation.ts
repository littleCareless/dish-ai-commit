import { Logger } from "@/utils/logger";
import { getMessage } from "@/utils/i18n";

/**
 * 错误类型枚举
 */
export enum ErrorType {
  CONFIGURATION = "configuration",
  NETWORK = "network", 
  AI_PROVIDER = "ai_provider",
  FILE_SYSTEM = "file_system",
  VALIDATION = "validation",
  PERMISSION = "permission",
  UNKNOWN = "unknown"
}

/**
 * 错误严重程度枚举
 */
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium", 
  HIGH = "high",
  CRITICAL = "critical"
}

/**
 * 用户友好错误信息接口
 */
export interface UserFriendlyError {
  title: string;
  message: string;
  suggestions: string[];
  helpLinks: string[];
  severity: ErrorSeverity;
  canRetry: boolean;
  context?: Record<string, any>;
}

/**
 * 错误上下文信息
 */
export interface ErrorContext {
  operation: string;
  timestamp: Date;
  userId?: string;
  workspacePath?: string;
  additionalInfo?: Record<string, any>;
}

/**
 * 错误信息翻译服务
 * 负责将技术错误信息转换为用户友好的错误信息
 */
export class ErrorTranslationService {
  private static instance: ErrorTranslationService;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance("ErrorTranslationService");
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ErrorTranslationService {
    if (!ErrorTranslationService.instance) {
      ErrorTranslationService.instance = new ErrorTranslationService();
    }
    return ErrorTranslationService.instance;
  }

  /**
   * 将技术错误转换为用户友好错误
   * @param error - 原始错误对象
   * @param context - 错误上下文
   * @returns 用户友好的错误信息
   */
  public translateError(error: unknown, context?: ErrorContext): UserFriendlyError {
    try {
      const errorType = this.classifyError(error);
      const severity = this.assessSeverity(error, errorType);
      
      return {
        title: this.getErrorTitle(errorType, severity),
        message: this.getErrorMessage(error, errorType, context),
        suggestions: this.getErrorSuggestions(errorType, error, context),
        helpLinks: this.getHelpLinks(errorType),
        severity,
        canRetry: this.canRetry(errorType, error),
        context: this.buildContext(error, context)
      };
    } catch (translationError) {
      this.logger.error(`Failed to translate error: ${translationError}`);
      return this.getFallbackError(error);
    }
  }

  /**
   * 错误分类
   */
  private classifyError(error: unknown): ErrorType {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // 配置相关错误
      if (message.includes("config") || message.includes("setting") || 
          message.includes("api key") || message.includes("token")) {
        return ErrorType.CONFIGURATION;
      }
      
      // 网络相关错误
      if (message.includes("network") || message.includes("connection") ||
          message.includes("timeout") || message.includes("fetch")) {
        return ErrorType.NETWORK;
      }
      
      // AI提供商相关错误
      if (message.includes("ai") || message.includes("model") || 
          message.includes("provider") || message.includes("openai") ||
          message.includes("ollama") || message.includes("anthropic")) {
        return ErrorType.AI_PROVIDER;
      }
      
      // 文件系统相关错误
      if (message.includes("file") || message.includes("directory") ||
          message.includes("path") || message.includes("permission")) {
        return ErrorType.FILE_SYSTEM;
      }
      
      // 验证相关错误
      if (message.includes("validation") || message.includes("invalid") ||
          message.includes("required") || message.includes("format")) {
        return ErrorType.VALIDATION;
      }
      
      // 权限相关错误
      if (message.includes("permission") || message.includes("access") ||
          message.includes("unauthorized") || message.includes("forbidden")) {
        return ErrorType.PERMISSION;
      }
    }
    
    return ErrorType.UNKNOWN;
  }

  /**
   * 评估错误严重程度
   */
  private assessSeverity(error: unknown, errorType: ErrorType): ErrorSeverity {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // 关键错误
      if (message.includes("critical") || message.includes("fatal") ||
          errorType === ErrorType.PERMISSION) {
        return ErrorSeverity.CRITICAL;
      }
      
      // 高严重程度错误
      if (message.includes("failed") || message.includes("error") ||
          errorType === ErrorType.AI_PROVIDER || errorType === ErrorType.CONFIGURATION) {
        return ErrorSeverity.HIGH;
      }
      
      // 中等严重程度错误
      if (message.includes("warning") || message.includes("timeout") ||
          errorType === ErrorType.NETWORK) {
        return ErrorSeverity.MEDIUM;
      }
    }
    
    return ErrorSeverity.LOW;
  }

  /**
   * 获取错误标题
   */
  private getErrorTitle(errorType: ErrorType, severity: ErrorSeverity): string {
    const severityPrefix = this.getSeverityPrefix(severity);
    const typeKey = `error.title.${errorType}`;
    
    try {
      return `${severityPrefix} ${getMessage(typeKey)}`;
    } catch {
      return `${severityPrefix} ${getMessage("error.title.unknown")}`;
    }
  }

  /**
   * 获取错误消息
   */
  private getErrorMessage(error: unknown, errorType: ErrorType, context?: ErrorContext): string {
    const baseKey = `error.message.${errorType}`;
    
    try {
      let message = getMessage(baseKey);
      
      // 添加上下文信息
      if (context?.operation) {
        message += ` ${getMessage("error.context.operation")} ${context.operation}`;
      }
      
      // 添加具体错误信息（如果安全的话）
      if (error instanceof Error && this.isSafeToShow(error.message)) {
        message += ` ${getMessage("error.details")} ${error.message}`;
      }
      
      return message;
    } catch {
      return getMessage("error.message.unknown");
    }
  }

  /**
   * 获取错误建议
   */
  private getErrorSuggestions(errorType: ErrorType, error: unknown, context?: ErrorContext): string[] {
    const suggestions: string[] = [];
    
    try {
      // 基础建议
      const baseSuggestions = this.getBaseSuggestions(errorType);
      suggestions.push(...baseSuggestions);
      
      // 上下文相关建议
      if (context?.operation) {
        const contextSuggestions = this.getContextSuggestions(errorType, context.operation);
        suggestions.push(...contextSuggestions);
      }
      
      // 错误特定建议
      if (error instanceof Error) {
        const specificSuggestions = this.getSpecificSuggestions(errorType, error.message);
        suggestions.push(...specificSuggestions);
      }
      
      return suggestions.slice(0, 3); // 限制建议数量
    } catch {
      return [getMessage("error.suggestion.general")];
    }
  }

  /**
   * 获取基础建议
   */
  private getBaseSuggestions(errorType: ErrorType): string[] {
    const suggestions: string[] = [];
    
    switch (errorType) {
      case ErrorType.CONFIGURATION:
        suggestions.push(getMessage("error.suggestion.config.check"));
        suggestions.push(getMessage("error.suggestion.config.reset"));
        break;
      case ErrorType.NETWORK:
        suggestions.push(getMessage("error.suggestion.network.check"));
        suggestions.push(getMessage("error.suggestion.network.retry"));
        break;
      case ErrorType.AI_PROVIDER:
        suggestions.push(getMessage("error.suggestion.ai.check_provider"));
        suggestions.push(getMessage("error.suggestion.ai.check_model"));
        break;
      case ErrorType.FILE_SYSTEM:
        suggestions.push(getMessage("error.suggestion.file.check_path"));
        suggestions.push(getMessage("error.suggestion.file.check_permission"));
        break;
      case ErrorType.VALIDATION:
        suggestions.push(getMessage("error.suggestion.validation.check_input"));
        suggestions.push(getMessage("error.suggestion.validation.check_format"));
        break;
      case ErrorType.PERMISSION:
        suggestions.push(getMessage("error.suggestion.permission.check_access"));
        suggestions.push(getMessage("error.suggestion.permission.contact_admin"));
        break;
      default:
        suggestions.push(getMessage("error.suggestion.general"));
    }
    
    return suggestions;
  }

  /**
   * 获取上下文相关建议
   */
  private getContextSuggestions(errorType: ErrorType, operation: string): string[] {
    const suggestions: string[] = [];
    
    if (operation.includes("commit")) {
      suggestions.push(getMessage("error.suggestion.operation.commit"));
    } else if (operation.includes("branch")) {
      suggestions.push(getMessage("error.suggestion.operation.branch"));
    } else if (operation.includes("review")) {
      suggestions.push(getMessage("error.suggestion.operation.review"));
    }
    
    return suggestions;
  }

  /**
   * 获取错误特定建议
   */
  private getSpecificSuggestions(errorType: ErrorType, message: string): string[] {
    const suggestions: string[] = [];
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes("api key")) {
      suggestions.push(getMessage("error.suggestion.specific.api_key"));
    } else if (lowerMessage.includes("model")) {
      suggestions.push(getMessage("error.suggestion.specific.model"));
    } else if (lowerMessage.includes("timeout")) {
      suggestions.push(getMessage("error.suggestion.specific.timeout"));
    }
    
    return suggestions;
  }

  /**
   * 获取帮助链接
   */
  private getHelpLinks(errorType: ErrorType): string[] {
    const links: string[] = [];
    
    try {
      const baseLink = getMessage("error.help.base_url");
      
      switch (errorType) {
        case ErrorType.CONFIGURATION:
          links.push(`${baseLink}/configuration`);
          links.push(`${baseLink}/setup`);
          break;
        case ErrorType.AI_PROVIDER:
          links.push(`${baseLink}/ai-providers`);
          links.push(`${baseLink}/models`);
          break;
        case ErrorType.NETWORK:
          links.push(`${baseLink}/network-issues`);
          break;
        case ErrorType.FILE_SYSTEM:
          links.push(`${baseLink}/file-permissions`);
          break;
        default:
          links.push(`${baseLink}/troubleshooting`);
      }
      
      return links;
    } catch {
      return [getMessage("error.help.default_url")];
    }
  }

  /**
   * 判断是否可以重试
   */
  private canRetry(errorType: ErrorType, error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // 网络错误通常可以重试
      if (errorType === ErrorType.NETWORK) {
        return !message.includes("permission") && !message.includes("unauthorized");
      }
      
      // 临时性错误可以重试
      if (message.includes("timeout") || message.includes("temporary")) {
        return true;
      }
    }
    
    // 配置和权限错误通常不能重试
    return errorType !== ErrorType.CONFIGURATION && errorType !== ErrorType.PERMISSION;
  }

  /**
   * 构建错误上下文
   */
  private buildContext(error: unknown, context?: ErrorContext): Record<string, any> {
    const errorContext: Record<string, any> = {
      timestamp: new Date().toISOString(),
      errorType: this.classifyError(error),
      ...context
    };
    
    if (error instanceof Error) {
      errorContext.errorName = error.name;
      errorContext.errorMessage = error.message;
      errorContext.stack = error.stack;
    }
    
    return errorContext;
  }

  /**
   * 获取严重程度前缀
   */
  private getSeverityPrefix(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return "🚨";
      case ErrorSeverity.HIGH:
        return "⚠️";
      case ErrorSeverity.MEDIUM:
        return "ℹ️";
      case ErrorSeverity.LOW:
        return "💡";
      default:
        return "ℹ️";
    }
  }

  /**
   * 判断错误信息是否安全显示
   */
  private isSafeToShow(message: string): boolean {
    const sensitivePatterns = [
      /password/i,
      /token/i,
      /key/i,
      /secret/i,
      /credential/i,
      /auth/i
    ];
    
    return !sensitivePatterns.some(pattern => pattern.test(message));
  }

  /**
   * 获取回退错误信息
   */
  private getFallbackError(error: unknown): UserFriendlyError {
    return {
      title: getMessage("error.title.unknown"),
      message: getMessage("error.message.unknown"),
      suggestions: [getMessage("error.suggestion.general")],
      helpLinks: [getMessage("error.help.default_url")],
      severity: ErrorSeverity.MEDIUM,
      canRetry: false,
      context: {
        timestamp: new Date().toISOString(),
        originalError: String(error)
      }
    };
  }
}
