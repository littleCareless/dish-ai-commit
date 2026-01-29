import { AIModel, AIProvider } from "@/ai/types";
import { ISCMProvider } from "@/scm/scm-provider";
import { ContextManager } from "@/utils/context-manager";
import { Logger } from "@/utils/logger";
import { notify } from "@/utils/notification/notification-manager";
import { showCommitSuccessNotification } from "@/utils/notification/system-notification";
import { stateManager } from "@/utils/state/state-manager";
import { commitCacheService } from "@/services/cache/commit-cache-service";
import * as vscode from "vscode";

/**
 * 流式生成辅助类 - 优化版
 *
 * 设计原则：
 * - 依赖注入：通过协调器获取所有资源
 * - 简化流程：移除重复的初始化逻辑
 * - 单一职责：只负责流式生成的执行
 *
 * 与原版本的区别：
 * 1. 不负责 Provider 和 Model 的获取（由协调器处理）
 * 2. 不负责 SCM 检测（由协调器处理）
 * 3. 简化提示词构建（依赖协调器）
 * 4. 保留核心功能：缓存、流式生成、错误处理
 */
export class StreamingGenerationHelperOptimized {
  private logger: Logger;

  constructor(private loggerInstance?: Logger) {
    this.logger =
      loggerInstance || Logger.getInstance("StreamingGenerationHelper");
  }

  /**
   * 执行流式生成
   * 简化版：依赖协调器提供已初始化的资源
   *
   * @param progress 进度报告
   * @param token 取消令牌
   * @param scmProvider 已初始化的 SCM 提供者
   * @param aiProvider 已初始化的 AI 提供者
   * @param selectedModel 已验证的模型
   * @param prompt 完整的提示词（由协调器构建）
   * @param diffContent 代码差异
   * @param configuration 配置
   * @param selectedFiles 选中的文件
   * @param repositoryPath 仓库路径
   */
  async performStreamingGeneration(
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken,
    scmProvider: ISCMProvider,
    aiProvider: AIProvider,
    selectedModel: AIModel,
    prompt: string,
    diffContent: string,
    configuration: any,
    selectedFiles: string[] | undefined,
    repositoryPath: string | undefined,
  ): Promise<void> {
    this.logger.info("Performing streaming generation (optimized)...");

    // 1. 检查取消
    this.throwIfCancelled(token);

    // 2. 极速缓存检查（可选，保留原逻辑）
    if (configuration.features.commitFormat.enableLayeredCommit === false) {
      const cacheKey = commitCacheService.generateKey(
        diffContent,
        configuration,
        selectedModel.id,
      );
      const cachedMessage = commitCacheService.get(cacheKey);

      if (cachedMessage) {
        this.logger.info("Cache hit! Using cached commit message.");
        progress.report({
          message: "[4/4] 生成提交消息...",
          increment: 100,
        });

        await scmProvider.startStreamingInput(cachedMessage);
        notify.info("commit.message.generated.from.cache");
        showCommitSuccessNotification();
        return;
      }
    }

    // 3. 构建上下文管理器
    progress.report({ message: "[3/4] 构建上下文..." });

    const contextManager = await this.buildContextManager(
      selectedModel,
      prompt,
      scmProvider,
      diffContent,
      configuration,
    );

    // 4. 检查提示词长度
    await this.checkPromptLength(contextManager, selectedModel, configuration);

    // 5. 执行生成
    progress.report({ message: "[4/4] 生成提交消息..." });

    const useFunctionCalling =
      stateManager.getWorkspace<boolean>(
        "experimental.commitWithFunctionCalling.enabled",
      ) ?? false;

    let generatedMessage: string | undefined;

    if (useFunctionCalling) {
      generatedMessage = await this.handleFunctionCalling(
        aiProvider,
        contextManager,
        scmProvider,
        token,
        progress,
        repositoryPath,
      );
    } else {
      generatedMessage = await this.handleStandardGeneration(
        aiProvider,
        contextManager,
        scmProvider,
        token,
        progress,
      );
    }

    // 6. 写入缓存
    if (
      generatedMessage &&
      configuration.features.commitFormat.enableLayeredCommit === false
    ) {
      const cacheKey = commitCacheService.generateKey(
        diffContent,
        configuration,
        selectedModel.id,
      );
      commitCacheService.set(cacheKey, generatedMessage);
    }

    // 7. 完成
    notify.info("commit.message.generated.stream", [
      scmProvider.type.toUpperCase(),
      aiProvider.getName?.() || "unknown",
      selectedModel.id,
    ]);

    showCommitSuccessNotification();
  }

