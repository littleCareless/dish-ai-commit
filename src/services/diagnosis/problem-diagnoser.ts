import { Logger } from "../../utils/logger";
import { ErrorType, ErrorSeverity } from "../error-translation";

/**
 * 问题模式接口
 */
export interface ProblemPattern {
  id: string;
  name: string;
  description: string;
  severity: ErrorSeverity;
  category: ErrorType;
  patterns: RegExp[];
  conditions: ProblemCondition[];
  solutions: string[];
  prevention: string[];
}

/**
 * 问题条件接口
 */
export interface ProblemCondition {
  type: 'error_message' | 'system_state' | 'user_action' | 'environment';
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'exists' | 'not_exists';
  value: any;
  weight: number;
}

/**
 * 诊断结果接口
 */
export interface DiagnosisResult {
  problemId: string;
  problemName: string;
  confidence: number;
  severity: ErrorSeverity;
  category: ErrorType;
  description: string;
  rootCause: string;
  solutions: string[];
  prevention: string[];
  relatedProblems: string[];
  metadata: Record<string, any>;
}

/**
 * 系统状态接口
 */
export interface SystemState {
  timestamp: Date;
  environment: {
    vscodeVersion: string;
    extensionVersion: string;
    platform: string;
    nodeVersion: string;
  };
  configuration: {
    hasApiKey: boolean;
    provider: string;
    model: string;
    settings: Record<string, any>;
  };
  network: {
    connectivity: boolean;
    latency?: number;
    lastCheck: Date;
  };
  git: {
    isRepository: boolean;
    hasChanges: boolean;
    branch?: string;
    lastCommit?: Date;
  };
  errors: Array<{
    message: string;
    timestamp: Date;
    context: any;
  }>;
}

/**
 * 问题诊断引擎
 * 负责自动检测和诊断系统问题
 */
export class ProblemDiagnoser {
  private static instance: ProblemDiagnoser;
  private logger: Logger;
  private problemPatterns: ProblemPattern[] = [];
  private systemState: SystemState | null = null;

