/**
 * Models.dev API 数据获取器
 * 负责从 Models.dev 拉取最新的 AI 模型信息并缓存
 */

import {
  CachedModelData,
  CachedProviderData,
  FetchResult,
  ModelsDevApiResponse,
  ModelsDevModel,
  ModelsDevProvider,
} from "@/ai/model-registry/models-dev-types";
import * as i18n from "@/utils/i18n";
import { notify } from "@/utils/notification/notification-manager";

/**
 * Models.dev 数据获取器类
 */
export class ModelsDevFetcher {
  private static instance: ModelsDevFetcher;
  private readonly API_URL = "https://models.dev/api.json";
  private readonly LOGO_BASE_URL = "https://models.dev/logos";
  private readonly DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时

  // 内存缓存
  private modelCache: Map<string, CachedModelData> = new Map();
  private providerCache: Map<string, CachedProviderData> = new Map();
  private lastFetchTime: number = 0;

  private constructor() {
    this.loadCacheFromStorage();
  }

  public static getInstance(): ModelsDevFetcher {
    if (!ModelsDevFetcher.instance) {
      ModelsDevFetcher.instance = new ModelsDevFetcher();
    }
    return ModelsDevFetcher.instance;
  }

  /**
   * 从 Models.dev API 拉取最新数据
   */
  async fetchLatestData(options?: {
    forceRefresh?: boolean;
    cacheTTL?: number;
  }): Promise<FetchResult> {
    const { forceRefresh = false, cacheTTL = this.DEFAULT_CACHE_TTL } = options || {};

    const result: FetchResult = {
      success: false,
      modelCount: 0,
      providerCount: 0,
      updatedModels: [],
      newModels: [],
      errorModels: [],
      errors: [],
      fetchTime: new Date().toISOString(),
    };

    try {
      // 检查是否需要刷新
      if (!forceRefresh && this.isCacheValid()) {
        result.success = true;
        result.modelCount = this.modelCache.size;
        result.providerCount = this.providerCache.size;
        console.log("使用缓存的 Models.dev 数据");
        return result;
      }

      console.log(`正在从 ${this.API_URL} 拉取数据...`);

      // 拉取数据
      const response = await fetch(this.API_URL, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Dish-AI-Commit-VSCode-Extension",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ModelsDevApiResponse = await response.json();

      // 处理 Providers
      const providers = this.parseProviders(data.providers);
      for (const provider of providers) {
        const existing = this.providerCache.get(provider.id);
        this.providerCache.set(provider.id, {
          provider,
          timestamp: Date.now(),
          ttl: cacheTTL,
        });

        if (!existing) {
          result.providerCount++;
        }
      }

      // 处理 Models
      for (const modelData of data.models) {
        try {
          const provider = providers.find((p) => p.id === modelData.provider);
          if (!provider) {
            result.errorModels.push(modelData.id);
            result.errors.push(`Provider not found for model: ${modelData.id}`);
            continue;
          }

          const existing = this.modelCache.get(modelData.id);
          const isNew = !existing;
          const isUpdated = existing && this.hasModelChanged(existing.model, modelData);

          this.modelCache.set(modelData.id, {
            model: modelData,
            provider,
            timestamp: Date.now(),
            ttl: cacheTTL,
          });

          if (isNew) {
            result.newModels.push(modelData.id);
          } else if (isUpdated) {
            result.updatedModels.push(modelData.id);
          }

          result.modelCount++;
        } catch (error) {
          result.errorModels.push(modelData.id);
          result.errors.push(
            `${modelData.id}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // 保存到持久化存储
      await this.saveCacheToStorage();

      this.lastFetchTime = Date.now();
      result.success = true;

      // 显示通知
      if (result.newModels.length > 0 || result.updatedModels.length > 0) {
        notify.info("models.dev.fetch.success", [
          result.modelCount.toString(),
          result.newModels.length.toString(),
          result.updatedModels.length.toString(),
        ]);
      }

      console.log(`成功拉取 ${result.modelCount} 个模型，${result.providerCount} 个 Provider`);
      console.log(`新增: ${result.newModels.length}, 更新: ${result.updatedModels.length}`);

      return result;
    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);

      notify.error("models.dev.fetch.failed", [errorMessage]);
      console.error("拉取 Models.dev 数据失败:", error);

      return result;
    }
  }

  /**
   * 解析 Providers   */
  private parseProviders(
    providersData: Record<string, any>
  ): ModelsDevProvider[] {
    const providers: ModelsDevProvider[] = [];

    for (const [id, data] of Object.entries(providersData)) {
      providers.push({
        id,
        name: data.name || id,
        npm: data.npm,
        env: data.env,
        doc: data.doc,
        api: data.api,
        logo: `${this.LOGO_BASE_URL}/${id}.svg`,
      });
    }

    return providers;
  }

  /**
   * 检查模型是否有变化
   */
  private hasModelChanged(
    oldModel: ModelsDevModel,
    newModel: ModelsDevModel
  ): boolean {
    return (
      oldModel.last_updated !== newModel.last_updated ||
      JSON.stringify(oldModel.limit) !== JSON.stringify(newModel.limit) ||
      JSON.stringify(oldModel.cost) !== JSON.stringify(newModel.cost)
    );
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(): boolean {
    if (this.modelCache.size === 0) {
      return false;
    }

    const now = Date.now();
    // 检查第一个模型的缓存是否过期
    const firstModel = this.modelCache.values().next().value as CachedModelData | undefined;
    if (!firstModel) {
      return false;
    }

    return now - firstModel.timestamp < firstModel.ttl;
  }

  /**
   * 获取模型信息
   */
  getModel(modelId: string): ModelsDevModel | null {
    const cached = this.modelCache.get(modelId);
    if (!cached) {
      return null;
    }

    // 检查是否过期
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.modelCache.delete(modelId);
      return null;
    }

    return cached.model;
  }

  /**
   * 获取 Provider 信息
   */
  getProvider(providerId: string): ModelsDevProvider | null {
    const cached = this.providerCache.get(providerId);
    if (!cached) {
      return null;
    }

    // 检查是否过期
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.providerCache.delete(providerId);
      return null;
    }

    return cached.provider;
  }

  /**
   * 获取所有模型
   */
  getAllModels(): ModelsDevModel[] {
    const now = Date.now();
    const models: ModelsDevModel[] = [];

    for (const [modelId, cached] of this.modelCache.entries()) {
      if (now - cached.timestamp <= cached.ttl) {
        models.push(cached.model);
      } else {
        this.modelCache.delete(modelId);
      }
    }

    return models;
  }

  /**
   * 获取所有 Providers
   */
  getAllProviders(): ModelsDevProvider[] {
    const now = Date.now();
    const providers: ModelsDevProvider[] = [];

    for (const [providerId, cached] of this.providerCache.entries()) {
      if (now - cached.timestamp <= cached.ttl) {
        providers.push(cached.provider);
      } else {
        this.providerCache.delete(providerId);
      }
    }

    return providers;
  }

  /**
   * 根据 Provider 获取模型列表
   */
  getModelsByProvider(providerId: string): ModelsDevModel[] {
    return this.getAllModels().filter((model) => model.provider === providerId);
  }

  /**
   * 搜索模型
   */
  searchModels(query: string): ModelsDevModel[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllModels().filter(
      (model) =>
        model.id.toLowerCase().includes(lowerQuery) ||
        model.name.toLowerCase().includes(lowerQuery) ||
        model.provider.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.modelCache.clear();
    this.providerCache.clear();
    this.lastFetchTime = 0;
    this.saveCacheToStorage();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    modelCount: number;
    providerCount: number;
    lastFetchTime: string | null;
    cacheAge: number;
    isExpired: boolean;
  } {
    const now = Date.now();
    const cacheAge = this.lastFetchTime > 0 ? now - this.lastFetchTime : 0;
    const isExpired = !this.isCacheValid();

    return {
      modelCount: this.modelCache.size,
      providerCount: this.providerCache.size,
      lastFetchTime: this.lastFetchTime > 0 ? new Date(this.lastFetchTime).toISOString() : null,
      cacheAge,
      isExpired,
    };
  }

  /**
   * 从持久化存储加载缓存
   */
  private async loadCacheFromStorage(): Promise<void> {
    try {
      // 这里可以从 VSCode 的 globalState 或文件系统加载
      // 暂时使用内存缓存
      console.log("Models.dev 缓存已初始化");
    } catch (error) {
      console.warn("加载 Models.dev 缓存失败:", error);
    }
  }

  /**
   * 保存缓存到持久化存储
   */
  private async saveCacheToStorage(): Promise<void> {
    try {
      // 这里可以保存到 VSCode 的 globalState 或文件系统
      // 暂时使用内存缓存
      console.log("Models.dev 缓存已保存");
    } catch (error) {
      console.warn("保存 Models.dev 缓存失败:", error);
    }
  }
}

/**
 * 便捷函数：拉取最新的 Models.dev 数据
 */
export async function fetchModelsDevData(options?: {
  forceRefresh?: boolean;
  cacheTTL?: number;
}): Promise<FetchResult> {
  const fetcher = ModelsDevFetcher.getInstance();
  return await fetcher.fetchLatestData(options);
}

/**
 * 便捷函数：获取模型信息
 */
export function getModelsDevModel(modelId: string): ModelsDevModel | null {
  const fetcher = ModelsDevFetcher.getInstance();
  return fetcher.getModel(modelId);
}

/**
 * 便捷函数：获取 Provider 信息
 */
export function getModelsDevProvider(providerId: string): ModelsDevProvider | null {
  const fetcher = ModelsDevFetcher.getInstance();
  return fetcher.getProvider(providerId);
}

/**
 * 便捷函数：搜索模型
 */
export function searchModelsDevModels(query: string): ModelsDevModel[] {
  const fetcher = ModelsDevFetcher.getInstance();
  return fetcher.searchModels(query);
}

/**
 * 便捷函数：获取缓存统计
 */
export function getModelsDevCacheStats() {
  const fetcher = ModelsDevFetcher.getInstance();
  return fetcher.getCacheStats();
}
