import type { AIGenerationErrorType } from "./utils/generateHelper";

export interface AIRequestOptions {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  language?: string; // 新增语言选项
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AIRequestParams {
  diff: string;
  systemPrompt?: string;
  model: AIModel;
  language?: string;
  scm?: "git" | "svn"; // 新增SCM类型
  additionalContext: string;

  // 代码分析相关选项 - 从 features.codeAnalysis
  simplifyDiff?: boolean;
  maxLineLength?: number;
  contextLines?: number;

  // 提交格式相关选项 - 从 features.commitFormat
  enableMergeCommit?: boolean;
  enableEmoji?: boolean;
}

// 添加通用错误处理接口
export interface AIError extends Error {
  code: string;
  type: AIGenerationErrorType;
  retryable: boolean;
}

export interface AIModel<
  Provider extends AIProviders = AIProviders,
  Model extends AIModels<Provider> = AIModels<Provider>
> {
  readonly id: Model;
  readonly name: string;
  readonly maxTokens: { input: number; output: number };
  readonly provider: {
    id: Provider;
    name: string;
  };

  readonly default?: boolean;
  readonly hidden?: boolean;
  readonly capabilities?: {
    streaming?: boolean;
    functionCalling?: boolean;
  };
  readonly cost?: {
    input: number;
    output: number;
  };
}

export interface AIProvider {
  generateResponse(params: AIRequestParams): Promise<AIResponse>;
  generateWeeklyReport(commits: string[]): Promise<AIResponse>;
  isAvailable(): Promise<boolean>;
  refreshModels(): Promise<string[]>;
  getModels(): Promise<AIModel[]>; // 更新返回类型
  getName(): string;
  getId(): string;
}

export type GitHubModels =
  | "gpt-4o"
  | "gpt-4o-mini"
  | "o1-preview"
  | "o1-mini"
  | "Phi-3.5-MoE-instruct"
  | "Phi-3.5-mini-instruct"
  | "AI21-Jamba-1.5-Large"
  | "AI21-Jamba-1.5-Mini";

export type OpenAIModels =
  | "o1-preview"
  | "o1-preview-2024-09-12"
  | "o1-mini"
  | "o1-mini-2024-09-12"
  | "gpt-4o"
  | "gpt-4o-2024-08-06"
  | "gpt-4o-2024-05-13"
  | "chatgpt-4o-latest"
  | "gpt-4o-mini"
  | "gpt-4o-mini-2024-07-18"
  | "gpt-4-turbo"
  | "gpt-4-turbo-2024-04-09"
  | "gpt-4-turbo-preview"
  | "gpt-4-0125-preview"
  | "gpt-4-1106-preview"
  | "gpt-4"
  | "gpt-4-0613"
  | "gpt-4-32k"
  | "gpt-4-32k-0613"
  | "gpt-3.5-turbo"
  | "gpt-3.5-turbo-0125"
  | "gpt-3.5-turbo-1106"
  | "gpt-3.5-turbo-16k";

export type VSCodeAIModels = `${string}:${string}`;

export type ZhipuAIModels =
  | "glm-4-plus" // 最强大通用模型
  | "glm-4-0520" // 最新基础版本
  | "glm-4" // 基础通用版本
  | "glm-4-air" // 轻量快速版本
  | "glm-4-airx" // 轻量增强版本
  | "glm-4-long" // 长文本版本
  | "glm-4-flashx" // 快速版本增强
  | "glm-4-flash"; // 快速版本基础

export type DashScopeModels =
  | "qwen-max"
  | "qwen-max-latest"
  | "qwen-plus"
  | "qwen-plus-latest"
  | "qwen-turbo"
  | "qwen-turbo-latest"
  | "qwen-coder-turbo" // 稳定版本
  | "qwen-coder-turbo-latest"; // 最新版本

export type DoubaoModels =
  | "doubao-lite-4k"
  | "doubao-lite-character"
  | "doubao-lite-32k"
  | "doubao-lite-128k"
  | "doubao-pro-4k"
  | "doubao-pro-character"
  | "doubao-pro-functioncall"
  | "doubao-pro-32k"
  | "doubao-pro-128k"
  | "doubao-pro-256k"
  | "doubao-vision-pro-32k";

export type AIProviders =
  | "anthropic"
  | "github"
  | "openai"
  | "vscode"
  | "zhipu"
  | "dashscope"
  | "doubao"; // 添加doubao

export type AIModels<Provider extends AIProviders = AIProviders> =
  Provider extends "github"
    ? GitHubModels
    : Provider extends "openai"
    ? OpenAIModels
    : Provider extends "vscode"
    ? VSCodeAIModels
    : Provider extends "zhipu"
    ? ZhipuAIModels
    : Provider extends "dashscope"
    ? DashScopeModels
    : Provider extends "doubao"
    ? DoubaoModels
    : OpenAIModels;

export type SupportedAIModels =
  | `github:${AIModels<"github">}`
  | `openai:${AIModels<"openai">}`
  | "vscode";

export interface VSCodeModelInfo {
  id: string;
  family: string;
  name: string;
  vendor: string;
  version: string;
  maxTokens: number; // 新增maxTokens字段
}

export function getMaxCharacters(model: AIModel, outputLength: number): number {
  const tokensPerCharacter = 3.1;
  const max =
    model.maxTokens.input * tokensPerCharacter -
    outputLength / tokensPerCharacter;
  return Math.floor(max - max * 0.1);
}
