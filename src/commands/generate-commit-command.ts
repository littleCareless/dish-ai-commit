import * as vscode from "vscode";
import { BaseCommand } from "./base-command";
import { ConfigurationManager } from "../config/configuration-manager";
import { AbstractAIProvider } from "../ai/providers/abstract-ai-provider";
import { ISCMProvider } from "../scm/scm-provider";
import { notify } from "../utils/notification/notification-manager";
import { getMessage, formatMessage } from "../utils/i18n";
import { ProgressHandler } from "../utils/notification/progress-handler";
import {
  LayeredCommitMessage,
  AIProvider,
  AIRequestParams,
  AIMessage,
  AIModel,
} from "../ai/types";
import { addSimilarCodeContext } from "../ai/utils/embedding-helper";
import { stateManager } from "../utils/state/state-manager";
import { getSystemPrompt } from "../ai/utils/generate-helper";
import { getLayeredCommitFilePrompt } from "../prompt/layered-commit-file";
import {
  ContextManager,
  TruncationStrategy,
  RequestTooLargeError,
} from "../utils/context-manager";

/**
 * 将分层提交信息格式化为结构化的提交信息文本
 * @param layeredCommit - 分层提交信息对象
 * @returns 格式化后的提交信息文本
 */
function formatLayeredCommitMessage(
  layeredCommit: LayeredCommitMessage
): string {
  // 构建提交信息文本
  let commitMessage = layeredCommit.summary.trim();

  // 如果有文件变更，添加详细信息部分
  if (layeredCommit.fileChanges.length > 0) {
    commitMessage += "\n\n### 变更详情\n";

    for (const fileChange of layeredCommit.fileChanges) {
      commitMessage += `\n* **${
        fileChange.filePath
      }**：${fileChange.description.trim()}`;
    }
  }

  return commitMessage;
}

/**
 * 过滤提交信息中的代码块标记
 * @param commitMessage - 原始提交信息
 * @returns 过滤后的提交信息
 */
