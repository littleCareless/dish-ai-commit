import { NotificationHandler } from "../../utils/NotificationHandler";
import { LocalizationManager } from "../../utils/LocalizationManager";
import { generateCommitMessageSystemPrompt } from "../../prompt/prompt";
import { DEFAULT_CONFIG } from "../../config/default";
import { AIRequestParams } from "../types";

// 添加错误类型枚举
export enum AIGenerationErrorType {
  CONTEXT_LENGTH = "CONTEXT_LENGTH",
  TOKEN_LIMIT = "TOKEN_LIMIT",
  UNKNOWN = "UNKNOWN",
}

export interface GenerateWithRetryOptions {
  maxRetries?: number;
  initialMaxLength: number;
  reductionFactor?: number;
  provider: string;
  retryableErrors?: AIGenerationErrorType[]; // 添加可重试的错误类型
  retryDelay?: number; // 添加重试延迟时间
}

export async function generateWithRetry<T>(
  params: AIRequestParams,
  generateFn: (truncatedDiff: string) => Promise<T>,
  options: GenerateWithRetryOptions
): Promise<T> {
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
      const truncatedPrompt = params.diff.substring(0, maxInputLength);

      if (params.diff.length > maxInputLength) {
        NotificationHandler.warn(
          LocalizationManager.getInstance().getMessage(
            `${provider}.input.truncated`
          )
        );
      }

      return await generateFn(truncatedPrompt);
    } catch (error: any) {
      console.log("error", error);
      if (
        retries < maxRetries &&
        (error.message?.includes("maximum context length") ||
          error.message?.includes("context length exceeded") ||
          error.message?.includes("exceeds token limit"))
      ) {
        retries++;
        maxInputLength = Math.floor(maxInputLength * reductionFactor);
        continue;
      }

      const errorMessage = LocalizationManager.getInstance().format(
        `${provider}.generation.failed`,
        error.message || String(error)
      );
      NotificationHandler.error(errorMessage);
      throw new Error(errorMessage);
    }
  }
}

export function getSystemPrompt(params: AIRequestParams): string {
  return (
    params.systemPrompt ||
    generateCommitMessageSystemPrompt(
      params.language || DEFAULT_CONFIG.language,
      params.allowMergeCommits || false,
      params.splitChangesInSingleFile || false,
      params.scm || "git"
    )
  );
}
