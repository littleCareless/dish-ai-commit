import { getAccurateTokenLimits } from "@/ai/model-registry";
import { AIModel, AIProvider } from "@/ai/types";
import { getSystemPrompt } from "@/ai/utils/generate-helper";
import { CommitContextBuilder } from "@/commands/generate-commit/builders/context-builder";
import { FunctionCallingHandler } from "@/commands/generate-commit/handlers/function-calling-handler";
import { LayeredCommitHandler } from "@/commands/generate-commit/handlers/layered-commit-handler";
import { StreamingHandler } from "@/commands/generate-commit/handlers/streaming-handler";
import { multiRepositoryContextManager } from "@/scm/multi-repository-context-manager";
import { ISCMProvider } from "@/scm/scm-provider";
import { smartDiffSelector } from "@/scm/smart-diff-selector";
import { stagedContentDetector } from "@/scm/staged-content-detector";
import { DiffTarget } from "@/scm/staged-detector-types";
import { commitCacheService } from "@/services/cache/commit-cache-service";
import { ContextManager, RequestTooLargeError } from "@/utils/context-manager";
import { getMessage } from "@/utils/i18n";
import { Logger } from "@/utils/logger";
import { notify } from "@/utils/notification/notification-manager";
import { showCommitSuccessNotification } from "@/utils/notification/system-notification";
import { stateManager } from "@/utils/state/state-manager";
import * as vscode from "vscode";

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
   * @param aiProvider - 已创建的AI提供者实例（避免重复创建）
   * @param selectedModel - 已验证的模型对象（可选，如果未提供则从配置中获取）
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
    providerConfig: any,
    aiProvider?: AIProvider,
    selectedModel?: AIModel
  ): Promise<void> {
    this.logger.info("Performing streaming generation...");

    // 阶段1: 初始化
    progress.report({
      message: getMessage("progress.stage.initializing") || "[1/4] 初始化...",
    });

    // 步骤1: 获取配置和diff内容
    const { configuration, diffContent } =
      await this.prepareConfigurationAndDiff(
        progress,
        scmProvider,
        selectedFiles,
        resources,
        providerConfig
      );

    if (!diffContent) {
      return;
    }

    // 步骤1.5: 极速缓存检查 (🔥 优化：在模型验证和构建上下文之前检查)
    // 只要有 diff 和配置，就不需要等待模型验证，直接尝试命中缓存
    const shouldUseLayeredCommit =
      configuration.features.commitFormat.enableLayeredCommit &&
      selectedFiles &&
      selectedFiles.length > 1;

    if (!shouldUseLayeredCommit) {
      // 使用传入的 model 参数作为 ID，跳过模型验证对象的获取
      const cacheKey = commitCacheService.generateKey(
        diffContent,
        configuration,
        model
      );
      const cachedMessage = commitCacheService.get(cacheKey);

      if (cachedMessage) {
        this.logger.info(
          "Cache hit! Using cached commit message (ultra-early check)."
        );
        progress.report({
          message:
            getMessage("progress.stage.generating") || "[4/4] 生成提交消息...",
          increment: 100,
        });

        await scmProvider.startStreamingInput(cachedMessage);
        notify.info("commit.message.generated.from.cache");
        showCommitSuccessNotification();
        return;
      }
    }

    // 阶段2: 分析变更
    progress.report({
      message: getMessage("progress.stage.analyzing") || "[2/4] 分析变更...",
    });
    const modelConfig = await this.processModelConfiguration(
      progress,
      provider,
      model,
      providerConfig,
      aiProvider,
      selectedModel
    );

    // 阶段3: 构建上下文
    progress.report({
      message:
        getMessage("progress.stage.buildingContext") || "[3/4] 构建上下文...",
    });
    const { contextManager, requestParams } =
      await this.preparePromptAndContext(
        modelConfig.selectedModel,
        scmProvider,
        diffContent,
        configuration,
        selectedFiles,
        repositoryPath
      );

    // 步骤4: 检查提示词长度并处理警告
    await this.checkPromptLengthAndHandleWarnings(
      contextManager,
      modelConfig.selectedModel,
      configuration
    );

    // 阶段4: 生成提交消息
    progress.report({
      message:
        getMessage("progress.stage.generating") || "[4/4] 生成提交消息...",
    });

    await this.executeGenerationFlow(
      modelConfig.aiProvider,
      requestParams,
      scmProvider,
      contextManager,
      selectedFiles,
      modelConfig.selectedModel,
      token,
      progress,
      configuration,
      repositoryPath,
      modelConfig.provider
    );
  }

  /**
   * 准备配置和diff内容 - 遵循单一职责原则
   */
  private async prepareConfigurationAndDiff(
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    scmProvider: ISCMProvider,
    selectedFiles: string[] | undefined,
    resources: vscode.SourceControlResourceState[],
    providerConfig: any
  ): Promise<{ configuration: any; diffContent: string | undefined }> {
    if (!providerConfig) {
      this.logger.error(
        "Provider config not found in prepareConfigurationAndDiff",
        {
          operation: "prepareConfigurationAndDiff",
        }
      );
      throw new Error(getMessage("profile.not.found"));
    }

    // 直接使用传入的 providerConfig 作为 configuration
    const configuration = providerConfig;

    // 设置当前文件
    if (scmProvider.setCurrentFiles && selectedFiles) {
      this.logger.info(
        `Setting current files for SCM provider: ${selectedFiles.join(", ")}`
      );
      scmProvider.setCurrentFiles(selectedFiles);
    }

    // 获取diff内容
    progress.report({
      message:
        getMessage("progress.detecting.staged.content") || "检测暂存区内容...",
    });

    let diffContent: string | undefined;
    const diffTargetConfig = configuration.features.codeAnalysis.diffTarget;
    this.logger.info(`diffTargetConfig: ${diffTargetConfig}`);

    if (diffTargetConfig === "auto") {
      diffContent = await this.getDiffWithAutoDetection(
        scmProvider,
        selectedFiles,
        resources,
        progress
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
      const repositoryContext =
        await multiRepositoryContextManager.identifyRepository(
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
      this.logger.warn(
        `Auto-detection failed, falling back to traditional method: ${error}`
      );
      progress.report({ message: getMessage("progress.getting.diff") });
      return await scmProvider.getDiff(selectedFiles);
    }
  }

  /**
   * 处理模型配置 - 遵循单一职责原则
   * 优先使用传入的 aiProvider 和 selectedModel，避免重复创建
   */
  private async processModelConfiguration(
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    provider: string,
    model: string,
    providerConfig: any,
    aiProvider?: AIProvider,
    selectedModel?: AIModel
  ): Promise<{
    provider: string;
    model: string;
    aiProvider: AIProvider;
    selectedModel: AIModel;
  }> {
    progress.report({ message: getMessage("progress.updating.model.config") });

    // 如果已提供 aiProvider 和 selectedModel，直接使用（避免重复创建）
    if (aiProvider && selectedModel) {
      this.logger.info(
        `[Chain] [StreamingHelper] Using pre-initialized AI provider: ${aiProvider.getName?.() || provider}, model: ${selectedModel.id}`
      );

      if (!aiProvider.generateCommitStream) {
        this.logger.error(`Provider ${provider} does not support streaming.`);
        notify.error("provider.does.not.support.streaming", [provider]);
        throw new Error(`Provider ${provider} does not support streaming.`);
      }

      return {
        provider,
        model,
        aiProvider,
        selectedModel,
      };
    }

    // 否则，使用统一的模型验证服务（兼容旧流程）
    this.logger.warn(
      `[Chain] [StreamingHelper] No pre-initialized AI provider provided, creating new instance (fallback mode)`
    );
    const { ModelValidationService } =
      await import("@/services/core/model-validation-service");
    const { aiProvider: newProvider, selectedModel: newModel } =
      await ModelValidationService.validateModel(
        provider,
        model,
        providerConfig
      );

    if (!newModel) {
      this.logger.error("No model selected.");
      throw new Error(getMessage("no.model.selected"));
    }

    if (!newProvider.generateCommitStream) {
      this.logger.error(`Provider ${provider} does not support streaming.`);
      notify.error("provider.does.not.support.streaming", [provider]);
      throw new Error(`Provider ${provider} does not support streaming.`);
    }

    return {
      provider,
      model,
      aiProvider: newProvider,
      selectedModel: newModel,
    };
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
      feature: "commit-generation",
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
      `Context blocks: ${contextManager
        .getBlocks()
        .map((b: any) => b.name)
        .join(", ")}`
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

    const tokenLimits = await getAccurateTokenLimits(
      selectedModel,
      configuration
    );
    const maxTokens = tokenLimits.input;

    if (
      promptLength > maxTokens * 0.75 &&
      !configuration.features.suppressNonCriticalWarnings
    ) {
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

        const fallbackSystemPrompt = await getSystemPrompt(
          tempParams,
          true,
          true
        );
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

      const useFunctionCalling =
        stateManager.getWorkspace<boolean>(
          "experimental.commitWithFunctionCalling.enabled"
        ) ?? false;

      // === 缓存检查 ===
      // 目前只支持标准生成和函数调用生成的缓存，分层提交因复杂性暂不支持
      // 注意：读取缓存的逻辑已移动到 performStreamingGeneration 以提高性能
      const shouldUseLayeredCommit =
        configuration.features.commitFormat.enableLayeredCommit &&
        selectedFiles &&
        selectedFiles.length > 1;

      let cacheKey: string | undefined;

      // 只有非分层提交才生成 cacheKey (用于后续写入)
      if (!shouldUseLayeredCommit) {
        cacheKey = commitCacheService.generateKey(
          requestParams.diff || "", // 核心是 Diff 内容
          configuration,
          selectedModel.id
        );
      }
      // =================

      let generatedMessage: string | undefined;

      if (useFunctionCalling) {
        generatedMessage = await this.handleFunctionCallingGeneration(
          aiProvider,
          requestParams,
          scmProvider,
          contextManager,
          token,
          progress,
          repositoryPath,
          newProvider
        );
      } else {
        generatedMessage = await this.handleStandardGeneration(
          aiProvider,
          requestParams,
          scmProvider,
          contextManager,
          selectedFiles,
          selectedModel,
          token,
          progress,
          configuration,
          repositoryPath
        );
      }

      // === 写入缓存 ===
      if (cacheKey && generatedMessage && !shouldUseLayeredCommit) {
        this.logger.info("Caching generated commit message.");
        commitCacheService.set(cacheKey, generatedMessage);
      }
      // ================

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
  ): Promise<string> {
    this.logger.info("Using function calling generation.");

    if (!aiProvider.generateCommitWithFunctionCalling) {
      this.logger.error(
        `Provider ${newProvider} does not support function calling.`
      );
      throw new Error(
        `Provider ${newProvider} does not support function calling.`
      );
    }

    const messages = contextManager.buildMessages();
    this.logger.info(
      `Built messages for function calling. Total messages: ${messages.length}`
    );

    return await this.functionCallingHandler.handle(
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
  ): Promise<string | undefined> {
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
        selectedModel,
        configuration
      );
      return undefined; // Layered commit handler manages its own output and doesn't return a single string
    } else {
      this.logger.info("Performing standard streaming generation.");
      return await this.streamingHandler.handle(
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
        // 模型选择已迁移到 webview-ui 设置页面
        await vscode.commands.executeCommand(
          "workbench.view.extension.dish-ai-commitActivityBar"
        );
      }
    } else {
      this.logger.logError(error as Error, "流式生成失败");
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
