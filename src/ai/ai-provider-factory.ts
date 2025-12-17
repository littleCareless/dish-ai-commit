import { AnthropicAIProvider } from "@/ai/providers/anthropic-provider";
import { AzureOpenAIProvider } from "@/ai/providers/azure-openai-provider";
import { BaiduQianfanProvider } from "@/ai/providers/baidu-qianfan-provider";
import { CloudflareWorkersAIProvider } from "@/ai/providers/cloudflare-workersai-provider";
import { DashScopeProvider } from "@/ai/providers/dashscope-provider";
import { DeepseekAIProvider } from "@/ai/providers/deepseek-provider";
import { DoubaoProvider } from "@/ai/providers/doubao-provider";
import { GeminiAIProvider } from "@/ai/providers/gemini-provider";
import { GroqAIProvider } from "@/ai/providers/groq-provider";
import { LMStudioProvider } from "@/ai/providers/lmstudio-provider";
import { MistralAIProvider } from "@/ai/providers/mistral-provider";
import { OllamaProvider } from "@/ai/providers/ollama-provider";
import { OpenAICompatibleProvider } from "@/ai/providers/openai-compatible-provider";
import { OpenAIProvider } from "@/ai/providers/openai-provider";
import { OpenRouterProvider } from "@/ai/providers/openrouter-provider";
import { SiliconFlowProvider } from "@/ai/providers/siliconflow-provider";
import { TogetherAIProvider } from "@/ai/providers/together-provider"; // Import TogetherAIProvider
import { VertexAIProvider } from "@/ai/providers/vertexai-provider";
import { VSCodeProvider } from "@/ai/providers/vscode-provider";
import { XAIProvider } from "@/ai/providers/xai-provider";
import { XiaomiProvider } from "@/ai/providers/xiaomi-provider";
import { ZhipuAIProvider } from "@/ai/providers/zhipu-provider";
import { AIModel, AIProvider as AIProviderInterface } from "@/ai/types";
import {
  getProviderByEnumKey,
  normalizeProviderType,
} from "@/config/provider-definitions";
import { ProviderConfig } from "@/types/provider-config";
import { formatMessage } from "@/utils/i18n/localization-manager";
import { PerplexityAIProvider } from "./providers/perplexity-provider";
import { PremAIProvider } from "./providers/premai-provider";

/**
 * AI提供者工厂类，负责按需创建AI服务提供者的实时实例。
 * 该工厂确保每次创建都使用最新的配置，不使用任何缓存。
 * 支持多种AI提供者，包括:
 * - OpenAI, Ollama, ZhipuAI, DashScope, Doubao, Gemini, Deepseek, etc.
 */
