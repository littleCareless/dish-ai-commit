import { notify } from "../../utils/notification/notification-manager";
import { generateCommitMessageSystemPrompt } from "../../prompt/generate-commit";
import {
  generateBranchNameSystemPrompt,
  generateBranchNameUserPrompt,
} from "../../prompt/branch-name";
import { AIRequestParams } from "../types";
import { ConfigurationManager } from "../../config/configuration-manager";
import { getCodeReviewPrompt as getCodeReviewPrompts } from "../../prompt/code-review";
import { getMessage, formatMessage } from "../../utils/i18n";

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
        notify.warn(getMessage(`input.truncated`));
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
      // const errorMessage = formatMessage(
      //   `${provider}.generation.failed`,
      //   error.message || String(error)
      // );
      // notify.error(errorMessage);
      throw new Error(error.message || String(error));
    }
  }
}

/**
 * 带重试机制的 AI 流式生成函数
 * @template T 生成结果的类型
 * @param {AIRequestParams} params - AI 请求参数
 * @param {(truncatedDiff: string) => Promise<AsyncIterable<string>>} generateFn - 实际执行流式生成的函数
 * @param {GenerateWithRetryOptions} options - 重试配置选项
 * @returns {AsyncGenerator<string>} 一个异步生成器，用于逐块生成内容
 */
