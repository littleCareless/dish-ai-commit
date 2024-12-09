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
import { generateCommitMessageSystemPrompt } from "../../prompt/prompt";
import { DEFAULT_CONFIG } from "../../config/default";
import { LocalizationManager } from "../../utils/LocalizationManager";

export class OllamaProvider implements AIProvider {
  private ollama: Ollama;
  private readonly provider = {
    id: "ollama" as AIProviders,
    name: "Ollama",
  } as const;

  constructor() {
    const baseUrl = this.getBaseUrl();
    this.ollama = new Ollama({
      host: baseUrl,
    });
  }

  private getBaseUrl(): string {
    const configManager = ConfigurationManager.getInstance();
    return (
      configManager.getConfig<string>("OLLAMA_BASE_URL") ||
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
    let retries = 0;
    const maxRetries = 2;
    let maxInputLength = 4096; // Ollama默认context window

    while (true) {
      try {
        const truncatedPrompt = params.diff.substring(0, maxInputLength);
        const model =
          params.model ||
          ConfigurationManager.getInstance().getConfig<string>("MODEL");

        const response = await this.ollama.chat({
          model: model.id,
          messages: [
            {
              role: "system",
              content:
                params.systemPrompt ||
                generateCommitMessageSystemPrompt(
                  params.language || DEFAULT_CONFIG.language,
                  params.allowMergeCommits || false,
                  params.splitChangesInSingleFile || false,
                  params.scm || "git"
                ),
            },
            {
              role: "user",
              content: truncatedPrompt,
            },
          ],
          stream: false,
        });

        // 如果原始prompt被截断，发出警告
        if (params.diff.length > maxInputLength) {
          NotificationHandler.warn(
            LocalizationManager.getInstance().getMessage(
              "ollama.input.truncated"
            )
          );
        }

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
      } catch (error: any) {
        if (
          retries < maxRetries &&
          error.message?.includes("context length exceeded")
        ) {
          retries++;
          maxInputLength = Math.floor(maxInputLength * 0.8); // 减少20%的输入长度
          continue;
        }

        const errorMessage = LocalizationManager.getInstance().format(
          "ollama.generation.failed",
          error
        );
        NotificationHandler.error(errorMessage);
        throw new Error(errorMessage);
      }
    }
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
