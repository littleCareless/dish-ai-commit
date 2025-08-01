import {
  AIModel,
  AIMessage,
  AIRequestParams,
  ContextLengthExceededError,
} from "../ai/types";
import { notify } from "./notification";
import { getMessage, formatMessage } from "./i18n";
import { AbstractAIProvider } from "../ai/providers/abstract-ai-provider";
import { tokenizerService } from "./tokenizer";

/**
 * 定义需要强制保留的上下文区块名称
 * 这些区块在空间不足时不会被截断或移除。
 */
export const FORCE_RETAIN_BLOCKS: string[] = [
  "code-changes",
  // "custom-instructions",
  "reminder",
];
/**
 * 定义上下文区块的截断策略
 */
export enum TruncationStrategy {
  /**
   * 从尾部移除内容
   */
  TruncateTail,
  /**
   * 从头部移除内容
   */
  TruncateHead,
  /**
   * 按 diff hunk 智能移除
   */
  SmartTruncateDiff,
}

/**
 * 定义上下文区块的接口
 */
export interface ContextBlock {
  /**
   * 区块内容
   */
  content: string;
  /**
   * 优先级 (数字越小，优先级越高)
   */
  priority: number;
  /**
   * 截断策略
   */
  strategy: TruncationStrategy;
  /**
   * 区块名称，用于日志和调试
   */
  name: string;
}

/**
 * 自定义错误类型，当上下文过大且无法再缩减时抛出
 */
export class RequestTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestTooLargeError";
  }
}

/**
 * 管理和构建 AI 请求的上下文
 */
export class ContextManager {
  private blocks: ContextBlock[] = [];
  private model: AIModel;
  private systemPrompt: string;
  private suppressNonCriticalWarnings: boolean;

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
    const { tokenizerService } = require("./tokenizer");
    const messages = this.buildMessages();

