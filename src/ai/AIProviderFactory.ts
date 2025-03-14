import { AIProvider as AIProviderInterface } from "./types";
import { OpenAIProvider } from "./providers/OpenAIProvider";
import { OllamaProvider } from "./providers/OllamaProvider";
import { AIProvider, ConfigKeys } from "../config/types";
import { ConfigurationManager } from "../config/ConfigurationManager";
import { VSCodeProvider } from "./providers/VscodeProvider";
import { ZhipuAIProvider } from "./providers/ZhipuAIProvider";
import { DashScopeProvider } from "./providers/DashScopeProvider";
import { DoubaoProvider } from "./providers/DoubaoProvider";
import { GeminiAIProvider } from "./providers/GeminiAIProvider";
import { formatMessage } from "../utils/i18n/LocalizationManager";
import { DeepseekAIProvider } from "./providers/DeepseekAIProvider";
import { SiliconFlowProvider } from "./providers/SiliconFlowProvider";
import { OpenRouterProvider } from "./providers/OpenRouterProvider";

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
      }
    }
  }

  /**
   * 获取指定类型的AI提供者实例
   * 优先从缓存中获取，如果不存在或已过期则创建新实例
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

    console.log("AIProvider", AIProvider);
    let provider = this.providers.get(providerType);

    if (!provider) {
      switch (providerType.toLowerCase()) {
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
        default:
          throw new Error(formatMessage("provider.type.unknown", [type]));
      }
      this.providers.set(providerType, provider);
      this.providerTimestamps.set(providerType, Date.now());
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
      new OpenAIProvider(),
      new OllamaProvider(),
      new VSCodeProvider(),
      new ZhipuAIProvider(),
      new DashScopeProvider(),
      new DoubaoProvider(),
      new GeminiAIProvider(),
      new DeepseekAIProvider(),
      new SiliconFlowProvider(),
      new OpenRouterProvider(),
    ];
  }

  /**
   * 重新初始化指定的缓存提供者实例
   * 如果提供者存在且支持重初始化功能，则调用其reinitialize方法
   *
   * @param providerId - 需要重初始化的提供者ID
   */
  public static reinitializeProvider(providerId: string): void {
    const provider = this.providers.get(providerId);
    if (provider && "reinitialize" in provider) {
      (provider as any).reinitialize();
    }
  }
}
