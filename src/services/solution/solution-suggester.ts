import { Logger } from "../../utils/logger";
import { DiagnosisResult } from "../diagnosis/problem-diagnoser";
import { ErrorType, ErrorSeverity } from "../error-translation";

/**
 * 解决方案接口
 */
export interface Solution {
  id: string;
  title: string;
  description: string;
  category: ErrorType;
  severity: ErrorSeverity;
  steps: SolutionStep[];
  prerequisites: string[];
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
  successRate: number;
  sideEffects: string[];
  alternatives: string[];
}

/**
 * 解决步骤接口
 */
export interface SolutionStep {
  id: string;
  title: string;
  description: string;
  action: string;
  validation?: string;
  tips?: string[];
  warnings?: string[];
  automated: boolean;
}

/**
 * 解决方案匹配结果
 */
export interface SolutionMatch {
  solution: Solution;
  score: number;
  reasons: string[];
  confidence: number;
}

/**
 * 解决方案验证结果
 */
export interface SolutionValidation {
  solutionId: string;
  isValid: boolean;
  issues: string[];
  suggestions: string[];
  nextSteps: string[];
}

/**
 * 解决方案效果跟踪
 */
export interface SolutionEffectiveness {
  solutionId: string;
  attempts: number;
  successes: number;
  failures: number;
  averageTime: number;
  userRating: number;
  lastUsed: Date;
}

/**
 * 解决建议引擎
 * 负责匹配、验证和跟踪解决方案
 */
export class SolutionSuggester {
  private static instance: SolutionSuggester;
  private logger: Logger;
  private solutions: Map<string, Solution> = new Map();
  private effectiveness: Map<string, SolutionEffectiveness> = new Map();

  private constructor() {
    this.logger = Logger.getInstance("SolutionSuggester");
    this.initializeSolutions();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): SolutionSuggester {
    if (!SolutionSuggester.instance) {
      SolutionSuggester.instance = new SolutionSuggester();
    }
    return SolutionSuggester.instance;
  }

  /**
   * 获取解决方案建议
   * @param diagnosis - 诊断结果
   * @param context - 上下文信息
   * @returns 解决方案匹配结果
   */
  public async suggestSolutions(
    diagnosis: DiagnosisResult,
    context?: any
  ): Promise<SolutionMatch[]> {
    try {
      const matches: SolutionMatch[] = [];

      // 查找匹配的解决方案
      for (const solution of this.solutions.values()) {
        const score = this.calculateSolutionScore(solution, diagnosis, context);
        
        if (score > 0.3) { // 最低匹配阈值
          const match: SolutionMatch = {
            solution,
            score,
            reasons: this.getMatchReasons(solution, diagnosis),
            confidence: this.calculateConfidence(solution, diagnosis, context)
          };
          matches.push(match);
        }
      }

      // 按分数排序并限制数量
      return matches
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    } catch (error) {
      this.logger.error(`Solution suggestion failed:${error}`, );
      return [];
    }
  }

  /**
   * 验证解决方案
   * @param solutionId - 解决方案ID
   * @param context - 上下文信息
   * @returns 验证结果
   */
  public async validateSolution(
    solutionId: string,
    context?: any
  ): Promise<SolutionValidation> {
    const solution = this.solutions.get(solutionId);
    if (!solution) {
      return {
        solutionId,
        isValid: false,
        issues: ['解决方案不存在'],
        suggestions: [],
        nextSteps: []
      };
    }

    const issues: string[] = [];
    const suggestions: string[] = [];
    const nextSteps: string[] = [];

    // 检查先决条件
    for (const prerequisite of solution.prerequisites) {
      if (!this.checkPrerequisite(prerequisite, context)) {
        issues.push(`缺少先决条件: ${prerequisite}`);
        suggestions.push(`请先满足先决条件: ${prerequisite}`);
      }
    }

    // 检查系统状态
    const systemIssues = this.checkSystemRequirements(solution, context);
    issues.push(...systemIssues);

    // 生成下一步建议
    if (issues.length === 0) {
      nextSteps.push('可以开始执行解决方案');
      nextSteps.push('建议按步骤顺序执行');
    } else {
      nextSteps.push('请先解决上述问题');
      nextSteps.push('检查系统配置');
    }

    return {
      solutionId,
      isValid: issues.length === 0,
      issues,
      suggestions,
      nextSteps
    };
  }

