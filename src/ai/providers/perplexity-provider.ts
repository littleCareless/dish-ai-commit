import { ConfigurationManager } from "../../config/configuration-manager";
import { AIModel, AIRequestParams, type AIProviders } from "../types";
import { AbstractAIProvider } from "./abstract-ai-provider";

// Perplexity AI API 客户端 (需要安装相应的 npm 包)
// import { Perplexity } from "perplexity-ai";

import type { OpenAIProviderConfig } from "./base-openai-provider";
import {
  getPRSummarySystemPrompt,
  getPRSummaryUserPrompt,
} from "../../prompt/pr-summary";
import { getSystemPrompt } from "../utils/generate-helper"; // Import getSystemPrompt

/**
 * Perplexity AI支持的AI模型配置列表
 * 定义了不同版本的Perplexity AI模型及其特性
 */
const perplexityModels: AIModel[] = [
  {
    id: "pplx-7b-online",
    name: "Perplexity 7B Online",
    maxTokens: { input: 8000, output: 1024 },
    provider: { id: "perplexity", name: "Perplexity AI" },
    default: true,
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
  {
    id: "pplx-8b-online",
    name: "Perplexity 8B Online",
    maxTokens: { input: 8000, output: 1024 },
    provider: { id: "perplexity", name: "Perplexity AI" },
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
];

/**
 * Perplexity AI服务提供者实现类
 * 继承自AbstractAIProvider，提供对Perplexity AI API的访问能力
 */
export class PerplexityAIProvider extends AbstractAIProvider {
  private perplexityClient: any | undefined; // 将 Perplexity 替换为 any，直到安装了 npm 包
  /** 提供者标识信息 */
  readonly provider = {
    id: "perplexity" as AIProviders,
    name: "Perplexity AI",
  } as const;
  /** 提供者配置信息 */
  protected config: OpenAIProviderConfig;

  /**
   * 创建Perplexity AI提供者实例
   * 从配置管理器获取API密钥，初始化Perplexity AI
   */
  constructor() {
    super();
    const configManager = ConfigurationManager.getInstance();
    this.config = {
      apiKey: configManager.getConfig("PROVIDERS_PERPLEXITY_APIKEY"),
      baseURL: "https://api.perplexity.ai/",
      providerId: "perplexity",
      providerName: "Perplexity AI",
      models: perplexityModels,
      defaultModel: "pplx-7b-online",
    };

    if (this.config.apiKey) {
      // this.perplexityClient = new Perplexity(this.config.apiKey); // 需要安装 npm 包
      this.perplexityClient = {
        chat: {
          completions: {
            create: async (options: any) => {
              console.warn("Perplexity client not fully initialized. Returning mock response.");
              return { choices: [{ message: { content: "Mock Perplexity response" } }] };
            },
          },
        },
      };
    }
  }

  /**
   * 执行AI请求
   * 使用Perplexity AI API发送请求并获取回复
   */
  protected async executeAIRequest(
    params: AIRequestParams,
    options?: {
      parseAsJSON?: boolean;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<{ content: string; usage?: any; jsonContent?: any }> {
    if (!this.perplexityClient) {
      throw new Error(
        "Perplexity AI client not initialized. Please check your API key and install the perplexity-ai npm package."
      );
    }

    // 获取模型ID
    const modelId = (params.model?.id || this.config.defaultModel) as string;
    const { systemInstruction, contents } = (await this.buildProviderMessages(
      params
    )) as {
      systemInstruction?: string;
      contents: any[];
    };

    console.log(
      "Final messages for AI:",
      JSON.stringify({ systemInstruction, contents }, null, 2)
    );

    try {
      // 使用Perplexity AI API发送请求
      const result = await this.perplexityClient.chat.completions.create({
        model: modelId,
        messages: contents,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens,
      });

      const response = result.choices[0].message.content;

      // 由于Perplexity AI API目前不返回token使用情况，我们无法提供精确的usage数据
      const usage = {
        promptTokens: undefined,
        completionTokens: undefined,
        totalTokens: undefined,
      };

      return { content: response ?? "", usage };
    } catch (error) {
      console.error("Perplexity AI API request failed:", error);
      throw error;
    }
  }

  /**
   * 执行AI流式请求
   * 使用Perplexity AI API发送流式请求并逐步返回结果
   */
  protected async executeAIStreamRequest(
    params: AIRequestParams,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<AsyncIterable<string>> {
    // TODO: 实现 Perplexity AI 的流式请求
    throw new Error("Perplexity AI streaming is not yet implemented.");
  }

  /**
   * 获取默认模型
   */
  protected getDefaultModel(): AIModel {
    const defaultModel =
      this.config.models.find((m) => m.default) || this.config.models[0];
    return defaultModel;
  }

  /**
   * 获取当前支持的AI模型列表
   */
  /**
   * 获取当前支持的AI模型列表
   * 优先从API获取，如果失败则返回配置的静态列表
   *
   * @returns Promise<AIModel[]> 支持的模型配置数组
   */
  async getModels(): Promise<AIModel[]> {
    // TODO: 从 Perplexity AI API 获取模型列表
    return Promise.resolve(this.config.models);
  }
  /**
   * 检查Perplexity AI服务是否可用
   * @returns 如果API密钥已配置返回true
   */
  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }

  /**
   * 刷新可用的Perplexity AI模型列表
   * @returns 返回预定义的模型ID列表
   */
  async refreshModels(): Promise<string[]> {
    return Promise.resolve(this.config.models.map((m) => m.id));
  }

  /**
   * 获取提供者显示名称
   */
  getName(): string {
    return "Perplexity AI";
  }

  /**
   * 获取提供者唯一标识符
   */
  getId(): string {
    return "perplexity";
  }

  /**
   * 生成PR摘要 (占位符实现)
   * @param params AI请求参数
   * @param commitMessages 提交信息列表
   * @returns AI响应
   */
  async generatePRSummary(
    params: AIRequestParams,
    commitMessages: string[]
  ): Promise<import("../types").AIResponse> {
    console.warn(
      "generatePRSummary is not fully implemented for PerplexityAIProvider and will return an empty response."
    );
    const systemPrompt =
      params.systemPrompt || getPRSummarySystemPrompt(params.language);
    const userPrompt = getPRSummaryUserPrompt(params.language);
    const userContent = commitMessages.join("\n- ");

    // Perplexity AI的executeAIRequest会将userPrompt和userContent合并
    // 所以这里我们将commit列表作为userContent，userPrompt作为引导
    const response = await this.executeAIRequest(
      {
        ...params,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
          { role: "user", content: `- ${userContent}` },
        ],
      },
      {
        temperature: 0.7,
      }
    );

    return { content: response.content, usage: response.usage };
  }
  /**
   * 构建特定于提供商的消息数组。
   * Perplexity AI API 使用 messages 数组。
   * @param params - AI请求参数
   * @returns 包含 messages 的对象
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

    const messages: any[] = [];

    for (const message of params.messages) {
      messages.push({ role: message.role, content: message.content });
    }

    return { messages };
  }
}