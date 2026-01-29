import * as vscode from "vscode";
import { SCMDetectorService } from "./scm-detector-service";
import { AIProviderManager } from "./ai-provider-manager";
import { PromptManagerService } from "./prompt-manager-service";
import { ISCMProvider } from "@/scm/scm-provider";
import { AIProvider, AIModel, AIMessage } from "@/ai/types";
import { Logger } from "@/utils/logger";
import { ProviderConfig } from "@/types/provider-config";

/**
 * Commit 生成协调器
 *
 * 职责：
 * 1. 管理整个 commit 生成生命周期
 * 2. 确保单次初始化（消除重复操作）
 * 3. 协调各服务执行顺序
 * 4. 提供状态管理
 *
 * 设计原则：
 * - 单例模式：确保全局唯一实例
 * - 依赖注入：所有依赖通过构造函数传入
 * - 状态管理：明确的生命周期状态
 * - 无缓存：避免数据过期（提示词、配置等实时数据）
 *
 * 使用示例：
 * ```typescript
 * const coordinator = CommitGenerationCoordinator.getInstance();
 * await coordinator.initialize({
 *   providerId: 'openai',
 *   modelId: 'gpt-4',
 *   repositoryPath: '/path/to/repo'
 * });
 * const result = await coordinator.generateCommit(changes);
 * ```
 */
export class CommitGenerationCoordinator {
  private static instance: CommitGenerationCoordinator;

  // 状态管理
  private state: "idle" | "initializing" | "ready" | "disposed" = "idle";

  // 初始化参数（用于后续操作）
  private initParams: InitParams | null = null;

  // 已初始化的资源
  private scmProvider: ISCMProvider | null = null;
  private aiProvider: AIProvider | null = null;
  private selectedModel: AIModel | null = null;
  private repositoryPath: string | null = null;

  // 日志器
  private logger: Logger;

  /**
   * 私有构造函数（单例模式）
   * 通过依赖注入获取所需服务
   */
  private constructor(
    private scmDetector: SCMDetectorService,
    private promptManager: PromptManagerService,
    private aiProviderManager: AIProviderManager,
  ) {
    this.logger = Logger.getInstance("CommitGenerationCoordinator");
  }

  /**
   * 获取单例实例
   * @returns 协调器实例
   */
  static getInstance(
    scmDetector?: SCMDetectorService,
    promptManager?: PromptManagerService,
    aiProviderManager?: AIProviderManager,
  ): CommitGenerationCoordinator {
    if (!CommitGenerationCoordinator.instance) {
      if (!scmDetector || !promptManager || !aiProviderManager) {
        throw new Error(
          "SCMDetectorService, PromptManagerService, and AIProviderManager are required for first initialization",
        );
      }
      CommitGenerationCoordinator.instance = new CommitGenerationCoordinator(
        scmDetector,
        promptManager,
        aiProviderManager,
      );
    }
    return CommitGenerationCoordinator.instance;
  }

  /**
   * 初始化协调器
   * 确保只执行一次，重复调用将直接返回
   *
   * @param params 初始化参数
   */
  async initialize(params: InitParams): Promise<void> {
    const startTime = Date.now();

    // 状态检查：如果已初始化，直接返回
    if (this.state === "ready") {
      this.logger.info("[Coordinator] Already initialized, skipping");
      return;
    }

    // 状态检查：防止重复初始化
    if (this.state === "initializing") {
      this.logger.warn("[Coordinator] Initialization already in progress");
      throw new Error("Initialization already in progress");
    }

    try {
      this.state = "initializing";
      this.logger.info("[Coordinator] START initialization", {
        data: params as unknown as Record<string, unknown>,
      });

      // 1. SCM 检测（单次）
      this.logger.info("[Coordinator] Step 1: SCM Detection");
      const scmResult = await this.scmDetector.detectSCMProvider(
        params.resourceStates,
      );

      if (!scmResult) {
        throw new Error("SCM detection failed");
      }

      this.scmProvider = scmResult.scmProvider;
      this.repositoryPath = scmResult.repositoryPath ?? null;
      this.logger.info("[Coordinator] Step 1 COMPLETE", {
        data: {
          scmType: this.scmProvider.type,
          repositoryPath: this.repositoryPath,
        },
      });

      // 2. AI Provider 和模型验证（单次，使用管理器）
      this.logger.info("[Coordinator] Step 2: AI Provider Validation");
      const { provider, model } =
        await this.aiProviderManager.getProviderAndModel(
          params.providerId,
          params.modelId,
          params.providerConfig,
        );

      this.aiProvider = provider;
      this.selectedModel = model;
      this.logger.info("[Coordinator] Step 2 COMPLETE", {
        data: {
          provider: params.providerId,
          model: this.selectedModel.id,
        },
      });

      // 3. 保存初始化参数
      this.initParams = params;

      // 4. 标记为就绪
      this.state = "ready";

      const duration = Date.now() - startTime;
      this.logger.info("[Coordinator] Initialization COMPLETE", {
        data: { duration: `${duration}ms` },
      });
    } catch (error) {
      this.state = "idle";
      this.logger.error("[Coordinator] Initialization FAILED", {
        error: error as Error,
      });
      throw error;
    }
  }

