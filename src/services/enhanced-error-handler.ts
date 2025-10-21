import * as vscode from "vscode";
import { Logger } from "../utils/logger";
import { notify } from "../utils/notification/notification-manager";
import { ErrorTranslationService, UserFriendlyError, ErrorContext } from "./error-translation";
import { ErrorClassificationService, ErrorClassificationResult } from "./error-classification";
import { ErrorContextCollector } from "./error-context";

/**
 * 错误处理选项
 */
export interface ErrorHandlingOptions {
  showToUser?: boolean;
  logError?: boolean;
  collectContext?: boolean;
  suggestSolutions?: boolean;
  canRetry?: boolean;
  operation?: string;
  context?: any;
}

/**
 * 错误处理结果
 */
export interface ErrorHandlingResult {
  handled: boolean;
  userFriendlyError?: UserFriendlyError;
  classification?: ErrorClassificationResult;
  context?: ErrorContext;
  suggestedActions?: string[];
}

/**
 * 增强的错误处理服务
 * 整合错误翻译、分类和上下文收集功能
 */
export class EnhancedErrorHandler {
  private static instance: EnhancedErrorHandler;
  private logger: Logger;
  private errorTranslationService: ErrorTranslationService;
  private errorClassificationService: ErrorClassificationService;
  private errorContextCollector: ErrorContextCollector;

  private constructor(context: vscode.ExtensionContext) {
    this.logger = Logger.getInstance("EnhancedErrorHandler");
    this.errorTranslationService = ErrorTranslationService.getInstance();
    this.errorClassificationService = ErrorClassificationService.getInstance();
    this.errorContextCollector = ErrorContextCollector.getInstance(context);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(context?: vscode.ExtensionContext): EnhancedErrorHandler {
    if (!EnhancedErrorHandler.instance && context) {
      EnhancedErrorHandler.instance = new EnhancedErrorHandler(context);
    }
    return EnhancedErrorHandler.instance;
  }

  /**
   * 处理错误
   * @param error - 错误对象
   * @param options - 错误处理选项
   * @returns 错误处理结果
   */
  public async handleError(
    error: unknown, 
    options: ErrorHandlingOptions = {}
  ): Promise<ErrorHandlingResult> {
    const {
      showToUser = true,
      logError = true,
      collectContext = true,
      suggestSolutions = true,
      operation = "unknown"
    } = options;

    try {
      // 记录操作开始
      const actionId = this.errorContextCollector.recordUserAction(
        operation,
        undefined,
        options.context
      );

      // 收集错误上下文
      let errorContext: ErrorContext | undefined;
      if (collectContext) {
        errorContext = await this.errorContextCollector.collectErrorContext(error, operation);
      }

      // 分类错误
      const classification = this.errorClassificationService.classifyError(error, errorContext);

      // 翻译错误
      const userFriendlyError = this.errorTranslationService.translateError(error, errorContext);

      // 生成建议操作
      const suggestedActions = suggestSolutions ? 
        this.generateSuggestedActions(userFriendlyError, classification) : [];

      // 记录操作结果
      this.errorContextCollector.updateActionResult(actionId, "failure");

      // 记录错误日志
      if (logError) {
        this.logError(error, userFriendlyError, classification, errorContext);
      }

      // 显示用户友好的错误信息
      if (showToUser) {
        await this.showUserFriendlyError(userFriendlyError, suggestedActions);
      }

      return {
        handled: true,
        userFriendlyError,
        classification,
        context: errorContext,
        suggestedActions
      };

    } catch (handlingError) {
      this.logger.error(`Failed to handle error: ${handlingError}`, {
        error: handlingError instanceof Error ? handlingError : new Error(String(handlingError))
      });
      
      // 回退到基本错误处理
      return this.handleErrorFallback(error, options);
    }
  }

  /**
   * 处理可重试的错误
   * @param error - 错误对象
   * @param retryFunction - 重试函数
   * @param maxRetries - 最大重试次数
   * @param options - 错误处理选项
   */
  public async handleRetryableError<T>(
    error: unknown,
    retryFunction: () => Promise<T>,
    maxRetries: number = 3,
    options: ErrorHandlingOptions = {}
  ): Promise<T> {
    let lastError = error;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const result = await retryFunction();
        
        // 成功时记录操作
        if (options.operation) {
          const actionId = this.errorContextCollector.recordUserAction(
            `${options.operation}_retry_${retryCount}`,
            undefined,
            { retryCount, maxRetries }
          );
          this.errorContextCollector.updateActionResult(actionId, "success");
        }
        
        return result;
      } catch (retryError) {
        lastError = retryError;
        retryCount++;
        
        // 处理重试错误
        const handlingResult = await this.handleError(retryError, {
          ...options,
          showToUser: retryCount === maxRetries, // 只在最后一次重试失败时显示错误
          operation: `${options.operation}_retry_${retryCount}`
        });

        // 如果错误不可重试，立即退出
        if (!handlingResult.userFriendlyError?.canRetry) {
          break;
        }

        // 等待一段时间后重试
        if (retryCount < maxRetries) {
          await this.delay(Math.pow(2, retryCount) * 1000); // 指数退避
        }
      }
    }

