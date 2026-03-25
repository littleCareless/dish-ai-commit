import { getAccurateTokenLimits } from "@/ai/model-registry";
import { AdaptiveModelLimitService } from "@/ai/model-registry/adaptive-model-limit-service";
import { ModelCatalogService } from "@/ai/model-registry/model-catalog-service";
import { AIModel, AIProvider } from "@/ai/types";
import { getSystemPrompt } from "@/ai/utils/generate-helper";
import { CommitContextBuilder } from "@/commands/generate-commit/builders/context-builder";
import { FunctionCallingHandler } from "@/commands/generate-commit/handlers/function-calling-handler";
import { LayeredCommitHandler } from "@/commands/generate-commit/handlers/layered-commit-handler";
import {
  GenerationResult,
  GenerationSession,
  GenerationTargetContext,
} from "@/commands/generate-commit/types";
import {
  assertNotCancelled,
  isCancellationError,
} from "@/commands/generate-commit/utils/cancellation";
import { StreamingHandler } from "@/commands/generate-commit/handlers/streaming-handler";
import { ISCMProvider } from "@/scm/scm-provider";
import { smartDiffSelector } from "@/scm/smart-diff-selector";
import { stagedContentDetector } from "@/scm/staged-content-detector";
import { DiffTarget, RepositoryContext } from "@/scm/staged-detector-types";
import { commitCacheService } from "@/services/cache/commit-cache-service";
import { ContextInspectorService } from "@/services/context-inspector-service";
import { ContextManager, RequestTooLargeError } from "@/utils/context-manager";
import { getMessage } from "@/utils/i18n";
import { Logger } from "@/utils/logger";
import { notify } from "@/utils/notification/notification-manager";
import { showCommitSuccessNotification } from "@/utils/notification/system-notification";
import { stateManager } from "@/utils/state/state-manager";
import * as vscode from "vscode";
import * as crypto from "crypto";

const DEFAULT_REQUEST_INPUT_TOKEN_LIMIT = 120000;
const MODEL_INPUT_TOKEN_SAFETY_RATIO = 0.88;
const PROVIDER_REQUEST_INPUT_LIMITS: Record<string, number> = {
  gemini: 250000,
  vertexai: 250000,
};

interface PerformGenerationOptions {
  suppressSuccessNotification?: boolean;
}

interface DiffSnapshot {
  combinedDiff: string | undefined;
  resolvedDiffTarget: "staged" | "all";
  fileDiffMap?: Map<string, string>;
}

/**
 * 流式生成辅助类 - 遵循单一职责原则
 * 只负责流式生成的逻辑，不包含其他职责
 */
export class StreamingGenerationHelper {
  private contextBuilder: CommitContextBuilder;
  private layeredCommitHandler: LayeredCommitHandler;
  private streamingHandler: StreamingHandler;
  private functionCallingHandler: FunctionCallingHandler;
  private lastRequestId: string | null = null;
  private lastContext: {
    contextManager: ContextManager;
    requestParams: any;
  } | null = null;

  // 配置缓存
  private _baseRequestParams: any | null = null;
  private _lastRequestParamsHash: string | null = null;
  private _lastSystemPrompt: string | null = null;
  private _lastSystemPromptHash: string | null = null;
  private contextInspectorService = ContextInspectorService.getInstance();
  private adaptiveModelLimitService = AdaptiveModelLimitService.getInstance();
  private modelCatalogService = ModelCatalogService.getInstance();

  constructor(private logger: Logger) {
    this.contextBuilder = new CommitContextBuilder();
    this.layeredCommitHandler = new LayeredCommitHandler(logger);
    this.streamingHandler = new StreamingHandler(logger);
    this.functionCallingHandler = new FunctionCallingHandler(logger);
  }