export class AIProviderFactory {
  /**
   * 创建并返回指定类型的AI提供者实例。
   * 该方法确保始终创建新的实例，以反映最新的配置。
   * 如果未提供配置，将自动从 ProfileManagerService 获取当前激活的配置。
   *
   * @param type - 提供者类型标识符。
   * @param config - 可选的配置对象。如果未提供，将获取实时配置。
   * @returns AI提供者实例。
   * @throws Error 当提供者类型未知时抛出错误。
   */
  public static async getProvider(
    type: string,
    config: ProviderConfig
  ): Promise<AIProviderInterface> {
    const providerType = type;
    const normalizedEnumKey = normalizeProviderType(providerType);
    const providerDef = getProviderByEnumKey(normalizedEnumKey);

    if (!providerDef) {
      throw new Error(formatMessage("provider.type.unknown", [providerType]));
    }

    const effectiveConfig = config;

    const providerId = providerDef.id;
    let provider: AIProviderInterface;

    console.log("[ai-provider-factory]providerId", providerId);
    console.log("[ai-provider-factory]effectiveConfig", effectiveConfig);

    switch (providerId) {
      case "anthropic":
        provider = new AnthropicAIProvider(effectiveConfig);
        break;
      case "openai":
        provider = new OpenAIProvider(effectiveConfig);
        break;
      case "ollama":
        provider = new OllamaProvider(effectiveConfig);
        break;
      case "vscode":
        provider = new VSCodeProvider(effectiveConfig);
        break;
      case "zhipu":
        provider = new ZhipuAIProvider(effectiveConfig);
        break;
      case "dashscope":
        provider = new DashScopeProvider(effectiveConfig);
        break;
      case "doubao":
        provider = new DoubaoProvider(effectiveConfig);
        break;
      case "gemini":
        provider = new GeminiAIProvider(effectiveConfig);
        break;
      case "deepseek":
        provider = new DeepseekAIProvider(effectiveConfig);
        break;
      case "siliconflow":
        provider = new SiliconFlowProvider(effectiveConfig);
        break;
      case "openrouter":
        provider = new OpenRouterProvider(effectiveConfig);
        break;
      case "premai":
        provider = new PremAIProvider(effectiveConfig);
        break;
      case "together":
        provider = new TogetherAIProvider(effectiveConfig);
        break;
      case "xai":
        provider = new XAIProvider(effectiveConfig);
        break;
      case "azure-openai":
        provider = new AzureOpenAIProvider(effectiveConfig);
        break;
      case "cloudflare":
        provider = new CloudflareWorkersAIProvider(effectiveConfig);
        break;
      case "vertexai":
        provider = new VertexAIProvider(effectiveConfig);
        break;
      case "groq":
        provider = new GroqAIProvider(effectiveConfig);
        break;
      case "mistral":
        provider = new MistralAIProvider(effectiveConfig);
        break;
      case "baidu-qianfan":
        provider = new BaiduQianfanProvider(effectiveConfig);
        break;
      case "lmstudio":
        provider = new LMStudioProvider(effectiveConfig);
        break;
      case "openai-compatible":
        provider = new OpenAICompatibleProvider(effectiveConfig);
        break;
      case "perplexity":
        provider = new PerplexityAIProvider(effectiveConfig);
        break;
      case "xiaomi":
        provider = new XiaomiProvider(effectiveConfig);
        break;
      default:
        throw new Error(formatMessage("provider.type.unknown", [providerType]));
    }

    // 注入全局配置 (如果 provider 支持)
    if (typeof provider.setGlobalConfig === "function") {
      provider.setGlobalConfig(effectiveConfig);
    }

    return provider;
  }

  /**
   * 创建并返回所有支持的AI提供者的新实例
   * 注意: 这些实例不会被缓存，每次调用都会创建新实例
   *
   * @returns 包含所有可用AI提供者实例的数组
   */
  public static getAllProviders(): AIProviderInterface[] {
    return [
      new VSCodeProvider(),
      new OllamaProvider(),
      new OpenAIProvider(),
      new ZhipuAIProvider(),
      new DashScopeProvider(),
      new DoubaoProvider(),
      new GeminiAIProvider(),
      new DeepseekAIProvider(),
      new SiliconFlowProvider(),
      new OpenRouterProvider(),
      new PremAIProvider(),
      new TogetherAIProvider(),
      new XAIProvider(),
      new AnthropicAIProvider(),
      new AzureOpenAIProvider(),
      new CloudflareWorkersAIProvider(),
      new VertexAIProvider(),
      new MistralAIProvider(),
      new GroqAIProvider(),
      new BaiduQianfanProvider(),
      new LMStudioProvider(),
      new OpenAICompatibleProvider(),
      new XiaomiProvider(),
    ];
  }

  /**
   * 获取所有提供者支持的嵌入式模型列表
   * @returns Promise<AIModel[]> 返回一个包含所有嵌入式模型的数组
   */
  public static async getAllEmbeddingModels(): Promise<AIModel[]> {
    const allProviders = this.getAllProviders();
    const allEmbeddingModels: AIModel[] = [];

    for (const provider of allProviders) {
      if (provider.getEmbeddingModels) {
        try {
          const models = await provider.getEmbeddingModels();
          allEmbeddingModels.push(...models);
        } catch (error) {
          console.error(
            `Failed to get embedding models from ${provider.getName()}:`,
            error
          );
        }
      }
    }

    return allEmbeddingModels;
  }
}
