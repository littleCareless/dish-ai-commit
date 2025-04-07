import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources";
import {
  AIProvider,
  AIRequestParams,
  AIResponse,
  AIModel,
  type CodeReviewResult,
  type AIProviders,
} from "../types";
import {
  generateWithRetry,
  getCodeReviewPrompt,
  getSystemPrompt,
} from "../utils/generate-helper";

import { getWeeklyReportPrompt } from "../../prompt/weekly-report";
import { CodeReviewReportGenerator } from "../../services/code-review-report-generator";
import { formatMessage } from "../../utils/i18n/localization-manager";

/**
 * OpenAI提供者配置项接口
 */
export interface OpenAIProviderConfig {
  /** OpenAI API密钥 */
  apiKey: string;
  /** API基础URL，对于非官方OpenAI端点可自定义 */
  baseURL?: string;
  /** API版本号 */
  apiVersion?: string;
  /** 提供者唯一标识符 */
  providerId: string;
  /** 提供者显示名称 */
  providerName: string;
  /** 默认使用的模型ID */
  defaultModel?: string;
  /** 支持的模型列表 */
  models: AIModel[];
}

/**
 * OpenAI API基础提供者抽象类
 * 实现了OpenAI API的基本功能，可被具体提供者继承和扩展
 */
export abstract class BaseOpenAIProvider implements AIProvider {
  /** 超时时间(ms) */
  private readonly TIMEOUT = 10000; // 10秒
  /** 重试次数 */
  private readonly MAX_RETRIES = 3;

  /** OpenAI API客户端实例 */
  protected openai: OpenAI;
  /** 提供者配置信息 */
  protected config: OpenAIProviderConfig;
  /** 提供者标识信息 */
  protected provider: { id: string; name: string };

  /**
   * 创建基础OpenAI提供者实例
   * @param config - 提供者配置对象
   */
  constructor(config: OpenAIProviderConfig) {
    this.config = config;
    this.provider = {
      id: config.providerId,
      name: config.providerName,
    };
    this.openai = this.createClient();
  }

  /**
   * 创建OpenAI API客户端
   * @returns OpenAI客户端实例
   * @protected
   */
  protected createClient(): OpenAI {
    const config: any = {
      apiKey: this.config.apiKey,
    };

    if (this.config.baseURL) {
      config.baseURL = this.config.baseURL;
      if (this.config.apiKey) {
        // config.defaultQuery = { "api-version": this.config.apiVersion };
        config.defaultHeaders = { "api-key": this.config.apiKey };
      }
    }

    return new OpenAI(config);
  }

  /**
   * 生成AI回复内容
   * 使用重试机制处理可能的失败情况
   *
   * @param params - AI请求参数
   * @returns 包含生成内容和使用统计的Promise
   */
  async generateResponse(params: AIRequestParams): Promise<AIResponse> {
    return generateWithRetry(
      params,
      async (truncatedDiff) => {
        const messages: ChatCompletionMessageParam[] = [
          {
            role: "system",
            content: getSystemPrompt(params),
          },
          {
            role: "user",
            content: truncatedDiff,
          },
        ];

        const completion = await this.openai.chat.completions.create({
          model:
            (params.model && params.model.id) ||
            this.config.defaultModel ||
            "gpt-3.5-turbo",
          messages,
        });

        return {
          content: completion.choices[0]?.message?.content || "",
          usage: {
            promptTokens: completion.usage?.prompt_tokens,
            completionTokens: completion.usage?.completion_tokens,
            totalTokens: completion.usage?.total_tokens,
          },
        };
      },
      {
        initialMaxLength: params.model?.maxTokens?.input || 16385,
        provider: this.getId(),
      }
    );
  }

