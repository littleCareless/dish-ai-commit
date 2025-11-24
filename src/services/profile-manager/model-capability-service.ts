import { ProviderSettingsWithId } from "@/services/profile-manager/types";
import { AIProviderFactory } from "@/ai/ai-provider-factory";

import { AIModel } from "@/ai/types";

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

    public async getModelInfo(config: ProviderSettingsWithId): Promise<AIModel | null> {
        if (!config.id || !config.apiModelId) {
            return null;
        }

        const cacheKey = `${config.id}-${config.apiModelId}`;
        if (this.capabilityCache.has(cacheKey)) {
            return this.capabilityCache.get(cacheKey)!;
        }

        try {
            const apiHandler = AIProviderFactory.getProvider(config.apiProvider);
            const models = await apiHandler.getModels();
            const model = models.find(m => m.id === config.apiModelId);

            if (model) {
                this.capabilityCache.set(cacheKey, model);
                return model;
            }
            
            return null;
        } catch (error) {
            console.warn(`[ModelCapabilityService] Failed to get model info for config '${config.id}':`, error);
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