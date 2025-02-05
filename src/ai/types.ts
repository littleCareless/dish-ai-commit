import type { AIGenerationErrorType } from "./utils/generateHelper";

/**
 * AI请求选项接口，定义了向AI模型发送请求时的基本参数
 */
export interface AIRequestOptions {
  /** 提示词/输入文本 */
  prompt: string;
  /** 系统提示词，用于设置AI行为和角色 */
  systemPrompt?: string;
  /** 使用的模型标识符 */
  model?: string;
  /** 采样温度，控制输出的随机性，范围0-1 */
  temperature?: number;
  /** 生成的最大token数量 */
  maxTokens?: number;
  /** 输出的目标语言 */
  language?: string;
}

/**
 * AI响应结果接口，包含生成的内容和token使用统计
 */
export interface AIResponse {
  /** 生成的文本内容 */
  content: string;
  /** token使用统计信息 */
  usage?: {
    /** 提示词消耗的token数 */
    promptTokens?: number;
    /** 生成内容消耗的token数 */
    completionTokens?: number;
    /** 总消耗token数 */
    totalTokens?: number;
  };
}

/**
 * AI请求的详细参数接口，用于实际发送请求时的完整配置
 */
export interface AIRequestParams {
  /** 代码差异内容 */
  diff: string;
  /** 系统提示词 */
  systemPrompt?: string;
  /** 使用的AI模型 */
  model: AIModel;
  /** 目标语言 */
  language?: string;
  /** 源代码管理类型 */
  scm?: "git" | "svn";
  /** 额外上下文信息 */
  additionalContext: string;

  /** 代码分析相关选项 */
  simplifyDiff?: boolean;
  maxLineLength?: number;
  contextLines?: number;

  /** 提交格式相关选项 */
  enableMergeCommit?: boolean;
  enableEmoji?: boolean;
}

/**
 * AI错误接口，定义了统一的错误处理结构
 */
export interface AIError extends Error {
  /** 错误代码 */
  code: string;
  /** 错误类型 */
  type: AIGenerationErrorType;
  /** 是否可重试 */
  retryable: boolean;
}

/**
 * AI模型接口，定义了模型的基本信息和能力
 */
export interface AIModel<
  Provider extends AIProviders = AIProviders,
  Model extends AIModels<Provider> = AIModels<Provider>
> {
  /** 模型唯一标识符 */
  readonly id: Model;
  /** 模型名称 */
  readonly name: string;
  /** token限制 */
  readonly maxTokens: { input: number; output: number };
  /** 提供者信息 */
  readonly provider: {
    id: Provider;
    name: string;
  };
  /** 是否为默认模型 */
  readonly default?: boolean;
  /** 是否在界面上隐藏 */
  readonly hidden?: boolean;
  /** 模型特殊能力 */
  readonly capabilities?: {
    /** 是否支持流式输出 */
    streaming?: boolean;
    /** 是否支持函数调用 */
    functionCalling?: boolean;
  };
  /** 费用信息 */
  readonly cost?: {
    /** 输入token单价 */
    input: number;
    /** 输出token单价 */
    output: number;
  };
}

/**
 * AI提供者接口，定义了AI服务提供者需要实现的方法
 */
export interface AIProvider {
  /** 生成回复内容 */
  generateResponse(params: AIRequestParams): Promise<AIResponse>;
  /** 生成代码评审内容 */
  generateCodeReview?(params: AIRequestParams): Promise<AIResponse>;
  /** 生成周报 */
  generateWeeklyReport(commits: string[], model?: AIModel): Promise<AIResponse>;
  /** 检查服务可用性 */
  isAvailable(): Promise<boolean>;
  /** 刷新可用模型列表 */
  refreshModels(): Promise<string[]>;
  /** 获取支持的模型列表 */
  getModels(): Promise<AIModel[]>;
  /** 获取提供者名称 */
  getName(): string;
  /** 获取提供者ID */
  getId(): string;
}

/**
 * 代码评审问题接口，定义了代码评审时发现的具体问题
 */
export interface CodeReviewIssue {
  /** 问题严重程度 */
  severity: "NOTE" | "WARNING" | "ERROR";
  /** 问题文件路径 */
  filePath: string;
  /** 问题起始行号 */
  startLine: number;
  /** 问题结束行号 */
  endLine?: number;
  /** 问题描述 */
  description: string;
  /** 修复建议 */
  suggestion: string;
  /** 相关文档链接 */
  documentation?: string;
  /** 问题代码片段 */
  code?: string;
}

/**
 * 代码评审结果接口
 */
export interface CodeReviewResult {
  /** 发现的问题列表 */
  issues: CodeReviewIssue[];
  /** 总体评审摘要 */
  summary: string;
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

export type GeminiAIModels =
  | "gemini-1.5-flash"
  | "gemini-1.5-flash-8b"
  | "gemini-1.5-pro"
  | "gemini-2.0-flash-exp";

export type DeepseekModels =
  | "deepseek-chat"
  | "deepseek-coder"
  | "deepseek-chat-pro";

export type AIProviders =
  | "anthropic"
  | "github"
  | "openai"
  | "vscode"
  | "zhipu"
  | "dashscope"
  | "doubao"
  | "deepseek"
  | "gemini";

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
    : Provider extends "deepseek"
    ? DeepseekModels
    : Provider extends "gemini"
    ? GeminiAIModels
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

/**
 * 计算给定模型和输出长度下的最大输入字符数
 * @param model - AI模型信息
 * @param outputLength - 预期输出长度
 * @returns 允许的最大输入字符数
 */
export function getMaxCharacters(model: AIModel, outputLength: number): number {
  // 每个字符平均消耗的token数
  const tokensPerCharacter = 3.1;

  // 计算可用的最大token数
  const max =
    model.maxTokens.input * tokensPerCharacter -
    outputLength / tokensPerCharacter;

  // 保留10%的缓冲空间
  return Math.floor(max - max * 0.1);
}