  // ==================== 私有方法 ====================

  /**
   * 构建上下文管理器
   */
  private async buildContextManager(
    selectedModel: AIModel,
    prompt: string,
    scmProvider: ISCMProvider,
    diffContent: string,
    configuration: any,
  ): Promise<ContextManager> {
    // 这里需要导入 ContextManager 和 CommitContextBuilder
    // 简化实现，实际需要根据项目结构调整
    const { CommitContextBuilder } =
      await import("@/commands/generate-commit/builders/context-builder");

    const contextBuilder = new CommitContextBuilder();
    return await contextBuilder.buildContextManager(
      selectedModel,
      prompt,
      scmProvider,
      diffContent,
      configuration,
    );
  }

  /**
   * 检查提示词长度
   */
  private async checkPromptLength(
    contextManager: ContextManager,
    selectedModel: AIModel,
    configuration: any,
  ): Promise<void> {
    const { getAccurateTokenLimits } = await import("@/ai/model-registry");

    const promptLength = contextManager.getEstimatedRawTokenCount();
    const tokenLimits = await getAccurateTokenLimits(
      selectedModel,
      configuration,
    );
    const maxTokens = tokenLimits.input;

    if (
      promptLength > maxTokens * 0.75 &&
      !configuration.features.suppressNonCriticalWarnings
    ) {
      const choice = await notify.warn(
        "prompt.large.warning.with.fallback",
        [promptLength.toLocaleString(), maxTokens.toLocaleString()],
        { modal: true, buttons: ["使用回退", "继续"] },
      );

      if (choice === "使用回退") {
        const fallbackPrompt = await this.getFallbackPrompt();
        contextManager.setSystemPrompt(fallbackPrompt);
        notify.info("info.using.fallback.prompt");
      } else if (choice !== "继续") {
        throw new Error("用户取消");
      }
    }
  }

  /**
   * 处理函数调用生成
   */
  private async handleFunctionCalling(
    aiProvider: AIProvider,
    contextManager: ContextManager,
    scmProvider: ISCMProvider,
    token: vscode.CancellationToken,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    repositoryPath: string | undefined,
  ): Promise<string> {
    const { FunctionCallingHandler } =
      await import("@/commands/generate-commit/handlers/function-calling-handler");

    const handler = new FunctionCallingHandler(this.logger);
    const messages = contextManager.buildMessages();

    return await handler.handle(
      aiProvider,
      { messages, diff: "", additionalContext: "" },
      scmProvider,
      token,
      progress,
      repositoryPath,
    );
  }

  /**
   * 处理标准生成
   */
  private async handleStandardGeneration(
    aiProvider: AIProvider,
    contextManager: ContextManager,
    scmProvider: ISCMProvider,
    token: vscode.CancellationToken,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
  ): Promise<string> {
    const { StreamingHandler } =
      await import("@/commands/generate-commit/handlers/streaming-handler");

    const handler = new StreamingHandler(this.logger);
    const messages = contextManager.buildMessages();

    return await handler.handle(
      aiProvider as any,
      { messages, diff: "", additionalContext: "" },
      scmProvider,
      token,
      progress,
      contextManager,
    );
  }

  /**
   * 获取回退提示词
   */
  private async getFallbackPrompt(): Promise<string> {
    // 简化实现
    return "请生成简洁的 commit message";
  }

  /**
   * 检查是否已取消
   */
  private throwIfCancelled(token: vscode.CancellationToken): void {
    if (token.isCancellationRequested) {
      throw new Error("用户取消操作");
    }
  }
}
