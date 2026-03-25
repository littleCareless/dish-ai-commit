import { stateManager } from "@/utils/state/state-manager";

export interface SyncedCatalogEntry {
  providerId: string;
  modelId: string;
  inputLimit: number;
  outputLimit?: number;
  source: "openrouter" | "litellm";
  confidence: "medium";
  updatedAt: string;
}

interface SyncState {
  entries: Record<string, SyncedCatalogEntry>;
  lastSyncAt?: string;
}

export interface ThirdPartySyncResult {
  success: boolean;
  totalEntries: number;
  updatedEntries: number;
  errors: string[];
}

const STORAGE_KEY = "model.registry.syncedCatalog";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const LITELLM_MODEL_MAP_URL =
  "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

export class ThirdPartyModelCatalogSyncService {
  private static instance: ThirdPartyModelCatalogSyncService;

  static getInstance(): ThirdPartyModelCatalogSyncService {
    if (!this.instance) {
      this.instance = new ThirdPartyModelCatalogSyncService();
    }
    return this.instance;
  }

  async syncAll(): Promise<ThirdPartySyncResult> {
    const errors: string[] = [];
    const updatedKeys = new Set<string>();
    const current = this.getState();
    const merged: Record<string, SyncedCatalogEntry> = { ...current.entries };

    const openRouterResult = await this.fetchOpenRouterEntries();
    if (openRouterResult.error) {
      errors.push(openRouterResult.error);
    } else {
      this.mergeEntries(merged, openRouterResult.entries, updatedKeys);
    }

    const liteLLMResult = await this.fetchLiteLLMEntries();
    if (liteLLMResult.error) {
      errors.push(liteLLMResult.error);
    } else {
      this.mergeEntries(merged, liteLLMResult.entries, updatedKeys);
    }

    const nextState: SyncState = {
      entries: merged,
      lastSyncAt: new Date().toISOString(),
    };
    await stateManager.setGlobal(STORAGE_KEY, nextState);

    return {
      success: errors.length === 0,
      totalEntries: Object.keys(merged).length,
      updatedEntries: updatedKeys.size,
      errors,
    };
  }

  getEntry(providerId: string, modelId: string): SyncedCatalogEntry | null {
    const key = this.buildKey(providerId, modelId);
    return this.getState().entries[key] ?? null;
  }

  getAllEntries(): SyncedCatalogEntry[] {
    return Object.values(this.getState().entries);
  }

  getSummary(): { totalEntries: number; lastSyncAt?: string } {
    const state = this.getState();
    return {
      totalEntries: Object.keys(state.entries).length,
      lastSyncAt: state.lastSyncAt,
    };
  }

  private getState(): SyncState {
    return stateManager.getGlobal<SyncState>(STORAGE_KEY, { entries: {} });
  }

  private mergeEntries(
    target: Record<string, SyncedCatalogEntry>,
    entries: SyncedCatalogEntry[],
    updatedKeys?: Set<string>,
  ): void {
    for (const entry of entries) {
      const key = this.buildKey(entry.providerId, entry.modelId);
      const prev = target[key];
      if (
        !prev ||
        prev.inputLimit !== entry.inputLimit ||
        prev.outputLimit !== entry.outputLimit ||
        prev.source !== entry.source
      ) {
        target[key] = entry;
        updatedKeys?.add(key);
      }
    }
  }

  private async fetchOpenRouterEntries(): Promise<{
    entries: SyncedCatalogEntry[];
    error?: string;
  }> {
    try {
      const response = await fetch(OPENROUTER_MODELS_URL, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        return {
          entries: [],
          error: `OpenRouter sync failed: HTTP ${response.status}`,
        };
      }

      const json = (await response.json()) as any;
      const models = Array.isArray(json?.data) ? json.data : [];
      const now = new Date().toISOString();
      const entries: SyncedCatalogEntry[] = [];

      for (const model of models) {
        const id = String(model?.id ?? "").trim();
        if (!id) {
          continue;
        }
        const inputLimit = Number(model?.context_length);
        const outputLimit = Number(
          model?.top_provider?.max_completion_tokens ??
            model?.architecture?.output_tokens,
        );

        if (!Number.isFinite(inputLimit) || inputLimit <= 0) {
          continue;
        }

        entries.push({
          providerId: "openrouter",
          modelId: id.toLowerCase(),
          inputLimit: Math.floor(inputLimit),
          outputLimit:
            Number.isFinite(outputLimit) && outputLimit > 0
              ? Math.floor(outputLimit)
              : undefined,
          source: "openrouter",
          confidence: "medium",
          updatedAt: now,
        });
      }

      return { entries };
    } catch (error) {
      return {
        entries: [],
        error: `OpenRouter sync failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async fetchLiteLLMEntries(): Promise<{
    entries: SyncedCatalogEntry[];
    error?: string;
  }> {
    try {
      const response = await fetch(LITELLM_MODEL_MAP_URL, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        return {
          entries: [],
          error: `LiteLLM sync failed: HTTP ${response.status}`,
        };
      }

      const json = (await response.json()) as Record<string, any>;
      const now = new Date().toISOString();
      const entries: SyncedCatalogEntry[] = [];

      for (const [rawKey, meta] of Object.entries(json ?? {})) {
        const key = String(rawKey).trim();
        if (!key) {
          continue;
        }

        const inputLimit = Number(meta?.max_input_tokens ?? meta?.max_tokens);
        const outputLimit = Number(meta?.max_output_tokens);
        if (!Number.isFinite(inputLimit) || inputLimit <= 0) {
          continue;
        }

        const [providerId, ...modelParts] = key.includes("/")
          ? key.split("/")
          : ["litellm", key];
        const modelId = modelParts.length > 0 ? modelParts.join("/") : key;

        entries.push({
          providerId: providerId.toLowerCase(),
          modelId: modelId.toLowerCase(),
          inputLimit: Math.floor(inputLimit),
          outputLimit:
            Number.isFinite(outputLimit) && outputLimit > 0
              ? Math.floor(outputLimit)
              : undefined,
          source: "litellm",
          confidence: "medium",
          updatedAt: now,
        });
      }

      return { entries };
    } catch (error) {
      return {
        entries: [],
        error: `LiteLLM sync failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private buildKey(providerId: string, modelId: string): string {
    return `${providerId.toLowerCase()}:${modelId.toLowerCase()}`;
  }
}
