import { BaseCommand } from "@/commands/base-command";
import { CrossRepositoryHandler } from "@/commands/generate-commit/handlers/cross-repository-handler";
import { StreamingGenerationHelper } from "@/commands/generate-commit/utils/streaming-generation-helper";
import { multiRepositoryContextManager } from "@/scm/multi-repository-context-manager";
import { formatMessage } from "@/utils/i18n";
import { notify } from "@/utils/notification/notification-manager";
import { ProgressHandler } from "@/utils/notification/progress-handler";
import * as vscode from "vscode";

/**
 * 提交信息生成命令类 - 遵循单一职责原则的简洁版本
 * 只负责命令入口和基本验证，具体执行委托给编排器
 */
export class GenerateCommitCommand extends BaseCommand {
  private crossRepoHandler: CrossRepositoryHandler;
  private streamingHelper: StreamingGenerationHelper;

  /**
   * 创建命令实例
   * @param context - VSCode扩展上下文
   */
  constructor(context: vscode.ExtensionContext) {
    super(context);
    this.crossRepoHandler = new CrossRepositoryHandler(this.logger);
    this.streamingHelper = new StreamingGenerationHelper(this.logger);
  }

  /**
   * 执行提交信息生成命令 - 遵循单一职责原则的简洁版本
   * @param arg - 参数可以是:
   *   - vscode.SourceControlResourceState[]: 来自scm/resourceState/context或scm/resourceFolder/context
   *   - sourceControl对象: 来自scm/title,包含{id, rootUri, ...}
   *   - undefined: 无参数情况
   */
  async execute(arg?: any): Promise<void> {
    this.logger.info("Executing GenerateCommitCommand...");

    // 使用 prepare 方法进行前置检查
    // 注意：GenerateCommitCommand 的参数 arg 比较特殊，可能是 resourceStates 数组，也可能是 sourceControl 对象
    // prepare 方法已经处理了这两种情况
    const context = await this.prepare(arg, {
      requireSelectedFiles: false, // 提交生成不一定强制需要选中的文件（比如可能是全部更改）
      validateModel: true,
    });

    if (!context) {
      return;
    }

    const { provider, model, providerConfig, aiProvider, selectedModel } = context;
    this.logger.info(`Using AI provider: ${provider}, model: ${model}`);

    const parsedArgs = await this.parseArguments(arg);

    // 步骤3: 处理具体执行逻辑
    try {
      await this.executeCommitGeneration(
        context,
        parsedArgs,
        provider,
        model,
        providerConfig,
        aiProvider,
        selectedModel,
      );
    } catch (error) {
      this.logger.logError(error as Error, "生成提交信息失败");
      if (error instanceof Error) {
        notify.error("generate.commit.failed", [error.message]);
      }
    }
  }

  /**
   * 执行提交生成的主要逻辑 - 遵循单一职责原则
   */
  private async executeCommitGeneration(
    context: {
      scmProvider: any;
      selectedFiles?: string[];
      repositoryPath?: string;
    },
    parsedArgs: {
      resourceStates?: vscode.SourceControlResourceState[];
      filesByRepository?: Map<string, string[]>;
      isCrossRepository: boolean;
    },
    provider: string,
    model: string,
    providerConfig: any,
    aiProvider?: any,
    selectedModel?: any,
  ): Promise<void> {
    // 检测是否为跨仓库场景
    if (parsedArgs.isCrossRepository && parsedArgs.filesByRepository) {
      await this.handleCrossRepositoryScenario(
        parsedArgs.filesByRepository,
        provider,
        model,
        providerConfig,
        aiProvider,
        selectedModel,
      );
      return;
    }

    // 处理单仓库场景
    await this.handleSingleRepositoryScenario(
      context,
      parsedArgs.resourceStates,
      provider,
      model,
      providerConfig,
      aiProvider,
      selectedModel,
    );
  }

