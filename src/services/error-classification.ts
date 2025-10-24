import { Logger } from "../utils/logger";
import { ErrorType, ErrorSeverity } from "./error-translation";

/**
 * 错误分类规则接口
 */
export interface ErrorClassificationRule {
  id: string;
  name: string;
  pattern: RegExp;
  errorType: ErrorType;
  severity: ErrorSeverity;
  priority: number;
  description: string;
}

/**
 * 错误分类结果
 */
export interface ErrorClassificationResult {
  errorType: ErrorType;
  severity: ErrorSeverity;
  confidence: number;
  matchedRules: ErrorClassificationRule[];
  suggestedActions: string[];
}

/**
 * 错误统计信息
 */
export interface ErrorStatistics {
  totalErrors: number;
  errorsByType: Record<ErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recentErrors: Array<{
    timestamp: Date;
    errorType: ErrorType;
    severity: ErrorSeverity;
    message: string;
  }>;
  trends: {
    increasing: ErrorType[];
    decreasing: ErrorType[];
    stable: ErrorType[];
  };
}

/**
 * 错误分类服务
 * 负责对错误进行分类、分级和统计分析
 */
export class ErrorClassificationService {
  private static instance: ErrorClassificationService;
  private logger: Logger;
  private classificationRules: ErrorClassificationRule[];
  private errorHistory: Array<{
    timestamp: Date;
    errorType: ErrorType;
    severity: ErrorSeverity;
    message: string;
    context?: any;
  }>;

  private constructor() {
    this.logger = Logger.getInstance("ErrorClassificationService");
    this.classificationRules = this.initializeClassificationRules();
    this.errorHistory = [];
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ErrorClassificationService {
    if (!ErrorClassificationService.instance) {
      ErrorClassificationService.instance = new ErrorClassificationService();
    }
    return ErrorClassificationService.instance;
  }

  /**
   * 分类错误
   * @param error - 错误对象
   * @param context - 错误上下文
   * @returns 分类结果
   */
  public classifyError(error: unknown, context?: any): ErrorClassificationResult {
    try {
      const errorMessage = this.extractErrorMessage(error);
      const matchedRules = this.findMatchingRules(errorMessage);
      
      if (matchedRules.length === 0) {
        return this.getDefaultClassification();
      }
      
      // 选择优先级最高的规则
      const primaryRule = matchedRules.reduce((prev, current) => 
        current.priority > prev.priority ? current : prev
      );
      
      const confidence = this.calculateConfidence(matchedRules, errorMessage);
      const suggestedActions = this.generateSuggestedActions(primaryRule, context);
      
      // 记录错误历史
      this.recordError(error, primaryRule.errorType, primaryRule.severity, context);
      
      return {
        errorType: primaryRule.errorType,
        severity: primaryRule.severity,
        confidence,
        matchedRules,
        suggestedActions
      };
    } catch (classificationError) {
      this.logger.error("Error classification failed", {
        error: classificationError instanceof Error ? classificationError : new Error(String(classificationError))
      });
      return this.getDefaultClassification();
    }
  }

  /**
   * 获取错误统计信息
   * @param timeRange - 时间范围（小时）
   * @returns 错误统计信息
   */
  public getErrorStatistics(timeRange: number = 24): ErrorStatistics {
    const cutoffTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);
    const recentErrors = this.errorHistory.filter(
      error => error.timestamp >= cutoffTime
    );
    
    const errorsByType: Record<ErrorType, number> = {} as Record<ErrorType, number>;
    const errorsBySeverity: Record<ErrorSeverity, number> = {} as Record<ErrorSeverity, number>;
    
    // 初始化计数器
    Object.values(ErrorType).forEach(type => errorsByType[type] = 0);
    Object.values(ErrorSeverity).forEach(severity => errorsBySeverity[severity] = 0);
    
    // 统计错误
    recentErrors.forEach(error => {
      errorsByType[error.errorType]++;
      errorsBySeverity[error.severity]++;
    });
    
    // 计算趋势
    const trends = this.calculateTrends(timeRange);
    
    return {
      totalErrors: recentErrors.length,
      errorsByType,
      errorsBySeverity,
      recentErrors: recentErrors.slice(-10), // 最近10个错误
      trends
    };
  }

  /**
   * 添加自定义分类规则
   * @param rule - 分类规则
   */
  public addClassificationRule(rule: ErrorClassificationRule): void {
    this.classificationRules.push(rule);
    this.classificationRules.sort((a, b) => b.priority - a.priority);
    this.logger.info(`Added classification rule: ${rule.name}`);
  }

