import { AIProvider, AIRequestParams } from "@/ai/types";
import { assertNotCancelled } from "@/commands/generate-commit/utils/cancellation";
import { applyCommitMessageToInput } from "@/commands/generate-commit/utils/commit-formatter";
import { ISCMProvider } from "@/scm/scm-provider";
import { ContextManager } from "@/utils/context-manager";
import { getMessage } from "@/utils/i18n";
import { Logger } from "@/utils/logger";
import * as vscode from "vscode";

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
   * @param requestParams - 原始请求参数。
   * @param scmProvider - SCM 供应器实例。
   * @param token - VS Code 取消令牌。
   * @param progress - VS Code 进度报告器。
   * @param contextManager - 上下文管理器实例，用于构建带重试逻辑的请求。
   * @param repositoryPath - 可选的仓库路径。
   */
  async handle(
    aiProvider: AIProvider,
    requestParams: AIRequestParams,
    scmProvider: ISCMProvider,
    token: vscode.CancellationToken,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    contextManager: ContextManager,
    _repositoryPath?: string
  ): Promise<string> {
    assertNotCancelled(token, this.logger);
    progress.report({
      message: getMessage("progress.calling.ai.function"),
    });

    if (!aiProvider.generateCommitWithFunctionCalling) {
      throw new Error(
        `Provider ${aiProvider.getId()} does not support function calling.`
      );
    }

    const aiResponse = await contextManager.executeWithRetry(
      requestParams,
      (params) => aiProvider.generateCommitWithFunctionCalling!(params),
    );

    assertNotCancelled(token, this.logger);

    const { message } = await applyCommitMessageToInput(
      scmProvider,
      aiResponse.content,
    );
    return message;
  }
}
