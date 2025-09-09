import { ConfigurationManager } from "../../config/configuration-manager";
import { AIModel, AIRequestParams, type AIProviders } from "../types";
import { AbstractAIProvider } from "./abstract-ai-provider";
import OpenAI, { AzureOpenAI } from "openai";
import { ChatCompletionMessageParam } from "openai/resources";
import type { OpenAIProviderConfig } from "./base-openai-provider";
import {
  getPRSummarySystemPrompt,
  getPRSummaryUserPrompt,
} from "../../prompt/pr-summary";
import { getSystemPrompt } from "../utils/generate-helper";
import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from "@azure/identity";

/**
 * Azure OpenAI支持的AI模型配置列表
 */
const azureOpenAIModels: AIModel[] = [
  {
    id: "gpt-3.5-turbo",
    name: "GPT 3.5 Turbo",
    maxTokens: { input: 4096, output: 2048 },
    provider: { id: "azure-openai", name: "Azure OpenAI" },
    default: true,
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "gpt-4",
    name: "GPT-4",
    maxTokens: { input: 8192, output: 4096 },
    provider: { id: "azure-openai", name: "Azure OpenAI" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
];

/**
 * Azure OpenAI 服务提供者实现类
 * 继承自AbstractAIProvider，提供对Azure OpenAI API的访问能力
 */
export class AzureOpenAIProvider extends AbstractAIProvider {
  private openai: AzureOpenAI | undefined;
  /** 提供者标识信息 */
  readonly provider = {
    id: "azure-openai" as AIProviders,
    name: "Azure OpenAI",
  } as const;
  /** 提供者配置信息 */
  protected config: OpenAIProviderConfig;

  /**
   * 创建Azure OpenAI 提供者实例
   * 从配置管理器获取API密钥，初始化OpenAI
   */
  constructor() {
    super();
    const configManager = ConfigurationManager.getInstance();
    this.config = {
      apiKey: configManager.getConfig("PROVIDERS_AZUREOPENAI_APIKEY"),
      baseURL: configManager.getConfig("PROVIDERS_AZUREOPENAI_ENDPOINT"),
      providerId: "azure-openai",
      providerName: "Azure OpenAI",
      models: azureOpenAIModels,
      defaultModel: "gpt-3.5-turbo",
      apiVersion: configManager.getConfig("PROVIDERS_AZUREOPENAI_APIVERSION"),
      organization: configManager.getConfig("PROVIDERS_AZUREOPENAI_ORGID"),
    };

    if (this.config.baseURL && this.config.apiVersion) {
      if (this.config.apiKey) {
        this.openai = new AzureOpenAI({
          apiKey: this.config.apiKey,
          endpoint: this.config.baseURL,
          apiVersion: this.config.apiVersion,
          organization: this.config.organization,
        });
      } else {
        const credential = new DefaultAzureCredential();
        const scope = "https://cognitiveservices.azure.com/.default";
        const azureADTokenProvider = getBearerTokenProvider(credential, scope);
        this.openai = new AzureOpenAI({
          endpoint: this.config.baseURL,
          apiVersion: this.config.apiVersion,
          azureADTokenProvider,
          organization: this.config.organization,
        });
      }
    }
  }

  /**
   * 执行AI请求
   * 使用OpenAI库发送请求并获取回复
   */
  protected async executeAIRequest(
    params: AIRequestParams,
    options?: {
      parseAsJSON?: boolean;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<{ content: string; usage?: any; jsonContent?: any }> {
    if (!this.openai) {
      throw new Error(
        "Azure OpenAI API client not initialized. Please check your API key, endpoint, and API version."
      );
    }

    const modelId = (params.model?.id || this.config.defaultModel) as string;
    const messages = await this.buildProviderMessages(params);

    try {
      const completion = await this.openai!.chat.completions.create({
        model: modelId,
        messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens,
      });

      const response = completion.choices[0].message.content;
      const usage = completion.usage;

      let jsonContent;
      if (options?.parseAsJSON && response) {
        try {
          jsonContent = JSON.parse(response);
        } catch (e) {
          console.warn("Failed to parse response as JSON", e);
        }
      }

      return { content: response ?? "", usage, jsonContent };
    } catch (error) {
      console.error("Azure OpenAI API request failed:", error);
      throw error;
    }
  }

  /**
   * 执行AI流式请求
   * 使用OpenAI库发送流式请求并逐步返回结果
   */
  protected async executeAIStreamRequest(
    params: AIRequestParams,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<AsyncIterable<string>> {
    if (!this.openai) {
      throw new Error(
        "Azure OpenAI API client not initialized. Please check your API key, endpoint, and API version."
      );
    }

    const modelId = (params.model?.id || this.config.defaultModel) as string;
    const messages = await this.buildProviderMessages(params);

    const processStream = async function* (
      this: AzureOpenAIProvider
    ): AsyncIterable<string> {
      try {
        const stream = await this.openai!.chat.completions.create({
          model: modelId,
          messages,
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens,
          stream: true,
        });

        for await (const chunk of stream) {
          const textResponse = chunk.choices[0]?.delta?.content;
          if (textResponse) {
            yield textResponse;
          }
        }
      } catch (error) {
        console.error("Azure OpenAI API stream request failed:", error);
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
    return Promise.resolve(this.config.models);
  }
  /**
   * 检查Azure OpenAI服务是否可用
   * @returns 如果API密钥已配置返回true
   */
  async isAvailable(): Promise<boolean> {
    return !!(this.config.apiKey && this.config.baseURL && this.config.apiVersion);
  }

  /**
   * 刷新可用的Azure OpenAI模型列表
   * @returns 返回预定义的模型ID列表
   */
  async refreshModels(): Promise<string[]> {
    return Promise.resolve(this.config.models.map((m) => m.id));
  }

  /**
   * 获取提供者显示名称
   */
  getName(): string {
    return "Azure OpenAI";
  }

  /**
   * 获取提供者唯一标识符
   */
  getId(): string {
    return "azure-openai";
  }

  /**
   * 生成PR摘要
   * @param params AI请求参数
   * @param commitMessages 提交信息列表
   * @returns AI响应
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

  protected async buildProviderMessages(
    params: AIRequestParams
  ): Promise<ChatCompletionMessageParam[]> {
    const validRoles: ChatCompletionMessageParam["role"][] = [
      "system",
      "user",
      "assistant",
      "function",
    ];

    if (params.messages && params.messages.length > 0) {
      return params.messages
        .filter((m) =>
          validRoles.includes(m.role as ChatCompletionMessageParam["role"])
        )
        .map(
          (m) =>
            ({
              role: m.role,
              content: m.content,
            } as ChatCompletionMessageParam)
        );
    }

    const messages: ChatCompletionMessageParam[] = [];
    const systemPrompt = await getSystemPrompt(params);
    messages.push({ role: "system", content: systemPrompt });

    let userContent = "";
    if (params.additionalContext) {
      userContent += params.additionalContext;
    }
    if (params.diff) {
      userContent += "\n" + params.diff;
    }
    if (userContent.trim()) {
      messages.push({ role: "user", content: userContent });
    }

    return messages;
  }
}