  /**
   * 移除分类规则
   * @param ruleId - 规则ID
   */
  public removeClassificationRule(ruleId: string): void {
    const index = this.classificationRules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.classificationRules.splice(index, 1);
      this.logger.info(`Removed classification rule: ${ruleId}`);
    }
  }

  /**
   * 获取所有分类规则
   */
  public getClassificationRules(): ErrorClassificationRule[] {
    return [...this.classificationRules];
  }

  /**
   * 清理错误历史
   * @param olderThanHours - 清理多少小时前的历史
   */
  public cleanupErrorHistory(olderThanHours: number = 168): void { // 默认7天
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const initialCount = this.errorHistory.length;
    this.errorHistory = this.errorHistory.filter(error => error.timestamp >= cutoffTime);
    const removedCount = initialCount - this.errorHistory.length;
    
    if (removedCount > 0) {
      this.logger.info(`Cleaned up ${removedCount} old error records`);
    }
  }

  /**
   * 初始化分类规则
   */
  private initializeClassificationRules(): ErrorClassificationRule[] {
    return [
      // 配置相关错误
      {
        id: "config-api-key-missing",
        name: "API Key Missing",
        pattern: /api.*key.*missing|missing.*api.*key/i,
        errorType: ErrorType.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        priority: 100,
        description: "API密钥缺失"
      },
      {
        id: "config-invalid-format",
        name: "Invalid Configuration Format",
        pattern: /invalid.*config|config.*invalid|malformed.*config/i,
        errorType: ErrorType.CONFIGURATION,
        severity: ErrorSeverity.MEDIUM,
        priority: 90,
        description: "配置格式无效"
      },
      
      // 网络相关错误
      {
        id: "network-connection-failed",
        name: "Network Connection Failed",
        pattern: /connection.*failed|failed.*to.*connect|network.*error/i,
        errorType: ErrorType.NETWORK,
        severity: ErrorSeverity.HIGH,
        priority: 95,
        description: "网络连接失败"
      },
      {
        id: "network-timeout",
        name: "Network Timeout",
        pattern: /timeout|request.*timeout|connection.*timeout/i,
        errorType: ErrorType.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        priority: 85,
        description: "网络超时"
      },
      
      // AI提供商相关错误
      {
        id: "ai-provider-unavailable",
        name: "AI Provider Unavailable",
        pattern: /provider.*unavailable|service.*unavailable|ai.*service.*down/i,
        errorType: ErrorType.AI_PROVIDER,
        severity: ErrorSeverity.HIGH,
        priority: 90,
        description: "AI服务不可用"
      },
      {
        id: "ai-model-not-found",
        name: "AI Model Not Found",
        pattern: /model.*not.*found|invalid.*model|model.*does.*not.*exist/i,
        errorType: ErrorType.AI_PROVIDER,
        severity: ErrorSeverity.MEDIUM,
        priority: 80,
        description: "AI模型不存在"
      },
      {
        id: "ai-quota-exceeded",
        name: "AI Quota Exceeded",
        pattern: /quota.*exceeded|rate.*limit|usage.*limit/i,
        errorType: ErrorType.AI_PROVIDER,
        severity: ErrorSeverity.MEDIUM,
        priority: 75,
        description: "AI配额超限"
      },
      
      // 文件系统相关错误
      {
        id: "file-not-found",
        name: "File Not Found",
        pattern: /file.*not.*found|no.*such.*file|path.*does.*not.*exist/i,
        errorType: ErrorType.FILE_SYSTEM,
        severity: ErrorSeverity.MEDIUM,
        priority: 70,
        description: "文件不存在"
      },
      {
        id: "file-permission-denied",
        name: "File Permission Denied",
        pattern: /permission.*denied|access.*denied|eacces/i,
        errorType: ErrorType.FILE_SYSTEM,
        severity: ErrorSeverity.HIGH,
        priority: 85,
        description: "文件权限被拒绝"
      },
      
      // 验证相关错误
      {
        id: "validation-required-field",
        name: "Required Field Missing",
        pattern: /required.*field|field.*is.*required|missing.*required/i,
        errorType: ErrorType.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        priority: 60,
        description: "必填字段缺失"
      },
      {
        id: "validation-invalid-format",
        name: "Invalid Format",
        pattern: /invalid.*format|format.*invalid|malformed.*input/i,
        errorType: ErrorType.VALIDATION,
        severity: ErrorSeverity.LOW,
        priority: 50,
        description: "格式无效"
      },
      
      // 权限相关错误
      {
        id: "permission-unauthorized",
        name: "Unauthorized Access",
        pattern: /unauthorized|forbidden|access.*denied|insufficient.*permission/i,
        errorType: ErrorType.PERMISSION,
        severity: ErrorSeverity.CRITICAL,
        priority: 100,
        description: "未授权访问"
      }
    ];
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

  /**
   * 查找匹配的规则
   */
  private findMatchingRules(errorMessage: string): ErrorClassificationRule[] {
    return this.classificationRules.filter(rule => 
      rule.pattern.test(errorMessage)
    );
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(matchedRules: ErrorClassificationRule[], errorMessage: string): number {
    if (matchedRules.length === 0) {
      return 0;
    }
    
    // 基于匹配规则数量和优先级计算置信度
    const maxPriority = Math.max(...matchedRules.map(rule => rule.priority));
    const ruleCount = matchedRules.length;
    
    // 基础置信度基于最高优先级
    let confidence = Math.min(maxPriority / 100, 1);
    
    // 多个规则匹配增加置信度
    if (ruleCount > 1) {
      confidence += 0.1 * Math.min(ruleCount - 1, 3);
    }
    
    return Math.min(confidence, 1);
  }

  /**
   * 生成建议操作
   */
  private generateSuggestedActions(rule: ErrorClassificationRule, context?: any): string[] {
    const actions: string[] = [];
    
    switch (rule.errorType) {
      case ErrorType.CONFIGURATION:
        actions.push("检查配置设置");
        actions.push("验证API密钥");
        break;
      case ErrorType.NETWORK:
        actions.push("检查网络连接");
        actions.push("重试操作");
        break;
      case ErrorType.AI_PROVIDER:
        actions.push("检查AI服务状态");
        actions.push("验证模型配置");
        break;
      case ErrorType.FILE_SYSTEM:
        actions.push("检查文件路径");
        actions.push("验证文件权限");
        break;
      case ErrorType.VALIDATION:
        actions.push("检查输入格式");
        actions.push("验证必填字段");
        break;
      case ErrorType.PERMISSION:
        actions.push("检查用户权限");
        actions.push("联系管理员");
        break;
    }
    
    return actions;
  }

  /**
   * 记录错误历史
   */
  private recordError(error: unknown, errorType: ErrorType, severity: ErrorSeverity, context?: any): void {
    const errorRecord = {
      timestamp: new Date(),
      errorType,
      severity,
      message: this.extractErrorMessage(error),
      context
    };
    
    this.errorHistory.push(errorRecord);
    
    // 限制历史记录数量
    if (this.errorHistory.length > 1000) {
      this.errorHistory = this.errorHistory.slice(-500);
    }
  }

  /**
   * 计算错误趋势
   */
  private calculateTrends(timeRange: number): { increasing: ErrorType[]; decreasing: ErrorType[]; stable: ErrorType[] } {
    const currentPeriod = timeRange;
    const previousPeriod = timeRange * 2;
    
    const currentCutoff = new Date(Date.now() - currentPeriod * 60 * 60 * 1000);
    const previousCutoff = new Date(Date.now() - previousPeriod * 60 * 60 * 1000);
    
    const currentErrors = this.errorHistory.filter(e => e.timestamp >= currentCutoff);
    const previousErrors = this.errorHistory.filter(
      e => e.timestamp >= previousCutoff && e.timestamp < currentCutoff
    );
    
    const currentCounts: Record<ErrorType, number> = {} as Record<ErrorType, number>;
    const previousCounts: Record<ErrorType, number> = {} as Record<ErrorType, number>;
    
    // 初始化计数器
    Object.values(ErrorType).forEach(type => {
      currentCounts[type] = 0;
      previousCounts[type] = 0;
    });
    
    // 统计当前和之前的错误数量
    currentErrors.forEach(error => currentCounts[error.errorType]++);
    previousErrors.forEach(error => previousCounts[error.errorType]++);
    
    const increasing: ErrorType[] = [];
    const decreasing: ErrorType[] = [];
    const stable: ErrorType[] = [];
    
    Object.values(ErrorType).forEach(type => {
      const current = currentCounts[type];
      const previous = previousCounts[type];
      
      if (previous === 0) {
        if (current > 0) {
          increasing.push(type);
        } else {
          stable.push(type);
        }
      } else {
        const change = (current - previous) / previous;
        if (change > 0.2) {
          increasing.push(type);
        } else if (change < -0.2) {
          decreasing.push(type);
        } else {
          stable.push(type);
        }
      }
    });
    
    return { increasing, decreasing, stable };
  }

  /**
   * 获取默认分类
   */
  private getDefaultClassification(): ErrorClassificationResult {
    return {
      errorType: ErrorType.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      confidence: 0.1,
      matchedRules: [],
      suggestedActions: ["查看帮助文档", "联系技术支持"]
    };
  }
}
