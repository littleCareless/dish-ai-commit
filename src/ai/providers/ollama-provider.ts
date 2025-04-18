import { Ollama } from "ollama";
import {
  AIProvider,
  AIRequestParams,
  AIResponse,
  type AIModel,
  type AIProviders,
  type LayeredCommitMessage,
} from "../types";
import { AbstractAIProvider } from "./abstract-ai-provider";
import { ConfigurationManager } from "../../config/configuration-manager";
import { notify } from "../../utils/notification/notification-manager";

/**
 * Ollama AI服务提供者实现类
 * 提供对本地部署的Ollama服务的访问能力
 */
export class OllamaProvider extends AbstractAIProvider {
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
    super();
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
      notify.info("ollama.models.updated");
      return response.models.map((model) => model.name);
    } catch (error) {
      console.error("Failed to fetch Ollama models:", error);
      notify.error("ollama.models.fetch.failed");
      return [];
    }
  }

  /**
   * 实现抽象方法：执行AI请求
   * 调用Ollama API执行请求并返回结果
   */
  protected async executeAIRequest(
    systemPrompt: string,
    userPrompt: string,
    userContent: string,
    params: AIRequestParams,
    options?: {
      parseAsJSON?: boolean;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<{ content: string; usage?: any; jsonContent?: any }> {
    const model = params.model || this.getDefaultModel();

    const response = await this.ollama.chat({
      model: model.id,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
        { role: "user", content: userPrompt },
      ],
      stream: false,
      // 如果Ollama支持temperature参数
      options: {
        temperature: options?.temperature,
      },
      // temperature: options?.temperature,
    });

    let content = "";
    try {
      const jsonContent = JSON.parse(response.message.content);
      content = jsonContent.response || response.message.content;
    } catch {
      content = response.message.content;
    }

    let parsedJsonContent;
    if (options?.parseAsJSON) {
      try {
        parsedJsonContent = JSON.parse(content);
      } catch (e) {
        // 尝试查找JSON部分
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedJsonContent = JSON.parse(jsonMatch[0]);
          }
        } catch (nestedError) {
          console.warn("Failed to parse response as JSON", nestedError);
        }
      }
    }

    return {
      content,
      usage: { totalTokens: response.total_duration },
      jsonContent: parsedJsonContent,
    };
  }

  /**
   * 获取默认模型
   */
  protected getDefaultModel(): AIModel {
    const defaultModelConfig = this.configManager.getConfig(
      "BASE_MODEL"
    ) as any;
    return {
      id: defaultModelConfig?.id || "llama2:latest",
      name: defaultModelConfig?.name || "Default Ollama Model",
      maxTokens: { input: 4096, output: 4096 },
      provider: this.provider,
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
      notify.error("ollama.models.fetch.failed");
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
