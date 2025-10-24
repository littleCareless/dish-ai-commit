import * as vscode from "vscode";
import { ISCMProvider } from "../../../scm/scm-provider";
import { AIProvider, AIRequestParams, AIModel } from "../../../ai/types";
import { ConfigurationManager } from "../../../config/configuration-manager";
import { getLayeredCommitFilePrompt } from "../../../prompt/layered-commit-file";
import { getMessage, formatMessage } from "../../../utils/i18n";
import { notify } from "../../../utils/notification/notification-manager";
import { CommitContextBuilder } from "../builders/context-builder";
import { CommitMessageBuilder } from "../builders/message-builder";
import { filterCodeBlockMarkers } from "../utils/commit-formatter";
import { Logger } from "../../../utils/logger";
import { getSystemPrompt } from "../../../ai/utils/generate-helper";
import { GlobalContextExtractor } from "../services/global-context-extractor";

/**
 * 分层提交处理器类，负责处理分层提交信息生成
 */
export class LayeredCommitHandler {
  private logger: Logger;
  private contextBuilder: CommitContextBuilder;
  private messageBuilder: CommitMessageBuilder;
  private globalContextExtractor: GlobalContextExtractor;

  constructor(logger: Logger) {
    this.logger = logger;
    this.contextBuilder = new CommitContextBuilder();
    this.messageBuilder = new CommitMessageBuilder();
    this.globalContextExtractor = new GlobalContextExtractor();
  }

  /**
   * 执行分层文件提交生成
   * @param aiProvider - AI 供应器实例
   * @param requestParams - 请求参数
   * @param scmProvider - SCM 供应器实例
   * @param selectedFiles - 选中的文件列表
   * @param token - 取消令牌
   * @param progress - 进度报告器
   * @param selectedModel - 选中的模型
   */
  async handle(
    aiProvider: AIProvider,
    requestParams: AIRequestParams,
    scmProvider: ISCMProvider,
    selectedFiles: string[] | undefined,
    token: vscode.CancellationToken,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    selectedModel: AIModel
  ): Promise<void> {
    progress.report({
      message: getMessage("progress.generating.layered.commit"),
    });

    if (!selectedFiles || selectedFiles.length === 0) {
      notify.warn("no.files.selected.for.layered.commit");
      return;
    }

    const config = ConfigurationManager.getInstance().getConfiguration();
    
    // === 新增: 阶段0 - 全局上下文提取 ===
    progress.report({ message: getMessage("progress.extracting.global.context") });
    const globalContext = await this.globalContextExtractor.extractGlobalContext(
      selectedFiles,
      scmProvider,
      selectedModel,
      aiProvider
    );
    
    // === 增强: 阶段1 - 为每个文件生成描述 (带全局上下文) ===
    const fileDescriptionPromises = selectedFiles.map(async (filePath) => {
      this.throwIfCancelled(token);
      progress.report({
        message: formatMessage("progress.generating.commit.for.file", [
          filePath,
        ]),
      });

      const fileDiff = await scmProvider.getDiff([filePath]);
      if (!fileDiff) {
        return null;
      }

      // 🔥 关键改动: 构建增强prompt
      const systemPrompt = getLayeredCommitFilePrompt({
        config: config.features.commitFormat,
        language: config.base.language,
        filePath: filePath,
        globalContext: globalContext, // ✅ 新增参数
        otherFiles: selectedFiles.filter(f => f !== filePath) // ✅ 新增参数
      });

      const contextManager = await this.contextBuilder.buildContextManager(
        selectedModel,
        systemPrompt,
        scmProvider,
        fileDiff,
        config,
        { 
          exclude: ["similar-code"], // 降低token压力
          globalContext: globalContext // 作为高优先级block添加
        }
      );
      const messages = contextManager.buildMessages();

      if (!aiProvider.generateCommit) {
        notify.warn("provider.does.not.support.non.streaming.for.layered", [
          aiProvider.getId(),
        ]);
        return null;
      }

      try {
        const description = await aiProvider.generateCommit({
          ...requestParams, // Pass original params for model, etc.
          messages,
          diff: "", // Diff is now in messages, clear this
        });

        return {
          filePath,
          description: description.content,
        };
      } catch (error) {
        notify.error(
          formatMessage("error.generating.commit.for.file", [
            filePath,
            (error as Error).message,
          ])
        );
        return null;
      }
    });

    const fileDescriptions = (
      await Promise.all(fileDescriptionPromises)
    ).filter((d): d is { filePath: string; description: string } => d !== null);

    if (fileDescriptions.length > 0) {
      await this.generateAndApplyLayeredSummary(
        aiProvider,
        requestParams,
        scmProvider,
        fileDescriptions,
        token,
        progress
      );
    } else {
      notify.warn("warn.no.file.descriptions.generated");
    }
  }

  /**
   * 生成并应用分层摘要
   * @param aiProvider - AI 供应器实例
   * @param requestParams - 请求参数
   * @param scmProvider - SCM 供应器实例
   * @param fileChanges - 文件变更列表
   * @param token - 取消令牌
   * @param progress - 进度报告器
   */
  private async generateAndApplyLayeredSummary(
    aiProvider: AIProvider,
    requestParams: AIRequestParams,
    scmProvider: ISCMProvider,
    fileChanges: { filePath: string; description: string }[],
    token: vscode.CancellationToken,
    progress: vscode.Progress<{ message?: string; increment?: number }>
  ): Promise<void> {
    progress.report({
      message: getMessage("progress.generating.layered.summary"),
    });

    const config = ConfigurationManager.getInstance().getConfiguration();

    const formattedFileChanges = fileChanges
      .map(
        (change) =>
          `File: ${change.filePath}\nDescription: ${change.description}`
      )
      .join("\n\n");

    // Build a temporary params object for the system prompt, forcing merge commit behavior
    const summaryParams = {
      ...config.features.commitMessage,
      ...config.features.commitFormat,
      ...config.features.codeAnalysis,
      model: requestParams.model,
      scm: scmProvider.type ?? "git",
      changeFiles: fileChanges.map((fc) => fc.filePath),
      languages: config.base.language,
      diff: formattedFileChanges, // Use the descriptions as the "diff" for the summary
      additionalContext: "",
      enableMergeCommit: true, // Force merge commit style for the summary
    };

    const summarySystemPrompt = await getSystemPrompt(summaryParams);

    const summaryContextManager = await this.contextBuilder.buildLayeredSummaryContextManager(
      requestParams.model as AIModel,
      summarySystemPrompt,
      scmProvider,
      formattedFileChanges,
      config
    );

    const messages = summaryContextManager.buildMessages();

    if (!aiProvider.generateCommit) {
      throw new Error(
        `Provider ${aiProvider.getId()} does not support non-streaming for layered commit summary.`
      );
    }

    const summaryResponse = await aiProvider.generateCommit({
      ...requestParams,
      messages,
      diff: "", // Not needed for summary
    });

    this.throwIfCancelled(token);

    try {
      const finalMessage = summaryResponse.content;
      const filteredMessage = filterCodeBlockMarkers(finalMessage);
      await scmProvider.startStreamingInput(filteredMessage?.trim());
    } catch (error) {
      console.error("Error applying layered commit summary:", error);
      // Fallback to showing raw details if applying fails
      await this.messageBuilder.showLayeredCommitDetails(fileChanges, true);
      notify.error("error.applying.layered.summary");
    }
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

