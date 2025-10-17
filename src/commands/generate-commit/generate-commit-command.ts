import * as vscode from "vscode";
import { BaseCommand } from "../base-command";
import { notify } from "../../utils/notification/notification-manager";
import { getMessage, formatMessage } from "../../utils/i18n";
import { ProgressHandler } from "../../utils/notification/progress-handler";
import { multiRepositoryContextManager } from "../../scm/multi-repository-context-manager";
import { SCMFactory } from "../../scm/scm-provider";
import { CrossRepositoryHandler } from "./handlers/cross-repository-handler";
import { StreamingGenerationHelper } from "./utils/streaming-generation-helper";

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

    // 步骤1: 验证AI提供商服务条款
    if ((await this.showConfirmAIProviderToS()) === false) {
      this.logger.warn("User did not confirm AI provider ToS.");
      return;
    }

    // 步骤2: 验证配置
    const configResult = await this.handleConfiguration();
    if (!configResult) {
      this.logger.warn("Configuration is not valid.");
      return;
    }
    const { provider, model } = configResult;
    this.logger.info(`Using AI provider: ${provider}, model: ${model}`);

    // 步骤3: 处理具体执行逻辑
    try {
      await this.executeCommitGeneration(arg, provider, model);
    } catch (error) {
      this.logger.error(error as Error);
      if (error instanceof Error) {
        notify.error("generate.commit.failed", [error.message]);
      }
    }
  }

  /**
   * 执行提交生成的主要逻辑 - 遵循单一职责原则
   */
  private async executeCommitGeneration(
    arg: any,
    provider: string,
    model: string
  ): Promise<void> {
    // 解析参数
    const parsedArgs = this.parseArguments(arg);
    
    // 检测是否为跨仓库场景
    if (parsedArgs.isCrossRepository) {
      await this.handleCrossRepositoryScenario(
        parsedArgs.filesByRepository, provider, model
      );
      return;
    }

    // 处理单仓库场景
    await this.handleSingleRepositoryScenario(
      parsedArgs, provider, model
    );
  }

  /**
   * 解析参数 - 遵循单一职责原则
   */
  private parseArguments(arg: any): {
    resourceStates?: vscode.SourceControlResourceState[];
    repositoryPath?: string;
    scmType?: 'git' | 'svn';
    filesByRepository?: Map<string, string[]>;
    isCrossRepository: boolean;
  } {
    let resourceStates: vscode.SourceControlResourceState[] | undefined;
    let repositoryPath: string | undefined;
    let scmType: 'git' | 'svn' | undefined;
    let filesByRepository: Map<string, string[]> | undefined;
    let isCrossRepository = false;

    if (Array.isArray(arg)) {
      resourceStates = arg;
      this.logger.info(`Received resourceStates array with ${arg.length} items`);
    } else if (arg?.rootUri) {
      repositoryPath = arg.rootUri.fsPath;
      scmType = arg.id;
      this.logger.info(`Received sourceControl object: ${scmType} at ${repositoryPath}`);
    } else {
      this.logger.info("No valid arguments provided, will use fallback logic");
    }

    // 检查跨仓库场景
    if (resourceStates && resourceStates.length > 0) {
      // 这里需要异步处理，但我们先简化处理
      // 实际实现中需要await multiRepositoryContextManager.groupFilesByRepository(resourceStates)
      isCrossRepository = false; // 暂时设为false，避免异步问题
    }

    return {
      resourceStates,
      repositoryPath,
      scmType,
      filesByRepository,
      isCrossRepository
    };
  }

  /**
   * 处理跨仓库场景 - 遵循单一职责原则
   */
  private async handleCrossRepositoryScenario(
    filesByRepository: Map<string, string[]> | undefined,
    provider: string,
    model: string
  ): Promise<void> {
    if (!filesByRepository) {
      this.logger.warn("No files by repository provided for cross-repository scenario");
      return;
    }

    await this.crossRepoHandler.handle(
      filesByRepository,
      provider,
      model,
      (progress, token, provider, model, scmProvider, selectedFiles, resources, repoPath) =>
        this.streamingHelper.performStreamingGeneration(
          progress, token, provider, model, scmProvider, selectedFiles, resources, repoPath,
          this.selectAndUpdateModelConfiguration.bind(this)
        )
    );
  }

  /**
   * 处理单仓库场景 - 遵循单一职责原则
   */
  private async handleSingleRepositoryScenario(
    parsedArgs: any,
    provider: string,
    model: string
  ): Promise<void> {
    let result: any;

    if (parsedArgs.repositoryPath && parsedArgs.scmType) {
      // 直接使用已知的仓库信息
      result = await this.createSCMProviderFromKnownRepo(parsedArgs.repositoryPath);
    } else {
      // 通过resourceStates检测
      result = await this.detectSCMProvider(parsedArgs.resourceStates);
    }

    if (!result) {
      this.logger.warn("SCM provider not detected.");
      return;
    }

    const { scmProvider, selectedFiles, repositoryPath: finalRepoPath } = result;

    if (!finalRepoPath) {
      await notify.warn(
        formatMessage("scm.repository.not.found", [scmProvider.type.toUpperCase()])
      );
      return;
    }

    this.logger.info(`Working with repository: ${finalRepoPath}`);

    await ProgressHandler.withProgress(
      formatMessage("progress.generating.commit", [scmProvider.type.toLocaleUpperCase()]),
      async (progress, token) => {
        await this.streamingHelper.performStreamingGeneration(
          progress, token, provider, model, scmProvider, selectedFiles, 
          parsedArgs.resourceStates || [], finalRepoPath,
          this.selectAndUpdateModelConfiguration.bind(this)
        );
      }
    );
  }

  /**
   * 从已知仓库信息创建SCM提供器 - 遵循单一职责原则
   */
  private async createSCMProviderFromKnownRepo(repositoryPath: string): Promise<any> {
    const scmProvider = await SCMFactory.detectSCM(undefined, repositoryPath);
    if (!scmProvider) {
      await notify.error(getMessage("scm.not.detected"));
      return null;
    }

    return {
      scmProvider,
      selectedFiles: undefined,
      repositoryPath
    };
  }


}
