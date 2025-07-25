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

  constructor(model: AIModel, systemPrompt: string) {
    this.model = model;
    this.systemPrompt = systemPrompt;
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
   * 使用重试逻辑构建并执行AI流式请求
   * @param aiProvider - AI提供者实例
   * @param requestParams - 原始请求参数
   * @param maxRetries - 最大重试次数
   * @returns 一个异步生成器
   */
  /**
   * 估算构建后的用户上下文 token 数量（简化为字符数）
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
    // 按优先级排序，优先级高的在前面
    this.blocks.sort((a, b) => a.priority - b.priority);

    const maxTokens = this.model.maxTokens?.input ?? 8192;
    const systemPromptTokens = tokenizerService.countTokens(
      this.systemPrompt,
      this.model
    );
    let remainingTokens = maxTokens - systemPromptTokens - 100; // 100 tokens buffer for response and other overhead

    let userContent = "";
    const includedBlocks: string[] = [];
    const excludedBlocks: string[] = [];


    for (const block of this.blocks) {
      const blockTokens = tokenizerService.countTokens(
        block.content,
        this.model
      );
      if (remainingTokens >= blockTokens) {
        userContent += `\n\n--- START ${block.name} ---\n${block.content}\n--- END ${block.name} ---`;
        remainingTokens -= blockTokens;
        includedBlocks.push(block.name);
      } else if (remainingTokens > 100) {
        // 只有在还有足够空间时才尝试截断
        const truncatedContent = this.truncate(block, remainingTokens);
        const truncatedTokens = tokenizerService.countTokens(
          truncatedContent,
          this.model
        );
        userContent += `\n\n--- START ${block.name} (TRUNCATED) ---\n${truncatedContent}\n--- END ${block.name} ---`;
        remainingTokens -= truncatedTokens;
        includedBlocks.push(`${block.name} (Truncated)`);
        notify.warn(formatMessage("context.truncated", [block.name]));
        // 截断后，假设剩余空间已用尽或不足以添加更多块，因此跳出循环
        // 将此块之后的所有块都标记为已排除
        const currentIndex = this.blocks.indexOf(block);
        this.blocks
          .slice(currentIndex + 1)
          .forEach((b) => excludedBlocks.push(b.name));
        break;
      } else {
        // 剩余空间不足以容纳下一个块，即使截断也不行
        excludedBlocks.push(block.name);
      }
    }

    if (excludedBlocks.length > 0) {
      notify.warn(
        formatMessage("context.blocks.removed", [excludedBlocks.join(", ")])
      );
    }

    console.log("Included context blocks:", includedBlocks.join(", "));
    if (excludedBlocks.length > 0) {
      console.log("Excluded context blocks:", excludedBlocks.join(", "));
    }

    return [
      { role: "system", content: this.systemPrompt },
      { role: "user", content: userContent.trim() },
    ];
  }

  /**
   * 根据策略截断内容
   * @param block - 要截断的区块
   * @param maxLength - 最大长度
   * @returns 截断后的内容
   */
  /**
   * 尝试通过移除或截断优先级最低的块来智能地缩减上下文
   * @returns 如果成功缩减了上下文则返回 true，否则返回 false
   */
  private smartTruncate(): boolean {
    if (this.blocks.length === 0) {
      return false;
    }

    // 按优先级降序排序（数字大的在前）
    this.blocks.sort((a, b) => b.priority - a.priority);

    const lowestPriorityBlock = this.blocks[0];

    // 策略1: 截断非核心区块
    if (
      lowestPriorityBlock.name !== "Code Diff" &&
      tokenizerService.countTokens(lowestPriorityBlock.content, this.model) >
        100 // 避免截断太短的内容
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
      notify.warn(
        formatMessage("context.block.truncated", [lowestPriorityBlock.name])
      );
      this.blocks.sort((a, b) => a.priority - b.priority); // 恢复升序
      return true;
    }

    // 策略2: 移除整个非核心区块
    if (this.blocks.length > 1 && lowestPriorityBlock.name !== "Code Diff") {
      const removedBlock = this.blocks.shift(); // 移除优先级最低的
      if (removedBlock) {
        notify.warn(
          formatMessage("context.block.removed", [removedBlock.name])
        );
      }
      this.blocks.sort((a, b) => a.priority - b.priority); // 恢复升序
      return true;
    }

    // 策略3: 智能截断核心的 Diff 区块
    const diffBlock = this.blocks.find((b) => b.name === "Code Diff");
    if (diffBlock) {
      const originalLength = diffBlock.content.length;
      const originalTokens = tokenizerService.countTokens(
        diffBlock.content,
        this.model
      );
      diffBlock.content = this.smartTruncateDiff(
        diffBlock.content,
        Math.floor(originalTokens * 0.8)
      );
      if (diffBlock.content.length < originalLength) {
        notify.warn(formatMessage("context.block.truncated", [diffBlock.name]));
        return true;
      }
    }

    return false; // 无法进一步截断
  }

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
   * @param maxLength - 最大长度
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
