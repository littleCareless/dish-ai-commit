import {
  AIModel,
  AIMessage,
  AIRequestParams,
  ContextLengthExceededError,
} from "../ai/types";
import { AbstractAIProvider } from "../ai/providers/abstract-ai-provider";
import { notify } from "./notification";

// 导入模块化组件
import { 
  ContextBlock, 
  TruncationStrategy, 
  RequestTooLargeError 
} from "./context-manager/types";
import { FORCE_RETAIN_BLOCKS, DEFAULT_TOKEN_RESERVE } from "./context-manager/constants";
import { TokenCalculator } from "./context-manager/token-calculator";
import { BlockProcessor } from "./context-manager/block-processor";
import { ContentTruncator } from "./context-manager/content-truncator";
import { ContentBuilder } from "./context-manager/content-builder";
import { SmartTruncator } from "./context-manager/smart-truncator";
import { ContextLogger } from "./context-manager/context-logger";

// 重新导出类型和枚举以保持向后兼容
export { ContextBlock, TruncationStrategy, RequestTooLargeError };
export { FORCE_RETAIN_BLOCKS };

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

  /**
   * @param model - 使用的 AI 模型
   * @param systemPrompt - 系统提示
   * @param suppressNonCriticalWarnings - 是否抑制非关键警告
   */
  constructor(
    model: AIModel,
    systemPrompt: string,
    suppressNonCriticalWarnings: boolean = false
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
      suppressNonCriticalWarnings
    );
    this.contentBuilder = new ContentBuilder();
    this.contextLogger = new ContextLogger(suppressNonCriticalWarnings);
  }

  /**
   * 添加一个上下文区块
   * @param block - 要添加的区块
   */
  addBlock(block: ContextBlock) {
    if (block.content && block.content.trim().length > 0) {
      this.blocks.push(block);
    }
  }

  /**
   * 设置新的系统提示
   * @param systemPrompt - 新的系统提示字符串
   */
  setSystemPrompt(systemPrompt: string) {
    this.systemPrompt = systemPrompt;
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
        content: this.contentBuilder.buildRawUserContent(this.blocks)
      }
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
    maxRetries: number = 3
  ): AsyncGenerator<string> {
    let retries = 0;

    while (retries <= maxRetries) {
      const messages = this.buildMessages();
      const currentRequestParams = { ...requestParams, messages };
      try {
        const stream = await aiProvider.generateCommitStream(
          currentRequestParams
        );
        for await (const chunk of stream) {
          yield chunk;
        }
        return; // 成功，退出循环
      } catch (error: any) {
        if (error instanceof ContextLengthExceededError) {
          retries++;
          if (retries > maxRetries) {
            throw new RequestTooLargeError(
              `Context length issue persists after ${maxRetries} retries. Please try a model with a larger context window or reduce the number of selected files.`
            );
          }

          notify.warn(
            `Context too long, attempting retry ${retries}/${maxRetries}.`
          );

          // 智能截断逻辑
          if (!this.smartTruncate()) {
            // 如果无法再截断，则抛出错误
            throw new RequestTooLargeError(
              "Unable to truncate context further. Please reduce the number of selected files."
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
    const { maxTokens, systemPromptTokens } = this.tokenCalculator.calculateInitialTokens(this.systemPrompt);
    let remainingTokens = maxTokens - systemPromptTokens - DEFAULT_TOKEN_RESERVE;

    const { forcedBlocks, processableBlocks } = this.blockProcessor.partitionAndSortBlocks(this.blocks);

    // 处理强制保留的区块
    const forcedResult = this.blockProcessor.processForcedBlocks(forcedBlocks, remainingTokens);
    
    // 处理可处理的区块
    const processableResult = this.blockProcessor.processProcessableBlocks(
      processableBlocks, 
      forcedResult.remainingTokens
    );

    // 合并结果
    const allIncludedBlocks = [...forcedResult.includedBlocks, ...processableResult.includedBlocks];
    const allIncludedBlockNames = [...forcedResult.includedBlockNames, ...processableResult.includedBlockNames];
    const allExcludedBlockNames = [...forcedResult.excludedBlockNames, ...processableResult.excludedBlockNames];

    const userContent = this.contentBuilder.sortAndBuildUserContent(
      allIncludedBlocks,
      allIncludedBlockNames
    );

    this.contextLogger.logContextBlockReport(allIncludedBlockNames, allExcludedBlockNames);

    return [
      { role: "system", content: this.systemPrompt },
      { role: "user", content: userContent.trim() },
    ];
  }

  /**
   * 尝试通过移除或截断优先级最低的块来智能地缩减上下文
   * @returns 如果成功缩减了上下文则返回 true，否则返回 false
   */
  private smartTruncate(): boolean {
    const smartTruncator = new SmartTruncator(
      this.blocks,
      this.tokenCalculator,
      this.suppressNonCriticalWarnings
    );
    return smartTruncator.smartTruncate();
  }
}