  /**
   * 执行流式生成 - 遵循单一职责原则
   * 仅消费由编排器产出的 session，不再在此处重复进行模型/仓库识别
   */
  async performStreamingGeneration(
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken,
    session: GenerationSession,
    target: GenerationTargetContext,
    options: PerformGenerationOptions = {},
  ): Promise<GenerationResult> {
    this.logger.info(
      `[Chain] [Generation] START - requestId=${session.requestId}, repository=${target.repositoryPath}`,
    );

    if (!target.scmProvider) {
      return this.createFailedResult(
        session,
        target,
        target.detectionError || "SCM provider is missing.",
      );
    }

    const scmProvider = target.scmProvider;
    const selectedFiles = target.selectedFiles;
    const repositoryPath = target.repositoryPath;

    // 阶段1: 初始化
    progress.report({
      message: getMessage("progress.stage.initializing") || "[1/4] 初始化...",
    });

    try {
      // 步骤1: 获取配置和diff内容
      const { configuration, snapshot } =
        await this.prepareConfigurationAndDiff(
          progress,
          scmProvider,
          selectedFiles,
          session.providerConfig,
          target.repositoryContext,
        );
      const { combinedDiff: diffContent, fileDiffMap } = snapshot;

      if (!diffContent) {
        return this.createFailedResult(
          session,
          target,
          "No diff content available for commit generation.",
        );
      }

      // 步骤1.5: 极速缓存检查 (在上下文构建前)
      const shouldUseLayeredCommit =
        configuration.features.commitFormat.enableLayeredCommit &&
        selectedFiles &&
        selectedFiles.length > 1;

      if (!shouldUseLayeredCommit) {
        const cacheKey = commitCacheService.generateKey(
          diffContent,
          configuration,
          session.model,
          scmProvider.type ?? "git",
        );
        const cachedMessage = commitCacheService.get(cacheKey);

        if (cachedMessage) {
          this.logger.info(
            "Cache hit! Using cached commit message (ultra-early check).",
          );
          progress.report({
            message:
              getMessage("progress.stage.generating") || "[4/4] 生成提交消息...",
            increment: 100,
          });

          await scmProvider.startStreamingInput(cachedMessage);
          if (!options.suppressSuccessNotification) {
            notify.info("commit.message.generated.from.cache");
            showCommitSuccessNotification();
          }

          return {
            status: "success",
            applied: true,
            requestId: session.requestId,
            repositoryPath,
            provider: session.provider,
            model: session.selectedModel.id,
            message: cachedMessage,
            fromCache: true,
          };
        }
      }

      // 阶段2: 分析变更
      progress.report({
        message: getMessage("progress.stage.analyzing") || "[2/4] 分析变更...",
      });
      const modelConfig = this.processModelConfiguration(
        progress,
        session.provider,
        session.model,
        session.aiProvider,
        session.selectedModel,
      );
      const contextModel = await this.getContextModelWithSafeInputLimit(
        modelConfig.selectedModel,
        configuration,
      );

      // 阶段3: 构建上下文
      progress.report({
        message:
          getMessage("progress.stage.buildingContext") || "[3/4] 构建上下文...",
      });
      const scopedRequestId = repositoryPath
        ? `${session.requestId}:${repositoryPath}`
        : session.requestId;
      const { contextManager, requestParams } =
        await this.preparePromptAndContext(
          contextModel,
          modelConfig.selectedModel,
          scmProvider,
          diffContent,
          configuration,
          selectedFiles,
          repositoryPath,
          scopedRequestId,
        );

      // 步骤4: 检查提示词长度并处理警告
      await this.checkPromptLengthAndHandleWarnings(
        contextManager,
        contextModel,
        configuration,
        scmProvider.type ?? "git",
      );

      this.contextInspectorService.storeSnapshot({
        requestId: scopedRequestId,
        provider: modelConfig.provider,
        model: modelConfig.selectedModel,
        contextManager,
        suppressNonCriticalWarnings:
          configuration.features?.suppressNonCriticalWarnings ?? false,
      });

      // 阶段4: 生成提交消息
      progress.report({
        message:
          getMessage("progress.stage.generating") || "[4/4] 生成提交消息...",
      });

      return await this.executeGenerationFlow(
        modelConfig.aiProvider,
        requestParams,
        scmProvider,
        contextManager,
        selectedFiles,
        contextModel,
        token,
        progress,
        configuration,
        repositoryPath,
        modelConfig.provider,
        options,
        session,
        target,
        fileDiffMap,
      );
    } catch (error) {
      return await this.handleGenerationError(
        error,
        session.selectedModel,
        session.providerConfig,
        session,
        target,
      );
    }
  }