  /**
   * 生成 Commit
   * 依赖已初始化的资源
   *
   * @param changes 文件变更列表
   * @returns 生成结果
   */
  async generateCommit(changes: FileChange[]): Promise<CommitResult> {
    this.ensureInitialized();

    const startTime = Date.now();
    this.logger.info("[Coordinator] START commit generation", {
      data: { fileCount: changes.length },
    });

    try {
      // 1. 构建提示词（不缓存，确保实时性）
      this.logger.info("[Coordinator] Step 1: Build prompt (no cache)");
      const prompt = await this.buildPrompt(changes);

      // 2. 构建上下文（不缓存）
      this.logger.info("[Coordinator] Step 2: Build context (no cache)");
      const context = await this.buildContext(changes);

      // 3. 执行 AI 生成
      this.logger.info("[Coordinator] Step 3: AI Generation");
      const result = await this.executeAIGeneration(prompt, context, changes);

      const duration = Date.now() - startTime;
      this.logger.info("[Coordinator] Commit generation COMPLETE", {
        data: { duration: `${duration}ms` },
      });

      return result;
    } catch (error) {
      this.logger.error("[Coordinator] Commit generation FAILED", {
        error: error as Error,
      });
      throw error;
    }
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.state === "ready";
  }

  /**
   * 获取当前状态
   */
  getState(): string {
    return this.state;
  }

  /**
   * 获取当前仓库路径
   */
  getRepositoryPath(): string | null {
    return this.repositoryPath;
  }

  /**
   * 获取已初始化的 AI Provider
   */
  getAIProvider(): AIProvider | null {
    return this.aiProvider;
  }

  /**
   * 获取已验证的模型
   */
  getSelectedModel(): AIModel | null {
    return this.selectedModel;
  }

  /**
   * 获取已初始化的 SCM Provider
   */
  getSCMProvider(): ISCMProvider | null {
    return this.scmProvider;
  }

  /**
   * 获取初始化参数
   */
  getInitParams(): InitParams | null {
    return this.initParams;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.state === "disposed") {
      return;
    }

    this.logger.info("[Coordinator] Disposing resources");
    this.state = "disposed";
    this.scmProvider = null;
    this.aiProvider = null;
    this.selectedModel = null;
    this.repositoryPath = null;
    this.initParams = null;
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 确保协调器已初始化
   */
  private ensureInitialized(): void {
    if (this.state !== "ready") {
      throw new Error(
        `Coordinator not initialized. Current state: ${this.state}`,
      );
    }

    if (!this.scmProvider || !this.aiProvider || !this.selectedModel) {
      throw new Error("Coordinator initialized but resources are missing");
    }
  }

  /**
   * 构建提示词（不缓存）
   * 注意：PromptManagerService 已经是单例，但内容是实时的
   */
  private async buildPrompt(changes: FileChange[]): Promise<string> {
    // 使用 PromptManagerService 获取实时提示词
    // 不缓存，确保用户修改后立即生效
    const promptContent = await this.promptManager.getActivePromptContent(
      "generate-commit-system",
    );

    // 这里可以添加额外的提示词构建逻辑
    // 但不进行缓存

    return promptContent;
  }

