import * as vscode from "vscode";
import { ISCMProvider } from "../../../scm/scm-provider";
import { AIProvider, AIModel } from "../../../ai/types";
import { ContextManager, RequestTooLargeError } from "../../../utils/context-manager";
import { getAccurateTokenLimits } from "../../../ai/model-registry";
import { getSystemPrompt } from "../../../ai/utils/generate-helper";
import { stateManager } from "../../../utils/state/state-manager";
import { multiRepositoryContextManager } from "../../../scm/multi-repository-context-manager";
import { stagedContentDetector } from "../../../scm/staged-content-detector";
import { smartDiffSelector } from "../../../scm/smart-diff-selector";
import { DiffTarget } from "../../../scm/staged-detector-types";
import { ConfigurationManager } from "../../../config/configuration-manager";
import { getMessage } from "../../../utils/i18n";
import { notify } from "../../../utils/notification/notification-manager";
import { showCommitSuccessNotification } from "../../../utils/notification/system-notification";
import { CommitContextBuilder } from "../builders/context-builder";
import { LayeredCommitHandler } from "../handlers/layered-commit-handler";
import { StreamingHandler } from "../handlers/streaming-handler";
import { FunctionCallingHandler } from "../handlers/function-calling-handler";
import { Logger } from "../../../utils/logger";

/**
 * 流式生成辅助类 - 遵循单一职责原则
 * 只负责流式生成的逻辑，不包含其他职责
 */
export class StreamingGenerationHelper {
  private contextBuilder: CommitContextBuilder;
  private layeredCommitHandler: LayeredCommitHandler;
  private streamingHandler: StreamingHandler;
  private functionCallingHandler: FunctionCallingHandler;

  constructor(private logger: Logger) {
    this.contextBuilder = new CommitContextBuilder();
    this.layeredCommitHandler = new LayeredCommitHandler(logger);
    this.streamingHandler = new StreamingHandler(logger);
    this.functionCallingHandler = new FunctionCallingHandler(logger);
  }

  /**
   * 执行流式生成 - 遵循单一职责原则
   */
  async performStreamingGeneration(
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken,
    provider: string,
    model: string,
    scmProvider: ISCMProvider,
    selectedFiles: string[] | undefined,
    resources: vscode.SourceControlResourceState[],
    repositoryPath: string | undefined,
    selectAndUpdateModelConfiguration: (provider: string, model: string) => Promise<{
      provider: string;
      model: string;
      aiProvider: AIProvider;
      selectedModel: AIModel | undefined;
    }>
  ): Promise<void> {
    this.logger.info("Performing streaming generation...");
    
    // 步骤1: 获取配置和diff内容
    const { configuration, diffContent } = await this.prepareConfigurationAndDiff(
      progress, scmProvider, selectedFiles, resources
    );
    
    if (!diffContent) {
      return;
    }

    // 步骤2: 处理模型配置
    const modelConfig = await this.processModelConfiguration(
      progress, provider, model, selectAndUpdateModelConfiguration
    );

    // 步骤3: 准备提示词和上下文
    const { contextManager, requestParams } = await this.preparePromptAndContext(
      modelConfig.selectedModel, scmProvider, diffContent, configuration, 
      selectedFiles, repositoryPath
    );

    // 步骤4: 检查提示词长度并处理警告
    await this.checkPromptLengthAndHandleWarnings(
      contextManager, modelConfig.selectedModel, configuration
    );

    // 步骤5: 执行生成流程
    await this.executeGenerationFlow(
      modelConfig.aiProvider, requestParams, scmProvider, contextManager,
      selectedFiles, modelConfig.selectedModel, token, progress, 
      configuration, repositoryPath, modelConfig.provider
    );
  }

  /**
   * 准备配置和diff内容 - 遵循单一职责原则
   */
  private async prepareConfigurationAndDiff(
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    scmProvider: ISCMProvider,
    selectedFiles: string[] | undefined,
    resources: vscode.SourceControlResourceState[]
  ): Promise<{ configuration: any; diffContent: string | undefined }> {
    const config = ConfigurationManager.getInstance();
    const configuration = config.getConfiguration();

    // 设置当前文件
    if (scmProvider.setCurrentFiles && selectedFiles) {
      this.logger.info(`Setting current files for SCM provider: ${selectedFiles.join(", ")}`);
      scmProvider.setCurrentFiles(selectedFiles);
    }

    // 获取diff内容
    progress.report({
      message: getMessage("progress.detecting.staged.content") || "检测暂存区内容...",
    });

    let diffContent: string | undefined;
    const diffTargetConfig = configuration.features.codeAnalysis.diffTarget;
    this.logger.info(`diffTargetConfig: ${diffTargetConfig}`);

    if (diffTargetConfig === "auto") {
      diffContent = await this.getDiffWithAutoDetection(
        scmProvider, selectedFiles, resources, progress
      );
    } else {
      progress.report({ message: getMessage("progress.getting.diff") });
      diffContent = await scmProvider.getDiff(selectedFiles);
    }

    return { configuration, diffContent };
  }

