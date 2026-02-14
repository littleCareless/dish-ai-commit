/**
 * Models.dev 集成模块
 * 将 Models.dev 数据与现有的模型注册表系统整合
 */

import { ModelSpec } from "@/ai/model-registry/model-specs";
import { ModelsDevFetcher } from "@/ai/model-registry/models-dev-fetcher";
import { ModelsDevModel, ModelsDevProvider } from "@/ai/model-registry/models-dev-types";

/**
 * 转换 Models.dev 模型到内部 ModelSpec 格式
 */
export function convertModelsDevToModelSpec(
  model: ModelsDevModel,
  provider: ModelsDevProvider
): ModelSpec {
  return {
    id: model.id,
    name: model.name,
    provider: {
      id: provider.id,
      name: provider.name,
    },
    maxTokens: {
      input: model.limit?.context || 8192,
      output: model.limit?.output || 4096,
    },
    lastUpdated: model.last_updated || new Date().toISOString(),
    source: "api",
    capabilities: {
      streaming: true, // 大多数现代模型支持流式
      functionCalling: model.tool_call || false,
      vision: model.modalities?.input?.includes("image") || false,
    },
    cost: model.cost
      ? {
          input: model.cost.input || 0,
          output: model.cost.output || 0,
        }
      : undefined,
  };
}

/**
 * Models.dev 集成服务
 */
export class ModelsDevIntegration {
  private static instance: ModelsDevIntegration;
  private fetcher: ModelsDevFetcher;

  private constructor() {
    this.fetcher = ModelsDevFetcher.getInstance();
  }

  public static getInstance(): ModelsDevIntegration {
    if (!ModelsDevIntegration.instance) {
      ModelsDevIntegration.instance = new ModelsDevIntegration();
    }
    return ModelsDevIntegration.instance;
  }

  /**
   * 从 Models.dev 获取模型规格
   */
  async getModelSpec(modelId: string): Promise<ModelSpec | null> {
    const model = this.fetcher.getModel(modelId);
    if (!model) {
      return null;
    }

    const provider = this.fetcher.getProvider(model.provider);
    if (!provider) {
      return null;
    }

    return convertModelsDevToModelSpec(model, provider);
  }

  /**
   * 从 Models.dev 获取 Provider 的所有模型
   */
  async getProviderModels(providerId: string): Promise<ModelSpec[]> {
    const models = this.fetcher.getModelsByProvider(providerId);
    const provider = this.fetcher.getProvider(providerId);

    if (!provider) {
      return [];
    }

    return models.map((model) => convertModelsDevToModelSpec(model, provider));
  }

  /**
   * 搜索模型并转换为 ModelSpec
   */
  async searchModels(query: string): Promise<ModelSpec[]> {
    const models = this.fetcher.searchModels(query);
    const specs: ModelSpec[] = [];

    for (const model of models) {
      const provider = this.fetcher.getProvider(model.provider);
      if (provider) {
        specs.push(convertModelsDevToModelSpec(model, provider));
      }
    }

    return specs;
  }

  /**
   * 获取模型的详细信息（包含 Models.dev 特有字段）
   */
  async getEnhancedModelInfo(modelId: string): Promise<{
    spec: ModelSpec | null;
    modelsDevData: ModelsDevModel | null;
    provider: ModelsDevProvider | null;
  }> {
    const model = this.fetcher.getModel(modelId);
    const provider = model ? this.fetcher.getProvider(model.provider) : null;
    const spec = model && provider ? convertModelsDevToModelSpec(model, provider) : null;

    return {
      spec,
      modelsDevData: model,
      provider,
    };
  }

  /**
   * 检查模型是否在 Models.dev 中存在
   */
  isModelAvailable(modelId: string): boolean {
    return this.fetcher.getModel(modelId) !== null;
  }

