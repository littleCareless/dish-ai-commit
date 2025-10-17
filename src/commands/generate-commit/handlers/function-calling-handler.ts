import * as vscode from "vscode";
import { ISCMProvider } from "../../../scm/scm-provider";
import { AIProvider, AIRequestParams, AIMessage } from "../../../ai/types";
import { filterCodeBlockMarkers } from "../utils/commit-formatter";
import { getMessage } from "../../../utils/i18n";
import { Logger } from "../../../utils/logger";

/**
 * 函数调用处理器类，负责处理函数调用模式的提交信息生成
 */
export class FunctionCallingHandler {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 使用函数调用（Function Calling）模式生成提交信息。
   * 这种模式下，AI 会返回一个结构化的对象而不是纯文本。
   * @param aiProvider - AI 供应器实例。
   * @param requestParams - 包含消息历史的请求参数。
   * @param scmProvider - SCM 供应器实例。
   * @param token - VS Code 取消令牌。
   * @param progress - VS Code 进度报告器。
   * @param repositoryPath - 可选的仓库路径。
   */
  async handle(
    aiProvider: AIProvider,
    requestParams: AIRequestParams & { messages: AIMessage[] },
    scmProvider: ISCMProvider,
    token: vscode.CancellationToken,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    repositoryPath?: string
  ): Promise<void> {
    this.throwIfCancelled(token);
    progress.report({
      message: getMessage("progress.calling.ai.function"),
    });

    if (!aiProvider.generateCommitWithFunctionCalling) {
      throw new Error(
        `Provider ${aiProvider.getId()} does not support function calling.`
      );
    }

    const aiResponse = await aiProvider.generateCommitWithFunctionCalling(
      requestParams
    );

    this.throwIfCancelled(token);

    const finalMessage = filterCodeBlockMarkers(aiResponse.content)?.trim();
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