  private constructor() {
    this.logger = Logger.getInstance("ProblemDiagnoser");
    this.initializeProblemPatterns();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ProblemDiagnoser {
    if (!ProblemDiagnoser.instance) {
      ProblemDiagnoser.instance = new ProblemDiagnoser();
    }
    return ProblemDiagnoser.instance;
  }

  /**
   * 诊断问题
   * @param error - 错误对象
   * @param context - 错误上下文
   * @param systemState - 系统状态
   * @returns 诊断结果列表
   */
  public async diagnoseProblem(
    error: unknown,
    context?: any,
    systemState?: SystemState
  ): Promise<DiagnosisResult[]> {
    try {
      this.systemState = systemState || await this.collectSystemState();
      
      const errorMessage = this.extractErrorMessage(error);
      const results: DiagnosisResult[] = [];

      // 遍历所有问题模式
      for (const pattern of this.problemPatterns) {
        const confidence = this.calculatePatternConfidence(pattern, errorMessage, context);
        
        if (confidence > 0.3) { // 置信度阈值
          const result = this.createDiagnosisResult(pattern, confidence, errorMessage, context);
          results.push(result);
        }
      }

      // 按置信度排序
      return results.sort((a, b) => b.confidence - a.confidence);
    } catch (diagnosisError) {
      this.logger.error(`Problem diagnosis failed: ${diagnosisError}` );
      return [];
    }
  }

  /**
   * 获取问题模式
   * @param category - 问题分类
   * @returns 问题模式列表
   */
  public getProblemPatterns(category?: ErrorType): ProblemPattern[] {
    if (category) {
      return this.problemPatterns.filter(pattern => pattern.category === category);
    }
    return [...this.problemPatterns];
  }

  /**
   * 添加自定义问题模式
   * @param pattern - 问题模式
   */
  public addProblemPattern(pattern: ProblemPattern): void {
    this.problemPatterns.push(pattern);
    this.logger.info(`Added problem pattern: ${pattern.name}`);
  }

  /**
   * 获取系统状态
   * @returns 当前系统状态
   */
  public getSystemState(): SystemState | null {
    return this.systemState;
  }

  /**
   * 收集系统状态
   */
  private async collectSystemState(): Promise<SystemState> {
    const timestamp = new Date();
    
    return {
      timestamp,
      environment: {
        vscodeVersion: "1.0.0", // 从VS Code API获取
        extensionVersion: "1.0.0", // 从扩展信息获取
        platform: process.platform,
        nodeVersion: process.version
      },
      configuration: {
        hasApiKey: false, // 从配置管理器获取
        provider: "unknown",
        model: "unknown",
        settings: {}
      },
      network: {
        connectivity: true,
        lastCheck: timestamp
      },
      git: {
        isRepository: false,
        hasChanges: false
      },
      errors: []
    };
  }

  /**
   * 初始化问题模式
   */
  private initializeProblemPatterns(): void {
    this.problemPatterns = [
      // API配置问题
      {
        id: 'api-key-missing',
        name: 'API密钥缺失',
        description: '用户未配置AI提供商的API密钥',
        severity: ErrorSeverity.HIGH,
        category: ErrorType.CONFIGURATION,
        patterns: [
          /api.*key.*missing/i,
          /missing.*api.*key/i,
          /no.*api.*key/i
        ],
        conditions: [
          {
            type: 'system_state',
            field: 'configuration.hasApiKey',
            operator: 'equals',
            value: false,
            weight: 0.8
          }
        ],
        solutions: [
          '在设置中配置API密钥',
          '检查API密钥格式是否正确',
          '确认API密钥是否有效'
        ],
        prevention: [
          '在首次使用时配置API密钥',
          '定期检查API密钥状态',
          '备份API密钥配置'
        ]
      },
      {
        id: 'api-key-invalid',
        name: 'API密钥无效',
        description: '配置的API密钥格式不正确或已过期',
        severity: ErrorSeverity.HIGH,
        category: ErrorType.CONFIGURATION,
        patterns: [
          /invalid.*api.*key/i,
          /unauthorized/i,
          /authentication.*failed/i,
          /401.*unauthorized/i
        ],
        conditions: [
          {
            type: 'system_state',
            field: 'configuration.hasApiKey',
            operator: 'equals',
            value: true,
            weight: 0.6
          }
        ],
        solutions: [
          '检查API密钥格式',
          '重新生成API密钥',
          '确认API密钥权限',
          '检查API密钥是否过期'
        ],
        prevention: [
          '使用正确的API密钥格式',
          '定期更新API密钥',
          '检查API密钥权限设置'
        ]
      },

      // 网络连接问题
      {
        id: 'network-connection-failed',
        name: '网络连接失败',
        description: '无法连接到AI服务提供商',
        severity: ErrorSeverity.HIGH,
        category: ErrorType.NETWORK,
        patterns: [
          /connection.*failed/i,
          /network.*error/i,
          /timeout/i,
          /connection.*refused/i,
          /dns.*error/i
        ],
        conditions: [
          {
            type: 'system_state',
            field: 'network.connectivity',
            operator: 'equals',
            value: false,
            weight: 0.9
          }
        ],
        solutions: [
          '检查网络连接',
          '检查防火墙设置',
          '尝试使用代理',
          '检查DNS设置',
          '稍后重试'
        ],
        prevention: [
          '确保网络连接稳定',
          '配置网络代理',
          '检查防火墙规则'
        ]
      },
      {
        id: 'api-rate-limit',
        name: 'API调用频率限制',
        description: 'API调用频率超过限制',
        severity: ErrorSeverity.MEDIUM,
        category: ErrorType.AI_PROVIDER,
        patterns: [
          /rate.*limit/i,
          /too.*many.*requests/i,
          /quota.*exceeded/i,
          /429.*too.*many.*requests/i
        ],
        conditions: [],
        solutions: [
          '等待一段时间后重试',
          '检查API使用配额',
          '升级API计划',
          '优化请求频率'
        ],
        prevention: [
          '监控API使用量',
          '实现请求频率控制',
          '升级API计划'
        ]
      },

      // 模型相关问题
      {
        id: 'model-not-found',
        name: '模型不存在',
        description: '指定的AI模型不存在或不可用',
        severity: ErrorSeverity.MEDIUM,
        category: ErrorType.AI_PROVIDER,
        patterns: [
          /model.*not.*found/i,
          /invalid.*model/i,
          /model.*does.*not.*exist/i,
          /404.*not.*found/i
        ],
        conditions: [
          {
            type: 'system_state',
            field: 'configuration.model',
            operator: 'exists',
            value: true,
            weight: 0.7
          }
        ],
        solutions: [
          '检查模型名称是否正确',
          '更新到可用的模型',
          '检查模型访问权限',
          '联系服务提供商'
        ],
        prevention: [
          '使用正确的模型名称',
          '定期检查模型可用性',
          '备份模型配置'
        ]
      },

      // 文件系统问题
      {
        id: 'file-permission-denied',
        name: '文件权限被拒绝',
        description: '没有权限访问或修改文件',
        severity: ErrorSeverity.HIGH,
        category: ErrorType.FILE_SYSTEM,
        patterns: [
          /permission.*denied/i,
          /access.*denied/i,
          /eacces/i,
          /eperm/i
        ],
        conditions: [],
        solutions: [
          '检查文件权限',
          '以管理员身份运行',
          '修改文件权限',
          '检查文件是否被占用'
        ],
        prevention: [
          '确保有足够的文件权限',
          '避免在系统目录中操作',
          '定期检查文件权限'
        ]
      },
      {
        id: 'file-not-found',
        name: '文件不存在',
        description: '指定的文件或目录不存在',
        severity: ErrorSeverity.MEDIUM,
        category: ErrorType.FILE_SYSTEM,
        patterns: [
          /file.*not.*found/i,
          /no.*such.*file/i,
          /path.*does.*not.*exist/i,
          /enoent/i
        ],
        conditions: [],
        solutions: [
          '检查文件路径是否正确',
          '确认文件是否存在',
          '创建缺失的文件',
          '检查文件路径权限'
        ],
        prevention: [
          '使用正确的文件路径',
          '检查文件是否存在',
          '创建必要的目录结构'
        ]
      },

      // Git相关问题
      {
        id: 'git-repository-not-found',
        name: 'Git仓库不存在',
        description: '当前目录不是Git仓库',
        severity: ErrorSeverity.MEDIUM,
        category: ErrorType.VALIDATION,
        patterns: [
          /not.*a.*git.*repository/i,
          /git.*repository.*not.*found/i,
          /fatal.*not.*a.*git.*repository/i
        ],
        conditions: [
          {
            type: 'system_state',
            field: 'git.isRepository',
            operator: 'equals',
            value: false,
            weight: 0.8
          }
        ],
        solutions: [
          '初始化Git仓库',
          '切换到正确的目录',
          '克隆现有仓库',
          '检查当前目录'
        ],
        prevention: [
          '在Git仓库中工作',
          '确认仓库状态',
          '使用正确的目录'
        ]
      },

      // 内存和性能问题
      {
        id: 'memory-insufficient',
        name: '内存不足',
        description: '系统内存不足，无法完成操作',
        severity: ErrorSeverity.HIGH,
        category: ErrorType.UNKNOWN,
        patterns: [
          /out.*of.*memory/i,
          /memory.*allocation.*failed/i,
          /heap.*out.*of.*memory/i
        ],
        conditions: [],
        solutions: [
          '关闭其他应用程序',
          '增加系统内存',
          '优化代码更改',
          '重启VS Code'
        ],
        prevention: [
          '监控内存使用',
          '优化工作流程',
          '定期清理内存'
        ]
      }
    ];
  }

  /**
   * 计算模式置信度
   */
  private calculatePatternConfidence(
    pattern: ProblemPattern,
    errorMessage: string,
    context?: any
  ): number {
    let confidence = 0;

    // 检查错误消息模式匹配
    for (const regex of pattern.patterns) {
      if (regex.test(errorMessage)) {
        confidence += 0.6; // 模式匹配权重
        break;
      }
    }

    // 检查系统状态条件
    if (this.systemState) {
      for (const condition of pattern.conditions) {
        if (this.evaluateCondition(condition, this.systemState)) {
          confidence += condition.weight;
        }
      }
    }

    // 检查上下文条件
    if (context) {
      confidence += this.evaluateContextConditions(pattern, context);
    }

    return Math.min(confidence, 1.0); // 限制在0-1范围内
  }

  /**
   * 评估条件
   */
  private evaluateCondition(condition: ProblemCondition, systemState: SystemState): boolean {
    const value = this.getNestedValue(systemState, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'contains':
        return typeof value === 'string' && value.includes(condition.value);
      case 'matches':
        return typeof value === 'string' && new RegExp(condition.value).test(value);
      case 'exists':
        return value !== undefined && value !== null;
      case 'not_exists':
        return value === undefined || value === null;
      default:
        return false;
    }
  }

  /**
   * 评估上下文条件
   */
  private evaluateContextConditions(pattern: ProblemPattern, context: any): number {
    // 简单的上下文评估逻辑
    let score = 0;
    
    if (context.operation) {
      const operationLower = context.operation.toLowerCase();
      if (operationLower.includes('commit') && pattern.category === ErrorType.VALIDATION) {
        score += 0.2;
      }
      if (operationLower.includes('config') && pattern.category === ErrorType.CONFIGURATION) {
        score += 0.2;
      }
    }
    
    return score;
  }

  /**
   * 获取嵌套对象值
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * 创建诊断结果
   */
  private createDiagnosisResult(
    pattern: ProblemPattern,
    confidence: number,
    errorMessage: string,
    context?: any
  ): DiagnosisResult {
    return {
      problemId: pattern.id,
      problemName: pattern.name,
      confidence,
      severity: pattern.severity,
      category: pattern.category,
      description: pattern.description,
      rootCause: this.identifyRootCause(pattern, errorMessage, context),
      solutions: pattern.solutions,
      prevention: pattern.prevention,
      relatedProblems: this.findRelatedProblems(pattern),
      metadata: {
        errorMessage,
        context,
        timestamp: new Date(),
        patternId: pattern.id
      }
    };
  }

  /**
   * 识别根本原因
   */
  private identifyRootCause(
    pattern: ProblemPattern,
    errorMessage: string,
    context?: any
  ): string {
    // 基于问题模式和错误消息识别根本原因
    switch (pattern.id) {
      case 'api-key-missing':
        return '用户未配置AI提供商的API密钥，导致无法调用AI服务';
      case 'api-key-invalid':
        return '配置的API密钥格式不正确、已过期或权限不足';
      case 'network-connection-failed':
        return '网络连接问题导致无法访问AI服务提供商';
      case 'api-rate-limit':
        return 'API调用频率超过服务提供商的限制';
      case 'model-not-found':
        return '指定的AI模型不存在或当前用户无权访问';
      case 'file-permission-denied':
        return '当前用户没有足够的文件系统权限';
      case 'file-not-found':
        return '指定的文件或目录路径不存在';
      case 'git-repository-not-found':
        return '当前工作目录不是Git仓库';
      case 'memory-insufficient':
        return '系统内存不足，无法完成当前操作';
      default:
        return '未知的根本原因，需要进一步调查';
    }
  }

  /**
   * 查找相关问题
   */
  private findRelatedProblems(pattern: ProblemPattern): string[] {
    const related: string[] = [];
    
    // 基于问题分类查找相关问题
    const sameCategory = this.problemPatterns.filter(p => 
      p.category === pattern.category && p.id !== pattern.id
    );
    
    related.push(...sameCategory.slice(0, 3).map(p => p.id));
    
    return related;
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
