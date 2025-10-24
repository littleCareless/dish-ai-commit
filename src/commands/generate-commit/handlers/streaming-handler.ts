import * as vscode from "vscode";
import { ISCMProvider } from "../../../scm/scm-provider";
import { AIRequestParams } from "../../../ai/types";
import { AbstractAIProvider } from "../../../ai/providers/abstract-ai-provider";
import { ContextManager } from "../../../utils/context-manager";
import { filterCodeBlockMarkers } from "../utils/commit-formatter";
import { getMessage } from "../../../utils/i18n";
import { Logger } from "../../../utils/logger";

/**
 * 流式处理器类，负责处理流式提交信息生成
 */
export class StreamingHandler {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 处理来自 AI 的流式响应，并将其逐步应用到 SCM 输入框中。
   * @param aiProvider - AI 供应器实例。
   * @param requestParams - 发送给 AI 的请求参数。
   * @param scmProvider - SCM 供应器实例。
   * @param token - VS Code 取消令牌。
   * @param progress - VS Code 进度报告器。
   * @param contextManager - 上下文管理器实例，用于构建带重试逻辑的请求。
   * @param repositoryPath - 可选的仓库路径。
   */
  async handle(
    aiProvider: AbstractAIProvider,
    requestParams: AIRequestParams,
    scmProvider: ISCMProvider,
    token: vscode.CancellationToken,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    contextManager: ContextManager,
    repositoryPath?: string
  ): Promise<void> {
    this.throwIfCancelled(token);
    progress.report({
      message: getMessage("progress.calling.ai.stream"),
    });

    // 使用 contextManager 的 buildWithRetry 方法来获取流
    const stream = contextManager.buildWithRetry(aiProvider, requestParams);

    let accumulatedMessage = "";
    for await (const chunk of stream) {
      this.throwIfCancelled(token);
      accumulatedMessage += chunk;
      // During streaming, we show the raw output from the AI.
      await scmProvider.startStreamingInput(accumulatedMessage);
    }

    this.throwIfCancelled(token);

    // After the stream is complete, filter the final message and apply it.
    const finalMessage = filterCodeBlockMarkers(accumulatedMessage);
    await scmProvider.startStreamingInput(finalMessage);
  }

  /**
   * 检查操作是否已被用户取消
   * @param token - VS Code 取消令牌
   */
  private throwIfCancelled(token: vscode.CancellationToken): void {
    if (token.isCancellationRequested) {
      this.logger.info(getMessage("user.cancelled.operation.log"));
      throw new Error(getMessage("user.cancelled.operation.error"));
    }
  }
}

