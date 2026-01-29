import { AIProviderFactory } from "@/ai/ai-provider-factory";
import { AIModel, AIProvider } from "@/ai/types";
import { ProviderConfig } from "@/types/provider-config";
import { Logger } from "@/utils/logger";

/**
 * AI Provider 管理器 - 单例模式
 *
 * 职责：
 * 1. 管理 AI Provider 实例（单例）
 * 2. 缓存模型列表（避免重复 API 调用）
 * 3. 验证模型可用性
 * 4. 提供统一的 Provider 获取接口
 *
 * 设计原则：
 * - 单例模式：每个 Provider 只创建一次
 * - 模型缓存：模型列表相对稳定，可以缓存
 * - 按需创建：Provider 按需创建和缓存
 * - 生命周期管理：支持清理和重置
 *
 * 缓存策略：
 * - Provider 实例：永久缓存（直到显式清理）
 * - 模型列表：会话级缓存（可配置 TTL）
 * - 验证结果：不缓存（确保实时性）
 */
export class AIProviderManager {
  private static instance: AIProviderManager;

  // Provider 实例缓存（Provider ID -> Provider 实例）
  private providerCache: Map<string, AIProvider> = new Map();

  // 模型列表缓存（Provider ID -> 模型列表）
  private modelCache: Map<string, AIModel[]> = new Map();

  // 模型缓存 TTL（毫秒），默认 5 分钟
  private modelCacheTTL: number = 5 * 60 * 1000;

  // 模型缓存时间戳
  private modelCacheTimestamp: Map<string, number> = new Map();