  /**
   * 准备配置和diff内容 - 遵循单一职责原则
   */
  private async prepareConfigurationAndDiff(
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    scmProvider: ISCMProvider,
    selectedFiles: string[] | undefined,
    providerConfig: any,
    repositoryContext?: RepositoryContext,
  ): Promise<{
    configuration: any;
    snapshot: DiffSnapshot;
  }> {
    if (!providerConfig) {
      this.logger.error(
        "Provider config not found in prepareConfigurationAndDiff",
        {
          operation: "prepareConfigurationAndDiff",
        },
      );
      throw new Error(getMessage("profile.not.found"));
    }

    // 直接使用传入的 providerConfig 作为 configuration
    const configuration = providerConfig;

    // 设置当前文件
    if (scmProvider.setCurrentFiles && selectedFiles) {
      this.logger.info(
        `Setting current files for SCM provider: ${selectedFiles.join(", ")}`,
      );
      scmProvider.setCurrentFiles(selectedFiles);
    }

    // 获取diff内容
    progress.report({
      message:
        getMessage("progress.detecting.staged.content") || "检测暂存区内容...",
    });

    let diffContent: string | undefined;
    let resolvedDiffTarget: "staged" | "all" = "all";
    const diffTargetConfig = configuration.features.codeAnalysis.diffTarget;
    this.logger.info(`diffTargetConfig: ${diffTargetConfig}`);

    if (diffTargetConfig === "auto") {
      const autoDiffResult = await this.getDiffWithAutoDetection(
        scmProvider,
        selectedFiles,
        repositoryContext,
        progress,
      );
      diffContent = autoDiffResult.content;
      resolvedDiffTarget = autoDiffResult.target;
    } else {
      const explicitTarget =
        diffTargetConfig === "staged" ? "staged" : "all";
      progress.report({ message: getMessage("progress.getting.diff") });
      diffContent = await scmProvider.getDiff(selectedFiles, explicitTarget);
      resolvedDiffTarget = explicitTarget;
    }

    let fileDiffMap: Map<string, string> | undefined;
    const shouldBuildFileDiffMap =
      configuration.features?.commitFormat?.enableLayeredCommit &&
      selectedFiles &&
      selectedFiles.length > 1;

    if (shouldBuildFileDiffMap) {
      fileDiffMap = new Map<string, string>();
      for (const file of selectedFiles) {
        const fileDiff = await scmProvider.getDiff([file], resolvedDiffTarget);
        if (fileDiff) {
          fileDiffMap.set(file, fileDiff);
        }
      }
    }

    return {
      configuration,
      snapshot: {
        combinedDiff: diffContent,
        resolvedDiffTarget,
        fileDiffMap,
      },
    };
  }

  /**
   * 使用自动检测获取diff内容 - 遵循单一职责原则
   */
  private async getDiffWithAutoDetection(
    scmProvider: ISCMProvider,
    selectedFiles: string[] | undefined,
    repositoryContext: RepositoryContext | undefined,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
  ): Promise<{ content: string | undefined; target: "staged" | "all" }> {
    try {
      if (!repositoryContext) {
        progress.report({ message: getMessage("progress.getting.diff") });
        return {
          content: await scmProvider.getDiff(selectedFiles, "all"),
          target: "all",
        };
      }

      const detectionResult = await stagedContentDetector.detectStagedContent({
        repository: repositoryContext,
        includeFileDetails: true,
        useCache: true,
      });

      const selectedTarget = await smartDiffSelector.selectDiffTarget(
        scmProvider,
        detectionResult,
        DiffTarget.AUTO,
      );

      const diffResult = await smartDiffSelector.getDiffWithTarget(
        scmProvider,
        selectedTarget,
        selectedFiles,
      );

      this.logger.info(
        `Auto-detection selected target: ${selectedTarget}, files: ${diffResult.files.length}`,
      );

      return {
        content: diffResult.content,
        target: selectedTarget === "staged" ? "staged" : "all",
      };
    } catch (error) {
      this.logger.warn(
        `Auto-detection failed, falling back to traditional method: ${error}`,
      );
      progress.report({ message: getMessage("progress.getting.diff") });
      return {
        content: await scmProvider.getDiff(selectedFiles, "all"),
        target: "all",
      };
    }
  }

