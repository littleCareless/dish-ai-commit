import { AIModel } from "@/ai/types";
import { PRESET_MODELS } from "@/services/storage/model-presets";
import { ModelsDevFetcher } from "@/ai/model-registry/models-dev-fetcher";
import { DISH_CONFIG_PREFIX } from "@/config/constants";
import { stateManager } from "@/utils/state/state-manager";
import { CustomModelRegistry } from "@shared/types/model-custom";
import {
  SyncedCatalogEntry,
  ThirdPartyModelCatalogSyncService,
} from "@/ai/model-registry/third-party-model-catalog-sync-service";

export interface ResolvedModelLimit {
  inputLimit: number;
  outputLimit?: number;
  source:
    | "custom-registry"
    | "preset"
    | "synced-openrouter"
    | "synced-litellm"
    | "models-dev"
    | "runtime";
  confidence: "high" | "medium" | "low";
}

export class ModelCatalogService {
  private static instance: ModelCatalogService;
  private static readonly CUSTOM_MODEL_KEY = `${DISH_CONFIG_PREFIX}_model_custom`;
  private readonly syncService = ThirdPartyModelCatalogSyncService.getInstance();
  private readonly modelsDevFetcher = ModelsDevFetcher.getInstance();

  static getInstance(): ModelCatalogService {
    if (!this.instance) {
      this.instance = new ModelCatalogService();
    }
    return this.instance;
  }

  async resolveInputLimit(
    model: AIModel,
    options: { enableSyncedCatalog?: boolean } = {},
  ): Promise<ResolvedModelLimit | null> {
    const providerId = String(model.provider?.id ?? "").toLowerCase();
    const modelId = String(model.id ?? "").toLowerCase();

    const custom = this.findCustomRegistryModel(providerId, modelId);
    if (custom) {
      return {
        inputLimit: custom.inputLimit,
        outputLimit: custom.outputLimit,
        source: "custom-registry",
        confidence: "high",
      };
    }

    const preset = this.findPreset(providerId, modelId);
    if (preset) {
      return {
        inputLimit: preset.maxTokens.input,
        outputLimit: preset.maxTokens.output,
        source: "preset",
        confidence: "high",
      };
    }

    const enableSyncedCatalog = options.enableSyncedCatalog !== false;
    if (enableSyncedCatalog) {
      const synced = this.findSynced(providerId, modelId);
      if (synced) {
        return {
          inputLimit: synced.inputLimit,
          outputLimit: synced.outputLimit,
          source:
            synced.source === "openrouter"
              ? "synced-openrouter"
              : "synced-litellm",
          confidence: "medium",
        };
      }
    }

    const modelsDevModel = this.modelsDevFetcher.getModel(modelId);
    if (modelsDevModel?.limit?.context) {
      return {
        inputLimit: modelsDevModel.limit.context,
        outputLimit: modelsDevModel.limit.output,
        source: "models-dev",
        confidence: "medium",
      };
    }

    const runtimeLimit = Number(model.maxTokens?.input);
    if (Number.isFinite(runtimeLimit) && runtimeLimit > 0) {
      return {
        inputLimit: runtimeLimit,
        outputLimit: model.maxTokens?.output,
        source: "runtime",
        confidence: "low",
      };
    }

    return null;
  }

  async syncThirdPartyCatalog(): Promise<{
    success: boolean;
    totalEntries: number;
    updatedEntries: number;
    errors: string[];
  }> {
    return this.syncService.syncAll();
  }

  private findPreset(providerId: string, modelId: string) {
    return PRESET_MODELS.find(
      (item) =>
        item.providerId.toLowerCase() === providerId &&
        item.id.toLowerCase() === modelId,
    );
  }

  private findSynced(
    providerId: string,
    modelId: string,
  ): SyncedCatalogEntry | null {
    const exact = this.syncService.getEntry(providerId, modelId);
    if (exact) {
      return exact;
    }

    const byModel = this.syncService
      .getAllEntries()
      .find((item) => item.modelId === modelId);
    return byModel ?? null;
  }

  private findCustomRegistryModel(
    providerId: string,
    modelId: string,
  ): { inputLimit: number; outputLimit?: number } | null {
    const data = stateManager.getGlobal<string>(
      ModelCatalogService.CUSTOM_MODEL_KEY,
    );
    if (!data) {
      return null;
    }

    try {
      const registry = JSON.parse(data) as CustomModelRegistry;
      const key = `${providerId}_${modelId}`;
      const model = registry?.models?.[key];
      if (!model) {
        return null;
      }

      const contextWindow = Number(model.contextWindow);
      const maxInput = Number(model.maxTokens?.input);
      const maxOutput = Number(model.maxTokens?.output);
      const inputLimit =
        Number.isFinite(contextWindow) && contextWindow > 0
          ? Math.floor(contextWindow)
          : Number.isFinite(maxInput) && maxInput > 0
            ? Math.floor(maxInput)
            : null;

      if (!inputLimit) {
        return null;
      }

      return {
        inputLimit,
        outputLimit:
          Number.isFinite(maxOutput) && maxOutput > 0
            ? Math.floor(maxOutput)
            : undefined,
      };
    } catch {
      return null;
    }
  }
}
