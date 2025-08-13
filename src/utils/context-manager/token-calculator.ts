import { AIModel, AIMessage } from "../../ai/types";
import { tokenizerService } from "../tokenizer";
import { TokenCalculationResult } from "./types";

/**
 * Token 计算工具类
 */
export class TokenCalculator {
  private model: AIModel;

  constructor(model: AIModel) {
    this.model = model;
  }

  /**
   * 计算初始化的 token 数量
   * @param systemPrompt 系统提示内容
   * @returns 包含最大 token 和系统提示 token 的对象
   */
  calculateInitialTokens(systemPrompt: string): TokenCalculationResult {
    const maxTokens = this.model.maxTokens?.input ?? 8192;
    const systemPromptTokens = tokenizerService.countTokens(
      systemPrompt,
      this.model
    );
    return { maxTokens, systemPromptTokens };
  }

  /**
   * 计算消息数组的总 token 数量
   * @param messages 消息数组
   * @returns 总 token 数量
   */
  calculateMessagesTokens(messages: AIMessage[]): number {
    return messages.reduce((acc, message) => {
      const content =
        typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content);
      return acc + tokenizerService.countTokens(content, this.model);
    }, 0);
  }

  /**
   * 计算单个内容的 token 数量
   * @param content 内容字符串
   * @returns token 数量
   */
  calculateContentTokens(content: string): number {
    return tokenizerService.countTokens(content, this.model);
  }

  /**
   * 编码内容为 token 数组
   * @param content 内容字符串
   * @returns token 数组
   */
  encodeContent(content: string): Uint32Array {
    return tokenizerService.encode(content, this.model);
  }

  /**
   * 解码 token 数组为内容字符串
   * @param tokens token 数组
   * @returns 内容字符串
   */
  decodeTokens(tokens: Uint32Array): string {
    return tokenizerService.decode(tokens, this.model);
  }
}