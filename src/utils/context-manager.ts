import { AbstractAIProvider } from "@/ai/providers/abstract-ai-provider";
import {
  AIMessage,
  AIModel,
  AIRequestParams,
  ContextLengthExceededError,
} from "@/ai/types";
import { notify } from "@/utils/notification";

// 导入模块化组件
import { BlockProcessor } from "@/utils/context-manager/block-processor";
import {
  DEFAULT_TOKEN_RESERVE,
  FORCE_RETAIN_BLOCKS,
} from "@/utils/context-manager/constants";
import { ContentBuilder } from "@/utils/context-manager/content-builder";
import { ContentTruncator } from "@/utils/context-manager/content-truncator";
import { ContextLogger } from "@/utils/context-manager/context-logger";
import { SmartTruncator } from "@/utils/context-manager/smart-truncator";
import { TokenCalculator } from "@/utils/context-manager/token-calculator";
import {
  ContextBlock,
  ContextBuildReport,
  RequestTooLargeError,
  TruncationStrategy,
} from "@/utils/context-manager/types";
import { Logger } from "./logger";

const logger = Logger.getInstance("Dish AI Commit Gen");

// 重新导出类型和枚举以保持向后兼容
export {
  ContextBlock,
  FORCE_RETAIN_BLOCKS,
  RequestTooLargeError,
  TruncationStrategy,
};

/**
 * 管理和构建 AI 请求的上下文
 */
export class ContextManager {
  private blocks: ContextBlock[] = [];
  private model: AIModel;
  private systemPrompt: string;
  private suppressNonCriticalWarnings: boolean;

  // 模块化组件
  private tokenCalculator: TokenCalculator;
  private contentTruncator: ContentTruncator;
  private blockProcessor: BlockProcessor;
  private contentBuilder: ContentBuilder;
  private contextLogger: ContextLogger;
  private lastBuiltMessages: AIMessage[] | null = null;
  private lastBuildReport: ContextBuildReport | null = null;
  private isDirty = true;

  /**
   * @param model - 使用的 AI 模型
   * @param systemPrompt - 系统提示
   * @param suppressNonCriticalWarnings - 是否抑制非关键警告
   */
  constructor(
    model: AIModel,
    systemPrompt: string,
    suppressNonCriticalWarnings: boolean = false,
  ) {
    this.model = model;
    this.systemPrompt = systemPrompt;
    this.suppressNonCriticalWarnings = suppressNonCriticalWarnings;

    // 初始化模块化组件
    this.tokenCalculator = new TokenCalculator(model);
    this.contentTruncator = new ContentTruncator(this.tokenCalculator);
    this.blockProcessor = new BlockProcessor(
      this.tokenCalculator,
      this.contentTruncator,
      suppressNonCriticalWarnings,
    );
    this.contentBuilder = new ContentBuilder();
    this.contextLogger = new ContextLogger(suppressNonCriticalWarnings);
  }

  /**
   * 添加一个上下文区块
   * @param block - 要添加的区块
   */
  addBlock(block: ContextBlock) {
    if (block.content && block.content?.trim().length > 0) {
      this.blocks.push(block);
      this.invalidateBuildCache();
    }
  }

  /**
   * 获取所有上下文区块
   * @returns 当前所有区块的数组
   */
  public getBlocks(): ContextBlock[] {
    return this.blocks;
  }

  /**
   * 设置新的系统提示
   * @param systemPrompt - 新的系统提示字符串
   */
  setSystemPrompt(systemPrompt: string) {
    this.systemPrompt = systemPrompt;
    this.invalidateBuildCache();
  }

  /**
   * 估算构建后的用户上下文 token 数量
   * @returns 估算的 token 数量
   */
  public getEstimatedTokenCount(): number {
    const messages = this.buildMessages();
    return this.tokenCalculator.calculateMessagesTokens(messages);
  }

  /**
   * 估算原始未截取消息的 token 数量
   * @param customMessages 可选参数，如果提供则使用这些消息而不是构建新的
   * @returns 估算的原始 token 数量
   */
  public getEstimatedRawTokenCount(customMessages?: AIMessage[]): number {
    // 如果提供了自定义消息，则使用它们；否则构建系统消息和用户内容
    const messages = customMessages || [
      { role: "system", content: this.systemPrompt },
      {
        role: "user",
        content: this.contentBuilder.buildRawUserContent(this.blocks),
      },
    ];

    return this.tokenCalculator.calculateMessagesTokens(messages);
  }

  /**
   * 使用重试逻辑构建并执行AI流式请求
   * @param aiProvider - AI提供者实例
   * @param requestParams - 原始请求参数
   * @param maxRetries - 最大重试次数
   * @returns 一个包含AI生成内容的异步生成器
   */
  async *buildWithRetry(
    aiProvider: AbstractAIProvider,
    requestParams: AIRequestParams,
    maxRetries: number = 3,
  ): AsyncGenerator<string> {
    let retries = 0;

    while (retries <= maxRetries) {
      const messages = this.buildMessages();
      const currentRequestParams = { ...requestParams, messages };

      if (Logger.isDevelopment()) {
        logger.debug("[ContextManager] buildWithRetry - currentRequestParams", {
          data: {
            feature: currentRequestParams.feature,
            hasModel: !!currentRequestParams.model,
            hasMessages: Array.isArray(currentRequestParams.messages),
            messageCount: currentRequestParams.messages?.length,
          },
        });
      }

      try {
        const stream =
          await aiProvider.generateCommitStream(currentRequestParams);
        for await (const chunk of stream) {
          yield chunk;
        }
        return; // 成功，退出循环
      } catch (error: any) {
        if (error instanceof ContextLengthExceededError) {
          retries++;
          if (retries > maxRetries) {
            throw new RequestTooLargeError(
              `Context length issue persists after ${maxRetries} retries. Please try a model with a larger context window or reduce the number of selected files.`,
            );
          }

          if (Logger.isDevelopment()) {
            logger.warn(
              `Context too long, attempting retry ${retries}/${maxRetries}.`,
            );
          }
          notify.warn(
            `Context too long, attempting retry ${retries}/${maxRetries}.`,
          );

          // 智能截断逻辑
          if (!this.smartTruncate()) {
            // 如果无法再截断，则抛出错误
            throw new RequestTooLargeError(
              "Unable to truncate context further. Please reduce the number of selected files.",
            );
          }
        } else {
          // 对于非上下文长度错误，直接抛出
          throw error;
        }
      }
    }
  }