  /**
   * 处理模型配置 - 遵循单一职责原则
   * 优先使用传入的 aiProvider 和 selectedModel，避免重复创建
   */
  private processModelConfiguration(
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    provider: string,
    model: string,
    aiProvider: AIProvider,
    selectedModel: AIModel,
  ): {
    provider: string;
    model: string;
    aiProvider: AIProvider;
    selectedModel: AIModel;
  } {
    progress.report({ message: getMessage("progress.updating.model.config") });

    this.logger.info(
      `[Chain] [StreamingHelper] Using orchestrated AI provider: ${aiProvider.getName?.() || provider}, model: ${selectedModel.id}`,
    );

    return {
      provider,
      model,
      aiProvider,
      selectedModel,
    };
  }

  /**
   * 准备提示词和上下文 - 遵循单一职责原则
   */
  private async preparePromptAndContext(
    contextModel: AIModel,
    requestModel: AIModel,
    scmProvider: ISCMProvider,
    diffContent: string,
    configuration: any,
    selectedFiles: string[] | undefined,
    repositoryPath: string | undefined,
    requestId: string,
  ): Promise<{ contextManager: ContextManager; requestParams: any }> {
    if (this.lastRequestId === requestId && this.lastContext) {
      this.logger.debug(
        `[StreamingHelper] ✓ Reused context for requestId=${requestId}`,
      );
      return this.lastContext;
    }

    // 构建并缓存 system prompt
    const systemPromptHash = this.getSystemPromptHash(
      configuration,
      scmProvider.type ?? "git",
    );
    if (
      !this._lastSystemPrompt ||
      this._lastSystemPromptHash !== systemPromptHash
    ) {
      const tempParams = this.buildRequestParams(configuration, {
        model: requestModel,
        scm: scmProvider.type ?? "git",
        workspaceRoot: repositoryPath,
        changeFiles: selectedFiles || [],
        diff: diffContent,
      });

      this._lastSystemPrompt = await getSystemPrompt(tempParams);
      this._lastSystemPromptHash = systemPromptHash;
    }

    const contextManager = await this.contextBuilder.buildContextManager(
      contextModel,
      this._lastSystemPrompt,
      scmProvider,
      diffContent,
      configuration,
      { requestId },
    );

    this.logger.info("ContextManager built.");
    this.logger.info(
      `Context blocks: ${contextManager
        .getBlocks()
        .map((b: any) => b.name)
        .join(", ")}`,
    );

    const requestParams = this.buildRequestParams(configuration, {
      model: requestModel,
      scm: scmProvider.type ?? "git",
      workspaceRoot: repositoryPath,
      changeFiles: selectedFiles || [],
      diff: diffContent,
      additionalContext: "",
      feature: "commit-generation",
    });

    this.lastRequestId = requestId;
    this.lastContext = { contextManager, requestParams };

    this.logger.debug(
      `[StreamingHelper] Built new context for requestId=${requestId}`,
    );
    return { contextManager, requestParams };
  }

  /**
   * 构建请求参数 - 避免重复解构配置
   */
  private buildRequestParams(
    configuration: any,
    overrides: Partial<any> = {},
  ): any {
    const currentConfigHash = this.getRequestParamsHash(configuration);
    if (
      !this._baseRequestParams ||
      this._lastRequestParamsHash !== currentConfigHash
    ) {
      this._baseRequestParams = {
        ...configuration.features.commitMessage,
        ...configuration.features.commitFormat,
        ...configuration.features.codeAnalysis,
        languages: configuration.base.language,
      };
      this._lastRequestParamsHash = currentConfigHash;
    }

    return {
      ...this._baseRequestParams,
      ...overrides,
    };
  }

