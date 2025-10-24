import * as vscode from "vscode";
import { Logger } from "../utils/logger";
import { ErrorContext } from "./error-translation";

/**
 * 用户操作历史记录
 */
export interface UserAction {
  id: string;
  timestamp: Date;
  action: string;
  target?: string;
  parameters?: Record<string, any>;
  result?: "success" | "failure" | "partial";
  duration?: number;
}

/**
 * 系统环境信息
 */
export interface SystemEnvironment {
  vscodeVersion: string;
  extensionVersion: string;
  platform: string;
  architecture: string;
  workspacePath?: string;
  activeLanguage?: string;
  openFiles: string[];
  gitStatus?: {
    branch: string;
    hasUncommittedChanges: boolean;
    lastCommit?: string;
  };
}

/**
 * 错误关联分析结果
 */
export interface ErrorCorrelation {
  relatedErrors: Array<{
    error: string;
    timestamp: Date;
    correlation: number;
  }>;
  patterns: Array<{
    pattern: string;
    frequency: number;
    severity: "low" | "medium" | "high";
  }>;
  rootCause?: {
    type: string;
    description: string;
    confidence: number;
  };
}

/**
 * 错误上下文收集器
 * 负责收集错误发生时的环境信息和用户操作历史
 */
export class ErrorContextCollector {
  private static instance: ErrorContextCollector;
  private logger: Logger;
  private userActions: UserAction[];
  private maxActionHistory: number = 100;
  private context: vscode.ExtensionContext;

  private constructor(context: vscode.ExtensionContext) {
    this.logger = Logger.getInstance("ErrorContextCollector");
    this.context = context;
    this.userActions = [];
    this.loadActionHistory();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(context?: vscode.ExtensionContext): ErrorContextCollector {
    if (!ErrorContextCollector.instance && context) {
      ErrorContextCollector.instance = new ErrorContextCollector(context);
    }
    return ErrorContextCollector.instance;
  }

  /**
   * 收集错误上下文
   * @param error - 错误对象
   * @param operation - 操作名称
   * @returns 完整的错误上下文
   */
  public async collectErrorContext(error: unknown, operation: string): Promise<ErrorContext> {
    try {
      const timestamp = new Date();
      const systemEnv = await this.collectSystemEnvironment();
      const recentActions = this.getRecentActions(10);
      const correlation = await this.analyzeErrorCorrelation(error);
      
      return {
        operation,
        timestamp,
        userId: await this.getUserId(),
        workspacePath: this.getWorkspacePath(),
        additionalInfo: {
          systemEnvironment: systemEnv,
          recentActions,
          errorCorrelation: correlation,
          errorDetails: this.extractErrorDetails(error)
        }
      };
    } catch (contextError) {
      this.logger.error("Failed to collect error context", {
        error: contextError instanceof Error ? contextError : new Error(String(contextError))
      });
      return {
        operation,
        timestamp: new Date(),
        additionalInfo: {
          contextCollectionError: String(contextError)
        }
      };
    }
  }

  /**
   * 记录用户操作
   * @param action - 操作名称
   * @param target - 操作目标
   * @param parameters - 操作参数
   */
  public recordUserAction(
    action: string, 
    target?: string, 
    parameters?: Record<string, any>
  ): string {
    const actionId = this.generateActionId();
    const userAction: UserAction = {
      id: actionId,
      timestamp: new Date(),
      action,
      target,
      parameters: this.sanitizeParameters(parameters),
      result: "success"
    };
    
    this.userActions.push(userAction);
    this.trimActionHistory();
    this.saveActionHistory();
    
    return actionId;
  }

  /**
   * 更新操作结果
   * @param actionId - 操作ID
   * @param result - 操作结果
   * @param duration - 操作持续时间
   */
  public updateActionResult(
    actionId: string, 
    result: "success" | "failure" | "partial",
    duration?: number
  ): void {
    const action = this.userActions.find(a => a.id === actionId);
    if (action) {
      action.result = result;
      action.duration = duration;
      this.saveActionHistory();
    }
  }

  /**
   * 获取用户操作历史
   * @param limit - 限制数量
   * @returns 用户操作历史
   */
  public getUserActionHistory(limit: number = 50): UserAction[] {
    return this.userActions.slice(-limit);
  }

  /**
   * 清理操作历史
   * @param olderThanDays - 清理多少天前的历史
   */
  public cleanupActionHistory(olderThanDays: number = 30): void {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const initialCount = this.userActions.length;
    this.userActions = this.userActions.filter(action => action.timestamp >= cutoffDate);
    const removedCount = initialCount - this.userActions.length;
    
    if (removedCount > 0) {
      this.logger.info(`Cleaned up ${removedCount} old action records`);
      this.saveActionHistory();
    }
  }

  /**
   * 收集系统环境信息
   */
  private async collectSystemEnvironment(): Promise<SystemEnvironment> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const activeEditor = vscode.window.activeTextEditor;
    
    let gitStatus;
    try {
      gitStatus = await this.getGitStatus();
    } catch (error) {
      this.logger.warn("Failed to get git status", {
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
    
    return {
      vscodeVersion: vscode.version,
      extensionVersion: this.getExtensionVersion(),
      platform: process.platform,
      architecture: process.arch,
      workspacePath: workspaceFolders?.[0]?.uri.fsPath,
      activeLanguage: activeEditor?.document.languageId,
      openFiles: vscode.workspace.textDocuments.map(doc => doc.fileName),
      gitStatus
    };
  }

  /**
   * 获取Git状态
   */
  private async getGitStatus(): Promise<SystemEnvironment["gitStatus"]> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        return undefined;
      }
      
      const gitExtension = vscode.extensions.getExtension("vscode.git");
      if (!gitExtension) {
        return undefined;
      }
      
      const git = gitExtension.exports.getAPI(1);
      const repository = git.repositories.find((repo: any) => 
        repo.rootUri.fsPath === workspaceFolder.uri.fsPath
      );
      
      if (!repository) {
        return undefined;
      }
      
      return {
        branch: repository.state.HEAD?.name || "unknown",
        hasUncommittedChanges: repository.state.workingTreeChanges.length > 0,
        lastCommit: repository.state.HEAD?.commit
      };
    } catch (error) {
      this.logger.warn("Failed to get git status", {
        error: error instanceof Error ? error : new Error(String(error))
      });
      return undefined;
    }
  }

