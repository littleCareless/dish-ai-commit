import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources";
import { AIProvider, AIRequestParams, AIResponse, AIModel } from "../types";
import { generateWithRetry, getSystemPrompt } from "../utils/generateHelper";
import { LocalizationManager } from "../../utils/LocalizationManager";
import { getWeeklyReportPrompt } from "../../prompt/weeklyReport";

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
        LocalizationManager.getInstance().format(
          "weeklyReport.generation.failed",
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  async getModels(): Promise<AIModel[] | any[]> {
    try {
      const response = await this.openai.models.list();
      return response.data.map((model: any) => {
        console.log("model", model);
        return {
          id: model.id,
          name: model.id,
          maxTokens: {
            input: model.context_window || 4096,
            output: Math.floor((model.context_window || 4096) / 2),
          },
          provider: this.provider,
        };
      });
    } catch (error) {
      console.warn("Failed to fetch models:", error);
      return this.config.models;
    }
  }

  async refreshModels(): Promise<string[]> {
    const models = await this.getModels();
    return models.map((m) => m.id);
  }

  getName(): string {
    return this.provider.name;
  }

  getId(): string {
    return this.provider.id;
  }

  abstract isAvailable(): Promise<boolean>;
}
