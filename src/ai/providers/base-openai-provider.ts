import { AbstractAIProvider } from "@/ai/providers/abstract-ai-provider";
import { AIModel, AIRequestParams } from "@/ai/types";
import { getSystemPrompt } from "@/ai/utils/generate-helper";
import { Logger } from "@/utils/logger";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources";

/**
 * OpenAI提供者配置项接口
 */
export interface OpenAIProviderConfig {
  /** OpenAI API密钥 */
  apiKey?: string;
  /** API基础URL，对于非官方OpenAI端点可自定义 */
  baseUrl?: string;
  /** API版本号 */
  apiVersion?: string;
  /** 组织ID */
  organization?: string;
  /** 提供者唯一标识符 */
  providerId: string;
  /** 提供者显示名称 */
  providerName: string;
  /** 默认使用的模型ID */
  defaultModel?: string;
  /** 支持的模型列表 */
  models: AIModel[];
  /** 请求超时时间 (毫秒) */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 允许其他自定义配置项 */
  [key: string]: any;
}

/**
 * OpenAI API基础提供者抽象类
 * 实现了OpenAI API的基本功能，可被具体提供者继承和扩展
 */
export abstract class BaseOpenAIProvider extends AbstractAIProvider {
  /** 超时时间(ms) */
  private readonly TIMEOUT = 120000; // 120秒
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
    const apiKey = this.config.apiKey ?? "local-dummy-key";
    const logger = Logger.getInstance("Svn Commit-Gen AI");
    const config: any = {
      apiKey: apiKey,
      logLevel: "debug",
      timeout: this.config.timeout ?? this.TIMEOUT,
      maxRetries: this.config.maxRetries ?? this.MAX_RETRIES,
      logger: {
        error: (msg: string) => logger.error(msg),
        warn: (msg: string) => logger.warn(msg),
        info: (msg: string) => logger.info(msg),
        debug: (msg: string) => logger.debug(msg),
      },
    };

