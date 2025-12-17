import { AIModel, AIProvider, AIRequestParams } from "@/ai/types";
import { getSystemPrompt } from "@/ai/utils/generate-helper";
import { CommitContextBuilder } from "@/commands/generate-commit/builders/context-builder";
import { CommitMessageBuilder } from "@/commands/generate-commit/builders/message-builder";
import { GlobalContextExtractor } from "@/commands/generate-commit/services/global-context-extractor";
import { filterCodeBlockMarkers } from "@/commands/generate-commit/utils/commit-formatter";
import { getLayeredCommitBatchVariables } from "@/prompt/layered-commit-batch";
import { ISCMProvider } from "@/scm/scm-provider";
import { PromptManagerService } from "@/services/core/prompt-manager-service";
import { RateLimiterService } from "@/services/core/rate-limiter-service";
import { PromptKey } from "@/types/prompts";
import { getMessage } from "@/utils/i18n";
import { Logger } from "@/utils/logger";
import { notify } from "@/utils/notification/notification-manager";
import { processPromptTemplate } from "@/utils/prompt-template";
import * as vscode from "vscode";

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
    selectedModel: AIModel,
    config: any
  ): Promise<void> {
    this.logger.logOperationStart("handleLayeredCommit", {
      data: {
        provider: aiProvider.getId(),
        model: selectedModel.id,
        fileCount: selectedFiles?.length || 0,
      },
    });

    progress.report({
      message: getMessage("progress.generating.layered.commit"),
    });

    if (!selectedFiles || selectedFiles.length === 0) {
      this.logger.warn("未选择文件", {
        operation: "handleLayeredCommit",
      });
      notify.warn("no.files.selected.for.layered.commit");
      return;
    }

    this.logger.debug("获取配置完成", {
      data: {
        enableMergeCommit: config.features.commitFormat.enableMergeCommit,
        enableEmoji: config.features.commitFormat.enableEmoji,
      },
    });

    // === 新增: 阶段0 - 全局上下文提取 ===
    progress.report({
      message: getMessage("progress.extracting.global.context"),
    });

    this.logger.info("开始提取全局上下文", {
      data: { fileCount: selectedFiles.length },
    });

    const globalContext =
      await this.globalContextExtractor.extractGlobalContext(
        selectedFiles,
        scmProvider,
        selectedModel,
        aiProvider
      );

    this.logger.debug("全局上下文提取完成", {
      data: { contextLength: globalContext?.length || 0 },
    });

    // === 增强: 阶段1 - 为每个文件生成描述 (带全局上下文) ===
    this.logger.info("开始为每个文件生成描述", {
      data: { fileCount: selectedFiles.length },
    });

    // === 增强: 阶段1 - 批量生成文件描述 ===
    this.logger.info("开始批量生成文件描述", {
      data: { fileCount: selectedFiles.length },
    });

    const fileDescriptions = await this.processFilesInBatches(
      selectedFiles,
      scmProvider,
      aiProvider,
      requestParams,
      config,
      globalContext,
      token,
      progress,
      selectedModel
    );

    this.logger.info("文件描述生成完成", {
      data: {
        totalFiles: selectedFiles.length,
        successCount: fileDescriptions.length,
        failedCount: selectedFiles.length - fileDescriptions.length,
      },
    });

    if (fileDescriptions.length > 0) {
      await this.generateAndApplyLayeredSummary(
        aiProvider,
        requestParams,
        scmProvider,
        fileDescriptions,
        token,
        progress,
        config
      );

      this.logger.logOperationEnd("handleLayeredCommit", undefined, {
        data: { fileCount: fileDescriptions.length },
      });
    } else {
      this.logger.warn("未生成任何文件描述", {
        operation: "handleLayeredCommit",
      });
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
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    config: any
  ): Promise<void> {
    this.logger.logOperationStart("generateAndApplyLayeredSummary", {
      data: { fileCount: fileChanges.length },
    });

    progress.report({
      message: getMessage("progress.generating.layered.summary"),
    });

    const formattedFileChanges = fileChanges
      .map(
        (change) =>
          `File: ${change.filePath}\nDescription: ${change.description}`
      )
      .join("\n\n");

    // Build a temporary params object for the system prompt, forcing merge commit behavior
    // 使用从 profile 获取的配置，确保所有字段都从 profile 中获取
    const summaryParams: AIRequestParams = {
      ...config.features.commitMessage,
      ...config.features.commitFormat,
      ...config.features.codeAnalysis,
      model: requestParams.model,
      scm: scmProvider.type ?? "git",
      changeFiles: fileChanges.map((fc) => fc.filePath),
      language: config.base.language,
      languages: config.base.language,
      diff: formattedFileChanges, // Use the descriptions as the "diff" for the summary
      additionalContext: "",
      workspaceRoot: requestParams.workspaceRoot, // 从 requestParams 获取 workspaceRoot
      enableMergeCommit: true, // Force merge commit style for the summary
      feature: "commit-generation",
    };

    const summarySystemPrompt = await getSystemPrompt(summaryParams);

    const summaryContextManager =
      await this.contextBuilder.buildLayeredSummaryContextManager(
        requestParams.model as AIModel,
        summarySystemPrompt,
        scmProvider,
        formattedFileChanges,
        config
      );

    const messages = summaryContextManager.buildMessages();

    if (!aiProvider.generateCommit) {
      this.logger.error("Provider 不支持非流式生成", {
        data: { provider: aiProvider.getId() },
      });
      throw new Error(
        `Provider ${aiProvider.getId()} does not support non-streaming for layered commit summary.`
      );
    }

    this.logger.debug("生成分层摘要", {
      data: { messageCount: messages.length },
    });

    const summaryResponse = await aiProvider.generateCommit({
      ...requestParams,
      messages,
      diff: "", // Not needed for summary
    });

    this.throwIfCancelled(token);

    try {
      const finalMessage = summaryResponse.content;
      const filteredMessage = filterCodeBlockMarkers(finalMessage);

      this.logger.debug("应用分层摘要到 SCM", {
        data: { messageLength: filteredMessage?.length || 0 },
      });

      await scmProvider.startStreamingInput(filteredMessage?.trim());

      this.logger.logOperationEnd("generateAndApplyLayeredSummary", undefined, {
        data: { fileCount: fileChanges.length },
      });
    } catch (error) {
      this.logger.logError(error as Error, "应用分层提交摘要失败", {
        operation: "generateAndApplyLayeredSummary",
        data: { fileCount: fileChanges.length },
      });
      // Fallback to showing raw details if applying fails
      await this.messageBuilder.showLayeredCommitDetails(fileChanges, true);
      notify.error("error.applying.layered.summary");
    }
  }

  /**
   * 批量处理文件以生成描述
   */
  private async processFilesInBatches(
    files: string[],
    scmProvider: ISCMProvider,
    aiProvider: AIProvider,
    requestParams: AIRequestParams,
    config: any,
    globalContext: string | undefined,
    token: vscode.CancellationToken,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    selectedModel: AIModel
  ): Promise<{ filePath: string; description: string }[]> {
    const batches: string[][] = [];
    let currentBatch: string[] = [];
    let currentBatchSize = 0;
    const MAX_BATCH_SIZE = 15000; // chars
    const MAX_FILES_PER_BATCH = 10;

    // 1. Create Batches
    for (const file of files) {
      const diff = await scmProvider.getDiff([file]);
      if (!diff) {
        continue;
      }

      const diffSize = diff.length;

      // If single file is too large, process it individually (or in a batch of 1)
      if (diffSize > MAX_BATCH_SIZE) {
        if (currentBatch.length > 0) {
          batches.push(currentBatch);
          currentBatch = [];
          currentBatchSize = 0;
        }
        batches.push([file]);
        continue;
      }

      if (
        currentBatchSize + diffSize > MAX_BATCH_SIZE ||
        currentBatch.length >= MAX_FILES_PER_BATCH
      ) {
        batches.push(currentBatch);
        currentBatch = [];
        currentBatchSize = 0;
      }

      currentBatch.push(file);
      currentBatchSize += diffSize;
    }
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    // 2. Process Batches
    const results: { filePath: string; description: string }[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.throwIfCancelled(token);

      // === Rate Limiting ===
      const providerId = aiProvider.getId();
      const providerConfig = vscode.workspace
        .getConfiguration("dish-ai-commit.providers")
        .get<any>(providerId);

      if (providerConfig && providerConfig.rateLimitEnabled) {
        const rateLimiter = RateLimiterService.getInstance();
        await rateLimiter.acquire(
          providerId,
          providerConfig.rateLimitMax || 20,
          providerConfig.rateLimitWindow || 60,
          (waitTimeMs) => {
            progress.report({
              message: `Rate limit reached. Waiting ${Math.ceil(waitTimeMs / 1000)}s...`,
            });
          }
        );
      }
      // =====================

      progress.report({
        message: `Processing batch ${i + 1}/${batches.length} (${batch.length} files)...`,
      });

      try {
        const batchDiff = await scmProvider.getDiff(batch);
        if (!batchDiff) {
          continue;
        }

        const promptManager = PromptManagerService.getInstance();
        const activePromptContent = await promptManager.getActivePromptContent(
          PromptKey.LayeredCommitBatch
        );

        const variables = getLayeredCommitBatchVariables({
          config: config.features.commitFormat,
          language: config.base.language,
          globalContext: globalContext,
        });

        const systemPrompt = processPromptTemplate(
          activePromptContent,
          variables
        );

        const contextManager = await this.contextBuilder.buildContextManager(
          selectedModel,
          systemPrompt,
          scmProvider,
          batchDiff,
          config,
          {
            globalContext: globalContext,
          }
        );

        const messages = contextManager.buildMessages();

        if (!aiProvider.generateCommit) {
          // Fallback or skip
          continue;
        }

        const response = await aiProvider.generateCommit({
          ...requestParams,
          messages,
          diff: "",
        });

        // Parse JSON
        let parsed: any[];
        try {
          // Try to find JSON array in the response
          const content = response.content;
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            parsed = JSON.parse(content);
          }
        } catch (e) {
          this.logger.warn("Failed to parse batch response", {
            data: { batch, content: response.content },
          });
          continue;
        }

        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item.filePath && item.description) {
              results.push({
                filePath: item.filePath,
                description: item.description,
              });
            }
          }
        }
      } catch (error) {
        this.logger.error("Batch processing failed", { error: error as Error });
      }
    }

    return results;
  }

  /**
   * 检查操作是否已被用户取消
   * @param token - VS Code 取消令牌
   */
  private throwIfCancelled(token: vscode.CancellationToken): void {
    if (token.isCancellationRequested) {
      this.logger.warn("用户取消了操作", {
        operation: "handleLayeredCommit",
      });
      throw new Error(getMessage("user.cancelled.operation.error"));
    }
  }
}