  /**
   * 记录解决方案使用
   * @param solutionId - 解决方案ID
   * @param success - 是否成功
   * @param timeSpent - 花费时间
   * @param userRating - 用户评分
   */
  public recordSolutionUsage(
    solutionId: string,
    success: boolean,
    timeSpent: number,
    userRating?: number
  ): void {
    const current = this.effectiveness.get(solutionId) || {
      solutionId,
      attempts: 0,
      successes: 0,
      failures: 0,
      averageTime: 0,
      userRating: 0,
      lastUsed: new Date()
    };

    current.attempts++;
    if (success) {
      current.successes++;
    } else {
      current.failures++;
    }

    // 更新平均时间
    current.averageTime = (current.averageTime * (current.attempts - 1) + timeSpent) / current.attempts;

    // 更新用户评分
    if (userRating !== undefined) {
      current.userRating = (current.userRating * (current.attempts - 1) + userRating) / current.attempts;
    }

    current.lastUsed = new Date();
    this.effectiveness.set(solutionId, current);

    this.logger.info(`Recorded solution usage: ${solutionId}, success: ${success}`);
  }

  /**
   * 获取解决方案效果统计
   * @param solutionId - 解决方案ID
   * @returns 效果统计
   */
  public getSolutionEffectiveness(solutionId: string): SolutionEffectiveness | undefined {
    return this.effectiveness.get(solutionId);
  }

  /**
   * 获取所有解决方案
   * @param category - 问题分类
   * @returns 解决方案列表
   */
  public getSolutions(category?: ErrorType): Solution[] {
    if (category) {
      return Array.from(this.solutions.values()).filter(s => s.category === category);
    }
    return Array.from(this.solutions.values());
  }

  /**
   * 添加自定义解决方案
   * @param solution - 解决方案
   */
  public addSolution(solution: Solution): void {
    this.solutions.set(solution.id, solution);
    this.logger.info(`Added solution: ${solution.title}`);
  }