  /**
   * 解析参数 - 遵循单一职责原则
   */
  private async parseArguments(arg: any): Promise<{
    resourceStates?: vscode.SourceControlResourceState[];
    filesByRepository?: Map<string, string[]>;
    isCrossRepository: boolean;
  }> {
    let resourceStates: vscode.SourceControlResourceState[] | undefined;
    let filesByRepository: Map<string, string[]> | undefined;
    let isCrossRepository = false;

    if (Array.isArray(arg)) {
      resourceStates = arg;
      this.logger.info(
        `Received resourceStates array with ${arg.length} items`
      );
    } else if (arg?.rootUri && arg.id) {
      this.logger.info(`Received sourceControl object: ${arg.id} at ${arg.rootUri.fsPath}`);
    } else {
      this.logger.info("No valid arguments provided, will use fallback logic");
    }

    // 检查跨仓库场景
    if (resourceStates && resourceStates.length > 0) {
      try {
        filesByRepository =
          await multiRepositoryContextManager.groupFilesByRepository(
            resourceStates,
          );
        isCrossRepository = filesByRepository.size > 1;
        if (isCrossRepository) {
          this.logger.info(
            `[Chain] [CrossRepo] Detected ${filesByRepository.size} repositories`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `[Chain] [CrossRepo] Failed to group files by repository: ${error}`,
        );
      }
    }

    return {
      resourceStates,
      filesByRepository,
      isCrossRepository,
    };
  }

  /**
   * 处理跨仓库场景 - 遵循单一职责原则
   * 复用 prepare() 已初始化的 AI 上下文，避免跨仓库重复模型验证
   */
  private async handleCrossRepositoryScenario(
    filesByRepository: Map<string, string[]> | undefined,
    provider: string,
    model: string,
    providerConfig: any,
    aiProvider?: any,
    selectedModel?: any,
  ): Promise<void> {
    if (!filesByRepository) {
      this.logger.warn(
        "No files by repository provided for cross-repository scenario",
      );
      return;
    }

    this.logger.info(
      `[Chain] [CrossRepo] Starting cross-repository generation for ${filesByRepository.size} repositories`
    );

    await this.crossRepoHandler.handle(
      filesByRepository,
      provider,
      model,
      providerConfig,
      aiProvider,
      selectedModel,
      (
        progress,
        token,
        provider,
        model,
        scmProvider,
        selectedFiles,
        resources,
        repoPath,
        providerConfig,
        aiProvider,
        selectedModel,
      ) =>
        this.streamingHelper.performStreamingGeneration(
          progress,
          token,
          provider,
          model,
          scmProvider,
          selectedFiles,
          resources,
          repoPath,
          providerConfig,
          aiProvider,
          selectedModel,
        ),
    );
  }

  /**
   * 处理单仓库场景 - 遵循单一职责原则
   */
  private async handleSingleRepositoryScenario(
    context: {
      scmProvider: any;
      selectedFiles?: string[];
      repositoryPath?: string;
    },
    resourceStates: vscode.SourceControlResourceState[] | undefined,
    provider: string,
    model: string,
    providerConfig: any,
    aiProvider?: any,
    selectedModel?: any,
  ): Promise<void> {
    const { scmProvider, selectedFiles, repositoryPath: finalRepoPath } =
      context;

    if (!finalRepoPath) {
      await notify.warn(
        formatMessage("scm.repository.not.found", [
          scmProvider.type.toUpperCase(),
        ])
      );
      return;
    }

    this.logger.info(`Working with repository: ${finalRepoPath}`);

    await ProgressHandler.withProgress(
      formatMessage("progress.generating.commit", [
        scmProvider.type.toLocaleUpperCase(),
      ]),
      async (progress, token) => {
        await this.streamingHelper.performStreamingGeneration(
          progress,
          token,
          provider,
          model,
          scmProvider,
          selectedFiles,
          resourceStates || [],
          finalRepoPath,
          providerConfig,
          aiProvider,
          selectedModel,
        );
      },
    );
  }
}
