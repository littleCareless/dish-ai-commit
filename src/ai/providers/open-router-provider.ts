import { ConfigurationManager } from "../../config/configuration-manager";
import { notify } from "../../utils/notification/notification-manager";
import { type AIModel } from "../types";
import { BaseOpenAIProvider } from "./base-open-ai-provider";

/** OpenRouter服务提供者标识信息 */
const provider = { id: "openrouter", name: "OpenRouter" } as const;

/**
 * OpenRouter支持的模型列表配置
 * 包含来自不同提供商的模型及其参数设置
 */
const models: AIModel[] = [
  {
    id: "openai/gpt-4-turbo",
    name: "OpenAI GPT-4 Turbo - 高性能通用模型",
    maxTokens: { input: 128000, output: 4096 },
    provider: provider,
    default: true,
  },
  {
    id: "anthropic/claude-3-opus",
    name: "Anthropic Claude 3 Opus - 最强大的Claude模型",
    maxTokens: { input: 200000, output: 4096 },
    provider: provider,
  },
  {
    id: "anthropic/claude-3-sonnet",
    name: "Anthropic Claude 3 Sonnet - 平衡性能和效率的Claude模型",
    maxTokens: { input: 200000, output: 4096 },
    provider: provider,
  },
  {
    id: "google/gemini-1.5-pro",
    name: "Google Gemini 1.5 Pro - Google高性能模型",
    maxTokens: { input: 1000000, output: 8192 },
    provider: provider,
  },
  {
    id: "meta-llama/llama-3-70b-instruct",
    name: "Meta Llama 3 70B - Meta最新开源模型",
    maxTokens: { input: 8192, output: 4096 },
    provider: provider,
  },
  {
    id: "mistralai/mixtral-8x7b-instruct",
    name: "Mistral Mixtral 8x7B - 高性能开源模型",
    maxTokens: { input: 32768, output: 4096 },
    provider: provider,
  },
];

/**
 * OpenRouter服务提供者实现类
 * 继承自BaseOpenAIProvider，提供对OpenRouter API的访问能力
 */
export class OpenRouterProvider extends BaseOpenAIProvider {
  /**
   * 创建OpenRouter提供者实例
   * 从配置管理器获取必要的配置信息并初始化基类
   */
  constructor() {
    const configManager = ConfigurationManager.getInstance();
    super({
      apiKey: configManager.getConfig("PROVIDERS_OPENROUTER_APIKEY"),
      baseURL: "https://openrouter.ai/api/v1",
      apiVersion: "v1",
      providerId: "openrouter",
      providerName: "OpenRouter",
      models: models,
      defaultModel: "openai/gpt-4-turbo",
    });
  }

  /**
   * 检查OpenRouter服务是否可用
   * 验证API密钥是否已正确配置
   *
   * @returns Promise<boolean> 如果API密钥已配置则返回true，否则返回false
   */
  async isAvailable(): Promise<boolean> {
    try {
      // 快速返回，异步检查
      if (!this.config.apiKey) {
        return false;
      }

      const checkPromise = this.withTimeout(
        this.withRetry(async () => {
          try {
            await this.openai.models.list();
            return true;
          } catch {
            return false;
          }
        })
      );

      // 异步执行检查
      setTimeout(async () => {
        try {
          await checkPromise;
        } catch (error) {
          console.error("Background availability check failed:", error);
        }
      });

      return !!this.config.apiKey;
    } catch {
      return false;
    }
  }

  /**
   * 刷新可用的OpenRouter模型列表
   * 通过API获取最新的模型列表
   *
   * @returns Promise<string[]> 返回可用模型ID的数组
   * @throws 如果API调用失败会记录错误并返回空数组
   */
  async refreshModels(): Promise<string[]> {
    try {
      const models = await this.openai.models.list();
      notify.info("openrouter.models.update.success");
      return models.data.map((model) => model.id);
    } catch (error) {
      console.error("Failed to fetch OpenRouter models:", error);
      notify.error("openrouter.models.fetch.failed");
      return [];
    }
  }
}