  private getRequestParamsHash(config: any): string {
    return JSON.stringify({
      language: config.base?.language,
      commitFormat: {
        enableEmoji: config.features?.commitFormat?.enableEmoji,
        enableBody: config.features?.commitFormat?.enableBody,
        enableMergeCommit: config.features?.commitFormat?.enableMergeCommit,
        enableLayeredCommit:
          config.features?.commitFormat?.enableLayeredCommit,
        enableGlobalContext:
          config.features?.commitFormat?.enableGlobalContext,
      },
      commitMessage: {
        rule: config.features?.commitMessage?.rule,
        useRecentCommitsAsReference:
          config.features?.commitMessage?.useRecentCommitsAsReference,
        diffTruncationStrategy:
          config.features?.commitMessage?.diffTruncationStrategy,
        maxInputTokensPerRequest:
          config.features?.commitMessage?.maxInputTokensPerRequest,
        largePromptAction: config.features?.commitMessage?.largePromptAction,
      },
      codeAnalysis: {
        diffTarget: config.features?.codeAnalysis?.diffTarget,
        autoDetectStaged: config.features?.codeAnalysis?.autoDetectStaged,
        fallbackToAll: config.features?.codeAnalysis?.fallbackToAll,
        simplifyDiff: config.features?.codeAnalysis?.simplifyDiff,
      },
    });
  }

  private getSystemPromptHash(config: any, scmType: string): string {
    return JSON.stringify({
      scm: scmType || "git",
      language: config.base?.language,
      commitFormat: {
        enableEmoji: config.features?.commitFormat?.enableEmoji,
        enableBody: config.features?.commitFormat?.enableBody,
        enableMergeCommit: config.features?.commitFormat?.enableMergeCommit,
      },
      commitMessage: {
        rule: config.features?.commitMessage?.rule,
        useRecentCommitsAsReference:
          config.features?.commitMessage?.useRecentCommitsAsReference,
        largePromptAction: config.features?.commitMessage?.largePromptAction,
      },
    });
  }

  /**
   * 检查提示词长度并处理警告 - 遵循单一职责原则
   */
  private async checkPromptLengthAndHandleWarnings(
    contextManager: ContextManager,
    selectedModel: AIModel,
    configuration: any,
    scmType: "git" | "svn",
  ): Promise<void> {
    const promptLength = contextManager.getEstimatedRawTokenCount();
    this.logger.info(`Estimated prompt length: ${promptLength} tokens.`);

    const rawInputLimit = await this.resolveModelInputLimit(
      selectedModel,
      configuration,
    );
    const maxTokens = this.getEffectiveInputTokenLimit(
      selectedModel,
      rawInputLimit,
      configuration,
    );
    const largePromptAction =
      configuration.features?.commitMessage?.largePromptAction ?? "useFallback";

    if (promptLength <= maxTokens * 0.75) {
      return;
    }

    if (largePromptAction === "useFallback") {
      await this.applyFallbackSystemPrompt(
        contextManager,
        selectedModel,
        configuration,
        scmType,
      );
      return;
    }

    if (largePromptAction === "continue") {
      return;
    }

    if (!configuration.features.suppressNonCriticalWarnings) {
      const useFallbackChoice = getMessage("fallback.use");
      const continueAnyway = getMessage("prompt.large.continue");

      const choice = await notify.warn(
        "prompt.large.warning.with.fallback",
        [promptLength.toLocaleString(), maxTokens.toLocaleString()],
        { modal: true, buttons: [useFallbackChoice, continueAnyway] },
      );

      if (choice === useFallbackChoice) {
        await this.applyFallbackSystemPrompt(
          contextManager,
          selectedModel,
          configuration,
          scmType,
        );
      } else if (choice !== continueAnyway) {
        throw new Error(getMessage("prompt.user.cancelled"));
      }
    }
  }

  private async applyFallbackSystemPrompt(
    contextManager: ContextManager,
    selectedModel: AIModel,
    configuration: any,
    scmType: "git" | "svn",
  ): Promise<void> {
    const tempParams = this.buildRequestParams(configuration, {
      model: selectedModel,
      scm: scmType,
      workspaceRoot: undefined,
      changeFiles: [],
      diff: "",
      additionalContext: "",
    });

    const fallbackSystemPrompt = await getSystemPrompt(tempParams, true, true);
    contextManager.setSystemPrompt(fallbackSystemPrompt);
    notify.info("info.using.fallback.prompt");
  }