  /**
   * 获取所有可用的 Provider
   */
  getAvailableProviders(): ModelsDevProvider[] {
    return this.fetcher.getAllProviders();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalModels: number;
    totalProviders: number;
    modelsByProvider: Record<string, number>;
    cacheStats: ReturnType<ModelsDevFetcher["getCacheStats"]>;
  } {
    const models = this.fetcher.getAllModels();
    const providers = this.fetcher.getAllProviders();

    const modelsByProvider: Record<string, number> = {};
    for (const model of models) {
      modelsByProvider[model.provider] = (modelsByProvider[model.provider] || 0) + 1;
    }

    return {
      totalModels: models.length,
      totalProviders: providers.length,
      modelsByProvider,
      cacheStats: this.fetcher.getCacheStats(),
    };
  }

  /**
   * 根据能力筛选模型
   */
  filterModelsByCapabilities(options: {
    reasoning?: boolean;
    toolCall?: boolean;
    vision?: boolean;
    attachment?: boolean;
  }): ModelsDevModel[] {
    const models = this.fetcher.getAllModels();

    return models.filter((model) => {
      if (options.reasoning !== undefined && model.reasoning !== options.reasoning) {
        return false;
      }
      if (options.toolCall !== undefined && model.tool_call !== options.toolCall) {
        return false;
      }
      if (options.vision !== undefined) {
        const hasVision = model.modalities?.input?.includes("image");
        if (hasVision !== options.vision) {
          return false;
        }
      }
      if (options.attachment !== undefined && model.attachment !== options.attachment) {
        return false;
      }
      return true;
    });
  }

  /**
   * 根据成本筛选模型
   */
  filterModelsByCost(options: {
    maxInputCost?: number;
    maxOutputCost?: number;
  }): ModelsDevModel[] {
    const models = this.fetcher.getAllModels();

    return models.filter((model) => {
      if (!model.cost) {
        return false;
      }
      if (options.maxInputCost !== undefined && model.cost.input && model.cost.input > options.maxInputCost) {
        return false;
      }
      if (options.maxOutputCost !== undefined && model.cost.output && model.cost.output > options.maxOutputCost) {
        return false;
      }
      return true;
    });
  }

  /**
   * 获取推荐模型（基于能力和成本）
   */
  getRecommendedModels(options?: {
    capabilities?: {
      reasoning?: boolean;
      toolCall?: boolean;
      vision?: boolean;
    };
    maxCost?: number;
    limit?: number;
  }): ModelsDevModel[] {
    let models = this.fetcher.getAllModels();

    // 按能力筛选
    if (options?.capabilities) {
      models = this.filterModelsByCapabilities(options.capabilities);
    }

    // 按成本筛选
    if (options?.maxCost !== undefined) {
      models = models.filter((model) => {
        if (!model.cost) {return false;}
        const avgCost = ((model.cost.input || 0) + (model.cost.output || 0)) / 2;
        return avgCost <= options.maxCost!;
      });
    }

    // 按成本排序（从低到高）
    models.sort((a, b) => {
      const costA = a.cost ? ((a.cost.input || 0) + (a.cost.output || 0)) / 2 : Infinity;
      const costB = b.cost ? ((b.cost.input || 0) + (b.cost.output || 0)) / 2 : Infinity;
      return costA - costB;
    });

    // 限制数量
    if (options?.limit) {
      models = models.slice(0, options.limit);
    }

    return models;
  }
}

/**
 * 便捷函数：获取模型规格
 */
export async function getModelsDevModelSpec(modelId: string): Promise<ModelSpec | null> {
  const integration = ModelsDevIntegration.getInstance();
  return await integration.getModelSpec(modelId);
}

/**
 * 便捷函数：搜索模型
 */
export async function searchModelsDevModels(query: string): Promise<ModelSpec[]> {
  const integration = ModelsDevIntegration.getInstance();
  return await integration.searchModels(query);
}

/**
 * 便捷函数：获取统计信息
 */
export function getModelsDevStats() {
  const integration = ModelsDevIntegration.getInstance();
  return integration.getStats();
}

/**
 * 便捷函数：获取推荐模型
 */
export function getRecommendedModels(options?: Parameters<ModelsDevIntegration["getRecommendedModels"]>[0]) {
  const integration = ModelsDevIntegration.getInstance();
  return integration.getRecommendedModels(options);
}