  // 日志器
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance("AIProviderManager");
  }

  /**
   * 获取单例实例
   */
  static getInstance(): AIProviderManager {
    if (!AIProviderManager.instance) {
      AIProviderManager.instance = new AIProviderManager();
    }
    return AIProviderManager.instance;
  }

  /**
   * 获取 Provider 实例
   * 如果已缓存则返回缓存实例，否则创建并缓存
   *
   * @param providerId Provider ID (如 'openai', 'anthropic')
   * @param config Provider 配置
   * @returns Provider 实例
   */
  async getProvider(
    providerId: string,
    config: ProviderConfig,
  ): Promise<AIProvider> {
    // 1. 检查缓存
    if (this.providerCache.has(providerId)) {
      this.logger.debug("Using cached provider", { data: { providerId } });
      return this.providerCache.get(providerId)!;
    }

    // 2. 创建新实例
    this.logger.info("Creating new provider", { data: { providerId } });
    const startTime = Date.now();

    try {
      const provider = await AIProviderFactory.getProvider(providerId, config);

      // 3. 缓存实例
      this.providerCache.set(providerId, provider);

      const duration = Date.now() - startTime;
      this.logger.info("Provider created and cached", {
        data: { providerId, duration: `${duration}ms` },
      });

      return provider;
    } catch (error) {
      this.logger.error("Failed to create provider", {
        error: error as Error,
        data: { providerId },
      });
      throw error;
    }
  }

  /**
   * 获取模型列表（带缓存）
   *
   * @param providerId Provider ID
   * @param config Provider 配置
   * @param forceRefresh 是否强制刷新缓存
   * @returns 模型列表
   */
  async getModels(
    providerId: string,
    config: ProviderConfig,
    forceRefresh: boolean = false,
  ): Promise<AIModel[]> {
    // 1. 检查是否需要刷新
    const needsRefresh = forceRefresh || this.isCacheExpired(providerId);

    if (!needsRefresh && this.modelCache.has(providerId)) {
      this.logger.debug("Using cached models", { data: { providerId } });
      return this.modelCache.get(providerId)!;
    }

    // 2. 获取 Provider
    const provider = await this.getProvider(providerId, config);

    // 3. 获取模型列表
    this.logger.info("Fetching models from API", { data: { providerId } });
    const startTime = Date.now();

    try {
      const models = await provider.getModels();

      // 4. 缓存模型列表
      this.modelCache.set(providerId, models);
      this.modelCacheTimestamp.set(providerId, Date.now());

      const duration = Date.now() - startTime;
      this.logger.info("Models fetched and cached", {
        data: {
          providerId,
          modelCount: models.length,
          duration: `${duration}ms`,
        },
      });

      return models;
    } catch (error) {
      this.logger.error("Failed to fetch models", {
        error: error as Error,
        data: { providerId },
      });
      throw error;
    }
  }

  /**
   * 验证模型可用性
   * 不使用缓存，确保实时性
   *
   * @param providerId Provider ID
   * @param modelId 模型 ID
   * @param config Provider 配置
   * @returns 验证结果
   */
  async validateModel(
    providerId: string,
    modelId: string,
    config: ProviderConfig,
  ): Promise<{
    valid: boolean;
    model: AIModel | null;
    confidence: number;
  }> {
    this.logger.info("Validating model", {
      data: { providerId, modelId },
    });

    // 获取模型列表（可能使用缓存）
    const models = await this.getModels(providerId, config);

    // 查找模型
    const model = models.find((m) => m.id === modelId);

    if (model) {
      this.logger.info("Model validation succeeded", {
        data: { providerId, modelId },
      });
      return {
        valid: true,
        model,
        confidence: 1.0,
      };
    } else {
      this.logger.warn("Model validation failed", {
        data: { providerId, modelId, availableModels: models.map((m) => m.id) },
      });
      return {
        valid: false,
        model: null,
        confidence: 0.3, // 低置信度，可能是模型名称变更
      };
    }
  }

  /**
   * 获取 Provider 和模型（组合方法）
   *
   * @param providerId Provider ID
   * @param modelId 模型 ID
   * @param config Provider 配置
   * @returns Provider 实例和模型对象
   */
  async getProviderAndModel(
    providerId: string,
    modelId: string,
    config: ProviderConfig,
  ): Promise<{
    provider: AIProvider;
    model: AIModel;
  }> {
    // 1. 获取 Provider
    const provider = await this.getProvider(providerId, config);

    // 2. 验证模型
    const validation = await this.validateModel(providerId, modelId, config);

    if (!validation.valid || !validation.model) {
      throw new Error(
        `Model '${modelId}' not found for provider '${providerId}'`,
      );
    }

    return {
      provider,
      model: validation.model,
    };
  }

  /**
   * 清除指定 Provider 的缓存
   *
   * @param providerId Provider ID
   */
  clearCache(providerId: string): void {
    this.providerCache.delete(providerId);
    this.modelCache.delete(providerId);
    this.modelCacheTimestamp.delete(providerId);

    this.logger.info("Cache cleared", { data: { providerId } });
  }

  /**
   * 清除所有缓存
   */
  clearAllCache(): void {
    this.providerCache.clear();
    this.modelCache.clear();
    this.modelCacheTimestamp.clear();

    this.logger.info("All caches cleared");
  }

  /**
   * 设置模型缓存 TTL
   *
   * @param ttl 毫秒
   */
  setModelCacheTTL(ttl: number): void {
    this.modelCacheTTL = ttl;
    this.logger.info("Model cache TTL updated", { data: { ttl: `${ttl}ms` } });
  }

  /**
   * 检查缓存是否过期
   *
   * @param providerId Provider ID
   * @returns 是否过期
   */
  private isCacheExpired(providerId: string): boolean {
    const timestamp = this.modelCacheTimestamp.get(providerId);
    if (!timestamp) {
      return true;
    }

    return Date.now() - timestamp > this.modelCacheTTL;
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    providerCount: number;
    modelCount: number;
    totalMemory: number;
  } {
    return {
      providerCount: this.providerCache.size,
      modelCount: this.modelCache.size,
      totalMemory: this.providerCache.size + this.modelCache.size,
    };
  }

  /**
   * 销毁管理器（用于测试或清理）
   */
  destroy(): void {
    this.clearAllCache();
    if (AIProviderManager.instance === this) {
      AIProviderManager.instance = null as any;
    }
    this.logger.info("AIProviderManager destroyed");
  }
}