  private async getContextModelWithSafeInputLimit(
    selectedModel: AIModel,
    configuration: any,
  ): Promise<AIModel> {
    const rawInputLimit = await this.resolveModelInputLimit(
      selectedModel,
      configuration,
    );
    const effectiveInputLimit = this.getEffectiveInputTokenLimit(
      selectedModel,
      rawInputLimit,
      configuration,
    );

    if (effectiveInputLimit >= selectedModel.maxTokens.input) {
      return selectedModel;
    }

    this.logger.warn(
      `[StreamingHelper] Reducing context input limit for ${selectedModel.provider.id}/${selectedModel.id}: ${selectedModel.maxTokens.input} -> ${effectiveInputLimit}`,
    );

    return {
      ...selectedModel,
      maxTokens: {
        ...selectedModel.maxTokens,
        input: effectiveInputLimit,
      },
    };
  }

  private getEffectiveInputTokenLimit(
    selectedModel: AIModel,
    modelInputLimit: number,
    configuration?: any,
  ): number {
    const providerId = selectedModel.provider?.id?.toLowerCase?.() ?? "";
    const modelId = selectedModel.id?.toLowerCase?.() ?? "";
    const modelSafetyLimit = Math.floor(
      modelInputLimit * MODEL_INPUT_TOKEN_SAFETY_RATIO,
    );
    const providerLimit =
      PROVIDER_REQUEST_INPUT_LIMITS[providerId] ??
      (modelId.includes("gemini")
        ? PROVIDER_REQUEST_INPUT_LIMITS.gemini
        : undefined);
    const providerSafetyLimit = providerLimit
      ? Math.floor(providerLimit * MODEL_INPUT_TOKEN_SAFETY_RATIO)
      : Number.POSITIVE_INFINITY;
    const configuredLimit = Number(
      configuration?.features?.commitMessage?.maxInputTokensPerRequest,
    );
    const configSafetyLimit =
      Number.isFinite(configuredLimit) && configuredLimit > 0
        ? Math.floor(configuredLimit)
        : Number.POSITIVE_INFINITY;
    const learnedInputLimit =
      this.adaptiveModelLimitService.getLearnedInputLimit(providerId, modelId);
    const learnedSafetyLimit =
      learnedInputLimit && Number.isFinite(learnedInputLimit)
        ? Math.floor(learnedInputLimit * MODEL_INPUT_TOKEN_SAFETY_RATIO)
        : Number.POSITIVE_INFINITY;

    return Math.max(
      4096,
      Math.min(
        modelInputLimit,
        modelSafetyLimit,
        DEFAULT_REQUEST_INPUT_TOKEN_LIMIT,
        providerSafetyLimit,
        configSafetyLimit,
        learnedSafetyLimit,
      ),
    );
  }