  /**
   * 初始化解决方案
   */
  private initializeSolutions(): void {
    const solutions: Solution[] = [
      // API配置解决方案
      {
        id: 'configure-api-key',
        title: '配置API密钥',
        description: '在扩展设置中配置AI提供商的API密钥',
        category: ErrorType.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        steps: [
          {
            id: 'open-settings',
            title: '打开设置',
            description: '打开VS Code设置页面',
            action: '点击左下角齿轮图标，选择"设置"',
            validation: '设置页面已打开',
            tips: ['也可以使用快捷键 Ctrl+,'],
            automated: false
          },
          {
            id: 'find-extension-settings',
            title: '找到扩展设置',
            description: '定位到Dish AI Commit Gen设置',
            action: '在设置搜索框中输入"dish-ai-commit-gen"',
            validation: '看到扩展设置选项',
            automated: false
          },
          {
            id: 'enter-api-key',
            title: '输入API密钥',
            description: '在API Key字段中输入您的密钥',
            action: '点击API Key字段，输入密钥',
            validation: 'API密钥已保存',
            tips: ['确保密钥格式正确', '不要包含空格'],
            warnings: ['API密钥是敏感信息，请妥善保管'],
            automated: false
          },
          {
            id: 'test-connection',
            title: '测试连接',
            description: '验证API密钥是否有效',
            action: '点击"测试连接"按钮',
            validation: '显示连接成功',
            tips: ['如果失败，检查密钥是否正确'],
            automated: true
          }
        ],
        prerequisites: ['VS Code已安装', 'Dish AI Commit Gen扩展已安装'],
        estimatedTime: '2-5分钟',
        difficulty: 'easy',
        successRate: 0.95,
        sideEffects: [],
        alternatives: ['使用环境变量配置', '使用配置文件']
      },
      {
        id: 'regenerate-api-key',
        title: '重新生成API密钥',
        description: '在AI提供商控制台中重新生成API密钥',
        category: ErrorType.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        steps: [
          {
            id: 'access-provider-console',
            title: '访问提供商控制台',
            description: '登录到AI提供商的控制台',
            action: '打开浏览器，访问提供商网站并登录',
            validation: '成功登录控制台',
            automated: false
          },
          {
            id: 'navigate-to-api-settings',
            title: '导航到API设置',
            description: '找到API密钥管理页面',
            action: '在控制台中找到API或密钥管理选项',
            validation: '看到API密钥管理页面',
            automated: false
          },
          {
            id: 'generate-new-key',
            title: '生成新密钥',
            description: '创建新的API密钥',
            action: '点击"生成新密钥"或"创建密钥"按钮',
            validation: '新密钥已生成',
            tips: ['记录新密钥', '旧密钥将失效'],
            warnings: ['旧密钥将立即失效'],
            automated: false
          },
          {
            id: 'update-extension-config',
            title: '更新扩展配置',
            description: '在扩展中使用新密钥',
            action: '将新密钥复制到扩展设置中',
            validation: '新密钥已保存并测试成功',
            automated: false
          }
        ],
        prerequisites: ['有效的提供商账户', '访问控制台的权限'],
        estimatedTime: '5-10分钟',
        difficulty: 'medium',
        successRate: 0.85,
        sideEffects: ['旧密钥失效', '需要更新所有使用该密钥的应用'],
        alternatives: ['联系提供商支持', '检查账户状态']
      },

      // 网络问题解决方案
      {
        id: 'check-network-connection',
        title: '检查网络连接',
        description: '诊断和修复网络连接问题',
        category: ErrorType.NETWORK,
        severity: ErrorSeverity.HIGH,
        steps: [
          {
            id: 'test-basic-connectivity',
            title: '测试基本连接',
            description: '检查是否能访问互联网',
            action: '打开浏览器，访问任意网站',
            validation: '网站能正常加载',
            tips: ['尝试访问多个网站'],
            automated: true
          },
          {
            id: 'check-firewall',
            title: '检查防火墙设置',
            description: '确保防火墙没有阻止连接',
            action: '检查系统防火墙设置',
            validation: '防火墙允许VS Code访问网络',
            tips: ['临时禁用防火墙测试'],
            warnings: ['禁用防火墙可能降低安全性'],
            automated: false
          },
          {
            id: 'test-dns',
            title: '测试DNS解析',
            description: '检查DNS是否正常工作',
            action: '在命令行中运行 nslookup google.com',
            validation: 'DNS解析正常',
            tips: ['尝试使用不同的DNS服务器'],
            automated: true
          },
          {
            id: 'check-proxy',
            title: '检查代理设置',
            description: '如果使用代理，检查代理配置',
            action: '检查VS Code代理设置',
            validation: '代理设置正确',
            tips: ['尝试禁用代理测试'],
            automated: false
          }
        ],
        prerequisites: ['管理员权限（某些步骤）'],
        estimatedTime: '10-15分钟',
        difficulty: 'medium',
        successRate: 0.80,
        sideEffects: [],
        alternatives: ['使用移动热点', '联系网络管理员']
      },

      // 模型问题解决方案
      {
        id: 'update-model-configuration',
        title: '更新模型配置',
        description: '选择可用的AI模型',
        category: ErrorType.AI_PROVIDER,
        severity: ErrorSeverity.MEDIUM,
        steps: [
          {
            id: 'check-available-models',
            title: '检查可用模型',
            description: '查看当前可用的模型列表',
            action: '在扩展设置中查看模型选项',
            validation: '看到可用模型列表',
            automated: true
          },
          {
            id: 'select-alternative-model',
            title: '选择替代模型',
            description: '选择一个可用的模型',
            action: '从列表中选择一个模型',
            validation: '模型已选择',
            tips: ['选择性能相近的模型'],
            automated: false
          },
          {
            id: 'test-new-model',
            title: '测试新模型',
            description: '验证新模型是否工作正常',
            action: '尝试生成一个简单的提交信息',
            validation: '模型响应正常',
            automated: true
          }
        ],
        prerequisites: ['有效的API密钥'],
        estimatedTime: '3-5分钟',
        difficulty: 'easy',
        successRate: 0.90,
        sideEffects: ['可能影响生成质量'],
        alternatives: ['联系提供商支持', '等待模型恢复']
      },

      // 文件权限解决方案
      {
        id: 'fix-file-permissions',
        title: '修复文件权限',
        description: '解决文件访问权限问题',
        category: ErrorType.FILE_SYSTEM,
        severity: ErrorSeverity.HIGH,
        steps: [
          {
            id: 'identify-permission-issue',
            title: '识别权限问题',
            description: '确定具体的权限问题',
            action: '查看错误消息，确定需要权限的文件',
            validation: '明确了权限问题',
            automated: false
          },
          {
            id: 'check-file-ownership',
            title: '检查文件所有权',
            description: '确认文件的所有者',
            action: '在命令行中运行 ls -la 查看文件权限',
            validation: '了解了文件权限状态',
            tips: ['注意文件的所有者和权限'],
            automated: true
          },
          {
            id: 'fix-permissions',
            title: '修复权限',
            description: '修改文件权限',
            action: '使用 chmod 或 chown 命令修改权限',
            validation: '权限已修改',
            tips: ['使用适当的权限级别'],
            warnings: ['错误的权限设置可能导致安全问题'],
            automated: false
          }
        ],
        prerequisites: ['管理员权限', '命令行访问'],
        estimatedTime: '5-10分钟',
        difficulty: 'hard',
        successRate: 0.75,
        sideEffects: ['可能影响系统安全'],
        alternatives: ['以管理员身份运行', '移动文件到用户目录']
      }
    ];

    // 添加解决方案到映射
    solutions.forEach(solution => {
      this.solutions.set(solution.id, solution);
    });
  }

