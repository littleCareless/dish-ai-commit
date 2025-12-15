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
import { ZhipuAIProvider } from "@/ai/providers/zhipu-provider";
import { AIModel, AIProvider as AIProviderInterface } from "@/ai/types";

import {
  getProviderByEnumKey,
  normalizeProviderType,
} from "@/config/provider-definitions";
import { AIProvider } from "@/config/types";
import { formatMessage } from "@/utils/i18n/localization-manager";
import { PerplexityAIProvider } from "./providers/perplexity-provider";
import { PremAIProvider } from "./providers/premai-provider";

/**
 * AI提供者工厂类，负责创建和管理不同AI服务提供者的实例
 * 实现了30分钟的缓存机制来重用提供者实例
 * 支持多种AI提供者，包括:
 * - OpenAI: 标准GPT模型
 * - Ollama: 本地部署模型
 * - VSCode: VSCode内置AI
 * - ZhipuAI: 智谱AI服务
 * - DashScope: 阿里云通义平台
 * - Doubao: 豆包AI平台
 * - Gemini: Google Gemini模型
 * - SiliconFlow: 硅基流动API服务
 * - OpenRouter: OpenRouter聚合API服务
 */
export class AIProviderFactory {
  /**
   * 存储AI提供者实例的映射
   * - key: 提供者类型标识符（规范化格式）
   * - value: 提供者实例
   * @private
   */
  private static providers: Map<string, AIProviderInterface> = new Map();

  /**
   * 提供者实例的缓存过期时间
   * 默认为30分钟，超过该时间的实例会被清理
   * @private
   */
  private static readonly PROVIDER_CACHE_TTL = 1000 * 60 * 30;

  /**
   * 记录每个提供者实例的创建/访问时间戳
   * - key: 提供者类型标识符
   * - value: 时间戳
   * @private
   */
  private static providerTimestamps: Map<string, number> = new Map();

  /**
   * 记录每个提供者实例创建时的配置哈希值
   * 用于检测配置是否发生变化
   * - key: 提供者类型标识符
   * - value: 配置哈希值
   * @private
   */
  private static providerConfigHashes: Map<string, string> = new Map();

  /**
   * 缓存过期时间（毫秒）：30分钟
   * 超过此时间的缓存将被自动清除
   * @private
   */
  private static readonly CACHE_EXPIRATION_TIME = 30 * 60 * 1000;

  /**
   * 清理过期的提供者实例
   * 遍历时间戳映射，移除超过TTL的实例和对应时间戳
   * @private
   */
  private static cleanStaleProviders() {
    const now = Date.now();
    for (const [id, timestamp] of this.providerTimestamps.entries()) {
      if (now - timestamp > this.PROVIDER_CACHE_TTL) {
        this.providers.delete(id);
        this.providerTimestamps.delete(id);
        this.providerConfigHashes.delete(id);
      }
    }
  }

  /**
   * 获取特定提供者的相关配置
   * @private
   */
  private static getProviderSpecificConfig(
    providerType: string,
    config: any
  ): any {
    const lowerType = providerType.toLowerCase();
    const baseConfig = {
      provider: config.base?.provider,
      model: config.base?.model,
    };

    // 根据提供者类型获取对应的配置
    switch (lowerType) {
      case AIProvider.OPENAI:
        return { ...baseConfig, ...config.providers?.openai };
      case AIProvider.ANTHROPIC:
        return { ...baseConfig, ...config.providers?.anthropic };
      case AIProvider.OLLAMA:
        return { ...baseConfig, ...config.providers?.ollama };
      case AIProvider.ZHIPU:
        return { ...baseConfig, ...config.providers?.zhipuai };
      case AIProvider.DASHSCOPE:
        return { ...baseConfig, ...config.providers?.dashscope };
      case AIProvider.DOUBAO:
        return { ...baseConfig, ...config.providers?.doubao };
      case AIProvider.GEMINI:
        return { ...baseConfig, ...config.providers?.gemini };
      case AIProvider.DEEPSEEK:
        return { ...baseConfig, ...config.providers?.deepseek };
      case AIProvider.SILICONFLOW:
        return { ...baseConfig, ...config.providers?.siliconflow };
      case AIProvider.OPENROUTER:
        return { ...baseConfig, ...config.providers?.openrouter };
      case AIProvider.PREMAI:
        return { ...baseConfig, ...config.providers?.premai };
      case AIProvider.TOGETHER:
        return { ...baseConfig, ...config.providers?.together };
      case AIProvider.XAI:
        return { ...baseConfig, ...config.providers?.xai };
      case AIProvider.AZURE_OPENAI:
        return { ...baseConfig, ...config.providers?.azureOpenai };
      case AIProvider.CLOUDFLARE:
        return { ...baseConfig, ...config.providers?.cloudflare };
      case AIProvider.VERTEXAI:
        return { ...baseConfig, ...config.providers?.vertexai };
      case AIProvider.GROQ:
        return { ...baseConfig, ...config.providers?.groq };
      case AIProvider.MISTRAL:
        return { ...baseConfig, ...config.providers?.mistral };
      case AIProvider.BAIDU_QIANFAN:
        return { ...baseConfig, ...config.providers?.baiduQianfan };
      case AIProvider.LMSTUDIO:
        return { ...baseConfig, ...config.providers?.lmstudio };
      case AIProvider.OPENAI_COMPATIBLE:
        return { ...baseConfig, ...config.providers?.["openai-compatible"] };
      default:
        return baseConfig;
    }
  }

