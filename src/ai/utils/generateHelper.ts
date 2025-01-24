import { generateCommitMessageSystemPrompt } from "../../prompt/prompt";
import { AIRequestParams } from "../types";
import { ConfigurationManager } from "../../config/ConfigurationManager";
import { CODE_REVIEW_PROMPT } from "../../prompt/codeReview";
import { NotificationHandler } from "../../utils/NotificationHandler";
import { LocalizationManager } from "../../utils/LocalizationManager";

/**
 * AI 生成过程中可能遇到的错误类型枚举
 * @enum {string}
 */
export enum AIGenerationErrorType {
  /** 上下文长度超出限制 */
  CONTEXT_LENGTH = "CONTEXT_LENGTH",
  /** Token 数量超出限制 */
  TOKEN_LIMIT = "TOKEN_LIMIT",
  /** 未知错误 */
  UNKNOWN = "UNKNOWN",
}

/**
 * generateWithRetry 函数的配置选项接口
 * @interface GenerateWithRetryOptions
 */
export interface GenerateWithRetryOptions {
  /** 最大重试次数,默认为 2 */
  maxRetries?: number;
  /** 初始最大输入长度 */
  initialMaxLength: number;
  /** 每次重试时输入长度的缩减系数,默认为 0.8 */
  reductionFactor?: number;
  /** AI 提供商标识 */
  provider: string;
  /** 可重试的错误类型列表 */
  retryableErrors?: AIGenerationErrorType[];
  /** 重试之间的延迟时间(ms),默认为 1000ms */
  retryDelay?: number;
}

/**
 * 带重试机制的 AI 生成函数
 * @template T 生成结果的类型
 * @param {AIRequestParams} params - AI 请求参数
 * @param {function(string): Promise<T>} generateFn - 实际执行生成的函数
 * @param {GenerateWithRetryOptions} options - 重试配置选项
 * @returns {Promise<T>} 生成的结果
 * @throws {Error} 当重试次数用尽或遇到不可重试的错误时抛出
 */
export async function generateWithRetry<T>(
  params: AIRequestParams,
  generateFn: (truncatedDiff: string) => Promise<T>,
  options: GenerateWithRetryOptions
): Promise<T> {
  // 解构配置参数并设置默认值
  const {
    maxRetries = 2,
    initialMaxLength,
    reductionFactor = 0.8,
    provider,
    retryableErrors = [
      AIGenerationErrorType.CONTEXT_LENGTH,
      AIGenerationErrorType.TOKEN_LIMIT,
    ],
    retryDelay = 1000,
  } = options;

  let retries = 0;
  let maxInputLength = initialMaxLength;

  while (true) {
    try {
      // 截断输入文本到指定长度
      const truncatedPrompt = params.diff.substring(0, maxInputLength);

      // 如果原始输入被截断,发出警告
      if (params.diff.length > maxInputLength) {
        NotificationHandler.warn(
          LocalizationManager.getInstance().getMessage(`input.truncated`)
        );
      }

      return await generateFn(truncatedPrompt);
    } catch (error: any) {
      console.log("error", error);

      // 检查是否是可重试的错误类型且未超过最大重试次数
      if (
        retries < maxRetries &&
        (error.message?.includes("maximum context length") ||
          error.message?.includes("context length exceeded") ||
          error.message?.includes("exceeds token limit"))
      ) {
        retries++;
        // 减少输入长度并继续重试
        maxInputLength = Math.floor(maxInputLength * reductionFactor);
        continue;
      }

      // 达到最大重试次数或遇到不可重试的错误,抛出异常
      const errorMessage = LocalizationManager.getInstance().format(
        `${provider}.generation.failed`,
        error.message || String(error)
      );
      NotificationHandler.error(errorMessage);
      throw new Error(errorMessage);
    }
  }
}

/** 标记是否正在生成系统提示,用于防止循环调用 */
let isGeneratingPrompt = false;

/**
 * 获取系统提示文本
 * @param {AIRequestParams} params - AI 请求参数
 * @returns {string} 系统提示文本
 */
export function getSystemPrompt(params: AIRequestParams): string {
  if (isGeneratingPrompt) {
    return ""; // 防止循环调用
  }

  try {
    isGeneratingPrompt = true;
    // 优先使用参数中提供的系统提示
    if (params.systemPrompt) {
      return params.systemPrompt;
    }

    // 获取完整配置并生成系统提示
    const config = ConfigurationManager.getInstance().getConfiguration();
    return generateCommitMessageSystemPrompt({
      config,
      vcsType: params.scm || "git",
    });
  } finally {
    isGeneratingPrompt = false;
  }
}

/**
 * 获取代码审查提示文本
 * @param {AIRequestParams} params - AI 请求参数
 * @returns {string} 代码审查提示文本
 */
export function getCodeReviewPrompt(params: AIRequestParams): string {
  try {
    // 获取配置中的code review系统提示
    const config = ConfigurationManager.getInstance().getConfiguration();
    const configuredPrompt = config.features?.codeReview?.systemPrompt;

    // 如果配置了自定义提示则使用配置的,否则使用默认提示
    return configuredPrompt || CODE_REVIEW_PROMPT;
  } finally {
  }
}
