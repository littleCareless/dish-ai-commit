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
import { AbstractAIProvider } from "./abstract-ai-provider";
import { generateWithRetry } from "../utils/generate-helper";

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
export abstract class BaseOpenAIProvider extends AbstractAIProvider {
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
    super();
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
   * 实现抽象方法：执行AI请求
   * 调用OpenAI API执行请求并返回结果
   */
  protected async executeAIRequest(
    systemPrompt: string,
    userPrompt: string,
    userContent: string,
    params: AIRequestParams,
    options?: {
      parseAsJSON?: boolean;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<{ content: string; usage?: any; jsonContent?: any }> {
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
      { role: "user", content: userPrompt },
    ];

    const completion = await this.openai.chat.completions.create({
      model:
        (params.model && params.model.id) ||
        this.config.defaultModel ||
        "gpt-3.5-turbo",
      messages,
      temperature: options?.temperature,
    });

    const content = completion.choices[0]?.message?.content || "";
    const usage = {
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens: completion.usage?.total_tokens,
    };

    let jsonContent;
    if (options?.parseAsJSON) {
      try {
        jsonContent = JSON.parse(content);
      } catch (e) {
        console.warn("Failed to parse response as JSON", e);
      }
    }

    return { content, usage, jsonContent };
  }

  /**
   * 获取默认模型
   */
  protected getDefaultModel(): AIModel {
    // 使用类型断言将模型ID转换为AIModel.id允许的类型
    const modelId = this.config.defaultModel || "gpt-3.5-turbo";
    return {
      id: modelId as any, // 使用类型断言解决类型不兼容问题
      name: modelId,
      maxTokens: { input: 4096, output: 2048 },
      provider: {
        id: this.provider.id as AIProviders,
        name: this.provider.name,
      },
    };
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
        id: model.id as any, // 使用类型断言解决类型不兼容问题
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