  /**
   * 清除指定提供者的缓存实例
   * @private
   */
  private static clearProvider(providerType: string): void {
    this.providers.delete(providerType);
    this.providerTimestamps.delete(providerType);
    this.providerConfigHashes.delete(providerType);
  }

  /**
   * 创建并返回指定类型的AI提供者实例
   * 优先从缓存中获取，如果不存在或已过期则创建新实例
   * 当配置发生变化时会自动清除对应的缓存实例
   *
   * @param type - 提供者类型标识符，如果未指定则使用配置中的默认值
   * @returns AI提供者实例
   * @throws Error 当提供者类型未知时抛出错误
   */
  public static getProvider(type?: string, config?: any): AIProviderInterface {
    // 如果提供了 config，我们总是创建一个新的实例，不使用缓存
    // 这是为了支持 ProfileManager 的多配置管理

    const providerType = type || AIProvider.OPENAI;

    // 规范化提供商类型返回大写下划线格式（如 VS_CODE_PROVIDED）
    const normalizedEnumKey = normalizeProviderType(providerType);

    // 获取对应的提供商定义以得到小写 ID（如 vscode）
    const providerDef = getProviderByEnumKey(normalizedEnumKey);
    if (!providerDef) {
      throw new Error(formatMessage("provider.type.unknown", [providerType]));
    }

    const providerId = providerDef.id;
    let provider: AIProviderInterface | undefined;

    // 如果没有提供 config，尝试使用旧的缓存逻辑 (为了兼容性)
    // 但如果提供了 config，直接创建新实例
    if (!config) {
      this.cleanStaleProviders();
      provider = this.providers.get(providerId);
    }

    if (!provider) {
      switch (providerId) {
        case "anthropic":
          provider = new AnthropicAIProvider(config);
          break;
        case "openai":
          provider = new OpenAIProvider(config);
          break;
        case "ollama":
          provider = new OllamaProvider(config);
          break;
        case "vscode":
          provider = new VSCodeProvider(config);
          break;
        case "zhipu":
          provider = new ZhipuAIProvider(config);
          break;
        case "dashscope":
          provider = new DashScopeProvider(config);
          break;
        case "doubao":
          provider = new DoubaoProvider(config);
          break;
        case "gemini":
          provider = new GeminiAIProvider(config);
          break;
        case "deepseek":
          provider = new DeepseekAIProvider(config);
          break;
        case "siliconflow":
          provider = new SiliconFlowProvider(config);
          break;
        case "openrouter":
          provider = new OpenRouterProvider(config);
          break;
        case "premai":
          provider = new PremAIProvider(config);
          break;
        case "together":
          provider = new TogetherAIProvider(config);
          break;
        case "xai":
          provider = new XAIProvider(config);
          break;
        case "azure-openai":
          provider = new AzureOpenAIProvider(config);
          break;
        case "cloudflare":
          provider = new CloudflareWorkersAIProvider(config);
          break;
        case "vertexai":
          provider = new VertexAIProvider(config);
          break;
        case "groq":
          provider = new GroqAIProvider(config);
          break;
        case "mistral":
          provider = new MistralAIProvider(config);
          break;
        case "baidu-qianfan":
          provider = new BaiduQianfanProvider(config);
          break;
        case "lmstudio":
          provider = new LMStudioProvider(config);
          break;
        case "openai-compatible":
          provider = new OpenAICompatibleProvider(config);
          break;
        case "perplexity":
          provider = new PerplexityAIProvider(config);
          break;
        default:
          throw new Error(
            formatMessage("provider.type.unknown", [providerType])
          );
      }

      // 只有在没有 config 的情况下才缓存 (兼容旧逻辑)
      if (provider && !config) {
        this.providers.set(providerId, provider);
        this.providerTimestamps.set(providerId, Date.now());
      }
    }

    // 注入全局配置 (如果 provider 支持)
    if (provider && config && typeof provider.setGlobalConfig === "function") {
      provider.setGlobalConfig(config);
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
    ];
  }

  /**
   * 重新初始化指定的缓存提供者实例
   * 如果提供者存在且支持重初始化功能，则调用其reinitialize方法
   * 同时清除缓存以确保下次获取时使用新配置
   *
   * @param providerId - 需要重初始化的提供者ID
   */
  public static reinitializeProvider(providerId: string): void {
    // 规范化提供商类型以确保一致性
    const normalizedEnumKey = normalizeProviderType(providerId);
    const providerDef = getProviderByEnumKey(normalizedEnumKey);
    if (!providerDef) {
      return; // 提供者定义不存在，直接返回
    }

    const normalizedId = providerDef.id;
    const provider = this.providers.get(normalizedId);
    if (provider && "reinitialize" in provider) {
      (provider as any).reinitialize();
    }
    // 清除缓存以确保下次获取时使用新配置
    this.clearProvider(normalizedId);
  }

  /**
   * 清除指定提供者的缓存实例
   * 用于在配置变更时强制重新创建实例
   *
   * @param providerType - 提供者类型标识符
   */
  public static clearProviderCache(providerType: string): void {
    // 规范化提供商类型以确保一致性
    const normalizedEnumKey = normalizeProviderType(providerType);
    const providerDef = getProviderByEnumKey(normalizedEnumKey);
    if (!providerDef) {
      return; // 提供者定义不存在，直接返回
    }

    const normalizedId = providerDef.id;
    this.clearProvider(normalizedId);
  }

  /**
   * 清除所有提供者的缓存实例
   * 用于在全局配置变更时强制重新创建所有实例
   */
  public static clearAllProviderCache(): void {
    this.providers.clear();
    this.providerTimestamps.clear();
    this.providerConfigHashes.clear();
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