    throw lastError;
  }

  /**
   * 获取错误统计信息
   */
  public getErrorStatistics() {
    return this.errorClassificationService.getErrorStatistics();
  }

  /**
   * 清理错误历史
   */
  public cleanupErrorHistory() {
    this.errorClassificationService.cleanupErrorHistory();
    this.errorContextCollector.cleanupActionHistory();
  }

  /**
   * 生成建议操作
   */
  private generateSuggestedActions(
    userFriendlyError: UserFriendlyError,
    classification: ErrorClassificationResult
  ): string[] {
    const actions: string[] = [];
    
    // 添加翻译服务提供的建议
    actions.push(...userFriendlyError.suggestions);
    
    // 添加分类服务提供的建议
    actions.push(...classification.suggestedActions);
    
    // 去重并限制数量
    return [...new Set(actions)].slice(0, 5);
  }

  /**
   * 记录错误日志
   */
  private logError(
    error: unknown,
    userFriendlyError: UserFriendlyError,
    classification: ErrorClassificationResult,
    context?: ErrorContext
  ): void {
    const logData = {
      originalError: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : String(error),
      userFriendlyError: {
        title: userFriendlyError.title,
        message: userFriendlyError.message,
        severity: userFriendlyError.severity
      },
      classification: {
        errorType: classification.errorType,
        severity: classification.severity,
        confidence: classification.confidence
      },
      context: context ? {
        operation: context.operation,
        timestamp: context.timestamp,
        workspacePath: context.workspacePath
      } : undefined
    };

    this.logger.error(`Enhanced error handling: ${logData}`);
  }

  /**
   * 显示用户友好的错误信息
   */
  private async showUserFriendlyError(
    userFriendlyError: UserFriendlyError,
    suggestedActions: string[]
  ): Promise<void> {
    try {
      const message = `${userFriendlyError.title}\n\n${userFriendlyError.message}`;
      
      // 构建按钮选项
      const buttons: string[] = [];
      
      if (suggestedActions.length > 0) {
        buttons.push("查看解决方案");
      }
      
      if (userFriendlyError.helpLinks.length > 0) {
        buttons.push("查看帮助");
      }
      
      if (userFriendlyError.canRetry) {
        buttons.push("重试");
      }
      
      buttons.push("确定");

      const result = await notify.error(message, [], {
        buttons,
        modal: userFriendlyError.severity === "critical"
      });

      // 处理用户选择
      if (result === "查看解决方案" && suggestedActions.length > 0) {
        await this.showSolutions(suggestedActions);
      } else if (result === "查看帮助" && userFriendlyError.helpLinks.length > 0) {
        await this.showHelp(userFriendlyError.helpLinks);
      } else if (result === "重试" && userFriendlyError.canRetry) {
        // 重试逻辑由调用方处理
        throw new Error("RETRY_REQUESTED");
      }
    } catch (error) {
      if (error instanceof Error && error.message === "RETRY_REQUESTED") {
        throw error; // 重新抛出重试请求
      }
      this.logger.error(`Failed to show user friendly error: ${error}`, {
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  /**
   * 显示解决方案
   */
  private async showSolutions(suggestedActions: string[]): Promise<void> {
    const solutionsText = suggestedActions
      .map((action, index) => `${index + 1}. ${action}`)
      .join('\n');
    
    const message = `建议的解决方案：\n\n${solutionsText}`;
    
    await notify.info(message, [], {
      buttons: ["确定"],
      modal: true
    });
  }

  /**
   * 显示帮助链接
   */
  private async showHelp(helpLinks: string[]): Promise<void> {
    if (helpLinks.length === 1) {
      // 单个链接直接打开
      await vscode.env.openExternal(vscode.Uri.parse(helpLinks[0]));
    } else {
      // 多个链接让用户选择
      const linkItems: vscode.QuickPickItem[] = helpLinks.map((link, index) => ({
        label: `帮助链接 ${index + 1}`,
        description: link,
        detail: link
      }));
      
      const selected = await vscode.window.showQuickPick(linkItems, {
        placeHolder: "选择要查看的帮助链接"
      });
      
      if (selected && selected.detail) {
        await vscode.env.openExternal(vscode.Uri.parse(selected.detail));
      }
    }
  }

  /**
   * 回退错误处理
   */
  private async handleErrorFallback(
    error: unknown,
    options: ErrorHandlingOptions
  ): Promise<ErrorHandlingResult> {
    const message = error instanceof Error ? error.message : String(error);
    
    if (options.showToUser) {
      await notify.error(message);
    }
    
    if (options.logError) {
      this.logger.error("Fallback error handling", {
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
    
    return {
      handled: false,
      suggestedActions: ["查看帮助文档", "联系技术支持"]
    };
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