  /**
   * 构建最终用于 AI 请求的 messages 数组
   * @returns 经过智能截断和组装的 messages 数组
   */
  public buildMessages(): AIMessage[] {
    if (!this.isDirty && this.lastBuiltMessages) {
      return this.lastBuiltMessages;
    }

    const { maxTokens, systemPromptTokens } =
      this.tokenCalculator.calculateInitialTokens(this.systemPrompt);
    let remainingTokens =
      maxTokens - systemPromptTokens - DEFAULT_TOKEN_RESERVE;

    const { forcedBlocks, processableBlocks } =
      this.blockProcessor.partitionAndSortBlocks(this.blocks);

    // 处理强制保留的区块
    const forcedResult = this.blockProcessor.processForcedBlocks(
      forcedBlocks,
      remainingTokens,
    );

    // 处理可处理的区块
    const processableResult = this.blockProcessor.processProcessableBlocks(
      processableBlocks,
      forcedResult.remainingTokens,
    );

    // 合并结果
    const allIncludedBlocks = [
      ...forcedResult.includedBlocks,
      ...processableResult.includedBlocks,
    ];
    const allIncludedBlockNames = [
      ...forcedResult.includedBlockNames,
      ...processableResult.includedBlockNames,
    ];
    const allExcludedBlockNames = [
      ...forcedResult.excludedBlockNames,
      ...processableResult.excludedBlockNames,
    ];

    const userContent = this.contentBuilder.sortAndBuildUserContent(
      allIncludedBlocks,
      allIncludedBlockNames,
    );

    this.contextLogger.logContextBlockReport(
      allIncludedBlockNames,
      allExcludedBlockNames,
    );

    const messages: AIMessage[] = [
      { role: "system", content: this.systemPrompt },
      { role: "user", content: userContent?.trim() },
    ];

    const rawMessages: AIMessage[] = [
      { role: "system", content: this.systemPrompt },
      {
        role: "user",
        content: this.contentBuilder.buildRawUserContent(this.blocks),
      },
    ];

    const finalBlockByName = new Map<string, ContextBlock>();
    for (const block of allIncludedBlocks) {
      if (!finalBlockByName.has(block.name)) {
        finalBlockByName.set(block.name, block);
      }
    }

    this.lastBuildReport = {
      summary: {
        maxTokens,
        systemPromptTokens,
        reserveTokens: DEFAULT_TOKEN_RESERVE,
        remainingTokens: processableResult.remainingTokens,
        rawPromptTokens: this.tokenCalculator.calculateMessagesTokens(rawMessages),
        finalPromptTokens: this.tokenCalculator.calculateMessagesTokens(messages),
      },
      blocks: this.blocks.map((originalBlock) => {
        const finalBlock = finalBlockByName.get(originalBlock.name);
        const isTruncated = allIncludedBlockNames.includes(
          `${originalBlock.name} (Truncated)`,
        );
        const isIncluded =
          allIncludedBlockNames.includes(originalBlock.name) || isTruncated;
        return {
          name: originalBlock.name,
          priority: originalBlock.priority,
          strategy: originalBlock.strategy,
          forceRetained: FORCE_RETAIN_BLOCKS.includes(originalBlock.name),
          included: isIncluded,
          truncated: isTruncated,
          rawTokens: this.tokenCalculator.calculateContentTokens(
            originalBlock.content,
          ),
          finalTokens: finalBlock
            ? this.tokenCalculator.calculateContentTokens(finalBlock.content)
            : 0,
          rawLength: originalBlock.content.length,
          finalLength: finalBlock?.content.length ?? 0,
          finalContent: finalBlock?.content ?? "",
        };
      }),
      includedBlockNames: allIncludedBlockNames,
      excludedBlockNames: allExcludedBlockNames,
      userContent,
    };
    this.lastBuiltMessages = messages;
    this.isDirty = false;

    return messages;
  }

  /**
   * 获取最近一次构建的上下文报告（若未构建会自动构建一次）
   */
  public getLastBuildReport(): ContextBuildReport {
    if (!this.lastBuildReport) {
      this.buildMessages();
    }
    return this.lastBuildReport!;
  }

  /**
   * 尝试通过移除或截断优先级最低的块来智能地缩减上下文
   * @returns 如果成功缩减了上下文则返回 true，否则返回 false
   */
  private smartTruncate(): boolean {
    const smartTruncator = new SmartTruncator(
      this.blocks,
      this.tokenCalculator,
      this.suppressNonCriticalWarnings,
    );
    const truncated = smartTruncator.smartTruncate();
    if (truncated) {
      this.invalidateBuildCache();
    }
    return truncated;
  }

  private invalidateBuildCache(): void {
    this.lastBuiltMessages = null;
    this.lastBuildReport = null;
    this.isDirty = true;
  }
}
