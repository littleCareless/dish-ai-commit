import { Mistral } from "@mistralai/mistralai";
import * as components from "@mistralai/mistralai/models/components";
import { ConfigurationManager } from "../../config/configuration-manager";
import { AIModel, AIRequestParams, type AIProviders } from "../types";
import { AbstractAIProvider } from "./abstract-ai-provider";
import type { OpenAIProviderConfig } from "./base-openai-provider";
import {
  getPRSummarySystemPrompt,
  getPRSummaryUserPrompt,
} from "../../prompt/pr-summary";
import { getSystemPrompt } from "../utils/generate-helper";

/**
 * MistralAI支持的AI模型配置列表
 */
const mistralModels: AIModel[] = [
  {
    id: "mistral-large-latest",
    name: "Mistral Large - Top-tier reasoning and knowledge",
    maxTokens: { input: 32768, output: 4096 },
    provider: { id: "mistral", name: "Mistral AI" },
    default: true,
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "mistral-small-latest",
    name: "Mistral Small - Fast and cost-effective",
    maxTokens: { input: 32768, output: 4096 },
    provider: { id: "mistral", name: "Mistral AI" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "open-mistral-7b",
    name: "Open Mistral 7B - Open-source model",
    maxTokens: { input: 8192, output: 2048 },
    provider: { id: "mistral", name: "Mistral AI" },
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
  {
    id: "open-mixtral-8x7b",
    name: "Open Mixtral 8x7B - Sparse Mixture-of-Experts model",
    maxTokens: { input: 32768, output: 4096 },
    provider: { id: "mistral", name: "Mistral AI" },
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
];

/**
 * Mistral AI服务提供者实现类
 */
export class MistralAIProvider extends AbstractAIProvider {
  private client: Mistral | undefined;
  readonly provider = {
    id: "mistral" as AIProviders,
    name: "Mistral AI",
  } as const;
  protected config: OpenAIProviderConfig;

  constructor() {
    super();
    const configManager = ConfigurationManager.getInstance();
    this.config = {
      apiKey: configManager.getConfig("PROVIDERS_MISTRAL_APIKEY"),
      baseURL: "https://api.mistral.ai/v1/",
      providerId: "mistral",
      providerName: "Mistral AI",
      models: mistralModels,
      defaultModel: "mistral-large-latest",
    };

    if (this.config.apiKey) {
      this.client = new Mistral({ apiKey: this.config.apiKey });
    }
  }

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
        "Mistral API client not initialized. Please check your API key."
      );
    }
    const client = this.client;

    const modelId = (params.model?.id || this.config.defaultModel) as string;
    const messages = await this.buildProviderMessages(params);

    try {
      const response = await client.chat.complete({
        model: modelId,
        messages: messages,
        temperature: options?.temperature || 0.7,
        maxTokens: options?.maxTokens,
      });

      const content = response.choices[0].message.content;
      const usage = response.usage;

      return { content: String(content ?? ""), usage };
    } catch (error) {
      console.error("Mistral API request failed:", error);
      throw error;
    }
  }

  protected async executeAIStreamRequest(
    params: AIRequestParams,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<AsyncIterable<string>> {
    if (!this.client) {
      throw new Error(
        "Mistral API client not initialized. Please check your API key."
      );
    }
    const client = this.client;

    const modelId = (params.model?.id || this.config.defaultModel) as string;
    const messages = await this.buildProviderMessages(params);

    const processStream = async function* (
      this: MistralAIProvider
    ): AsyncIterable<string> {
      try {
        const stream = await client.chat.stream({
          model: modelId,
          messages: messages,
          temperature: options?.temperature || 0.7,
          maxTokens: options?.maxTokens,
        });

        for await (const chunk of stream as AsyncIterable<components.CompletionChunk>) {
          if (chunk.choices[0]?.delta?.content) {
            yield String(chunk.choices[0].delta.content);
          }
        }
      } catch (error) {
        console.error("Mistral API stream request failed:", error);
        throw error;
      }
    };

    return Promise.resolve(processStream.call(this));
  }

  protected getDefaultModel(): AIModel {
    const defaultModel =
      this.config.models.find((m) => m.default) || this.config.models[0];
    return defaultModel;
  }

  async getModels(): Promise<AIModel[]> {
    if (!this.client) {
      return this.config.models;
    }
    try {
      const response = await this.client.models.list();
      const models: AIModel[] = (response.data || []).map((model: any) => ({
        id: model.id,
        name: model.id,
        maxTokens: { input: 32768, output: 4096 }, // Default values, Mistral API doesn't provide this
        provider: { id: "mistral", name: "Mistral AI" },
        capabilities: {
          streaming: true,
          functionCalling: true, // Assume true for most models
        },
      }));
      return models;
    } catch (error) {
      console.warn(
        "Failed to fetch models from Mistral API, returning static list:",
        error
      );
      return this.config.models;
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }

  async refreshModels(): Promise<string[]> {
    return Promise.resolve(this.config.models.map((m) => m.id));
  }

  getName(): string {
    return "Mistral AI";
  }

  getId(): string {
    return "mistral";
  }

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

  protected async buildProviderMessages(
    params: AIRequestParams
  ): Promise<any[]> {
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

    return params.messages
      .map((msg) => ({ role: msg.role, content: msg.content }))
      .filter((msg) => msg.content);
  }
}