    if (this.config.baseUrl) {
      config.baseURL = this.config.baseUrl;
      config.defaultHeaders = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
      };
    }

    const loggableConfig = { ...config };
    // if (loggableConfig.apiKey) {
    //   loggableConfig.apiKey = "REDACTED";
    // }
    // if (loggableConfig.defaultHeaders?.["api-key"]) {
    //   // To avoid modifying the original config object, create a new defaultHeaders object
    //   loggableConfig.defaultHeaders = {
    //     ...loggableConfig.defaultHeaders,
    //     "api-key": "REDACTED",
    //   };
    // }

    console.log(
      `[BaseOpenAIProvider] Creating OpenAI client with config:`,
      JSON.stringify(loggableConfig, null, 2)
    );
    console.log("config", config);

    return new OpenAI(config);
  }

  /**
   * 为特定模型创建OpenAI API客户端
   * @param model - AI模型
   * @returns OpenAI客户端实例
   * @protected
   */
  protected createClientForModel(model?: AIModel): OpenAI {
    const apiKey = this.config.apiKey ?? "local-dummy-key";
    const config: any = {
      apiKey: apiKey,
      timeout: this.config.timeout ?? this.TIMEOUT,
      maxRetries: this.config.maxRetries ?? this.MAX_RETRIES,
    };

    const baseUrl = model?.baseUrl || this.config.baseUrl;
    if (baseUrl) {
      config.baseURL = baseUrl;
      config.defaultHeaders = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
      };
    }
    console.log("config", config);
    return new OpenAI(config);
  }

  /**
   * 实现抽象方法：执行AI请求
   * 调用OpenAI API执行请求并返回结果
   */
  protected async executeAIRequest(
    params: AIRequestParams,
    options?: {
      parseAsJSON?: boolean;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<{ content: string; usage?: any; jsonContent?: any }> {
    const messages = (await this.buildProviderMessages(
      params
    )) as ChatCompletionMessageParam[];

    console.log(
      `[BaseOpenAIProvider] executeAIRequest called at ${new Date().toISOString()} `
    );
    console.log("Final messages for AI:", JSON.stringify(messages, null, 2));

    const client = this.createClientForModel(params.model);
    const completion = await client.chat.completions.create({
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
   * 执行AI流式请求
   * 调用OpenAI API执行流式请求并逐步返回结果
   */
  protected async executeAIStreamRequest(
    params: AIRequestParams,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<AsyncIterable<string>> {
    const messages = (await this.buildProviderMessages(
      params
    )) as ChatCompletionMessageParam[];

    const filteredMessages = messages.filter((msg) => {
      if (typeof msg.content === "string") {
        return msg.content?.trim() !== "";
      } else if (Array.isArray(msg.content)) {
        // 过滤掉 content 为空数组或者数组里全是空字符串
        const nonEmptyParts = msg.content.filter((part) => {
          if (part.type === "text" && part.text?.trim() !== "") {
            return true;
          }
          // 这里如果有别的类型，也可以加判断
          return false;
        });
        return nonEmptyParts.length > 0;
      }
      return false;
    });

    const processStream = async function* (
      this: BaseOpenAIProvider
    ): AsyncIterable<string> {
      try {
        console.log(
          "Final messages for AI:",
          JSON.stringify(filteredMessages, null, 2)
        );
        const client = this.createClientForModel(params.model);
        const stream = await client.chat.completions.create({
          model:
            (params.model && params.model.id) ||
            this.config.defaultModel ||
            "gpt-3.5-turbo",
          messages: filteredMessages,
          temperature: options?.temperature,
          max_tokens: options?.maxTokens,
          stream: true,
        });
        let completionContent = "";
        for await (const chunk of stream) {
          if (chunk.choices[0]?.delta?.content) {
            const content = chunk.choices[0].delta.content;
            completionContent += content;
            yield content;
          }
        }
      } catch (error) {
        this.handleApiError(error);
      }
    };

    return Promise.resolve(processStream.call(this));
  }

  /**
   * 获取默认模型
   */
  protected getDefaultModel(): AIModel {
    // 使用类型断言将模型ID转换为AIModel.id允许的类型
    const modelId = this.config.defaultModel || "gpt-3.5-turbo";
    return {
      id: modelId,
      name: modelId,
      maxTokens: { input: 4096, output: 2048 },
      provider: {
        id: this.provider.id,
        name: this.provider.name,
      },
    } as AIModel;
  }

  /**
   * 获取当前支持的AI模型列表
   * 优先从API获取，如果失败则返回配置的静态列表
   *
   * @returns Promise<AIModel[]> 支持的模型配置数组
   */
  async getModels(): Promise<AIModel[]> {
    // 如果没有提供API密钥，立即返回静态模型列表，避免不必要的API调用
    if (!this.config.apiKey) {
      console.warn(
        `[BaseOpenAIProvider] No API key for ${this.config.providerName}, returning static model list.`
      );
      return this.config.models as AIModel[];
    }

    try {
      const response = await this._fetchModelsFromApi();
      const models = response.data;

      if (!models || models.length === 0) {
        console.warn(
          `API for ${this.config.providerName} returned no models, falling back to static list.`
        );
        return this.config.models as AIModel[];
      }

      return models.map(
        (model: any) =>
          ({
            id: model.id,
            name: model.id,
            maxTokens: {
              input: model.context_window || 4096,
              output: Math.floor((model.context_window || 4096) / 2),
            },
            provider: {
              id: this.provider.id,
              name: this.provider.name,
            },
          }) as AIModel
      );
    } catch (error) {
      // _fetchModelsFromApi 已经记录了详细错误, 这里只记录回退行为
      console.warn(
        `[BaseOpenAIProvider] Falling back to static model list for ${this.config.providerName} due to API error.`
      );
      return this.config.models as AIModel[];
    }
  }

  /**
   * 刷新并返回可用的模型ID列表
   * @returns Promise<string[]> 模型ID数组
   */
  async refreshModels(): Promise<string[]> {
    try {
      const response = await this._fetchModelsFromApi();
      return response.data.map((model) => model.id);
    } catch (error) {
      // _fetchModelsFromApi 已经记录了详细错误, 这里只返回空数组
      console.warn(
        `[BaseOpenAIProvider] Falling back to static model list for ${this.config.providerName} due to API error.`
      );
      return [];
    }
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
    retries = this.MAX_RETRIES,
    operationName = "unnamed operation"
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        const delay = Math.min(1000 * (this.MAX_RETRIES - retries + 1), 3000);
        console.warn(
          `[BaseOpenAIProvider] Attempt for ${operationName} failed. Retrying in ${delay}ms... (${retries - 1
          } retries left). Error:`,
          error
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.withRetry(operation, retries - 1, operationName);
      }
      console.error(
        `[BaseOpenAIProvider] All retries for ${operationName} failed.`
      );
      throw error;
    }
  }

  /**
   * 构建OpenAI特定的消息数组。
   * @param params AI请求参数
   * @returns 转换后的ChatCompletionMessageParam数组
   */
  protected async buildProviderMessages(params: AIRequestParams): Promise<any> {
    if (!params.messages || params.messages.length === 0) {
      const systemPrompt = await getSystemPrompt(params);
      const userPrompt = params.additionalContext || "";
      const userContent = params.diff;

      params.messages = [{ role: "system", content: systemPrompt }];
      if (userContent) {
        params.messages.push({ role: "user", content: userContent });
      }
      if (userPrompt) {
        params.messages.push({ role: "user", content: userPrompt });
      }
    }

    // 类型断言，因为OpenAI的类型与通用类型兼容
    return params.messages as ChatCompletionMessageParam[];
  }
  /**
   * 检查服务是否可用的抽象方法
   * 需要由具体提供者实现
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * 处理API错误
   * @param error - 捕获到的错误对象
   */
  protected handleApiError(error: any): void {
    if (error.code === "context_length_exceeded") {
      this.handleContextLengthError(error, "unknown");
    } else {
      console.error(`[BaseOpenAIProvider] API Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * 处理上下文长度错误
   * @param error - 捕获到的错误对象
   * @param modelId - 当前使用的模型ID
   */
  protected handleContextLengthError(error: any, modelId: string): void {
    console.error(
      `[BaseOpenAIProvider] Context length exceeded for model ${modelId}: ${error.message}`
    );
    throw new Error(
      `Context length exceeded for model ${modelId}. Please reduce the input size.`
    );
  }

  /**
   * 受保护的辅助方法：从API获取模型列表，包含重试和超时逻辑
   * 子类可以直接调用此方法来获取模型列表
   * @returns Promise<OpenAI.Models.ModelsPage>
   * @protected
   */
  protected async _fetchModelsFromApi(): Promise<OpenAI.Models.ModelsPage> {
    try {
      console.log(
        `[BaseOpenAIProvider] Attempting to fetch models from API for provider: ${this.config.providerName}`
      );
      const response = await this.openai.models.list();
      console.log(
        `[BaseOpenAIProvider] Successfully fetched models from API for provider: ${this.config.providerName}`
      );
      return response;
    } catch (error) {
      console.dir(error);
      console.error(
        `[BaseOpenAIProvider] Failed to fetch models for provider: ${this.config.providerName}. Full error:`,
        error
      );
      // 向上抛出错误，由调用方（getModels/refreshModels）决定如何处理
      throw error;
    }
  }

  /**
   * 私有辅助方法：从API获取模型列表，包含重试和超时逻辑
   * @returns Promise<OpenAI.Models.ModelsPage>
   * @private
   */
  private async _fetchModelsFromApi2(): Promise<OpenAI.Models.ModelsPage> {
    try {
      console.log(
        `[BaseOpenAIProvider] Attempting to fetch models from API for provider: ${this.config.providerName}`
      );
      const response = await this.withTimeout(
        this.withRetry(
          async () => {
            console.log(
              `[BaseOpenAIProvider] Calling openai.models.list() at ${new Date().toISOString()}`
            );
            const result = await this.openai.models.list();
            console.log(
              `[BaseOpenAIProvider] openai.models.list() returned successfully at ${new Date().toISOString()}`
            );
            return result;
          },
          this.MAX_RETRIES,
          `fetchModels for ${this.config.providerName}`
        )
      );
      console.log(
        `[BaseOpenAIProvider] Successfully fetched models from API for provider: ${this.config.providerName}`
      );
      return response;
    } catch (error) {
      console.dir(error);
      console.error(
        `[BaseOpenAIProvider] Failed to fetch models for provider: ${this.config.providerName}. Full error:`,
        error
      );
      // 向上抛出错误，由调用方（getModels/refreshModels）决定如何处理
      throw error;
    }
  }
}