export async function* generateStreamWithRetry(
  params: AIRequestParams,
  generateFn: (truncatedDiff: string) => Promise<AsyncIterable<string>>,
  options: GenerateWithRetryOptions
): AsyncGenerator<string> {
  const {
    maxRetries = 2,
    initialMaxLength,
    reductionFactor = 0.8,
    retryDelay = 1000,
  } = options;

  let retries = 0;
  let maxInputLength = initialMaxLength;

  while (true) {
    try {
      const truncatedPrompt = params.diff.substring(0, maxInputLength);

      if (params.diff.length > maxInputLength) {
        notify.warn(getMessage(`input.truncated`));
      }

      const stream = await generateFn(truncatedPrompt);
      for await (const chunk of stream) {
        yield chunk;
      }
      return; // 成功完成，退出循环
    } catch (error: any) {
      console.error("Error during stream generation:", error);

      if (
        retries < maxRetries &&
        (error.message?.includes("maximum context length") ||
          error.message?.includes("context length exceeded") ||
          error.message?.includes("exceeds token limit"))
      ) {
        retries++;
        maxInputLength = Math.floor(maxInputLength * reductionFactor);
        notify.warn(
          `Stream generation failed, retrying with smaller input size (${maxInputLength} chars). Retry ${retries}/${maxRetries}`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue; // 继续下一次重试
      }

      // 达到最大重试次数或遇到不可重试的错误, 抛出异常
      throw new Error(
        `Stream generation failed after ${retries} retries: ${
          error.message || String(error)
        }`
      );
    }
  }
}

/**
 * 向提示词添加语言约束
 * @param prompt - 原始提示词
 * @param params - 请求参数，包含可选的language或languages属性
 * @returns 添加语言约束后的提示词
 */
function appendLanguageConstraint(
  prompt: string,
  params: AIRequestParams
): string {
  // 获取语言设置，优先使用language，如果不存在则使用languages
  const language = params.language || params.languages;

  if (!language) {
    return prompt;
  }

  // 添加语言约束
  return `${prompt.trim()}\n\nRespond in the following locale: ${language}`;
}

/**
 * 向提示词添加输出约束，要求直接返回结果，不包含解释
 * @param prompt - 原始提示词
 * @returns 添加输出约束后的提示词
 */
function appendOutputConstraint(prompt: string): string {
  return `${prompt.trim()}\n\nIMPORTANT: Directly provide the result without any explanations, introductions, or comments. Do not include phrases like "I suggest" or "Based on". Just return the exact content requested.`;
}

/**
 * 添加所有约束到提示词（语言约束和输出约束）
 * @param prompt - 原始提示词
 * @param params - 请求参数
 * @param directOutput - 是否要求直接输出结果，不包含解释
 * @returns 添加所有约束后的提示词
 */
function appendConstraints(
  prompt: string,
  params: AIRequestParams,
  directOutput: boolean = false
): string {
  let constrainedPrompt = prompt;

  // 添加语言约束
  constrainedPrompt = appendLanguageConstraint(constrainedPrompt, params);

  // 如果需要直接输出结果，添加输出约束
  constrainedPrompt = appendOutputConstraint(constrainedPrompt);

  return constrainedPrompt;
}

/** 标记是否正在生成系统提示,用于防止循环调用 */
let isGeneratingPrompt = false;

/**
 * 获取系统提示文本
 * @param {AIRequestParams} params - AI 请求参数
 * @param {boolean} directOutput - 是否要求直接输出结果，不包含解释
 * @returns {string} 系统提示文本
 */
export function getSystemPrompt(
  params: AIRequestParams,
  directOutput: boolean = false
): string {
  if (isGeneratingPrompt) {
    return ""; // 防止循环调用
  }

  try {
    isGeneratingPrompt = true;

    // 1. 优先使用params中提供的系统提示
    if (params.systemPrompt) {
      return appendConstraints(params.systemPrompt, params, directOutput);
    }

    // 2. 检查配置中是否有自定义提示词
    const config = ConfigurationManager.getInstance().getConfiguration();
    const configuredPrompt = config.features?.commitMessage?.systemPrompt;

    if (configuredPrompt) {
      return appendConstraints(configuredPrompt, params, directOutput);
    }

    // 3. 使用默认生成的提示词
    const prompt = generateCommitMessageSystemPrompt({
      config,
      vcsType: (params.scm === "svn" ? "svn" : "git") as "git" | "svn",
    });

    // 仅当需要直接输出结果时才添加输出约束
    return directOutput ? appendOutputConstraint(prompt) : prompt;
  } finally {
    isGeneratingPrompt = false;
  }
}

/**
 * 获取代码审查提示文本
 * @param {AIRequestParams} params - AI 请求参数
 * @param {boolean} directOutput - 是否要求直接输出结果，不包含解释
 * @returns {string} 代码审查提示文本
 */
export function getCodeReviewPrompt(
  params: AIRequestParams,
  directOutput: boolean = false
): string {
  try {
    // 1. 优先使用params中提供的代码审查提示
    if (params.codeReviewPrompt) {
      return appendConstraints(params.codeReviewPrompt, params, directOutput);
    }

    // 2. 检查配置中是否有自定义提示词
    const config = ConfigurationManager.getInstance().getConfiguration();
    const configuredPrompt = config.features?.codeReview?.systemPrompt;

    if (configuredPrompt) {
      return appendConstraints(configuredPrompt, params, directOutput);
    }

    // 3. 使用默认提示词
    const prompt = getCodeReviewPrompts();

    // 仅当需要直接输出结果时才添加输出约束
    return directOutput ? appendOutputConstraint(prompt) : prompt;
  } finally {
  }
}

/**
 * 获取分支名称生成的系统提示文本
 * @param {AIRequestParams} params - AI 请求参数
 * @param {boolean} directOutput - 是否要求直接输出结果，不包含解释
 * @returns {string} 分支名称生成的系统提示文本
 */
export function getBranchNameSystemPrompt(
  params: AIRequestParams,
  directOutput: boolean = false
): string {
  try {
    // 1. 优先使用params中提供的分支名称提示
    if (params.branchNamePrompt) {
      return appendConstraints(params.branchNamePrompt, params, directOutput);
    }

    // 2. 检查配置中是否有自定义提示词
    const config = ConfigurationManager.getInstance().getConfiguration();
    const configuredPrompt = config.features?.branchName?.systemPrompt;

    if (configuredPrompt) {
      return appendConstraints(configuredPrompt, params, directOutput);
    }

    // 3. 使用默认生成的提示词
    const prompt = generateBranchNameSystemPrompt({
      config,
    });

    // 仅当需要直接输出结果时才添加输出约束
    return directOutput ? appendOutputConstraint(prompt) : prompt;
  } finally {
  }
}

/**
 * 获取分支名称生成的用户提示文本
 * @param {string} diffContent - 代码差异内容
 * @returns {string} 分支名称生成的用户提示文本
 */
export function getBranchNameUserPrompt(diffContent: string): string {
  return generateBranchNameUserPrompt(diffContent);
}

/**
 * 获取全局摘要生成的系统提示文本
 * @param {AIRequestParams} params - AI 请求参数
 * @returns {string} 全局摘要生成的系统提示文本
 */
export function getGlobalSummaryPrompt(params: AIRequestParams): string {
  try {
    // 提示AI生成全局摘要
    const prompt = `请根据以下代码差异内容，生成一个简洁的全局摘要，概括所有变更的整体目的和意图。
摘要应该是高层次的，不需要包含每个文件的细节，而是关注整体变更的目标。
摘要内容应保持在1-3句话之内。

${getSystemPrompt(params)}`;

    // 全局摘要提示词不是自定义提示词，不应用语言约束
    return prompt;
  } finally {
  }
}

/**
 * 获取文件级描述生成的系统提示文本
 * @param {AIRequestParams} params - AI 请求参数
 * @param {string} filePath - 文件路径
 * @returns {string} 文件级描述生成的系统提示文本
 */
export function getFileDescriptionPrompt(
  params: AIRequestParams,
  filePath: string
): string {
  try {
    // 提示AI生成文件级描述
    const prompt = `请针对文件 "${filePath}" 的变更，生成一个简洁明了的描述。
描述应该只关注这个特定文件的变化，说明做了什么修改以及为什么做这些修改。
描述应该保持在1-2句话之内。

${getSystemPrompt(params)}`;

    // 文件描述提示词不是自定义提示词，不应用语言约束
    return prompt;
  } finally {
  }
}

/**
 * 从diff内容中提取修改的文件路径列表
 * @param {string} diff - diff内容
 * @returns {string[]} 修改的文件路径列表
 */
export function extractModifiedFilePaths(diff: string): string[] {
  const filePaths: string[] = [];
  const fileHeaderRegex = /^diff --git a\/(.*?) b\/(.*?)$/gm;

  let match;
  while ((match = fileHeaderRegex.exec(diff)) !== null) {
    filePaths.push(match[2]); // 使用b/后的文件路径（新文件路径）
  }

  return [...new Set(filePaths)]; // 去重
}
