import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources";
import { ConfigurationManager } from "../../config/ConfigurationManager";
import { AIProvider, AIRequestParams, AIResponse } from "../types";
import { NotificationHandler } from "../../utils/NotificationHandler";
import { generateCommitMessageSystemPrompt } from "../../prompt/prompt";
import { DEFAULT_CONFIG } from "../../config/default";

const provider = { id: "openai", name: "OpenAI" } as const;
const models = [
  {
    id: "o1-preview",
    name: "o1 preview",
    maxTokens: { input: 128000, output: 32768 },
    provider: provider,
  },
  {
    id: "o1-preview-2024-09-12",
    name: "o1 preview",
    maxTokens: { input: 128000, output: 32768 },
    provider: provider,
    hidden: true,
  },
  {
    id: "o1-mini",
    name: "o1 mini",
    maxTokens: { input: 128000, output: 65536 },
    provider: provider,
  },
  {
    id: "o1-mini-2024-09-12",
    name: "o1 mini",
    maxTokens: { input: 128000, output: 65536 },
    provider: provider,
    hidden: true,
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    maxTokens: { input: 128000, output: 16384 },
    provider: provider,
    default: true,
  },
  {
    id: "gpt-4o-2024-08-06",
    name: "GPT-4o",
    maxTokens: { input: 128000, output: 16384 },
    provider: provider,
    hidden: true,
  },
  {
    id: "gpt-4o-2024-05-13",
    name: "GPT-4o",
    maxTokens: { input: 128000, output: 4096 },
    provider: provider,
    hidden: true,
  },
  {
    id: "chatgpt-4o-latest",
    name: "GPT-4o",
    maxTokens: { input: 128000, output: 16384 },
    provider: provider,
    hidden: true,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o mini",
    maxTokens: { input: 128000, output: 16384 },
    provider: provider,
  },
  {
    id: "gpt-4o-mini-2024-07-18",
    name: "GPT-4o mini",
    maxTokens: { input: 128000, output: 16384 },
    provider: provider,
    hidden: true,
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    maxTokens: { input: 128000, output: 4096 },
    provider: provider,
  },
  {
    id: "gpt-4-turbo-2024-04-09",
    name: "GPT-4 Turbo preview (2024-04-09)",
    maxTokens: { input: 128000, output: 4096 },
    provider: provider,
    hidden: true,
  },
  {
    id: "gpt-4-turbo-preview",
    name: "GPT-4 Turbo preview",
    maxTokens: { input: 128000, output: 4096 },
    provider: provider,
  },
  {
    id: "gpt-4-0125-preview",
    name: "GPT-4 0125 preview",
    maxTokens: { input: 128000, output: 4096 },
    provider: provider,
    hidden: true,
  },
  {
    id: "gpt-4-1106-preview",
    name: "GPT-4 1106 preview",
    maxTokens: { input: 128000, output: 4096 },
    provider: provider,
    hidden: true,
  },
  {
    id: "gpt-4",
    name: "GPT-4",
    maxTokens: { input: 8192, output: 4096 },
    provider: provider,
  },
  {
    id: "gpt-4-0613",
    name: "GPT-4 0613",
    maxTokens: { input: 8192, output: 4096 },
    provider: provider,
    hidden: true,
  },
  {
    id: "gpt-4-32k",
    name: "GPT-4 32k",
    maxTokens: { input: 32768, output: 4096 },
    provider: provider,
    hidden: true,
  },
  {
    id: "gpt-4-32k-0613",
    name: "GPT-4 32k 0613",
    maxTokens: { input: 32768, output: 4096 },
    provider: provider,
    hidden: true,
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    maxTokens: { input: 16385, output: 4096 },
    provider: provider,
  },
  {
    id: "gpt-3.5-turbo-0125",
    name: "GPT-3.5 Turbo 0125",
    maxTokens: { input: 16385, output: 4096 },
    provider: provider,
    hidden: true,
  },
  {
    id: "gpt-3.5-turbo-1106",
    name: "GPT-3.5 Turbo 1106",
    maxTokens: { input: 16385, output: 4096 },
    provider: provider,
    hidden: true,
  },
  {
    id: "gpt-3.5-turbo-16k",
    name: "GPT-3.5 Turbo 16k",
    maxTokens: { input: 16385, output: 4096 },
    provider: provider,
    hidden: true,
  },
];

export class OpenAIProvider implements AIProvider {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI(this.getOpenAIConfig());
  }

  private getOpenAIConfig() {
    const configManager = ConfigurationManager.getInstance();
    const apiKey = configManager.getConfig<string>("OPENAI_API_KEY", false);
    const baseURL = configManager.getConfig<string>("OPENAI_BASE_URL", false);
    const apiVersion = configManager.getConfig<string>("MODEL", false);

    const config: {
      apiKey: string;
      baseURL?: string;
      defaultQuery?: { "api-version": string };
      defaultHeaders?: { "api-key": string };
    } = {
      apiKey,
    };

    if (baseURL) {
      config.baseURL = baseURL;
      if (apiVersion) {
        config.defaultQuery = { "api-version": apiVersion };
        config.defaultHeaders = { "api-key": apiKey };
      }
    }

    return config;
  }

  public reinitialize(): void {
    this.openai = new OpenAI(this.getOpenAIConfig());
  }

  async generateResponse(params: AIRequestParams): Promise<AIResponse> {
    const { language } = params;
    console.log(
      "params.language || DEFAULT_CONFIG.language",
      params.language || DEFAULT_CONFIG.language
    );
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          params.systemPrompt ||
          generateCommitMessageSystemPrompt(
            params.language || DEFAULT_CONFIG.language
          ),
      },
      {
        role: "user",
        content: params.prompt,
      },
    ];
    console.log("message", messages);
    const completion = await this.openai.chat.completions.create({
      model: params.model || "gpt-3.5-turbo",
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
  }

  async isAvailable(): Promise<boolean> {
    try {
      const config = this.getOpenAIConfig();
      return !!config.apiKey;
    } catch {
      return false;
    }
  }

  /**
   * 刷新可用的OpenAI模型列表
   */
  async refreshModels(): Promise<string[]> {
    try {
      const models = await this.openai.models.list();
      NotificationHandler.info("OpenAI模型列表已更新");
      return models.data.map((model) => model.id);
    } catch (error) {
      console.error("Failed to fetch OpenAI models:", error);
      NotificationHandler.error("获取OpenAI模型列表失败");
      return [];
    }
  }

  async getModels(): Promise<string[]> {
    try {
      return models.map((model) => model.id);
    } catch (error) {
      console.error("Failed to fetch OpenAI models:", error);
      NotificationHandler.error("获取OpenAI模型列表失败");
      return [];
    }
  }

  getName(): string {
    return provider.name;
  }

  getId(): string {
    return provider.id;
  }
}
