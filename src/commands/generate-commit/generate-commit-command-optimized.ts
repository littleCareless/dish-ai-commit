import { BaseCommand } from "@/commands/base-command";
import { CrossRepositoryHandler } from "@/commands/generate-commit/handlers/cross-repository-handler";
import { StreamingGenerationHelperOptimized } from "@/commands/generate-commit/utils/streaming-generation-helper-optimized";
import { CommitGenerationCoordinator } from "@/services/core/commit-generation-coordinator";
import { SCMDetectorService } from "@/services/core/scm-detector-service";
import { AIProviderManager } from "@/services/core/ai-provider-manager";
import { PromptManagerService } from "@/services/core/prompt-manager-service";
import { ISCMProvider, SCMFactory } from "@/scm/scm-provider";
import { formatMessage, getMessage } from "@/utils/i18n";
import { notify } from "@/utils/notification/notification-manager";
import { ProgressHandler } from "@/utils/notification/progress-handler";
import { Logger } from "@/utils/logger";
import * as vscode from "vscode";
import * as path from "path";

/**
 * 提交信息生成命令类 - 优化版
 *
 * 设计原则：
 * - 职责单一：只负责命令入口和参数解析
 * - 依赖协调器：所有初始化和生成逻辑由协调器处理
 * - 简化流程：移除重复的初始化逻辑
 *
 * 执行流程：
 * 1. 获取配置
 * 2. 初始化协调器（单次）
 * 3. 执行生成
 * 4. 处理结果
 */
export class GenerateCommitCommandOptimized extends BaseCommand {
  private coordinator: CommitGenerationCoordinator;
  private crossRepoHandler: CrossRepositoryHandler;
  private streamingHelper: StreamingGenerationHelperOptimized;

  /**
   * 创建命令实例
   * @param context - VSCode扩展上下文
   */
  constructor(context: vscode.ExtensionContext) {
    super(context);

    // 获取协调器单例（注入依赖）
    this.coordinator = CommitGenerationCoordinator.getInstance(
      SCMDetectorService.getInstance(),
      PromptManagerService.getInstance(),
      AIProviderManager.getInstance(),
    );

    // 跨仓库处理器（仍需要，但会使用新的协调器）
    this.crossRepoHandler = new CrossRepositoryHandler(this.logger);

    // 优化后的流式助手
    this.streamingHelper = new StreamingGenerationHelperOptimized(this.logger);
  }

