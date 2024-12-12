import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources";
import { AIProvider, AIRequestParams, AIResponse, AIModel } from "../types";
import { generateWithRetry, getSystemPrompt } from "../utils/generateHelper";
import { LocalizationManager } from "../../utils/LocalizationManager";

export interface OpenAIProviderConfig {
  apiKey: string;
  baseURL?: string;
  apiVersion?: string;
  providerId: string;
  providerName: string;
  defaultModel?: string;
  models: AIModel[];
}

export abstract class BaseOpenAIProvider implements AIProvider {
  protected openai: OpenAI;
  protected config: OpenAIProviderConfig;
  protected provider: { id: string; name: string };

  constructor(config: OpenAIProviderConfig) {
    this.config = config;
    this.provider = {
      id: config.providerId,
      name: config.providerName,
    };
    this.openai = this.createClient();
  }

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
    console.log("config", config);

    return new OpenAI(config);
  }

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

  async generateWeeklyReport(commits: string[]): Promise<AIResponse> {
    try {
      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: "请根据以下commit生成一份周报：",
        },
        {
          role: "user",
          content: commits.join("\n"),
        },
      ];

      const completion = await this.openai.chat.completions.create({
        model: this.config.defaultModel || "gpt-3.5-turbo",
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
    } catch (error) {
      throw new Error(
        LocalizationManager.getInstance().format(
          "weeklyReport.generation.failed",
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  async getModels(): Promise<AIModel[]> {
    return Promise.resolve(this.config.models);
  }

  getName(): string {
    return this.provider.name;
  }

  getId(): string {
    return this.provider.id;
  }

  abstract isAvailable(): Promise<boolean>;
  abstract refreshModels(): Promise<string[]>;
}