    const totalTokens = messages.reduce((acc, message) => {
      const content =
        typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content);
      // 注意：这里我们传递了 this.model，以便 tokenizer 能选择正确的编码
      return acc + tokenizerService.countTokens(content, this.model);
    }, 0);

    return totalTokens;
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
    const { maxTokens, systemPromptTokens } = this.calculateInitialTokens();
    let remainingTokens = maxTokens - systemPromptTokens - 100; // Reserve for response and overhead

    const { forcedBlocks, processableBlocks } = this.partitionAndSortBlocks();

    const includedBlocks: ContextBlock[] = [];
    const includedBlockNames: string[] = [];
    const excludedBlockNames: string[] = [];

    remainingTokens = this.processForcedBlocks(
      forcedBlocks,
      remainingTokens,
      includedBlocks,
      includedBlockNames
    );

    remainingTokens = this.processProcessableBlocks(
      processableBlocks,
      remainingTokens,
      includedBlocks,
      includedBlockNames,
      excludedBlockNames
    );

    const userContent = this.sortAndBuildUserContent(
      includedBlocks,
      includedBlockNames
    );

    this.logContextBlockReport(includedBlockNames, excludedBlockNames);

    return [
      { role: "system", content: this.systemPrompt },
      { role: "user", content: userContent.trim() },
    ];
  }

  /**
   * 计算初始化的 token 数量
   * @returns 包含最大 token 和系统提示 token 的对象
   */
  private calculateInitialTokens() {
    const maxTokens = this.model.maxTokens?.input ?? 8192;
    const systemPromptTokens = tokenizerService.countTokens(
      this.systemPrompt,
      this.model
    );
    return { maxTokens, systemPromptTokens };
  }

  /**
   * 将区块分区并排序
   * @returns 包含强制保留区块和可处理区块的对象
   */
  private partitionAndSortBlocks() {
    const forcedBlocks: ContextBlock[] = [];
    const processableBlocks: ContextBlock[] = [];
    for (const block of this.blocks) {
      if (FORCE_RETAIN_BLOCKS.includes(block.name)) {
        forcedBlocks.push(block);
      } else {
        processableBlocks.push(block);
      }
    }
    forcedBlocks.sort((a, b) => a.priority - b.priority);
    processableBlocks.sort((a, b) => b.priority - a.priority);
    return { forcedBlocks, processableBlocks };
  }

  /**
   * 处理强制保留的区块
   * @param blocks - 强制保留的区块数组
   * @param initialTokens - 初始剩余 token
   * @param includedBlocks - 已包含的区块数组
   * @param includedBlockNames - 已包含的区块名称数组
   * @returns 剩余的 token 数量
   */
  private processForcedBlocks(
    blocks: ContextBlock[],
    initialTokens: number,
    includedBlocks: ContextBlock[],
    includedBlockNames: string[]
  ): number {
    let remainingTokens = initialTokens;
    for (const block of blocks) {
      const blockTokens = tokenizerService.countTokens(
        block.content,
        this.model
      );
      if (remainingTokens >= blockTokens) {
        includedBlocks.push(block);
        remainingTokens -= blockTokens;
        includedBlockNames.push(block.name);
      } else {
        if (block.name === "code-changes") {
          remainingTokens -= this.addTruncatedBlock(
            block,
            remainingTokens,
            includedBlocks,
            includedBlockNames
          );
        }
      }
    }
    return remainingTokens;
  }

  /**
   * 处理可处理的区块
   * @param blocks - 可处理的区块数组
   * @param initialTokens - 初始剩余 token
   * @param includedBlocks - 已包含的区块数组
   * @param includedBlockNames - 已包含的区块名称数组
   * @param excludedBlockNames - 已排除的区块名称数组
   * @returns 剩余的 token 数量
   */
  private processProcessableBlocks(
    blocks: ContextBlock[],
    initialTokens: number,
    includedBlocks: ContextBlock[],
    includedBlockNames: string[],
    excludedBlockNames: string[]
  ): number {
    let remainingTokens = initialTokens;
    for (const block of blocks) {
      const blockTokens = tokenizerService.countTokens(
        block.content,
        this.model
      );

      if (remainingTokens >= blockTokens) {
        includedBlocks.push(block);
        remainingTokens -= blockTokens;
        includedBlockNames.push(block.name);
      } else if (remainingTokens > 100) {
        remainingTokens -= this.addTruncatedBlock(
          block,
          remainingTokens,
          includedBlocks,
          includedBlockNames
        );
        const currentIndex = blocks.indexOf(block);
        blocks
          .slice(currentIndex + 1)
          .forEach((b) => excludedBlockNames.push(b.name));
        break;
      } else {
        excludedBlockNames.push(block.name);
      }
    }
    return remainingTokens;
  }

  /**
   * 排序并构建用户内容
   * @param includedBlocks - 已包含的区块数组
   * @param includedBlockNames - 已包含的区块名称数组
   * @returns 构建好的用户内容字符串
   */
  private sortAndBuildUserContent(
    includedBlocks: ContextBlock[],
    includedBlockNames: string[]
  ): string {
    const finalOrder = [
      "user-commits",
      "recent-commits",
      "similar-code",
      "original-code",
      "code-changes",
      "reminder",
      "custom-instructions",
    ];

    includedBlocks.sort(
      (a, b) => finalOrder.indexOf(a.name) - finalOrder.indexOf(b.name)
    );

    return includedBlocks
      .map((block) => {
        const tagName = block.name.toLowerCase().replace(/\s+/g, "-");
        const isTruncated = includedBlockNames.includes(
          `${block.name} (Truncated)`
        );
        const tag = isTruncated
          ? `<${tagName} truncated="true">`
          : `<${tagName}>`;
        return `${tag}\n${block.content}\n</${tagName}>`;
      })
      .join("\n\n");
  }

  /**
   * 记录上下文区块报告
   * @param includedBlockNames - 已包含的区块名称数组
   * @param excludedBlockNames - 已排除的区块名称数组
   */
  private logContextBlockReport(
    includedBlockNames: string[],
    excludedBlockNames: string[]
  ) {
    if (excludedBlockNames.length > 0) {
      if (!this.suppressNonCriticalWarnings) {
        notify.warn(
          formatMessage("context.block.removed", [
            excludedBlockNames.join(", "),
          ])
        );
      }
    }

    console.log("Included context blocks:", includedBlockNames.join(", "));
    if (excludedBlockNames.length > 0) {
      console.log("Excluded context blocks:", excludedBlockNames.join(", "));
    }
  }

  /**
   * 尝试通过移除或截断优先级最低的块来智能地缩减上下文
   * @returns 如果成功缩减了上下文则返回 true，否则返回 false
   */
  private smartTruncate(): boolean {
    // 1. 识别出可以被截断的区块（即不在强制保留列表中的）
    const truncatableBlocks = this.blocks
      .filter((b) => !FORCE_RETAIN_BLOCKS.includes(b.name))
      .sort((a, b) => b.priority - a.priority); // 按优先级降序排序

    if (truncatableBlocks.length === 0) {
      // 没有可以安全截断的块了
      return false;
    }

    // 2. 从可截断的区块中，选取优先级最低的（即排序后的第一个）
    const lowestPriorityBlock = truncatableBlocks[0];

    // 3. 策略1: 截断该区块
    if (
      tokenizerService.countTokens(lowestPriorityBlock.content, this.model) >
      100
    ) {
      const tokens = tokenizerService.encode(
        lowestPriorityBlock.content,
        this.model
      );
      const newLength = Math.floor(tokens.length * 0.7);
      const truncatedTokens = tokens.slice(0, newLength);
      lowestPriorityBlock.content = tokenizerService.decode(
        truncatedTokens,
        this.model
      );
      if (!this.suppressNonCriticalWarnings) {
        notify.warn(
          formatMessage("context.block.truncated", [lowestPriorityBlock.name])
        );
      }
      return true;
    }

    // 4. 策略2: 如果截断不了（或太短），则直接移除该区块
    const blockIndex = this.blocks.findIndex(
      (b) => b.name === lowestPriorityBlock.name
    );
    if (blockIndex > -1) {
      const [removedBlock] = this.blocks.splice(blockIndex, 1);
      if (!this.suppressNonCriticalWarnings) {
        notify.warn(
          formatMessage("context.block.removed", [removedBlock.name])
        );
      }
      return true;
    }

    return false; // 无法进一步截断
  }

  /**
   * 添加一个被截断的区块到上下文中
   * @param block - 要截断并添加的区块
   * @param maxTokens - 可用于此区块的最大 token 数
   * @param includedBlocks - 当前已包含的区块列表 (将被修改)
   * @param includedBlockNames - 当前已包含的区块名称列表 (将被修改)
   * @returns 此截断区块所消耗的 token 数量
   */
  private addTruncatedBlock(
    block: ContextBlock,
    maxTokens: number,
    includedBlocks: ContextBlock[],
    includedBlockNames: string[]
  ): number {
    const truncatedContent = this.truncate(block, maxTokens);
    const truncatedTokens = tokenizerService.countTokens(
      truncatedContent,
      this.model
    );
    includedBlocks.push({ ...block, content: truncatedContent });
    includedBlockNames.push(`${block.name} (Truncated)`);
    if (!this.suppressNonCriticalWarnings) {
      notify.warn(formatMessage("context.truncated", [block.name]));
    }
    return truncatedTokens;
  }

  /**
   * 根据策略截断内容
   * @param block - 要截断的区块
   * @param maxTokens - 最大 token 数
   * @returns 截断后的内容
   */
  private truncate(block: ContextBlock, maxTokens: number): string {
    const tokens = tokenizerService.encode(block.content, this.model);
    if (tokens.length <= maxTokens) {
      return block.content;
    }

    let truncatedTokens: Uint32Array;

    switch (block.strategy) {
      case TruncationStrategy.TruncateHead:
        truncatedTokens = tokens.slice(-maxTokens);
        break;
      case TruncationStrategy.SmartTruncateDiff:
        // SmartTruncateDiff 在此上下文中应被视为一个更复杂的逻辑，
        // 这里我们直接调用它，并传递 maxTokens
        return this.smartTruncateDiff(block.content, maxTokens);
      case TruncationStrategy.TruncateTail:
      default:
        truncatedTokens = tokens.slice(0, maxTokens);
        break;
    }

    return tokenizerService.decode(truncatedTokens, this.model);
  }

  /**
   * 智能截断 diff 内容，优先保留文件头和尾部，并按 hunk 移除
   * @param diff - diff 内容
   * @param maxTokens - 最大 token 数
   * @returns 截断后的 diff 内容
   */
  private smartTruncateDiff(diff: string, maxTokens: number): string {
    const totalTokens = tokenizerService.countTokens(diff, this.model);
    if (totalTokens <= maxTokens) {
      return diff;
    }

    const hunks = diff
      .split(/^diff --git/m)
      .filter(Boolean)
      .map((h) => `diff --git${h}`);
    if (hunks.length <= 1) {
      // 如果只有一个文件变更，从中间截断
      const tokens = tokenizerService.encode(diff, this.model);
      const headTokens = tokens.slice(0, Math.floor(maxTokens / 2));
      const tailTokens = tokens.slice(-Math.floor(maxTokens / 2));
      const head = tokenizerService.decode(headTokens, this.model);
      const tail = tokenizerService.decode(tailTokens, this.model);
      return `${head}\n\n... (diff truncated) ...\n\n${tail}`;
    }

    const hunkWithTokens = hunks.map((hunk) => ({
      content: hunk,
      tokens: tokenizerService.countTokens(hunk, this.model),
    }));

    const firstHunk = hunkWithTokens.shift()!;
    const lastHunk = hunkWithTokens.pop(); // Can be undefined

    let middleHunks = hunkWithTokens;
    let currentTokens = firstHunk.tokens + (lastHunk?.tokens ?? 0);
    middleHunks.forEach((h) => (currentTokens += h.tokens));

    let removedHunks = false;
    // Remove hunks from the middle until the total token count is within the limit
    while (currentTokens > maxTokens && middleHunks.length > 0) {
      const removedHunk = middleHunks.splice(
        Math.floor(middleHunks.length / 2),
        1
      )[0];
      currentTokens -= removedHunk.tokens;
      removedHunks = true;
    }

    let finalHunks = [firstHunk.content];
    finalHunks.push(...middleHunks.map((h) => h.content));
    if (lastHunk) {
      finalHunks.push(lastHunk.content);
    }

    let finalContent = finalHunks.join("\n");

    if (removedHunks) {
      // Find a good place to insert the truncation message, e.g., before the last hunk
      const lastHunkIndex = finalContent.lastIndexOf("diff --git");
      if (lastHunkIndex > 0) {
        finalContent =
          finalContent.substring(0, lastHunkIndex) +
          "... (some file diffs truncated) ...\n\n" +
          finalContent.substring(lastHunkIndex);
      } else {
        finalContent += "\n\n... (some file diffs truncated) ...\n\n";
      }
    }

    // Final check to ensure we are within the token limit
    if (tokenizerService.countTokens(finalContent, this.model) > maxTokens) {
      const finalTokens = tokenizerService.encode(finalContent, this.model);
      const truncatedFinalTokens = finalTokens.slice(0, maxTokens);
      finalContent = tokenizerService.decode(truncatedFinalTokens, this.model);
    }

    return finalContent;
  }
}
