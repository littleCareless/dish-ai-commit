import { AIProvider as AIProviderInterface, AIModel } from "./types";
import { OpenAIProvider } from "./providers/openai-provider";
import { AnthropicAIProvider } from "./providers/anthropic-provider";
import { OllamaProvider } from "./providers/ollama-provider";
import { AIProvider, ConfigKeys } from "../config/types";
import { ConfigurationManager } from "../config/configuration-manager";
import { VSCodeProvider } from "./providers/vscode-provider";
import { ZhipuAIProvider } from "./providers/zhipu-provider";
import { DashScopeProvider } from "./providers/dashscope-provider";
import { DoubaoProvider } from "./providers/doubao-provider";
import { GeminiAIProvider } from "./providers/gemini-provider";
import { formatMessage } from "../utils/i18n/localization-manager";
import { DeepseekAIProvider } from "./providers/deepseek-provider";
import { SiliconFlowProvider } from "./providers/siliconflow-provider";
import { OpenRouterProvider } from "./providers/openrouter-provider";
import { PremAIProvider } from "./providers/premai-provider";
import { TogetherAIProvider } from "./providers/together-provider"; // Import TogetherAIProvider
import { XAIProvider } from "./providers/xai-provider";
import { MistralAIProvider } from "./providers/mistral-provider";
import { AzureOpenAIProvider } from "./providers/azure-openai-provider";
import { CloudflareWorkersAIProvider } from "./providers/cloudflare-workersai-provider";
import { VertexAIProvider } from "./providers/vertexai-provider";
import { GroqAIProvider } from "./providers/groq-provider";
import { BaiduQianfanProvider } from "./providers/baidu-qianfan-provider";
import { LMStudioProvider } from "./providers/lmstudio-provider";

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
   * - key: 提供者类型标识符
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
   * 生成提供者配置的哈希值
   * 用于检测配置是否发生变化
   * @private
   */
  private static getProviderConfigHash(providerType: string): string {
    const config = ConfigurationManager.getInstance().getConfiguration();
    const providerConfig = this.getProviderSpecificConfig(providerType, config);
    return JSON.stringify(providerConfig);
  }

  /**
   * 获取特定提供者的相关配置
   * @private
   */
  private static getProviderSpecificConfig(providerType: string, config: any): any {
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
      default:
        return baseConfig;
    }
  }

  /**
   * 检查是否需要强制重新创建提供者实例
   * @private
   */
  private static shouldForceRecreateProvider(providerType: string): boolean {
    const currentConfigHash = this.getProviderConfigHash(providerType);
    const cachedConfigHash = this.providerConfigHashes.get(providerType);
    
    return cachedConfigHash !== undefined && cachedConfigHash !== currentConfigHash;
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
   * 获取指定类型的AI提供者实例
   * 优先从缓存中获取，如果不存在或已过期则创建新实例
   * 当配置发生变化时会自动清除对应的缓存实例
   *
   * @param type - 提供者类型标识符，如果未指定则使用配置中的默认值
   * @returns AI提供者实例
   * @throws Error 当提供者类型未知时抛出错误
   */
  public static getProvider(type?: string): AIProviderInterface {
    this.cleanStaleProviders();
    const providerType =
      type ||
      ConfigurationManager.getInstance().getConfig("BASE_PROVIDER") ||
      AIProvider.OPENAI;

    // 检查是否需要强制重新创建实例（配置可能已变更）
    const shouldForceRecreate = this.shouldForceRecreateProvider(providerType);
    if (shouldForceRecreate) {
      this.clearProvider(providerType);
    }

    let provider = this.providers.get(providerType);

    if (!provider) {
      switch (providerType.toLowerCase()) {
        case AIProvider.ANTHROPIC:
          provider = new AnthropicAIProvider();
          break;
        case AIProvider.OPENAI:
          provider = new OpenAIProvider();
          break;
        case AIProvider.OLLAMA:
          provider = new OllamaProvider();
          break;
        case AIProvider.VS_CODE_PROVIDED:
          provider = new VSCodeProvider();
          break;
        case AIProvider.ZHIPU:
          provider = new ZhipuAIProvider();
          break;
        case AIProvider.DASHSCOPE:
          provider = new DashScopeProvider();
          break;
        case AIProvider.DOUBAO:
          provider = new DoubaoProvider();
          break;
        case AIProvider.GEMINI:
          provider = new GeminiAIProvider();
          break;
        case AIProvider.DEEPSEEK:
          provider = new DeepseekAIProvider();
          break;
        case AIProvider.SILICONFLOW:
          provider = new SiliconFlowProvider();
          break;
        case AIProvider.OPENROUTER:
          provider = new OpenRouterProvider();
          break;
        case AIProvider.PREMAI:
          provider = new PremAIProvider();
          break;
        case AIProvider.TOGETHER:
          provider = new TogetherAIProvider();
          break;
        case AIProvider.XAI:
          provider = new XAIProvider();
          break;
        case AIProvider.AZURE_OPENAI:
          provider = new AzureOpenAIProvider();
          break;
        case AIProvider.CLOUDFLARE:
          provider = new CloudflareWorkersAIProvider();
          break;
        case AIProvider.VERTEXAI:
          provider = new VertexAIProvider();
          break;
        case AIProvider.GROQ:
          provider = new GroqAIProvider();
          break;
        case AIProvider.MISTRAL:
          provider = new MistralAIProvider();
         break;
        case AIProvider.BAIDU_QIANFAN:
          provider = new BaiduQianfanProvider();
          break;
        case AIProvider.LMSTUDIO:
          provider = new LMStudioProvider();
          break;
       default:
         throw new Error(formatMessage("provider.type.unknown", [type]));
     }
      if (provider) {
        this.providers.set(providerType, provider);
        this.providerTimestamps.set(providerType, Date.now());
        this.providerConfigHashes.set(providerType, this.getProviderConfigHash(providerType));
      }
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
    const provider = this.providers.get(providerId);
    if (provider && "reinitialize" in provider) {
      (provider as any).reinitialize();
    }
    // 清除缓存以确保下次获取时使用新配置
    this.clearProvider(providerId);
  }

  /**
   * 清除指定提供者的缓存实例
   * 用于在配置变更时强制重新创建实例
   *
   * @param providerType - 提供者类型标识符
   */
  public static clearProviderCache(providerType: string): void {
    this.clearProvider(providerType);
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
