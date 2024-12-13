import { Ollama } from "ollama";
import {
  AIProvider,
  AIRequestParams,
  AIResponse,
  type AIModel,
  type AIProviders,
} from "../types";
import { ConfigurationManager } from "../../config/ConfigurationManager";
import { NotificationHandler } from "../../utils/NotificationHandler";
import { LocalizationManager } from "../../utils/LocalizationManager";
import { generateWithRetry, getSystemPrompt } from "../utils/generateHelper";
import { getWeeklyReportPrompt } from "../../prompt/weeklyReport";

export class OllamaProvider implements AIProvider {
  private ollama: Ollama;
  private readonly provider = {
    id: "ollama" as AIProviders,
    name: "Ollama",
  } as const;
  private configManager: ConfigurationManager;

  constructor() {
    this.configManager = ConfigurationManager.getInstance();
    const baseUrl = this.getBaseUrl();
    this.ollama = new Ollama({
      host: baseUrl,
    });
  }

  private getBaseUrl(): string {
    return (
      this.configManager.getConfig("PROVIDERS_OLLAMA_BASEURL") ||
      "http://localhost:11434"
    );
  }

  async refreshModels(): Promise<string[]> {
    try {
      const response = await this.ollama.list();
      NotificationHandler.info(
        LocalizationManager.getInstance().getMessage("ollama.models.updated")
      );
      return response.models.map((model) => model.name);
    } catch (error) {
      console.error("Failed to fetch Ollama models:", error);
      NotificationHandler.error(
        LocalizationManager.getInstance().getMessage(
          "ollama.models.fetch.failed"
        )
      );
      return [];
    }
  }

  async generateResponse(params: AIRequestParams): Promise<AIResponse> {
    return generateWithRetry(
      params,
      async (truncatedDiff) => {
        const model =
          params.model || this.configManager.getConfig("BASE_MODEL");

        const response = await this.ollama.chat({
          model: model.id,
          messages: [
            {
              role: "system",
              content: getSystemPrompt(params),
            },
            {
              role: "user",
              content: truncatedDiff,
            },
          ],
          stream: false,
        });

        let content = "";
        try {
          const jsonContent = JSON.parse(response.message.content);
          content = jsonContent.response || response.message.content;
        } catch {
          content = response.message.content;
        }

        return {
          content,
          usage: {
            totalTokens: response.total_duration,
          },
        };
      },
      {
        initialMaxLength: 4096,
        provider: this.getId(),
      }
    );
  }

  async generateWeeklyReport(
    commits: string[],
    model?: AIModel
  ): Promise<AIResponse> {
    const modelId =
      model?.id || (this.configManager.getConfig("BASE_MODEL") as any).id;

    const response = await this.ollama.chat({
      model: modelId,
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
      stream: false,
    });

    let content = "";
    try {
      const jsonContent = JSON.parse(response.message.content);
      content = jsonContent.response || response.message.content;
    } catch {
      content = response.message.content;
    }

    return {
      content,
      usage: {
        totalTokens: response.total_duration,
      },
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.ollama.list();
      return true;
    } catch {
      return false;
    }
  }

  async getModels(): Promise<AIModel[]> {
    try {
      const response = await this.ollama.list();
      return Promise.resolve(
        response.models.map((model) => ({
          id: model.name as `${string}:${string}`,
          name: model.name,
          maxTokens: {
            input: 4096, // Ollama默认值
            output: 4096, // Ollama默认值
          },
          provider: this.provider,
        }))
      );
    } catch (error) {
      console.error("Failed to fetch Ollama models:", error);
      NotificationHandler.error(
        LocalizationManager.getInstance().getMessage(
          "ollama.models.fetch.failed"
        )
      );
      return Promise.reject(error);
    }
  }

  getName(): string {
    return this.provider.name;
  }

  getId(): string {
    return this.provider.id;
  }
  dispose() {}
}
