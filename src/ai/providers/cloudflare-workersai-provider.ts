import { ConfigurationManager } from "../../config/configuration-manager";
import { AIModel, AIRequestParams, type AIProviders } from "../types";
import { AbstractAIProvider } from "./abstract-ai-provider";
import { getSystemPrompt } from "../utils/generate-helper";
import {
  getPRSummarySystemPrompt,
  getPRSummaryUserPrompt,
} from "../../prompt/pr-summary";

/**
 * Cloudflare Workers AI supported models
 * Note: maxTokens are estimates based on model families, as Cloudflare does not provide official numbers.
 */
const cloudflareModels: AIModel[] = [
  {
    id: "@cf/meta/llama-3-8b-instruct",
    name: "Llama 3 8B Instruct",
    maxTokens: { input: 8192, output: 8192 },
    provider: { id: "cloudflare", name: "Cloudflare AI" },
    default: true,
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
  {
    id: "@cf/meta/llama-2-7b-chat-fp16",
    name: "Llama 2 7B Chat (fp16)",
    maxTokens: { input: 4096, output: 4096 },
    provider: { id: "cloudflare", name: "Cloudflare AI" },
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
  {
    id: "@cf/mistral/mistral-7b-instruct-v0.1",
    name: "Mistral 7B Instruct v0.1",
    maxTokens: { input: 8000, output: 8000 },
    provider: { id: "cloudflare", name: "Cloudflare AI" },
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
  {
    id: "@cf/google/gemma-7b-it",
    name: "Gemma 7B IT",
    maxTokens: { input: 8192, output: 8192 },
    provider: { id: "cloudflare", name: "Cloudflare AI" },
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
];

export interface CloudflareProviderConfig {
  apiKey: string;
  accountId: string;
  providerId: "cloudflare";
  providerName: "Cloudflare AI";
  models: AIModel[];
  defaultModel: string;
}

/**
 * Cloudflare Workers AI Provider implementation.
 * Connects to the Cloudflare AI REST API.
 */
export class CloudflareWorkersAIProvider extends AbstractAIProvider {
  readonly provider = {
    id: "cloudflare" as AIProviders,
    name: "Cloudflare AI",
  } as const;

  protected config: CloudflareProviderConfig;
  private accountId: string;
  private apiKey: string;

  constructor() {
    super();
    const configManager = ConfigurationManager.getInstance();
    this.apiKey = configManager.getConfig("PROVIDERS_CLOUDFLARE_APIKEY");
    this.accountId = configManager.getConfig("PROVIDERS_CLOUDFLARE_ACCOUNTID");

    this.config = {
      apiKey: this.apiKey,
      accountId: this.accountId,
      providerId: "cloudflare",
      providerName: "Cloudflare AI",
      models: cloudflareModels,
      defaultModel: "@cf/meta/llama-3-8b-instruct",
    };
  }

  protected async executeAIRequest(
    params: AIRequestParams,
    options?: {
      parseAsJSON?: boolean;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<{ content: string; usage?: any; jsonContent?: any }> {
    if (!this.apiKey || !this.accountId) {
      throw new Error(
        "Cloudflare API key or Account ID not configured. Please check your settings."
      );
    }

    const modelId = params.model?.id || this.config.defaultModel;
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${modelId}`;

    const messages = await this.buildProviderMessages(params);

    const body = {
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudflare API request failed:", errorText);
      throw new Error(
        `Cloudflare API request failed: ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    const content = result.result?.response || "";

    // Cloudflare does not provide token usage in the response
    const usage = {
      promptTokens: undefined,
      completionTokens: undefined,
      totalTokens: undefined,
    };

    return { content, usage };
  }

  protected async executeAIStreamRequest(
    params: AIRequestParams,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<AsyncIterable<string>> {
    if (!this.apiKey || !this.accountId) {
      throw new Error(
        "Cloudflare API key or Account ID not configured. Please check your settings."
      );
    }

    const modelId = params.model?.id || this.config.defaultModel;
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${modelId}`;

    const messages = await this.buildProviderMessages(params);

    const body = {
      messages,
      stream: true,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      console.error("Cloudflare API stream request failed:", errorText);
      throw new Error(
        `Cloudflare API stream request failed: ${response.statusText} - ${errorText}`
      );
    }

    const stream = response.body;
    const decoder = new TextDecoder();

    const processStream = async function* (): AsyncIterable<string> {
      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk?.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.substring(6);
              if (data?.trim() === "[DONE]") {
                return;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.response) {
                  yield parsed.response;
                }
              } catch (e) {
                // Incomplete JSON objects are common in streams, ignore parsing errors.
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    };

    return Promise.resolve(processStream());
  }

  protected async buildProviderMessages(
    params: AIRequestParams
  ): Promise<{ role: string; content: string }[]> {
    if (!params.messages || params.messages.length === 0) {
      const systemPrompt = await getSystemPrompt(params);
      const userPrompt = params.additionalContext || "";
      const userContent = params.diff;

      const messages = [];
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
      let combinedUserContent = "";
      if (userContent) {
        combinedUserContent += userContent;
      }
      if (userPrompt) {
        combinedUserContent += "\n\n" + userPrompt;
      }

      if (combinedUserContent) {
        messages.push({ role: "user", content: combinedUserContent });
      }
      return messages;
    }

    return params.messages
      .map((m) => ({ role: m.role, content: m.content }))
      .filter((m) => m.content);
  }

  async getModels(): Promise<AIModel[]> {
    // Cloudflare does not have a dynamic model listing API.
    // We return the static list from the configuration.
    return Promise.resolve(this.config.models);
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey && !!this.accountId;
  }

  getName(): string {
    return "Cloudflare AI";
  }

  getId(): string {
    return "cloudflare";
  }

  protected getDefaultModel(): AIModel {
    const defaultModel =
      this.config.models.find((m) => m.default) || this.config.models[0];
    return defaultModel;
  }

  async refreshModels(): Promise<string[]> {
    return Promise.resolve(this.config.models.map((m) => m.id));
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
}