  /**
   * 构建上下文（不缓存）
   */
  private async buildContext(changes: FileChange[]): Promise<ContextBlocks> {
    // 构建上下文块
    const context: ContextBlocks = {
      codeChanges: [],
      userCommits: [],
      recentCommits: [],
    };

    // 文件变更
    for (const change of changes) {
      context.codeChanges.push({
        file: change.file,
        type: change.type,
        diff: change.diff || "",
      });
    }

    // 用户最近提交（从 SCM 获取，不缓存）
    if (this.scmProvider) {
      try {
        const userCommits = await this.scmProvider.getRecentCommits?.(5);
        context.userCommits = userCommits?.map((c) => c.message) || [];
      } catch (error) {
        this.logger.warn("Failed to get user commits", {
          error: error as Error,
        });
      }

      // 仓库最近提交
      try {
        const recentCommits = await this.scmProvider.getRecentCommits?.(10);
        context.recentCommits = recentCommits?.map((c) => c.message) || [];
      } catch (error) {
        this.logger.warn("Failed to get recent commits", {
          error: error as Error,
        });
      }
    }

    return context;
  }

  /**
   * 执行 AI 生成
   */
  private async executeAIGeneration(
    prompt: string,
    context: ContextBlocks,
    changes: FileChange[],
  ): Promise<CommitResult> {
    if (!this.aiProvider || !this.selectedModel) {
      throw new Error("AI provider or model not available");
    }

    // 构建完整的提示词消息
    const messages = this.buildAIMessages(prompt, context);

    // 调用 AI Provider
    // 注意：这里假设 AIProvider 有 generateCommitStream 方法
    // 如果没有，需要根据实际接口调整
    if (!this.aiProvider.generateCommitStream) {
      throw new Error("AI provider does not support streaming generation");
    }

    // 执行流式生成
    const stream = await this.aiProvider.generateCommitStream({
      messages,
      model: this.selectedModel,
      diff: changes.map((c) => c.diff || "").join("\n"),
      additionalContext: "",
    });

    // 收集流式结果
    let result = "";
    for await (const chunk of stream) {
      result += chunk;
    }

    return {
      message: result.trim(),
      model: this.selectedModel.id,
      provider: this.initParams?.providerId || "unknown",
    };
  }

  /**
   * 构建 AI 消息格式
   */
  private buildAIMessages(
    systemPrompt: string,
    context: ContextBlocks,
  ): AIMessage[] {
    const messages: AIMessage[] = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];

    // 构建用户消息
    let userContent = "";

    // 代码变更
    if (context.codeChanges.length > 0) {
      userContent += "<code-changes>\n";
      for (const change of context.codeChanges) {
        userContent += `# FILE: ${change.file}\n`;
        userContent += `# TYPE: ${change.type}\n`;
        if (change.diff) {
          userContent += "```diff\n" + change.diff + "\n```\n";
        }
      }
      userContent += "</code-changes>\n\n";
    }

    // 用户提交历史
    if (context.userCommits.length > 0) {
      userContent += "<user-commits>\n";
      for (const commit of context.userCommits) {
        userContent += `- ${commit}\n`;
      }
      userContent += "</user-commits>\n\n";
    }

    // 仓库最近提交
    if (context.recentCommits.length > 0) {
      userContent += "<recent-commits>\n";
      for (const commit of context.recentCommits) {
        userContent += `- ${commit}\n`;
      }
      userContent += "</recent-commits>\n\n";
    }

    // 提醒（固定内容）
    userContent += `<reminder>
- IMPORTANT: You will be provided with code changes from MULTIPLE files.
- Your primary task is to analyze ALL provided file changes under the \`<code-changes>\` block and synthesize them into a single, coherent commit message.
- Do NOT focus on only the first file you see. A good commits messages covers the intent of all changes.
- DO NOT COPY commits from RECENT COMMITS, but use it as reference for the commit style.
- The commit message MUST be in Simplified Chinese.
- Now only show your message, Do not provide any explanations or details
</reminder>`;

    messages.push({
      role: "user",
      content: userContent,
    });

    return messages;
  }
}

/**
 * 初始化参数接口
 */
export interface InitParams {
  providerId: string;
  modelId: string;
  providerConfig: ProviderConfig;
  resourceStates?: vscode.SourceControlResourceState[];
}

/**
 * 文件变更接口
 */
export interface FileChange {
  file: string;
  type: "add" | "modify" | "delete" | "rename";
  diff?: string;
}

/**
 * 上下文块接口
 */
export interface ContextBlocks {
  codeChanges: Array<{ file: string; type: string; diff: string }>;
  userCommits: string[];
  recentCommits: string[];
}

/**
 * Commit 生成结果接口
 */
export interface CommitResult {
  message: string;
  model: string;
  provider: string;
}
