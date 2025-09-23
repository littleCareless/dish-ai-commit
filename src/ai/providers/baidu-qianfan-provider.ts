import { ConfigurationManager } from "../../config/configuration-manager";
import {
  AIModel,
  AIRequestParams,
  type AIProviders,
  AIMessage,
} from "../types";
import { AbstractAIProvider } from "./abstract-ai-provider";
import Qianfan from "@baiducloud/qianfan";
import type { OpenAIProviderConfig } from "./base-openai-provider";
import {
  getPRSummarySystemPrompt,
  getPRSummaryUserPrompt,
} from "../../prompt/pr-summary";
import { getSystemPrompt } from "../utils/generate-helper";

/**
 * Baidu Qianfan 支持的AI模型配置列表
 * 定义了不同版本的ERNIE模型及其特性
 */
const qianfanModels: AIModel[] = [
  {
    id: "ERNIE-4.0-8K",
    name: "ERNIE 4.0 - 百度最新、最强大的基础模型",
    maxTokens: { input: 7168, output: 2048 },
    provider: { id: "baidu-qianfan", name: "Baidu Qianfan" },
    default: true,
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "ERNIE-3.5-8K",
    name: "ERNIE 3.5 - 功能强大、速度快、性能均衡",
    maxTokens: { input: 7168, output: 2048 },
    provider: { id: "baidu-qianfan", name: "Baidu Qianfan" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "ERNIE-Speed-8K",
    name: "ERNIE Speed - 百度自研的高效语言模型",
    maxTokens: { input: 7168, output: 1024 },
    provider: { id: "baidu-qianfan", name: "Baidu Qianfan" },
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
];

/**
 * Baidu Qianfan AI服务提供者实现类
 * 继承自AbstractAIProvider，提供对Qianfan API的访问能力
 */
export class BaiduQianfanProvider extends AbstractAIProvider {
  private client: any | undefined;
  /** 提供者标识信息 */
  readonly provider = {
    id: "baidu-qianfan" as AIProviders,
    name: "Baidu Qianfan",
  } as const;
  /** 提供者配置信息 */
  protected config: OpenAIProviderConfig & { secretKey?: string };

  /**
   * 创建Baidu Qianfan AI提供者实例
   * 从配置管理器获取API密钥和Secret Key，初始化Qianfan
   */
  constructor() {
    super();
    const configManager = ConfigurationManager.getInstance();
    this.config = {
      apiKey: configManager.getConfig("PROVIDERS_BAIDUQIANFAN_APIKEY"),
      secretKey: configManager.getConfig("PROVIDERS_BAIDUQIANFAN_SECRETKEY"),
      baseURL: "https://aip.baidubce.com",
      providerId: "baidu-qianfan",
      providerName: "Baidu Qianfan",
      models: qianfanModels,
      defaultModel: "ERNIE-4.0-8K",
    };

    if (this.config.apiKey && this.config.secretKey) {
      const Qianfan = require("@baiducloud/qianfan");
      this.client = new Qianfan.Qianfan(
        this.config.apiKey,
        this.config.secretKey
      );
    }
  }

  /**
   * 执行AI请求
   * 使用Qianfan SDK发送请求并获取回复
   */
  protected async executeAIRequest(
    params: AIRequestParams,
    options?: {
      parseAsJSON?: boolean;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<{ content: string; usage?: any; jsonContent?: any }> {
    if (!this.client) {
      throw new Error(
        "Baidu Qianfan client not initialized. Please check your API key and Secret key."
      );
    }

    const modelId = (params.model?.id || this.config.defaultModel) as string;
    const { messages, system } = await this.buildProviderMessages(params);

    console.log(
      "Final messages for AI:",
      JSON.stringify({ system, messages }, null, 2)
    );

    try {
      const response = await this.client.chat(
        {
          model: modelId,
          messages,
          system,
          temperature: options?.temperature || 0.7,
          max_output_tokens: options?.maxTokens,
        },
        // The SDK might have a different way to specify the model endpoint.
        // For now, we assume the model ID is sufficient.
        // Some models might need a specific endpoint path.
        // e.g. 'completions_pro' for ERNIE-4.0
        modelId.startsWith("ERNIE-4.0") ? "completions_pro" : undefined
      );

      const content = response.result || "";
      const usage = {
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
      };

      return { content, usage };
    } catch (error) {
      console.error("Baidu Qianfan API request failed:", error);
      throw error;
    }
  }

  /**
   * 执行AI流式请求
   * 使用Qianfan SDK发送流式请求并逐步返回结果
   */
  protected async executeAIStreamRequest(
    params: AIRequestParams,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<AsyncIterable<string>> {
    if (!this.client) {
      throw new Error(
        "Baidu Qianfan client not initialized. Please check your API key and Secret key."
      );
    }

    const modelId = (params.model?.id || this.config.defaultModel) as string;
    const { messages, system } = await this.buildProviderMessages(params);

    const processStream = async function* (
      this: BaiduQianfanProvider
    ): AsyncIterable<string> {
      try {
        console.log(
          "Final messages for AI:",
          JSON.stringify({ system, messages }, null, 2)
        );
        const stream = await this.client!.chat(
          {
            model: modelId,
            messages,
            system,
            temperature: options?.temperature || 0.7,
            max_output_tokens: options?.maxTokens,
            stream: true,
          },
          modelId.startsWith("ERNIE-4.0") ? "completions_pro" : undefined
        );

        for await (const chunk of stream) {
          if (chunk.result) {
            yield chunk.result;
          }
        }
      } catch (error) {
        console.error("Baidu Qianfan API stream request failed:", error);
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
  async getModels(): Promise<AIModel[]> {
    // Qianfan SDK does not provide a model list API, return static list.
    return Promise.resolve(this.config.models);
  }

  /**
   * 检查Qianfan服务是否可用
   * @returns 如果API密钥和Secret Key已配置返回true
   */
  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey && !!this.config.secretKey;
  }

  /**
   * 刷新可用的Qianfan模型列表
   * @returns 返回预定义的模型ID列表
   */
  async refreshModels(): Promise<string[]> {
    return Promise.resolve(this.config.models.map((m) => m.id));
  }

  /**
   * 获取提供者显示名称
   */
  getName(): string {
    return "Baidu Qianfan";
  }

  /**
   * 获取提供者唯一标识符
   */
  getId(): string {
    return "baidu-qianfan";
  }

  /**
   * 生成PR摘要
   */
  async generatePRSummary(
    params: AIRequestParams,
    commitMessages: string[]
  ): Promise<import("../types").AIResponse> {
    const systemPrompt =
      params.systemPrompt || getPRSummarySystemPrompt(params.language);
    const userPrompt = getPRSummaryUserPrompt(params.language);
    const userContent = commitMessages.join("\n- ");

    const response = await this.executeAIRequest(
      {
        ...params,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${userPrompt}\n- ${userContent}` },
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
   * Qianfan API 使用 system 和 messages 数组。
   * @param params - AI请求参数
   * @returns 包含 messages 和 system 的对象
   */
  protected async buildProviderMessages(params: AIRequestParams): Promise<{
    messages: AIMessage[];
    system?: string;
  }> {
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

    let system: string | undefined;
    const messages: AIMessage[] = [];

    for (const message of params.messages) {
      if (message.role === "system") {
        system = message.content;
      } else if (message.role === "user" || message.role === "assistant") {
        messages.push(message);
      }
    }

    // Ensure the last message is from the user
    if (messages.length > 0 && messages[messages.length - 1].role !== "user") {
      messages.push({ role: "user", content: "Please continue." });
    }

    // Qianfan requires at least one message.
    if (messages.length === 0) {
      messages.push({ role: "user", content: "Hello." });
    }

    return { messages, system };
  }
}