  /**
   * 获取扩展版本
   */
  private getExtensionVersion(): string {
    try {
      const extension = vscode.extensions.getExtension("dish-ai-commit-gen");
      return extension?.packageJSON?.version || "unknown";
    } catch {
      return "unknown";
    }
  }

  /**
   * 获取用户ID
   */
  private async getUserId(): Promise<string | undefined> {
    try {
      // 使用VS Code的机器ID作为用户标识
      return await vscode.env.machineId;
    } catch {
      return undefined;
    }
  }

  /**
   * 获取工作区路径
   */
  private getWorkspacePath(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  /**
   * 获取最近的操作
   */
  private getRecentActions(limit: number): UserAction[] {
    return this.userActions.slice(-limit);
  }

  /**
   * 分析错误关联
   */
  private async analyzeErrorCorrelation(error: unknown): Promise<ErrorCorrelation> {
    const errorMessage = this.extractErrorMessage(error);
    const recentErrors = this.getRecentErrors(24); // 最近24小时的错误
    
    const relatedErrors = recentErrors
      .map(recentError => ({
        error: recentError.message,
        timestamp: recentError.timestamp,
        correlation: this.calculateCorrelation(errorMessage, recentError.message)
      }))
      .filter(item => item.correlation > 0.3)
      .sort((a, b) => b.correlation - a.correlation)
      .slice(0, 5);
    
    const patterns = this.identifyErrorPatterns(recentErrors);
    const rootCause = this.identifyRootCause(recentErrors, errorMessage);
    
    return {
      relatedErrors,
      patterns,
      rootCause
    };
  }

  /**
   * 提取错误详情
   */
  private extractErrorDetails(error: unknown): Record<string, any> {
    const details: Record<string, any> = {};
    
    if (error instanceof Error) {
      details.name = error.name;
      details.message = error.message;
      details.stack = error.stack;
    } else if (typeof error === "string") {
      details.message = error;
    } else {
      details.raw = String(error);
    }
    
    return details;
  }

  /**
   * 生成操作ID
   */
  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理参数（移除敏感信息）
   */
  private sanitizeParameters(parameters?: Record<string, any>): Record<string, any> | undefined {
    if (!parameters) {
      return undefined;
    }
    
    const sanitized: Record<string, any> = {};
    const sensitiveKeys = ["password", "token", "key", "secret", "credential"];
    
    for (const [key, value] of Object.entries(parameters)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * 修剪操作历史
   */
  private trimActionHistory(): void {
    if (this.userActions.length > this.maxActionHistory) {
      this.userActions = this.userActions.slice(-this.maxActionHistory);
    }
  }

  /**
   * 保存操作历史
   */
  private saveActionHistory(): void {
    try {
      const historyData = JSON.stringify(this.userActions, null, 2);
      this.context.globalState.update("userActionHistory", historyData);
    } catch (error) {
      this.logger.error("Failed to save action history", {
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  /**
   * 加载操作历史
   */
  private loadActionHistory(): void {
    try {
      const historyData = this.context.globalState.get<string>("userActionHistory");
      if (historyData) {
        this.userActions = JSON.parse(historyData).map((action: any) => ({
          ...action,
          timestamp: new Date(action.timestamp)
        }));
      }
    } catch (error) {
      this.logger.error("Failed to load action history", {
        error: error instanceof Error ? error : new Error(String(error))
      });
      this.userActions = [];
    }
  }

  /**
   * 获取最近的错误
   */
  private getRecentErrors(hours: number): Array<{ message: string; timestamp: Date }> {
    // 这里应该从错误历史中获取，暂时返回空数组
    // 实际实现中应该与错误分类服务集成
    return [];
  }

  /**
   * 计算错误关联度
   */
  private calculateCorrelation(message1: string, message2: string): number {
    const words1 = new Set(message1.toLowerCase().split(/\s+/));
    const words2 = new Set(message2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * 识别错误模式
   */
  private identifyErrorPatterns(errors: Array<{ message: string; timestamp: Date }>): Array<{
    pattern: string;
    frequency: number;
    severity: "low" | "medium" | "high";
  }> {
    const patterns: Record<string, number> = {};
    
    errors.forEach(error => {
      const words = error.message.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) {
          patterns[word] = (patterns[word] || 0) + 1;
        }
      });
    });
    
    return Object.entries(patterns)
      .filter(([, frequency]) => frequency > 1)
      .map(([pattern, frequency]): {
        pattern: string;
        frequency: number;
        severity: "low" | "medium" | "high";
      } => ({
        pattern,
        frequency,
        severity: (frequency > 5 ? "high" : frequency > 2 ? "medium" : "low") as "low" | "medium" | "high"
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  /**
   * 识别根本原因
   */
  private identifyRootCause(
    errors: Array<{ message: string; timestamp: Date }>, 
    currentError: string
  ): { type: string; description: string; confidence: number } | undefined {
    if (errors.length < 3) {
      return undefined;
    }
    
    // 简单的根本原因分析逻辑
    const commonWords = this.findCommonWords(errors.map(e => e.message));
    
    if (commonWords.length > 0) {
      return {
        type: "recurring_pattern",
        description: `重复出现的错误模式: ${commonWords.join(", ")}`,
        confidence: Math.min(commonWords.length / 5, 1)
      };
    }
    
    return undefined;
  }

  /**
   * 查找共同词汇
   */
  private findCommonWords(messages: string[]): string[] {
    const wordCounts: Record<string, number> = {};
    
    messages.forEach(message => {
      const words = message.toLowerCase().split(/\s+/);
      const uniqueWords = new Set(words);
      uniqueWords.forEach(word => {
        if (word.length > 3) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });
    });
    
    return Object.entries(wordCounts)
      .filter(([, count]) => count >= messages.length * 0.5)
      .map(([word]) => word)
      .slice(0, 5);
  }

  /**
   * 提取错误消息
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    return String(error);
  }
}