  private async resolveModelInputLimit(
    selectedModel: AIModel,
    configuration: any,
  ): Promise<number> {
    const enableThirdPartyModelCatalog =
      configuration?.features?.commitMessage?.enableThirdPartyModelCatalog !==
      false;
    const catalogResolved = await this.modelCatalogService.resolveInputLimit(
      selectedModel,
      { enableSyncedCatalog: enableThirdPartyModelCatalog },
    );
    const runtimeLimit = Number(selectedModel?.maxTokens?.input);
    if (catalogResolved?.inputLimit) {
      if (Number.isFinite(runtimeLimit) && runtimeLimit > 0) {
        const merged = Math.min(runtimeLimit, catalogResolved.inputLimit);
        this.logger.info(
          `[StreamingHelper] Input limit resolved via catalog (${catalogResolved.source}, ${catalogResolved.confidence}): runtime=${runtimeLimit}, catalog=${catalogResolved.inputLimit}, using=${merged}`,
        );
        return merged;
      }

      this.logger.info(
        `[StreamingHelper] Input limit resolved via catalog (${catalogResolved.source}, ${catalogResolved.confidence}): ${catalogResolved.inputLimit}`,
      );
      return catalogResolved.inputLimit;
    }

    if (Number.isFinite(runtimeLimit) && runtimeLimit > 0) {
      return runtimeLimit;
    }

    try {
      const tokenLimits = await getAccurateTokenLimits(
        selectedModel,
        configuration,
      );
      const inferredLimit = Number(tokenLimits?.input);
      if (Number.isFinite(inferredLimit) && inferredLimit > 0) {
        return inferredLimit;
      }
    } catch (error) {
      this.logger.warn(
        `[StreamingHelper] Failed to resolve input limit from model registry for ${selectedModel.provider.id}/${selectedModel.id}, fallback to safe default.`,
        { error: error as Error },
      );
    }

    return 8192;
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
    providerId: string,
    options: PerformGenerationOptions,
    session: GenerationSession,
    target: GenerationTargetContext,
    fileDiffMap?: Map<string, string>,
  ): Promise<GenerationResult> {
    assertNotCancelled(token, this.logger);

    const useFunctionCalling =
      stateManager.getWorkspace<boolean>(
        "experimental.commitWithFunctionCalling.enabled",
      ) ?? false;

    const shouldUseLayeredCommit =
      configuration.features.commitFormat.enableLayeredCommit &&
      selectedFiles &&
      selectedFiles.length > 1;

    let cacheKey: string | undefined;
    if (!shouldUseLayeredCommit) {
      cacheKey = commitCacheService.generateKey(
        requestParams.diff || "",
        configuration,
        selectedModel.id,
        scmProvider.type ?? "git",
      );
    }

    if (!useFunctionCalling && shouldUseLayeredCommit) {
      const layeredResult = await this.layeredCommitHandler.handle(
        aiProvider,
        requestParams,
        scmProvider,
        selectedFiles,
        token,
        progress,
        selectedModel,
        configuration,
        {
          requestId: session.requestId,
          repositoryPath: target.repositoryPath,
          provider: session.provider,
          model: session.selectedModel.id,
        },
        fileDiffMap,
      );

      if (
        layeredResult.status === "success" &&
        layeredResult.applied &&
        !options.suppressSuccessNotification
      ) {
        notify.info("commit.message.generated.stream", [
          scmProvider.type.toUpperCase(),
          providerId,
          selectedModel?.id || "default",
        ]);
        showCommitSuccessNotification();
      }

      return layeredResult;
    }

    const generatedMessage = useFunctionCalling
      ? await this.handleFunctionCallingGeneration(
        aiProvider,
        requestParams,
        scmProvider,
        contextManager,
        token,
        progress,
        repositoryPath,
        providerId,
      )
      : await this.handleStandardGeneration(
        aiProvider,
        requestParams,
        scmProvider,
        contextManager,
        token,
        progress,
        repositoryPath,
      );

    const normalizedMessage = generatedMessage?.trim();
    if (!normalizedMessage) {
      return this.createFailedResult(
        session,
        target,
        "Generated commit message is empty.",
        "EMPTY_GENERATED_MESSAGE",
      );
    }

    if (cacheKey) {
      this.logger.info("Caching generated commit message.");
      commitCacheService.set(cacheKey, normalizedMessage);
    }

    if (!options.suppressSuccessNotification) {
      notify.info("commit.message.generated.stream", [
        scmProvider.type.toUpperCase(),
        providerId,
        selectedModel?.id || "default",
      ]);
      showCommitSuccessNotification();
    }

    return {
      status: "success",
      applied: true,
      requestId: session.requestId,
      repositoryPath: target.repositoryPath,
      provider: session.provider,
      model: session.selectedModel.id,
      message: normalizedMessage,
    };
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
    newProvider: string,
  ): Promise<string> {
    this.logger.info("Using function calling generation.");

    if (!aiProvider.generateCommitWithFunctionCalling) {
      this.logger.error(
        `Provider ${newProvider} does not support function calling.`,
      );
      throw new Error(
        `Provider ${newProvider} does not support function calling.`,
      );
    }

    const messages = contextManager.buildMessages();
    this.logger.info(
      `Built messages for function calling. Total messages: ${messages.length}`,
    );

    return await this.functionCallingHandler.handle(
      aiProvider,
      { ...requestParams, messages },
      scmProvider,
      token,
      progress,
      repositoryPath,
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
    token: vscode.CancellationToken,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    repositoryPath: string | undefined,
  ): Promise<string> {
    if (!aiProvider.generateCommitStream) {
      throw new Error(
        `Provider ${aiProvider.getId()} does not support streaming.`,
      );
    }

    this.logger.info("Performing standard streaming generation.");
    return await this.streamingHandler.handle(
      aiProvider as any,
      requestParams,
      scmProvider,
      token,
      progress,
      contextManager,
      repositoryPath,
    );
  }

  /**
   * 处理生成错误 - 遵循单一职责原则
   */
  private async handleGenerationError(
    error: any,
    selectedModel?: AIModel,
    configuration?: any,
    session?: GenerationSession,
    target?: GenerationTargetContext,
  ): Promise<GenerationResult> {
    if (isCancellationError(error)) {
      return {
        status: "cancelled",
        applied: false,
        requestId: session?.requestId || crypto.randomUUID(),
        repositoryPath: target?.repositoryPath,
        provider: session?.provider,
        model: session?.selectedModel?.id,
        error: error.message,
      };
    }

    if (selectedModel) {
      await this.learnInputLimitFromRuntimeError(
        error,
        selectedModel,
        configuration,
      );
    }

    if (error instanceof RequestTooLargeError) {
      const switchToLargerModel = getMessage("error.switch.to.larger.model");
      const choice = await notify.error(
        "error.request.too.large",
        [error.message],
        { buttons: [switchToLargerModel] },
      );
      if (choice === switchToLargerModel) {
        // 模型选择已迁移到 webview-ui 设置页面
        await vscode.commands.executeCommand(
          "workbench.view.extension.dish-ai-commitActivityBar",
        );
      }
      return {
        status: "too_large",
        applied: false,
        requestId: session?.requestId || crypto.randomUUID(),
        repositoryPath: target?.repositoryPath,
        provider: session?.provider,
        model: session?.selectedModel?.id,
        error: error.message,
      };
    } else {
      this.logger.logError(error as Error, "流式生成失败");
      return this.createFailedResult(
        session,
        target,
        this.extractErrorMessage(error),
      );
    }
  }

  private async learnInputLimitFromRuntimeError(
    error: any,
    selectedModel: AIModel,
    configuration?: any,
  ): Promise<void> {
    if (
      configuration?.features?.commitMessage?.enableAdaptiveInputLimitLearning ===
      false
    ) {
      return;
    }

    if (!this.isInputLimit429Error(error)) {
      return;
    }

    const message = this.extractErrorMessage(error);
    const learnedLimit = this.extractInputLimitFromErrorMessage(message);
    if (!learnedLimit) {
      return;
    }

    await this.adaptiveModelLimitService.recordLearnedInputLimit(
      selectedModel.provider.id,
      selectedModel.id as string,
      learnedLimit,
      message,
    );

    this.logger.warn(
      `[StreamingHelper] Learned input limit from runtime error for ${selectedModel.provider.id}/${selectedModel.id}: ${learnedLimit}`,
    );
  }

  private isInputLimit429Error(error: any): boolean {
    const statusCode =
      Number(error?.status) ||
      Number(error?.statusCode) ||
      Number(error?.response?.status);

    if (statusCode !== 429) {
      return false;
    }

    const message = this.extractErrorMessage(error).toLowerCase();
    return (
      message.includes("input token") ||
      message.includes("tokens per minute") ||
      message.includes("token limit") ||
      message.includes("quota")
    );
  }

  private extractErrorMessage(error: any): string {
    if (typeof error?.message === "string" && error.message.trim()) {
      return error.message;
    }

    const responseText = error?.response?.data || error?.response?.body;
    if (typeof responseText === "string" && responseText.trim()) {
      return responseText;
    }

    return String(error ?? "");
  }

  private extractInputLimitFromErrorMessage(message: string): number | null {
    if (!message) {
      return null;
    }

    const patterns = [
      /(?:at most|limit of)\s*([0-9][0-9,]*)\s*(?:input\s+)?tokens/i,
      /([0-9][0-9,]*)\s*(?:input\s+)?tokens\s+per\s+minute/i,
      /(?:maximum|max)\s*(?:input\s+)?tokens(?:\s*[:=]|\s+is\s+)\s*([0-9][0-9,]*)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (!match?.[1]) {
        continue;
      }

      const parsed = Number(match[1].replace(/,/g, ""));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  private createFailedResult(
    session: GenerationSession | undefined,
    target: GenerationTargetContext | undefined,
    error: string,
    errorCode?: string,
  ): GenerationResult {
    return {
      status: "failed",
      applied: false,
      requestId: session?.requestId || crypto.randomUUID(),
      repositoryPath: target?.repositoryPath,
      provider: session?.provider,
      model: session?.selectedModel?.id,
      error,
      errorCode,
    };
  }
}
