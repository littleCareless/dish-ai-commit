import { Ollama } from "ollama";
import {
  AIProvider,
  AIRequestParams,
  AIResponse,
  type AIModel,
  type AIProviders,
} from "../types";
import { ConfigurationManager } from "../../config/ConfigurationManager";
import { generateWithRetry, getSystemPrompt } from "../utils/generateHelper";
import { getWeeklyReportPrompt } from "../../prompt/weeklyReport";
import { LocalizationManager } from "../../utils/LocalizationManager";
import { NotificationHandler } from "../../utils/NotificationHandler";

/**
 * Ollama AI服务提供者实现类
 * 提供对本地部署的Ollama服务的访问能力
 */
export class OllamaProvider implements AIProvider {
  /** Ollama客户端实例 */
  private ollama: Ollama;

  /** 提供者标识信息 */
  private readonly provider = {
    id: "ollama" as AIProviders,
    name: "Ollama",
  } as const;

  /** 配置管理器实例 */
  private configManager: ConfigurationManager;

  /**
   * 创建Ollama提供者实例
   * 初始化Ollama客户端并配置基础URL
   */
  constructor() {
    this.configManager = ConfigurationManager.getInstance();
    const baseUrl = this.getBaseUrl();
    this.ollama = new Ollama({
      host: baseUrl,
    });
  }

  /**
   * 获取Ollama服务的基础URL
   * @returns 配置的URL或默认的localhost URL
   * @private
   */
  private getBaseUrl(): string {
    return (
      this.configManager.getConfig("PROVIDERS_OLLAMA_BASEURL") ||
      "http://localhost:11434"
    );
  }

  /**
   * 刷新可用的Ollama模型列表
   * @returns 返回模型名称的数组
   * @throws 如果获取失败则返回空数组并显示错误通知
   */
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

  /**
   * 生成AI响应
   * @param params - AI请求参数
   * @returns 包含生成内容和使用统计的响应
   * @throws 如果生成失败会通过重试机制处理
   */
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
        initialMaxLength: 16385,
        provider: this.getId(),
      }
    );
  }

  /**
   * 生成周报内容
   * @param commits - 提交记录数组
   * @param model - 可选的指定模型
   * @returns 生成的周报内容和统计信息
   */
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

  /**
   * 检查Ollama服务是否可用
   * @returns 如果能成功获取模型列表则返回true
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.ollama.list();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取支持的AI模型列表
   * @returns 返回支持的模型配置数组
   * @throws 如果获取失败则显示错误通知
   */
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

  /**
   * 获取提供者显示名称
   */
  getName(): string {
    return this.provider.name;
  }

  /**
   * 获取提供者ID
   */
  getId(): string {
    return this.provider.id;
  }

  /**
   * 资源释放
   */
  dispose() {}
}