  /**
   * 生成代码评审报告
   * 将diff内容转换为结构化的评审结果
   *
   * @param params - 代码评审请求参数
   * @returns 包含评审报告的Promise
   * @throws 如果AI响应解析失败或生成过程出错
   */
  async generateCodeReview(params: AIRequestParams): Promise<AIResponse> {
    return generateWithRetry(
      params,
      async (truncatedInput) => {
        const messages: ChatCompletionMessageParam[] = [
          {
            role: "system",
            content: getCodeReviewPrompt(params),
          },
          {
            role: "user",
            content: truncatedInput,
          },
        ];

        try {
          const completion = await this.openai.chat.completions.create({
            model:
              (params.model && params.model.id) ||
              this.config.defaultModel ||
              "gpt-3.5-turbo",
            messages,
            temperature: 0.3,
          });

          const responseContent = completion.choices[0]?.message?.content;
          if (!responseContent) {
            throw new Error("No response content from AI");
          }

          let reviewResult: CodeReviewResult;
          try {
            reviewResult = JSON.parse(responseContent);
          } catch (e) {
            throw new Error(
              `Failed to parse AI response as JSON: ${
                e instanceof Error ? e.message : String(e)
              }`
            );
          }
          return {
            content:
              CodeReviewReportGenerator.generateMarkdownReport(reviewResult),
            usage: {
              promptTokens: completion.usage?.prompt_tokens,
              completionTokens: completion.usage?.completion_tokens,
              totalTokens: completion.usage?.total_tokens,
            },
          };
        } catch (error) {
          const message = formatMessage("codeReview.generation.failed", [
            error instanceof Error ? error.message : String(error),
          ]);
          throw new Error(message);
        }
      },
      {
        initialMaxLength: params.model?.maxTokens?.input || 16385,
        provider: this.getId(),
      }
    );
  }

  /**
   * 基于提交记录生成周报
   * 总结一段时间内的代码提交活动
   *
   * @param commits - 提交记录数组
   * @param model - 可选的指定模型
   * @returns 包含周报内容的Promise
   * @throws 如果生成失败会抛出本地化的错误信息
   */
  async generateWeeklyReport(
    commits: string[],
    model?: AIModel
  ): Promise<AIResponse> {
    try {
      const response = await this.openai.chat.completions.create({
        model: model?.id || this.config.defaultModel || "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: getWeeklyReportPrompt(),
          },
          {
            role: "user",
            content: commits.join("\n"),
          },
        ],
      });
      return {
        content: response.choices[0]?.message?.content || "",
        usage: {
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
          totalTokens: response.usage?.total_tokens,
        },
      };
    } catch (error) {
      throw new Error(
        formatMessage("weeklyReport.generation.failed", [
          error instanceof Error ? error.message : String(error),
        ])
      );
    }
  }

  /**
   * 获取当前支持的AI模型列表
   * 优先从API获取，如果失败则返回配置的静态列表
   *
   * @returns Promise<AIModel[]> 支持的模型配置数组
   */
  async getModels(): Promise<AIModel[]> {
    try {
      const response = await this.withTimeout(
        this.withRetry(async () => {
          return await this.openai.models.list();
        })
      );

      return response.data.map((model: any) => ({
        id: model.id,
        name: model.id,
        maxTokens: {
          input: model.context_window || 4096,
          output: Math.floor((model.context_window || 4096) / 2),
        },
        provider: {
          id: this.provider.id as AIProviders,
          name: this.provider.name,
        },
      }));
    } catch (error) {
      console.warn("Failed to fetch models:", error);
      return this.config.models;
    }
  }

  /**
   * 刷新并返回可用的模型ID列表
   * @returns Promise<string[]> 模型ID数组
   */
  async refreshModels(): Promise<string[]> {
    const models = await this.getModels();
    return models.map((m) => m.id);
  }

  /**
   * 获取提供者显示名称
   */
  getName(): string {
    return this.provider.name;
  }

  /**
   * 获取提供者唯一标识符
   */
  getId(): string {
    return this.provider.id;
  }

  /**
   * 带超时的Promise包装
   * @param promise 原始Promise
   * @param timeout 超时时间(ms)
   */
  protected async withTimeout<T>(
    promise: Promise<T>,
    timeout = this.TIMEOUT
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), timeout);
    });
    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * 带重试的Promise包装
   * @param operation 异步操作函数
   * @param retries 重试次数
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    retries = this.MAX_RETRIES
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        const delay = Math.min(1000 * (this.MAX_RETRIES - retries + 1), 3000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.withRetry(operation, retries - 1);
      }
      throw error;
    }
  }

  /**
   * 检查服务是否可用的抽象方法
   * 需要由具体提供者实现
   */
  abstract isAvailable(): Promise<boolean>;
}