  /**
   * 使用自动检测获取diff内容 - 遵循单一职责原则
   */
  private async getDiffWithAutoDetection(
    scmProvider: ISCMProvider,
    selectedFiles: string[] | undefined,
    resources: vscode.SourceControlResourceState[],
    progress: vscode.Progress<{ message?: string; increment?: number }>
  ): Promise<string | undefined> {
    try {
      const repositoryContext = await multiRepositoryContextManager.identifyRepository(
        selectedFiles,
        vscode.window.activeTextEditor,
        resources
      );

      const detectionResult = await stagedContentDetector.detectStagedContent({
        repository: repositoryContext,
        includeFileDetails: true,
        useCache: true,
      });

      const selectedTarget = await smartDiffSelector.selectDiffTarget(
        scmProvider,
        detectionResult,
        DiffTarget.AUTO
      );

      const diffResult = await smartDiffSelector.getDiffWithTarget(
        scmProvider,
        selectedTarget,
        selectedFiles
      );

      this.logger.info(
        `Auto-detection selected target: ${selectedTarget}, files: ${diffResult.files.length}`
      );

      return diffResult.content;
    } catch (error) {
      this.logger.warn(`Auto-detection failed, falling back to traditional method: ${error}`);
      progress.report({ message: getMessage("progress.getting.diff") });
      return await scmProvider.getDiff(selectedFiles);
    }
  }

  /**
   * 处理模型配置 - 遵循单一职责原则
   */
  private async processModelConfiguration(
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    provider: string,
    model: string,
    selectAndUpdateModelConfiguration: (provider: string, model: string) => Promise<{
      provider: string;
      model: string;
      aiProvider: AIProvider;
      selectedModel: AIModel | undefined;
    }>
  ): Promise<{ provider: string; model: string; aiProvider: AIProvider; selectedModel: AIModel }> {
    progress.report({ message: getMessage("progress.updating.model.config") });
    
    const {
      provider: newProvider,
      model: newModel,
      aiProvider,
      selectedModel,
    } = await selectAndUpdateModelConfiguration(provider, model);

    if (!selectedModel) {
      this.logger.error("No model selected.");
      throw new Error(getMessage("no.model.selected"));
    }

    if (!aiProvider.generateCommitStream) {
      this.logger.error(`Provider ${newProvider} does not support streaming.`);
      notify.error("provider.does.not.support.streaming", [newProvider]);
      throw new Error(`Provider ${newProvider} does not support streaming.`);
    }

    return { provider: newProvider, model: newModel, aiProvider, selectedModel };
  }

  /**
   * 准备提示词和上下文 - 遵循单一职责原则
   */
  private async preparePromptAndContext(
    selectedModel: AIModel,
    scmProvider: ISCMProvider,
    diffContent: string,
    configuration: any,
    selectedFiles: string[] | undefined,
    repositoryPath?: string
  ): Promise<{ contextManager: ContextManager; requestParams: any }> {
    const tempParams = {
      ...configuration.features.commitMessage,
      ...configuration.features.commitFormat,
      ...configuration.features.codeAnalysis,
      model: selectedModel,
      scm: scmProvider.type ?? "git",
      workspaceRoot: repositoryPath,
      changeFiles: selectedFiles || [],
      languages: configuration.base.language,
      diff: diffContent,
      additionalContext: "",
    };

    const systemPrompt = await getSystemPrompt(tempParams);
    const contextManager = await this.contextBuilder.buildContextManager(
      selectedModel,
      systemPrompt,
      scmProvider,
      diffContent,
      configuration
    );

    this.logger.info("ContextManager built.");
    this.logger.info(
      `Context blocks: ${contextManager.getBlocks().map((b: any) => b.name).join(", ")}`
    );

    const requestParams = {
      ...tempParams,
      diff: diffContent,
    };

    return { contextManager, requestParams };
  }

  /**
   * 检查提示词长度并处理警告 - 遵循单一职责原则
   */
  private async checkPromptLengthAndHandleWarnings(
    contextManager: ContextManager,
    selectedModel: AIModel,
    configuration: any
  ): Promise<void> {
    const promptLength = contextManager.getEstimatedRawTokenCount();
    this.logger.info(`Estimated prompt length: ${promptLength} tokens.`);

    const tokenLimits = await getAccurateTokenLimits(selectedModel);
    const maxTokens = tokenLimits.input;

    if (promptLength > maxTokens * 0.75 && !configuration.features.suppressNonCriticalWarnings) {
      const useFallbackChoice = getMessage("fallback.use");
      const continueAnyway = getMessage("prompt.large.continue");

      const choice = await notify.warn(
        "prompt.large.warning.with.fallback",
        [promptLength.toLocaleString(), maxTokens.toLocaleString()],
        { modal: true, buttons: [useFallbackChoice, continueAnyway] }
      );

      if (choice === useFallbackChoice) {
        const tempParams = {
          ...configuration.features.commitMessage,
          ...configuration.features.commitFormat,
          ...configuration.features.codeAnalysis,
          model: selectedModel,
          scm: "git",
          workspaceRoot: undefined,
          changeFiles: [],
          languages: configuration.base.language,
          diff: "",
          additionalContext: "",
        };

        const fallbackSystemPrompt = await getSystemPrompt(tempParams, true, true);
        contextManager.setSystemPrompt(fallbackSystemPrompt);
        notify.info("info.using.fallback.prompt");
      } else if (choice !== continueAnyway) {
        throw new Error(getMessage("prompt.user.cancelled"));
      }
    }
  }

