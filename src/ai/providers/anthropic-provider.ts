import { ConfigurationManager } from "../../config/configuration-manager";
import { AIModel, AIRequestParams, type AIProviders } from "../types";
import { AbstractAIProvider } from "./abstract-ai-provider";
import Anthropic from "@anthropic-ai/sdk";
import type { OpenAIProviderConfig } from "./base-openai-provider";
import {
  getPRSummarySystemPrompt,
  getPRSummaryUserPrompt,
} from "../../prompt/pr-summary";
import { getSystemPrompt } from "../utils/generate-helper"; // Import getSystemPrompt

/**
 * Anthropic支持的AI模型配置列表
 */
const anthropicModels: AIModel[] = [
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    maxTokens: { input: 200000, output: 4096 },
    provider: { id: "anthropic", name: "Anthropic" },
    default: true,
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
  {
    id: "claude-3-sonnet-20240229",
    name: "Claude 3 Sonnet",
    maxTokens: { input: 200000, output: 4096 },
    provider: { id: "anthropic", name: "Anthropic" },
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
  {
    id: "claude-3-haiku-20240229",
    name: "Claude 3 Haiku",
    maxTokens: { input: 200000, output: 4096 },
    provider: { id: "anthropic", name: "Anthropic" },
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
];

/**
 * Anthropic AI服务提供者实现类
 * 继承自AbstractAIProvider，提供对Anthropic API的访问能力
 */
export class AnthropicAIProvider extends AbstractAIProvider {
  private anthropic: Anthropic | undefined;
  /** 提供者标识信息 */
  readonly provider = {
    id: "anthropic" as AIProviders,
    name: "Anthropic",
  } as const;
  /** 提供者配置信息 */
  protected config: OpenAIProviderConfig;

  /**
   * 创建Anthropic AI提供者实例
   * 从配置管理器获取API密钥，初始化Anthropic
   */
  constructor() {
    super();
    const configManager = ConfigurationManager.getInstance();
    this.config = {
      apiKey: configManager.getConfig("PROVIDERS_ANTHROPIC_APIKEY"),
      baseURL: "https://api.anthropic.com/",
      providerId: "anthropic",
      providerName: "Anthropic",
      models: anthropicModels,
      defaultModel: "claude-3-opus-20240229",
    };

    if (this.config.apiKey) {
      this.anthropic = new Anthropic({
        apiKey: this.config.apiKey,
      });
    }
  }

  /**
   * 执行AI请求
   * 使用Anthropic库发送请求并获取回复
   */
  protected async executeAIRequest(
    params: AIRequestParams,
    options?: {
      parseAsJSON?: boolean;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<{ content: string; usage?: any; jsonContent?: any }> {
    if (!this.anthropic) {
      throw new Error(
        "Anthropic API client not initialized. Please check your API key."
      );
    }

    // 获取模型ID
    const modelId = (params.model?.id || this.config.defaultModel) as string;
    const { systemInstruction, contents } = (await this.buildProviderMessages(
      params
    )) as {
      systemInstruction?: string;
      contents: Anthropic.Messages.MessageParam[];
    };

    console.log(
      "Final messages for AI:",
      JSON.stringify({ systemInstruction, contents }, null, 2)
    );

    try {
      const messages = contents.map((content) => ({
        role: content.role,
        content: content.content,
      }));

      const response = await this.anthropic.messages.create({
        model: modelId,
        messages: messages,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature || 0.7,
        system: systemInstruction,
      });

      // 由于Anthropic API目前不返回token使用情况，我们无法提供精确的usage数据
      const usage = {
        promptTokens: undefined,
        completionTokens: undefined,
        totalTokens: undefined,
      };

      const content =
        response.content[0]?.type === "text" ? response.content[0].text : "";
      return { content, usage };
    } catch (error) {
      console.error("Anthropic API request failed:", error);
      throw error;
    }
  }

  /**
   * 执行AI流式请求
   * 使用Anthropic库发送流式请求并逐步返回结果
   */
  protected async executeAIStreamRequest(
    params: AIRequestParams,
    options?: {
      temperature?: number;
      maxTokens?: number; // 注意: Anthropic API 可能对 maxTokens 的处理方式不同或在流式中不支持
    }
  ): Promise<AsyncIterable<string>> {
    if (!this.anthropic) {
      throw new Error(
        "Anthropic API client not initialized. Please check your API key."
      );
    }

    const modelId = (params.model?.id || this.config.defaultModel) as string;
    const { systemInstruction, contents } = (await this.buildProviderMessages(
      params
    )) as {
      systemInstruction?: string;
      contents: Anthropic.Messages.MessageParam[];
    };

    const processStream = async function* (
      this: AnthropicAIProvider
    ): AsyncIterable<string> {
      try {
        console.log(
          "Final messages for AI:",
          JSON.stringify({ systemInstruction, contents }, null, 2)
        );

        const messages = contents.map((content) => ({
          role: content.role,
          content: content.content,
        }));

        const stream = await this.anthropic!.messages.create({
          model: modelId,
          messages: messages,
          max_tokens: options?.maxTokens || 4096,
          temperature: options?.temperature || 0.7,
          stream: true,
          system: systemInstruction,
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            yield event.delta.text;
          }
        }
      } catch (error) {
        console.error("Anthropic API stream request failed:", error);
        throw error;
      }
    };

    return Promise.resolve(processStream.call(this));
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
    try {
      // Anthropic API does not provide a direct way to list models,
      // so we return the configured static list.
      return Promise.resolve(this.config.models);
    } catch (error) {
      // 如果通过 API 获取失败，则返回配置的静态列表
      console.warn("获取模型列表失败：", this.config.providerName, error);
      return this.config.models;
    }
  }
  /**
   * 检查Anthropic服务是否可用
   * @returns 如果API密钥已配置返回true
   */
  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }

  /**
   * 刷新可用的Anthropic模型列表
   * @returns 返回预定义的模型ID列表
   */
  async refreshModels(): Promise<string[]> {
    return Promise.resolve(this.config.models.map((m) => m.id));
  }

  /**
   * 获取提供者显示名称
   */
  getName(): string {
    return "Anthropic";
  }

  /**
   * 获取提供者唯一标识符
   */
  getId(): string {
    return "anthropic";
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
      "generatePRSummary is not fully implemented for AnthropicAIProvider and will return an empty response."
    );
    const systemPrompt =
      params.systemPrompt || getPRSummarySystemPrompt(params.language);
    const userPrompt = getPRSummaryUserPrompt(params.language);
    const userContent = commitMessages.join("\n- ");

    // Anthropic的executeAIRequest会将userPrompt和userContent合并
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
   * Anthropic API 使用 systemInstruction 和 contents 数组。
   * @param params - AI请求参数
   * @returns 包含 systemInstruction 和 contents 的对象
   */
  protected async buildProviderMessages(
    params: AIRequestParams
  ): Promise<any> {
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

    let systemInstruction: string | undefined;
    const contents: { role: "user" | "assistant" | "tool"; content: string }[] =
      [];

    for (const message of params.messages) {
      if (message.role === "system") {
        systemInstruction = message.content;
      } else {
        contents.push({ role: message.role, content: message.content });
      }
    }

    return { systemInstruction, contents };
  }
}