  /**
   * 执行提交信息生成命令
   * @param arg - 参数可以是：
   *   - vscode.SourceControlResourceState[]: 来自scm/resourceState/context或scm/resourceFolder/context
   *   - sourceControl对象: 来自scm/title,包含{id, rootUri, ...}
   *   - undefined: 无参数情况
   */
  async execute(arg?: any): Promise<void> {
    this.logger.info("Executing optimized GenerateCommitCommand...");

    try {
      // 1. 解析参数
      const parsedArgs = this.parseArguments(arg);

      // 2. 检测是否为跨仓库场景
      if (parsedArgs.isCrossRepository && parsedArgs.filesByRepository) {
        await this.handleCrossRepositoryScenario(parsedArgs.filesByRepository);
        return;
      }

      // 3. 单仓库场景：获取配置
      const config = await this.getCommandConfig(arg);
      if (!config) {
        return;
      }

      // 4. 初始化协调器（仅一次）
      await this.initializeCoordinator(config, parsedArgs.resourceStates);

      // 5. 执行生成
      await this.handleSingleRepositoryScenario(parsedArgs, config);
    } catch (error) {
      this.logger.logError(error as Error, "生成提交信息失败");
      if (error instanceof Error) {
        notify.error("generate.commit.failed", [error.message]);
      }
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 获取命令配置
   */
  private async getCommandConfig(arg: any): Promise<
    | {
        provider: string;
        model: string;
        providerConfig: any;
      }
    | undefined
  > {
    // 验证 AI 服务条款
    if ((await this.showConfirmAIProviderToS()) === false) {
      this.logger.warn("用户未确认 AI 服务条款");
      return undefined;
    }

    // 验证配置
    if (!(await this.validateConfig())) {
      return undefined;
    }

    // 获取配置
    const profileManager = await (
      await import("@/services/profile-manager/profile-manager-service")
    ).ProfileManagerService.create(this.context);
    const activeProfileId = profileManager.getActiveProfileId();
    const profile = activeProfileId
      ? profileManager.getProfileById(activeProfileId)
      : null;

    if (!profile) {
      await notify.error(getMessage("profile.not.found"));
      return undefined;
    }

    const featureSettings = profileManager.getFeatureSettings();
    const configResult = this.handleConfiguration(profile, featureSettings);

    if (!configResult) {
      return undefined;
    }

    return {
      provider: configResult.provider,
      model: configResult.model,
      providerConfig: configResult.config,
    };
  }

  /**
   * 初始化协调器
   */
  private async initializeCoordinator(
    config: { provider: string; model: string; providerConfig: any },
    resourceStates?: vscode.SourceControlResourceState[],
  ): Promise<void> {
    try {
      await this.coordinator.initialize({
        providerId: config.provider,
        modelId: config.model,
        providerConfig: config.providerConfig,
        resourceStates,
      });

      this.logger.info("协调器初始化完成");
    } catch (error) {
      this.logger.logError(error as Error, "协调器初始化失败");
      throw error;
    }
  }

  /**
   * 处理单仓库场景
   */
  private async handleSingleRepositoryScenario(
    parsedArgs: {
      resourceStates?: vscode.SourceControlResourceState[];
      repositoryPath?: string;
      scmType?: "git" | "svn";
      filesByRepository?: Map<string, string[]>;
      isCrossRepository: boolean;
    },
    config: { provider: string; model: string; providerConfig: any },
  ): Promise<void> {
    // 获取 SCM 上下文
    const scmResult = await this.resolveSCMContext(parsedArgs);
    if (!scmResult) {
      return;
    }

    const { scmProvider, selectedFiles, repositoryPath } = scmResult;

    // 获取文件变更
    const changes = await this.buildFileChanges(scmProvider, selectedFiles);

    if (changes.length === 0) {
      await notify.warn("no.changes.selected");
      return;
    }

    // 执行生成
    await ProgressHandler.withProgress(
      formatMessage("progress.generating.commit", [
        scmProvider.type.toUpperCase(),
      ]),
      async (progress, token) => {
        // 1. 构建提示词（实时）
        const prompt = await this.buildPrompt();

        // 2. 构建上下文（实时）
        const context = await this.buildContext(changes, scmProvider);

        // 3. 获取 diff
        const diffContent = await this.getDiffContent(
          scmProvider,
          selectedFiles,
        );

        // 4. 调用优化后的助手
        const aiProvider = this.coordinator.getAIProvider();
        const selectedModel = this.coordinator.getSelectedModel();

        if (!aiProvider || !selectedModel) {
          throw new Error("协调器未正确初始化，缺少 AI Provider 或 Model");
        }

        await this.streamingHelper.performStreamingGeneration(
          progress,
          token,
          scmProvider,
          aiProvider,
          selectedModel,
          prompt,
          diffContent,
          config.providerConfig,
          selectedFiles,
          repositoryPath,
        );
      },
    );
  }

  /**
   * 处理跨仓库场景
   */
  private async handleCrossRepositoryScenario(
    filesByRepository: Map<string, string[]>,
  ): Promise<void> {
    this.logger.info(`开始跨仓库生成，仓库数量: ${filesByRepository.size}`);

    // 为每个仓库创建独立的协调器实例
    for (const [repoPath, files] of filesByRepository.entries()) {
      const repoName = path.basename(repoPath);
      this.logger.info(`处理仓库: ${repoName}`);

      try {
        // 1. 获取配置
        const config = await this.getCommandConfig(undefined);
        if (!config) {
          continue;
        }

        // 2. 为当前仓库创建协调器
        const coordinator = CommitGenerationCoordinator.getInstance(
          SCMDetectorService.getInstance(),
          PromptManagerService.getInstance(),
          AIProviderManager.getInstance(),
        );

        await coordinator.initialize({
          providerId: config.provider,
          modelId: config.model,
          providerConfig: config.providerConfig,
          resourceStates: undefined,
        });

        // 3. 检测 SCM
        const scmProvider = await SCMFactory.detectSCM(files, repoPath);
        if (!scmProvider) {
          await notify.error(getMessage("scm.not.detected"));
          continue;
        }

        // 4. 构建文件变更
        const changes = await this.buildFileChanges(scmProvider, files);

        // 5. 执行生成
        const prompt = await this.buildPrompt();
        const context = await this.buildContext(changes, scmProvider);
        const diffContent = await this.getDiffContent(scmProvider, files);

        // 6. 调用助手
        const aiProvider = coordinator.getAIProvider();
        const selectedModel = coordinator.getSelectedModel();

        if (!aiProvider || !selectedModel) {
          throw new Error("协调器未正确初始化");
        }

        await this.streamingHelper.performStreamingGeneration(
          { report: () => {} } as any,
          { isCancellationRequested: false } as any,
          scmProvider,
          aiProvider,
          selectedModel,
          prompt,
          diffContent,
          config.providerConfig,
          files,
          repoPath,
        );

        this.logger.info(`✓ 仓库 ${repoName} 处理完成`);
      } catch (error) {
        this.logger.error(`仓库 ${repoName} 处理失败`, {
          error: error as Error,
        });
        await notify.warn("generate.commit.repository.failed", [
          repoName,
          error instanceof Error ? error.message : String(error),
        ]);
      }
    }
  }

  /**
   * 解析参数
   */
  private parseArguments(arg: any): {
    resourceStates?: vscode.SourceControlResourceState[];
    repositoryPath?: string;
    scmType?: "git" | "svn";
    filesByRepository?: Map<string, string[]>;
    isCrossRepository: boolean;
  } {
    let resourceStates: vscode.SourceControlResourceState[] | undefined;
    let repositoryPath: string | undefined;
    let scmType: "git" | "svn" | undefined;
    let filesByRepository: Map<string, string[]> | undefined;
    let isCrossRepository = false;

    if (Array.isArray(arg)) {
      resourceStates = arg;
      this.logger.info(`收到资源状态数组，共 ${arg.length} 项`);
    } else if (arg?.rootUri) {
      repositoryPath = arg.rootUri.fsPath;
      scmType = arg.id;
      this.logger.info(`收到源控制对象: ${scmType} at ${repositoryPath}`);
    } else {
      this.logger.info("未提供有效参数，将使用回退逻辑");
    }

    // 检查跨仓库场景（简化处理）
    if (resourceStates && resourceStates.length > 0) {
      // 实际实现中需要调用 multiRepositoryContextManager.groupFilesByRepository
      isCrossRepository = false;
    }

    return {
      resourceStates,
      repositoryPath,
      scmType,
      filesByRepository,
      isCrossRepository,
    };
  }

  /**
   * 解析 SCM 上下文
   */
  protected async resolveSCMContext(parsedArgs: {
    resourceStates?: vscode.SourceControlResourceState[];
    repositoryPath?: string;
    scmType?: "git" | "svn";
  }): Promise<
    | {
        scmProvider: ISCMProvider;
        selectedFiles: string[] | undefined;
        repositoryPath: string | undefined;
      }
    | undefined
  > {
    // 1. 如果是 SourceControl 对象
    if (parsedArgs.repositoryPath && parsedArgs.scmType) {
      const scmProvider = await SCMFactory.detectSCM(
        undefined,
        parsedArgs.repositoryPath,
      );
      if (!scmProvider) {
        await notify.error(getMessage("scm.not.detected"));
        return undefined;
      }
      return {
        scmProvider,
        selectedFiles: undefined,
        repositoryPath: parsedArgs.repositoryPath,
      };
    }

    // 2. 委托给 SCMDetectorService
    const result = await SCMDetectorService.getInstance().detectSCMProvider(
      parsedArgs.resourceStates,
    );
    return result;
  }

  /**
   * 构建文件变更列表
   */
  private async buildFileChanges(
    scmProvider: ISCMProvider,
    selectedFiles?: string[],
  ): Promise<
    Array<{
      file: string;
      type: "add" | "modify" | "delete" | "rename";
      diff?: string;
    }>
  > {
    if (!selectedFiles) {
      // 获取所有变更文件
      if (!scmProvider.getChanges) {
        return [];
      }
      const changes = await scmProvider.getChanges();
      return changes.map((c) => ({
        file: c.file,
        type: c.type as any,
        diff: c.diff,
      }));
    }

    // 获取指定文件的变更
    const changes = await scmProvider.getDiff(selectedFiles);
    if (!changes) {
      return [];
    }
    return selectedFiles.map((file, index) => ({
      file,
      type: "modify", // 简化处理
      diff: changes[index],
    }));
  }

  /**
   * 构建提示词（从协调器获取）
   */
  private async buildPrompt(): Promise<string> {
    const promptManager = PromptManagerService.getInstance();
    return await promptManager.getActivePromptContent("generate-commit-system");
  }

  /**
   * 构建上下文
   */
  private async buildContext(
    changes: Array<{ file: string; type: string; diff?: string }>,
    scmProvider: ISCMProvider,
  ): Promise<{
    codeChanges: Array<{ file: string; type: string; diff: string }>;
    userCommits: string[];
    recentCommits: string[];
  }> {
    const context = {
      codeChanges: changes.map((c) => ({
        file: c.file,
        type: c.type,
        diff: c.diff || "",
      })),
      userCommits: [] as string[],
      recentCommits: [] as string[],
    };

    // 获取提交历史
    try {
      if (scmProvider.getRecentCommits) {
        const userCommits = await scmProvider.getRecentCommits(5);
        context.userCommits = userCommits.map((c) => c.message);
      }
    } catch (error) {
      this.logger.warn("获取用户提交历史失败", { error: error as Error });
    }

    try {
      if (scmProvider.getRecentCommits) {
        const recentCommits = await scmProvider.getRecentCommits(10);
        context.recentCommits = recentCommits.map((c) => c.message);
      }
    } catch (error) {
      this.logger.warn("获取仓库提交历史失败", { error: error as Error });
    }

    return context;
  }

  /**
   * 获取 Diff 内容
   */
  private async getDiffContent(
    scmProvider: ISCMProvider,
    selectedFiles?: string[],
  ): Promise<string> {
    if (selectedFiles) {
      const diff = await scmProvider.getDiff(selectedFiles);
      return diff || "";
    }

    const changes = await scmProvider.getChanges?.();
    return changes?.map((c) => c.diff || "").join("\n") || "";
  }
}
