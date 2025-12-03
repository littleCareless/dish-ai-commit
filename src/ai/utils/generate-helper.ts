import { AIRequestParams } from "@/ai/types";
import {
  BRANCH_NAME_SYSTEM_TEMPLATE,
  BRANCH_NAME_USER_TEMPLATE,
} from "@/prompt/branch-name";
import { CODE_REVIEW_SYSTEM_TEMPLATE, getCodeReviewVariables } from "@/prompt/code-review";
import {
  generateCommitMessageSystemPrompt,
  generateThinkingProcessPrompt,
  generateTypeReferenceFromConfig,
  getDefaultTypeReference,
  getMergeCommitsSection,
  getVCSExamples,
} from "@/prompt/generate-commit";
import {
  GENERATE_COMMIT_FALLBACK_TEMPLATE,
  getFallbackCommitVariables,
} from "@/prompt/generate-commit-fallback";
import { PromptManagerService } from "@/services/core/prompt-manager-service";
import { ProfileManagerService } from "@/services/profile-manager/profile-manager-service";
import { PreferencesSettingsManager } from "@/services/settings/preferences-settings-manager";
import { PromptKey } from "@/types/prompts";
import { loadCommitlintConfig } from "@/utils/commitlint";
import { getMessage } from "@/utils/i18n";
import { notify } from "@/utils/notification/notification-manager";
import { processPromptTemplate } from "@/utils/prompt-template";

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
        `Stream generation failed after ${retries} retries: ${error.message || String(error)
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
  return `${prompt?.trim()}\n\nRespond in the following locale: ${language}`;
}

/**
 * 向提示词添加输出约束，要求直接返回结果，不包含解释
 * @param prompt - 原始提示词
 * @returns 添加输出约束后的提示词
 */
function appendOutputConstraint(prompt: string): string {
  return `${prompt?.trim()}\n\nIMPORTANT: Directly provide the result without any explanations, introductions, or comments. Do not include phrases like "I suggest" or "Based on". Just return the exact content requested.`;
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
export async function getSystemPrompt(
  params: AIRequestParams,
  directOutput: boolean = false,
  useFallback: boolean = false,
  config?: any
): Promise<string> {
  console.log("调用栈:\n", new Error().stack);

  if (isGeneratingPrompt) {
    return ""; // 防止循环调用
  }

  try {
    isGeneratingPrompt = true;

    const featureSettings = ProfileManagerService.getInstance().getFeatureSettings();
    const preferences = PreferencesSettingsManager.getInstance().getSettings();
    const commitlintConfig = await loadCommitlintConfig(params.workspaceRoot);

    // 1. 优先使用params中提供的系统提示
    // if (params.systemPrompt) {
    //   return appendConstraints(params.systemPrompt, params, directOutput);
    // }

    // 2. 获取 Active Prompt (支持 .dish/prompts, Config, Default)
    const promptManager = PromptManagerService.getInstance();
    const activePromptContent = await promptManager.getActivePromptContent(PromptKey.GenerateCommitSystem);

    if (activePromptContent) {
      const {
        enableMergeCommit,
        enableEmoji,
        enableBody,
        useRecentCommitsAsReference,
      } = featureSettings;

      const language = preferences.language;

      // Calculate block variables
      const typeReference = commitlintConfig
        ? generateTypeReferenceFromConfig(commitlintConfig, enableEmoji)
        : getDefaultTypeReference(enableEmoji);

      const formatTemplate = getMergeCommitsSection(
        enableMergeCommit,
        enableEmoji,
        enableBody
      );

      const examples = getVCSExamples(
        params.scm === "svn" ? "svn" : "git",
        enableMergeCommit,
        enableEmoji,
        enableBody
      );

      const thinkingProcess = generateThinkingProcessPrompt(
        useRecentCommitsAsReference
      );

      // Process template variables
      // 即使是自定义提示词，也支持变量替换，这样可以响应 enableEmoji 等设置
      const processedPrompt = processPromptTemplate(activePromptContent, {
        language: params.language || language || "Simplified Chinese",
        type_reference: typeReference,
        format_template: formatTemplate,
        examples: examples,
        thinking_process: thinkingProcess,
      });
      return appendConstraints(processedPrompt, params, directOutput);
    }

    // 3. Fallback (should rarely happen if default prompts are loaded)
    let prompt: string;
    if (useFallback) {
      const variables = getFallbackCommitVariables({
        vcsType: (params.scm === "svn" ? "svn" : "git") as "git" | "svn",
        useRecentCommitsAsReference: featureSettings.useRecentCommitsAsReference,
      });
      prompt = processPromptTemplate(GENERATE_COMMIT_FALLBACK_TEMPLATE, variables);
    } else {
      // Construct a config object that mimics the old structure for the generator
      // This is a temporary bridge until we refactor the generators to accept FeatureSettings
      const effectiveConfig = {
        base: { language: preferences.language },
        features: {
          commitFormat: {
            enableMergeCommit: featureSettings.enableMergeCommit,
            enableEmoji: featureSettings.enableEmoji,
            enableBody: featureSettings.enableBody,
          },
          commitMessage: {
            useRecentCommitsAsReference: featureSettings.useRecentCommitsAsReference,
          },
        },
      } as any;

      prompt = generateCommitMessageSystemPrompt({
        config: effectiveConfig,
        vcsType: (params.scm === "svn" ? "svn" : "git") as "git" | "svn",
        commitlintConfig,
      });
    }

    // 仅当需要直接输出结果时才添加输出约束
    return appendConstraints(prompt, params, directOutput);
  } finally {
    isGeneratingPrompt = false;
  }
}

/**
 * 获取代码审查提示文本
 * @param {AIRequestParams} params - AI 请求参数
 * @param {boolean} directOutput - 是否要求直接输出结果，不包含解释
 * @returns {Promise<string>} 代码审查提示文本
 */
export async function getCodeReviewPrompt(
  params: AIRequestParams,
  directOutput: boolean = false,
  config?: any
): Promise<string> {
  // 1. 优先使用 params 中提供的代码审查提示
  if (params.codeReviewPrompt) {
    return appendConstraints(params.codeReviewPrompt, params, directOutput);
  }

  // 2. 检查 PromptManager 是否有自定义 prompt
  const promptManager = PromptManagerService.getInstance();
  const promptDetail = promptManager.getPromptDetail(PromptKey.CodeReviewSystem);
  
  // 3. 获取语言配置
  const profileManager = ProfileManagerService.getInstance();
  const profile = await profileManager.getProfileForMode();
  const language = profile?.preferences?.language || "English";
  const variables = getCodeReviewVariables(language);
  
  if (promptDetail.isCustomized && promptDetail.content.trim() !== "") {
    // 自定义 prompt 也需要替换变量
    const customPrompt = processPromptTemplate(promptDetail.content, variables);
    return directOutput ? appendOutputConstraint(customPrompt) : customPrompt;
  }

  // 4. 使用默认模板并替换变量
  const prompt = processPromptTemplate(CODE_REVIEW_SYSTEM_TEMPLATE, variables);

  // 仅当需要直接输出结果时才添加输出约束
  return directOutput ? appendOutputConstraint(prompt) : prompt;
}

/**
 * 获取分支名称生成的系统提示文本
 * @param {AIRequestParams} params - AI 请求参数
 * @param {boolean} directOutput - 是否要求直接输出结果，不包含解释
 * @returns {string} 分支名称生成的系统提示文本
 */
export function getBranchNameSystemPrompt(
  params: AIRequestParams,
  directOutput: boolean = false,
  config?: any
): string {
  try {
    // 1. 优先使用params中提供的分支名称提示
    if (params.branchNamePrompt) {
      return appendConstraints(params.branchNamePrompt, params, directOutput);
    }

    // 2. 检查配置中是否有自定义提示词 (Deprecated)

    // 3. 使用默认生成的提示词
    // 分支名称提示词固定为英文，不需要语言变量
    const prompt = BRANCH_NAME_SYSTEM_TEMPLATE;

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
  return processPromptTemplate(BRANCH_NAME_USER_TEMPLATE, { diffContent });
}

/**
 * 获取全局摘要生成的系统提示文本
 * @param {AIRequestParams} params - AI 请求参数
 * @returns {string} 全局摘要生成的系统提示文本
 */
export async function getGlobalSummaryPrompt(
  params: AIRequestParams,
  config?: any
): Promise<string> {
  try {
    // 提示AI生成全局摘要
    const prompt = `请根据以下代码差异内容，生成一个简洁的全局摘要，概括所有变更的整体目的和意图。
摘要应该是高层次的，不需要包含每个文件的细节，而是关注整体变更的目标。
摘要内容应保持在1-3句话之内。

${await getSystemPrompt(params, false, false, config)}`;

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
export async function getFileDescriptionPrompt(
  params: AIRequestParams,
  filePath: string,
  config?: any
): Promise<string> {
  try {
    // 提示AI生成文件级描述
    const prompt = `请针对文件 "${filePath}" 的变更，生成一个简洁明了的描述。
描述应该只关注这个特定文件的变化，说明做了什么修改以及为什么做这些修改。
描述应该保持在1-2句话之内。

${await getSystemPrompt(params, false, false, config)}`;

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