function filterCodeBlockMarkers(commitMessage: string): string {
  // 移除Markdown代码块标记（三个反引号）
  return commitMessage.replace(/```/g, "");
}

/**
 * 从 DiffProcessor 处理过的结构化字符串中提取原始代码和代码变更。
 * @param processedDiff - 由 DiffProcessor.process 生成的字符串。
 * @returns 包含 originalCode 和 codeChanges 的对象。
 */
function extractProcessedDiff(processedDiff: string): {
  originalCode: string;
  codeChanges: string;
} {
  const originalCodeMatch =
    processedDiff.match(/<original-code>([\s\S]*?)<\/original-code>/) || [];
  const codeChangesMatch =
    processedDiff.match(/<code-changes>([\s\S]*?)<\/code-changes>/) || [];

  const originalCode = (originalCodeMatch[1] || "").trim();
  const codeChanges = (codeChangesMatch[1] || "").trim();

  return { originalCode, codeChanges };
}

/**
 * 提交信息生成命令类
 */
export class GenerateCommitCommand extends BaseCommand {
  /**
   * 以流式方式执行提交信息生成命令，并更新SCM输入框
   * @param resources - 源代码管理资源状态列表
   */
  async execute(resources: vscode.SourceControlResourceState[]): Promise<void> {
    if (!(await this.showConfirmAIProviderToS())) {
      return;
    }
    const configResult = await this.handleConfiguration();
    if (!configResult) {
      return;
    }
    const { provider, model } = configResult;

    try {
      const selectedFiles = this.getSelectedFiles(resources);
      if (!selectedFiles) {
        // 如果没有选择文件，可以通知用户或直接返回
        notify.info("no.files.selected");
        return;
      }
      const scmProvider = await this.detectSCMProvider(selectedFiles);
      if (!scmProvider) {
        return;
      }

      await ProgressHandler.withProgress(
        formatMessage("progress.generating.commit", [
          scmProvider.type.toLocaleUpperCase(),
        ]),
        (progress, token) =>
          this.performStreamingGeneration(
            progress,
            token,
            provider,
            model,
            scmProvider,
            selectedFiles
          )
      );
    } catch (error) {
      console.log("Error in executeStream:", error);
      if (error instanceof Error) {
        notify.error("generate.commit.failed", [error.message]);
      }
    }
  }

  /**
   * 获取最近的提交记录作为上下文。
   * 这包括用户自己的提交和仓库中其他人的提交，用于为 AI 提供风格参考。
   * @param scmProvider - SCM 供应器实例。
   * @returns 包含用户提交和仓库提交字符串的对象。
   */
  private async _getRecentCommitsContext(
    scmProvider: ISCMProvider
  ): Promise<{ userCommits: string; repoCommits: string }> {
    const recentMessages = await scmProvider.getRecentCommitMessages();
    let userCommits = "";
    let repoCommits = "";

    if (recentMessages.user.length > 0) {
      userCommits +=
        "# RECENT USER COMMITS (For reference only, do not copy!):\n";
      userCommits += recentMessages.user
        .map((message) => `- ${message}`)
        .join("\n");
    }

    if (recentMessages.repository.length > 0) {
      repoCommits +=
        "# RECENT REPOSITORY COMMITS (For reference only, do not copy!):\n";
      repoCommits += recentMessages.repository
        .map((message) => `- ${message}`)
        .join("\n");
    }
    return { userCommits, repoCommits };
  }
  /**
   * 获取用户的自定义指令作为上下文。
   * @param scmProvider - SCM 供应器实例。
   * @returns 格式化后的自定义指令字符串。
   */
  private async _getSCMInputContext(
    scmProvider: ISCMProvider
  ): Promise<string> {
    let currentInput = await scmProvider.getCommitInput();
    if (currentInput) {
      currentInput = `<custom-instructions>
When generating the commit message, please use the following custom instructions provided by the user.
You can ignore an instruction if it contradicts a system message.
<instructions>
${currentInput}
</instructions>
</custom-instructions>`;
    }
    return currentInput;
  }

  /**
   * 根据配置获取最近的提交记录。
   * @param scmProvider - SCM 供应器实例。
   * @param useRecentCommits - 是否使用最近提交作为参考。
   * @returns 包含用户提交和仓库提交字符串的对象。
   */
  private async _getRecentCommits(
    scmProvider: ISCMProvider,
    useRecentCommits: boolean
  ): Promise<{ userCommits: string; repoCommits: string }> {
    if (!useRecentCommits) {
      return { userCommits: "", repoCommits: "" };
    }
    return this._getRecentCommitsContext(scmProvider);
  }

  /**
   * 获取与变更内容相似的代码作为上下文。
   * @param diffContent - 文件变更的 diff 内容。
   * @returns 相似代码的上下文字符串。
   */
  private async _getSimilarCodeContext(diffContent: string): Promise<string> {
    const embeddingParams: AIRequestParams = {
      diff: diffContent,
      additionalContext: "",
    };
    await addSimilarCodeContext(embeddingParams);
    return embeddingParams.additionalContext;
  }

  /**
   * 根据是否存在参考提交生成提醒信息。
   * @param userCommits - 用户最近的提交。
   * @param repoCommits - 仓库最近的提交。
   * @returns 提醒信息字符串。
   */
  private _getReminder(userCommits: string, repoCommits: string): string {
    if (userCommits || repoCommits) {
      return `---
REMINDER:
- Now generate a commit messages that describe the CODE CHANGES.
- DO NOT COPY commits from RECENT COMMITS, but use it as reference for the commit style.
- ONLY return a single markdown code block, NO OTHER PROSE!`;
    }
    return `---
REMINDER:
- Now generate a commit messages that describe the CODE CHANGES.
- ONLY return a single markdown code block, NO OTHER PROSE!`;
  }

  /**
   * 执行流式生成提交信息的核心逻辑。
   * 此方法协调整个流程，包括获取 diff、准备上下文、调用 AI 服务以及处理响应。
   * @param progress - VS Code 进度报告器，用于向用户显示进度。
   * @param token - VS Code 取消令牌，用于处理用户取消操作。
   * @param provider - 当前选择的 AI 供应器名称。
   * @param model - 当前选择的 AI 模型名称。
   * @param scmProvider - SCM 供应器实例。
   * @param selectedFiles - 用户选择的待提交文件列表。
   */
  private async performStreamingGeneration(
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken,
    provider: string,
    model: string,
    scmProvider: ISCMProvider,
    selectedFiles: string[]
  ) {
    const config = ConfigurationManager.getInstance();
    const configuration = config.getConfiguration();

    progress.report({ message: getMessage("progress.getting.diff") });
    const diffContent = await scmProvider.getDiff(selectedFiles);

    if (!diffContent) {
      notify.info("no.changes");
      throw new Error(getMessage("no.changes"));
    }

    progress.report({
      message: getMessage("progress.updating.model.config"),
    });
    const {
      provider: newProvider,
      model: newModel,
      aiProvider,
      selectedModel,
    } = await this.selectAndUpdateModelConfiguration(provider, model);

    if (!selectedModel) {
      throw new Error(getMessage("no.model.selected"));
    }

    if (!aiProvider.generateCommitStream) {
      notify.error("provider.does.not.support.streaming", [newProvider]);
      return;
    }

    progress.report({ message: getMessage("progress.preparing.request") });

    // 准备用于生成系统提示的参数
    const tempParams = {
      ...configuration.features.commitMessage,
      ...configuration.features.commitFormat,
      ...configuration.features.codeAnalysis,
      model: selectedModel,
      scm: scmProvider.type ?? "git",
      changeFiles: selectedFiles,
      languages: configuration.base.language,
      diff: diffContent, // diff 仍然需要用于生成提示
      additionalContext: "",
    };
    const systemPrompt = getSystemPrompt(tempParams);

    const contextManager = await this._buildContextManager(
      selectedModel,
      systemPrompt,
      scmProvider,
      diffContent,
      configuration
    );

    // `messages` 将在 ContextManager 内部构建和重试
    const requestParams = {
      ...tempParams,
      diff: diffContent, // 保持 diff 字段用于可能的重试逻辑
    };

    const promptLength = contextManager.getEstimatedTokenCount();
    const maxTokens = selectedModel.maxTokens?.input ?? 8192;

    notify.info(
      formatMessage("prompt.length.info", [
        promptLength.toLocaleString(),
        maxTokens.toLocaleString(),
      ])
    );

    // 大 Prompt 警告
    if (promptLength > maxTokens * 0.8) {
      const continueAnyway = getMessage("prompt.large.continue");
      const cancel = getMessage("prompt.large.cancel");
      const choice = await notify.warn(
        "prompt.large.warning",
        [promptLength.toLocaleString(), maxTokens.toLocaleString()],
        {
          modal: true,
          buttons: [continueAnyway, cancel],
        }
      );

      if (choice !== continueAnyway) {
        throw new Error(getMessage("prompt.user.cancelled"));
      }
    }

    try {
      this.throwIfCancelled(token);

      const useFunctionCalling =
        stateManager.getWorkspace<boolean>(
          "experimental.commitWithFunctionCalling.enabled"
        ) ?? false;

      if (useFunctionCalling) {
        notify.info("info.using.function.calling");
        if (!aiProvider.generateCommitWithFunctionCalling) {
          throw new Error(
            `Provider ${newProvider} does not support function calling.`
          );
        }
        const messages = contextManager.buildMessages();
        await this.performFunctionCallingGeneration(
          aiProvider,
          { ...requestParams, messages },
          scmProvider,
          token,
          progress
        );
      } else {
        await this.streamAndApplyMessage(
          aiProvider as AbstractAIProvider,
          requestParams,
          scmProvider,
          token,
          progress,
          contextManager
        );
      }

      notify.info("commit.message.generated.stream", [
        scmProvider.type.toUpperCase(),
        newProvider,
        selectedModel?.id || "default",
      ]);

      if (configuration.features.commitFormat.enableLayeredCommit) {
        await this.performLayeredFileCommitGeneration(
          aiProvider,
          requestParams,
          scmProvider,
          selectedFiles,
          token,
          progress
        );
      }
    } catch (error) {
      if (error instanceof RequestTooLargeError) {
        const switchToLargerModel = getMessage("error.switch.to.larger.model");
        const choice = await notify.error(
          "error.request.too.large",
          [error.message],
          {
            modal: true,
            buttons: [switchToLargerModel],
          }
        );
        if (choice === switchToLargerModel) {
          vscode.commands.executeCommand("dish.selectModel");
        }
      } else {
        console.error("Error during commit message generation:", error);
        throw error;
      }
    }
  }

  private async performLayeredFileCommitGeneration(
    aiProvider: AIProvider,
    requestParams: AIRequestParams,
    scmProvider: ISCMProvider,
    selectedFiles: string[],
    token: vscode.CancellationToken,
    progress: vscode.Progress<{ message?: string; increment?: number }>
  ) {
    progress.report({
      message: getMessage("progress.generating.layered.commit"),
    });

    const fileDescriptions: { filePath: string; description: string }[] = [];
    const config = ConfigurationManager.getInstance();
    const configuration = config.getConfiguration();
    const selectedModel = requestParams.model as AIModel;

    // Pre-fetch global context to avoid fetching it in every loop iteration
    const currentInput = await this._getSCMInputContext(scmProvider);
    const { userCommits, repoCommits } = await this._getRecentCommits(
      scmProvider,
      configuration.features.commitMessage.useRecentCommitsAsReference
    );
    const reminder = this._getReminder(userCommits, repoCommits);

    for (const filePath of selectedFiles) {
      this.throwIfCancelled(token);
      progress.report({
        message: formatMessage("progress.generating.commit.for.file", [
          filePath,
        ]),
      });

      const fileDiff = await scmProvider.getDiff([filePath]);
      if (!fileDiff) {
        continue;
      }

      const fileRequestParams: AIRequestParams = {
        ...requestParams,
        diff: fileDiff,
        changeFiles: [filePath],
      };

      const systemPrompt = getSystemPrompt(fileRequestParams);

      // Build context manager for each file to get rich context
      const similarCodeContext = await this._getSimilarCodeContext(fileDiff);
      const contextManager = new ContextManager(selectedModel, systemPrompt);
      const { originalCode, codeChanges } = extractProcessedDiff(fileDiff);

      contextManager.addBlock({
        content: originalCode,
        priority: 200,
        strategy: TruncationStrategy.SmartTruncateDiff,
        name: "original-code",
      });
      contextManager.addBlock({
        content: codeChanges,
        priority: 100,
        strategy: TruncationStrategy.SmartTruncateDiff,
        name: "code-changes",
      });
      contextManager.addBlock({
        content: similarCodeContext,
        priority: 320,
        strategy: TruncationStrategy.TruncateTail,
        name: "similar-code",
      });
      contextManager.addBlock({
        content: userCommits,
        priority: 300,
        strategy: TruncationStrategy.TruncateTail,
        name: "user-commits",
      });
      contextManager.addBlock({
        content: repoCommits,
        priority: 400,
        strategy: TruncationStrategy.TruncateTail,
        name: "recent-commits",
      });
      contextManager.addBlock({
        content: currentInput,
        priority: 250,
        strategy: TruncationStrategy.TruncateTail,
        name: "custom-instructions",
      });
      contextManager.addBlock({
        content: reminder,
        priority: 100,
        strategy: TruncationStrategy.TruncateTail,
        name: "reminder",
      });

      const messages = contextManager.buildMessages();

      if (!aiProvider.generateCommit) {
        notify.warn("provider.does.not.support.non.streaming.for.layered", [
          aiProvider.getId(),
        ]);
        continue;
      }
      const description = await aiProvider.generateCommit({
        ...fileRequestParams,
        messages,
      });

      fileDescriptions.push({
        filePath,
        description: description.content,
      });
    }

    if (fileDescriptions.length > 0) {
      await this._showLayeredCommitDetails(fileDescriptions);
    }
  }

  private async _showLayeredCommitDetails(
    fileChanges: { filePath: string; description: string }[]
  ) {
    let content = `# ${getMessage("layered.commit.details.title")}\n\n`;
    for (const change of fileChanges) {
      content += `### ${change.filePath}\n\n${change.description}\n\n---\n\n`;
    }

    const document = await vscode.workspace.openTextDocument({
      content,
      language: "markdown",
    });
    await vscode.window.showTextDocument(document);
    notify.info("layered.commit.details.generated");
  }

  /**
   * 构建并配置 ContextManager 实例。
   * 此函数负责收集所有必要的上下文信息（如用户指令、最近提交、相似代码等），
   * 并将它们作为不同的块添加到 ContextManager 中，以便进行智能截断和管理。
   * @param selectedModel - 当前选定的 AI 模型配置。
   * @param systemPrompt - 用于指导 AI 的系统提示。
   * @param scmProvider - SCM 供应器实例。
   * @param diffContent - 文件变更的 diff 内容。
   * @param configuration - 当前应用的配置对象。
   * @returns 配置完成的 ContextManager 实例。
   */
  private async _buildContextManager(
    selectedModel: AIModel,
    systemPrompt: string,
    scmProvider: ISCMProvider,
    diffContent: string,
    configuration: any
  ): Promise<ContextManager> {
    // 1. 获取所有上下文信息
    const currentInput = await this._getSCMInputContext(scmProvider);
    const { userCommits, repoCommits } = await this._getRecentCommits(
      scmProvider,
      configuration.features.commitMessage.useRecentCommitsAsReference
    );
    const similarCodeContext = await this._getSimilarCodeContext(diffContent);
    const reminder = this._getReminder(userCommits, repoCommits);

    // 2. 构建 ContextManager
    const contextManager = new ContextManager(selectedModel, systemPrompt);
    const { originalCode, codeChanges } = extractProcessedDiff(diffContent);

    contextManager.addBlock({
      content: originalCode,
      priority: 200, // original-code: 800
      strategy: TruncationStrategy.SmartTruncateDiff,
      name: "original-code",
    });
    contextManager.addBlock({
      content: codeChanges,
      priority: 100, // code-changes: 900
      strategy: TruncationStrategy.SmartTruncateDiff,
      name: "code-changes",
    });
    contextManager.addBlock({
      content: similarCodeContext,
      priority: 320, // Inferred weight: 680
      strategy: TruncationStrategy.TruncateTail,
      name: "similar-code",
    });
    contextManager.addBlock({
      content: userCommits,
      priority: 300, // user-commits: 700
      strategy: TruncationStrategy.TruncateTail,
      name: "user-commits",
    });
    contextManager.addBlock({
      content: repoCommits,
      priority: 400, // recent-commits: 600
      strategy: TruncationStrategy.TruncateTail,
      name: "recent-commits",
    });
    contextManager.addBlock({
      content: currentInput,
      priority: 250, // custom-instructions: 750
      strategy: TruncationStrategy.TruncateTail,
      name: "custom-instructions",
    });
    contextManager.addBlock({
      content: reminder,
      priority: 100, // reminder: 900
      strategy: TruncationStrategy.TruncateTail,
      name: "reminder",
    });

    return contextManager;
  }

  /**
   * 处理来自 AI 的流式响应，并将其逐步应用到 SCM 输入框中。
   * @param aiProvider - AI 供应器实例。
   * @param requestParams - 发送给 AI 的请求参数。
   * @param scmProvider - SCM 供应器实例。
   * @param token - VS Code 取消令牌。
   * @param progress - VS Code 进度报告器。
   * @param contextManager - 上下文管理器实例，用于构建带重试逻辑的请求。
   */
  private async streamAndApplyMessage(
    aiProvider: AbstractAIProvider,
    requestParams: AIRequestParams,
    scmProvider: ISCMProvider,
    token: vscode.CancellationToken,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    contextManager: ContextManager // 接收 ContextManager 实例
  ) {
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
      let filteredMessage = filterCodeBlockMarkers(accumulatedMessage);
      filteredMessage = filteredMessage.trimStart();
      await scmProvider.startStreamingInput(filteredMessage);
      // 移除小的延时，让流式更新更平滑
    }
    this.throwIfCancelled(token);
    const finalMessage = filterCodeBlockMarkers(accumulatedMessage).trim();
    await scmProvider.startStreamingInput(finalMessage);
  }

  /**
   * 使用函数调用（Function Calling）模式生成提交信息。
   * 这种模式下，AI 会返回一个结构化的对象而不是纯文本。
   * @param aiProvider - AI 供应器实例。
   * @param requestParams - 包含消息历史的请求参数。
   * @param scmProvider - SCM 供应器实例。
   * @param token - VS Code 取消令牌。
   * @param progress - VS Code 进度报告器。
   */
  private async performFunctionCallingGeneration(
    aiProvider: AIProvider,
    requestParams: AIRequestParams & { messages: AIMessage[] },
    scmProvider: ISCMProvider,
    token: vscode.CancellationToken,
    progress: vscode.Progress<{ message?: string; increment?: number }>
  ) {
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

    const finalMessage = filterCodeBlockMarkers(aiResponse.content).trim();
    await scmProvider.startStreamingInput(finalMessage);
  }

  /**
   * 检查操作是否已被用户取消。
   * 如果已取消，则记录日志并抛出错误以中断当前操作。
   * @param token - VS Code 取消令牌。
   */
  throwIfCancelled(token: vscode.CancellationToken) {
    if (token.isCancellationRequested) {
      console.log(getMessage("user.cancelled.operation.log"));
      throw new Error(getMessage("user.cancelled.operation.error"));
    }
  }
}
