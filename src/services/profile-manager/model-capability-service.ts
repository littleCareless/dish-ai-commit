import { AIProviderFactory } from "@/ai/ai-provider-factory";
import { AIModel } from "@/ai/types";
import { ProviderConfig } from "@/types/provider-config";

export class ModelCapabilityService {
  private static _instance: ModelCapabilityService;
  private readonly capabilityCache = new Map<string, AIModel>();

  private constructor() {
    // private constructor for singleton
  }

  public static get instance(): ModelCapabilityService {
    if (!ModelCapabilityService._instance) {
      ModelCapabilityService._instance = new ModelCapabilityService();
    }
    return ModelCapabilityService._instance;
  }

  public async getModelInfo(config: ProviderConfig): Promise<AIModel | null> {
    if (!config.id || !config.modelId) {
      return null;
    }

    const cacheKey = `${config.id}-${config.modelId}`;
    if (this.capabilityCache.has(cacheKey)) {
      return this.capabilityCache.get(cacheKey)!;
    }

    try {
      // 🔥 关键修复：传递 provider 配置以确保 API key 等配置被正确传递
      const providerConfig = {
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.modelId,
        // 传递其他可能的配置字段
        ...(config as any),
      };
      const apiHandler = await AIProviderFactory.getProvider(
        config.provider,
        providerConfig
      );
      // 如果 provider 支持 setGlobalConfig，设置全局配置
      if (apiHandler && typeof apiHandler.setGlobalConfig === "function") {
        apiHandler.setGlobalConfig(providerConfig);
      }
      const models = await apiHandler.getModels();
      const model = models.find((m) => m.id === config.modelId);

      if (model) {
        this.capabilityCache.set(cacheKey, model);
        return model;
      }

      return null;
    } catch (error) {
      console.warn(
        `[ModelCapabilityService] Failed to get model info for config '${config.id}':`,
        error
      );
      return null;
    }
  }

  public clearCache(): void {
    this.capabilityCache.clear();
  }

  public evict(configId: string): void {
    this.capabilityCache.delete(configId);
  }
}
