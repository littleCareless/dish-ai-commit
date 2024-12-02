import { Ollama } from "ollama";
import { AIProvider, AIRequestParams, AIResponse } from "../types";
import { ConfigurationManager } from "../../config/ConfigurationManager";
import { NotificationHandler } from "../../utils/NotificationHandler";
import { generateCommitMessageSystemPrompt } from "../../prompt/prompt";
import { DEFAULT_CONFIG } from "../../config/default";

export class OllamaProvider implements AIProvider {
  private ollama: Ollama;
  private readonly provider = { id: "ollama", name: "Ollama" } as const;

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
      NotificationHandler.info("Ollama模型列表已更新");
      return response.models.map((model) => model.name);
    } catch (error) {
      console.error("Failed to fetch Ollama models:", error);
      NotificationHandler.error("获取Ollama模型列表失败");
      return [];
    }
  }

  async generateResponse(params: AIRequestParams): Promise<AIResponse> {
    try {
      const { language } = params;
      const model =
        params.model ||
        ConfigurationManager.getInstance().getConfig<string>("OLLAMA_MODEL");

      const response = await this.ollama.chat({
        model,
        messages: [
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
        ],
        stream: false,
      });

      // 处理JSON字符串响应
      let content = "";
      try {
        const jsonContent = JSON.parse(response.message.content);
        content = jsonContent.response || response.message.content;
      } catch {
        // 如果解析JSON失败，使用原始内容
        content = response.message.content;
      }

      return {
        content,
        usage: {
          totalTokens: response.total_duration,
        },
      };
    } catch (error) {
      NotificationHandler.error("Ollama API调用失败");
      throw new Error(`Ollama API request failed: ${error}`);
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

  async getModels(): Promise<string[]> {
    try {
      const response = await this.ollama.list();
      return response.models.map((model) => model.name);
    } catch (error) {
      console.error("Failed to fetch Ollama models:", error);
      NotificationHandler.error("获取Ollama模型列表失败");
      return [];
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