  /**
   * 计算解决方案分数
   */
  private calculateSolutionScore(
    solution: Solution,
    diagnosis: DiagnosisResult,
    context?: any
  ): number {
    let score = 0;

    // 分类匹配
    if (solution.category === diagnosis.category) {
      score += 0.4;
    }

    // 严重程度匹配
    if (solution.severity === diagnosis.severity) {
      score += 0.2;
    }

    // 成功率权重
    score += solution.successRate * 0.2;

    // 难度权重（简单解决方案优先）
    const difficultyWeight = {
      'easy': 0.1,
      'medium': 0.05,
      'hard': 0.0
    };
    score += difficultyWeight[solution.difficulty];

    // 效果统计权重
    const effectiveness = this.effectiveness.get(solution.id);
    if (effectiveness && effectiveness.attempts > 0) {
      const successRate = effectiveness.successes / effectiveness.attempts;
      score += successRate * 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * 获取匹配原因
   */
  private getMatchReasons(solution: Solution, diagnosis: DiagnosisResult): string[] {
    const reasons: string[] = [];

    if (solution.category === diagnosis.category) {
      reasons.push('问题分类匹配');
    }

    if (solution.severity === diagnosis.severity) {
      reasons.push('严重程度匹配');
    }

    if (solution.successRate > 0.8) {
      reasons.push('高成功率');
    }

    if (solution.difficulty === 'easy') {
      reasons.push('操作简单');
    }

    const effectiveness = this.effectiveness.get(solution.id);
    if (effectiveness && effectiveness.attempts > 5) {
      const successRate = effectiveness.successes / effectiveness.attempts;
      if (successRate > 0.8) {
        reasons.push('历史成功率较高');
      }
    }

    return reasons;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    solution: Solution,
    diagnosis: DiagnosisResult,
    context?: any
  ): number {
    let confidence = diagnosis.confidence * 0.5; // 基于诊断置信度

    // 解决方案成功率
    confidence += solution.successRate * 0.3;

    // 历史效果
    const effectiveness = this.effectiveness.get(solution.id);
    if (effectiveness && effectiveness.attempts > 0) {
      const historicalSuccessRate = effectiveness.successes / effectiveness.attempts;
      confidence += historicalSuccessRate * 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * 检查先决条件
   */
  private checkPrerequisite(prerequisite: string, context?: any): boolean {
    // 简单的先决条件检查逻辑
    const prerequisiteLower = prerequisite.toLowerCase();
    
    if (prerequisiteLower.includes('vscode')) {
      return true; // 假设VS Code已安装
    }
    
    if (prerequisiteLower.includes('extension')) {
      return true; // 假设扩展已安装
    }
    
    if (prerequisiteLower.includes('api key')) {
      return context?.hasApiKey || false;
    }
    
    if (prerequisiteLower.includes('admin')) {
      return context?.isAdmin || false;
    }
    
    return true; // 默认返回true
  }

  /**
   * 检查系统要求
   */
  private checkSystemRequirements(solution: Solution, context?: any): string[] {
    const issues: string[] = [];
    
    // 检查系统要求
    if (solution.difficulty === 'hard' && !context?.isAdmin) {
      issues.push('此解决方案需要管理员权限');
    }
    
    if (solution.estimatedTime.includes('10') && !context?.hasTime) {
      issues.push('此解决方案需要较长时间');
    }
    
    return issues;
  }
}
