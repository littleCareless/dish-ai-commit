import { Ollama } from "ollama";
import {
  AIRequestParams,
  AIResponse,
  type AIModel,
  type AIProviders,
  AIMessage,
} from "../types";
import { AbstractAIProvider } from "./abstract-ai-provider";
import { AIProvider } from "../../config/types";
import { ConfigurationManager } from "../../config/configuration-manager";
import { notify } from "../../utils/notification/notification-manager";
import {
  getPRSummarySystemPrompt,
  getPRSummaryUserPrompt,
} from "../../prompt/pr-summary";
import { getSystemPrompt } from "../utils/generate-helper"; // Import getSystemPrompt

/**
 * Ollama AI服务提供者实现类
 * 提供对本地部署的Ollama服务的访问能力
 */
export class OllamaProvider extends AbstractAIProvider {
  /** Ollama客户端实例 */
  private ollama: Ollama;

  /** 提供者标识信息 */
  private readonly provider = {
    id: AIProvider.OLLAMA as AIProviders,
    name: "Ollama",
  } as const;

  private static readonly embeddingModels: AIModel[] = [
    {
      id: "nomic-embed-text",
      name: "nomic-embed-text",
      maxTokens: { input: 8192, output: 0 },
      provider: { id: AIProvider.OLLAMA as AIProviders, name: "Ollama" },
      dimension: 768,
    },
    {
      id: "nomic-embed-code",
      name: "nomic-embed-code",
      maxTokens: { input: 8192, output: 0 },
      provider: { id: AIProvider.OLLAMA as AIProviders, name: "Ollama" },
      dimension: 768,
    },
    {
      id: "mxbai-embed-large",
      name: "mxbai-embed-large",
      maxTokens: { input: 8192, output: 0 },
      provider: { id: AIProvider.OLLAMA as AIProviders, name: "Ollama" },
      dimension: 1024,
    },
    {
      id: "all-minilm",
      name: "all-minilm",
      maxTokens: { input: 8192, output: 0 },
      provider: { id: AIProvider.OLLAMA as AIProviders, name: "Ollama" },
      dimension: 384,
    },
  ];

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
      notify.info("provider.models.updated", ["Ollama"]);
      return response.models.map((model) => model.name);
    } catch (error) {
      console.error("Failed to fetch Ollama models:", error);
      notify.error("provider.models.fetch.failed", ["Ollama"]);
      return [];
    }
  }

  /**
   * 实现抽象方法：执行AI请求
   * 调用Ollama API执行请求并返回结果
   */
  protected async executeAIRequest(
    params: AIRequestParams,
    options?: {
      parseAsJSON?: boolean;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<{ content: string; usage?: any; jsonContent?: any }> {
    const model = params.model || this.getDefaultModel();
    const messages = await this.buildProviderMessages(params);

    console.log("Final messages for AI:", JSON.stringify(messages, null, 2));

    const response = await this.ollama.chat({
      model: model.id,
      messages: messages,
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
   * 实现抽象方法：执行AI流式请求
   * 调用Ollama API执行流式请求并返回一个异步迭代器
   */
  protected async executeAIStreamRequest(
    params: AIRequestParams,
    options?: {
      temperature?: number;
      maxTokens?: number; // 注意：Ollama 可能使用不同的参数名，如 num_predict
    }
  ): Promise<AsyncIterable<string>> {
    const self = this; // 确保在异步生成器中正确使用 'this'
    async function* streamLogic(): AsyncIterable<string> {
      if (!params.messages) {
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

      const model = params.model || self.getDefaultModel();
      const messages = await self.buildProviderMessages(params);

      console.log("Final messages for AI:", JSON.stringify(messages, null, 2));

      const stream = await self.ollama.chat({
        model: model.id,
        messages: messages,
        stream: true,
        options: {
          temperature: options?.temperature,
          // Ollama API 可能使用 num_predict 而不是 max_tokens
          // num_predict: options?.maxTokens,
        },
      });

      for await (const chunk of stream) {
        if (chunk.message && typeof chunk.message.content === "string") {
          yield chunk.message.content;
        }
        // 如果需要处理流结束的特殊逻辑（例如，获取最终的使用情况统计），
        // 可以在这里检查 chunk.done 或其他特定于Ollama的字段。
        // 目前，我们只流式传输内容。
      }
    }
    return Promise.resolve(streamLogic());
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
      notify.error("provider.models.fetch.failed", ["Ollama"]);
      return Promise.reject(error);
    }
  }

  async getEmbeddingModels(): Promise<AIModel[]> {
    return Promise.resolve(OllamaProvider.embeddingModels);
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

  /**
   * 生成PR摘要
   * @param params AI请求参数
   * @param commitMessages 提交信息列表
   * @returns AI响应
   */
  async generatePRSummary(
    params: AIRequestParams,
    commitMessages: string[]
  ): Promise<AIResponse> {
    const systemPrompt =
      params.systemPrompt || getPRSummarySystemPrompt(params.language);
    const userPrompt = getPRSummaryUserPrompt(params.language);
    const userContent = `- ${commitMessages.join("\n- ")}`;

    const response = await this.executeAIRequest({
      ...params,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
        { role: "user", content: userPrompt },
      ],
    });

    return { content: response.content, usage: response.usage };
  }

  /**
   * 构建特定于提供商的消息数组。
   * 对于Ollama，我们直接使用通用的AIMessage格式。
   * @param params - AI请求参数
   * @returns 适合Ollama API的消息数组
   */
  protected async buildProviderMessages(
    params: AIRequestParams
  ): Promise<AIMessage[]> {
    if (!params.messages || params.messages.length === 0) {
      // 作为备用，如果 messages 未提供，则根据旧结构构建
      const systemPrompt = await getSystemPrompt(params);
      const userContent = params.diff;
      const userPrompt = params.additionalContext || "";

      const messages: AIMessage[] = [{ role: "system", content: systemPrompt }];
      if (userContent) {
        messages.push({ role: "user", content: userContent });
      }
      if (userPrompt) {
        messages.push({ role: "user", content: userPrompt });
      }
      return messages;
    }
    return params.messages;
  }
}