  /**
   * 执行生成流程 - 遵循单一职责原则
   */
  private async executeGenerationFlow(
    aiProvider: AIProvider,
    requestParams: any,
    scmProvider: ISCMProvider,
    contextManager: ContextManager,
    selectedFiles: string[] | undefined,
    selectedModel: AIModel,
    token: vscode.CancellationToken,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    configuration: any,
    repositoryPath: string | undefined,
    newProvider: string
  ): Promise<void> {
    try {
      this.throwIfCancelled(token);

      const useFunctionCalling = stateManager.getWorkspace<boolean>(
        "experimental.commitWithFunctionCalling.enabled"
      ) ?? false;

      if (useFunctionCalling) {
        await this.handleFunctionCallingGeneration(
          aiProvider, requestParams, scmProvider, contextManager, 
          token, progress, repositoryPath, newProvider
        );
      } else {
        await this.handleStandardGeneration(
          aiProvider, requestParams, scmProvider, contextManager,
          selectedFiles, selectedModel, token, progress, configuration, repositoryPath
        );
      }

      notify.info("commit.message.generated.stream", [
        scmProvider.type.toUpperCase(),
        newProvider,
        selectedModel?.id || "default",
      ]);

      showCommitSuccessNotification();
    } catch (error) {
      await this.handleGenerationError(error);
    }
  }

  /**
   * 处理函数调用生成 - 遵循单一职责原则
   */
  private async handleFunctionCallingGeneration(
    aiProvider: AIProvider,
    requestParams: any,
    scmProvider: ISCMProvider,
    contextManager: ContextManager,
    token: vscode.CancellationToken,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    repositoryPath: string | undefined,
    newProvider: string
  ): Promise<void> {
    this.logger.info("Using function calling generation.");

    if (!aiProvider.generateCommitWithFunctionCalling) {
      this.logger.error(`Provider ${newProvider} does not support function calling.`);
      throw new Error(`Provider ${newProvider} does not support function calling.`);
    }

    const messages = contextManager.buildMessages();
    this.logger.info(`Built messages for function calling. Total messages: ${messages.length}`);

    await this.functionCallingHandler.handle(
      aiProvider,
      { ...requestParams, messages },
      scmProvider,
      token,
      progress,
      repositoryPath
    );
  }

  /**
   * 处理标准生成 - 遵循单一职责原则
   */
  private async handleStandardGeneration(
    aiProvider: AIProvider,
    requestParams: any,
    scmProvider: ISCMProvider,
    contextManager: ContextManager,
    selectedFiles: string[] | undefined,
    selectedModel: AIModel,
    token: vscode.CancellationToken,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    configuration: any,
    repositoryPath: string | undefined
  ): Promise<void> {
    const shouldUseLayeredCommit =
      configuration.features.commitFormat.enableLayeredCommit &&
      selectedFiles &&
      selectedFiles.length > 1;

    if (shouldUseLayeredCommit) {
      this.logger.info("Performing layered file commit generation.");
      await this.layeredCommitHandler.handle(
        aiProvider,
        requestParams,
        scmProvider,
        selectedFiles,
        token,
        progress,
        selectedModel
      );
    } else {
      this.logger.info("Performing standard streaming generation.");
      await this.streamingHandler.handle(
        aiProvider as any,
        requestParams,
        scmProvider,
        token,
        progress,
        contextManager,
        repositoryPath
      );
    }
  }

  /**
   * 处理生成错误 - 遵循单一职责原则
   */
  private async handleGenerationError(error: any): Promise<void> {
    if (error instanceof RequestTooLargeError) {
      const switchToLargerModel = getMessage("error.switch.to.larger.model");
      const choice = await notify.error(
        "error.request.too.large",
        [error.message],
        { modal: true, buttons: [switchToLargerModel] }
      );
      if (choice === switchToLargerModel) {
        vscode.commands.executeCommand("dish.selectModel");
      }
    } else {
      this.logger.error(error as Error);
      throw error;
    }
  }

  /**
   * 检查操作是否已被用户取消
   */
  private throwIfCancelled(token: vscode.CancellationToken): void {
    if (token.isCancellationRequested) {
      this.logger.info(getMessage("user.cancelled.operation.log"));
      throw new Error(getMessage("user.cancelled.operation.error"));
    }
  }
}
