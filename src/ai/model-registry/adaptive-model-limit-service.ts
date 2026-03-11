import { stateManager } from "@/utils/state/state-manager";

export interface LearnedModelInputLimit {
  providerId: string;
  modelId: string;
  inputLimit: number;
  source: "runtime-error";
  updatedAt: string;
  evidence?: string;
}

type LearnedLimitMap = Record<string, LearnedModelInputLimit>;

const STORAGE_KEY = "model.registry.learnedInputLimits";
const MIN_REASONABLE_LIMIT = 1024;
const MAX_REASONABLE_LIMIT = 10_000_000;

/**
 * Stores provider/model input-limit hints learned from runtime errors (e.g. 429).
 */
export class AdaptiveModelLimitService {
  private static instance: AdaptiveModelLimitService;

  static getInstance(): AdaptiveModelLimitService {
    if (!this.instance) {
      this.instance = new AdaptiveModelLimitService();
    }
    return this.instance;
  }

  getLearnedInputLimit(providerId: string, modelId: string): number | null {
    const key = this.buildKey(providerId, modelId);
    const limits = this.getAllLimits();
    const entry = limits[key];
    if (!entry) {
      return null;
    }

    return entry.inputLimit;
  }

  async recordLearnedInputLimit(
    providerId: string,
    modelId: string,
    inputLimit: number,
    evidence?: string,
  ): Promise<void> {
    if (!Number.isFinite(inputLimit)) {
      return;
    }

    const normalized = Math.floor(inputLimit);
    if (
      normalized < MIN_REASONABLE_LIMIT ||
      normalized > MAX_REASONABLE_LIMIT
    ) {
      return;
    }

    const key = this.buildKey(providerId, modelId);
    const limits = this.getAllLimits();
    const current = limits[key];

    if (current && current.inputLimit <= normalized) {
      return;
    }

    limits[key] = {
      providerId,
      modelId,
      inputLimit: normalized,
      source: "runtime-error",
      updatedAt: new Date().toISOString(),
      evidence: evidence?.slice(0, 500),
    };

    await stateManager.setGlobal(STORAGE_KEY, limits);
  }

  private getAllLimits(): LearnedLimitMap {
    return stateManager.getGlobal<LearnedLimitMap>(STORAGE_KEY, {});
  }

  private buildKey(providerId: string, modelId: string): string {
    return `${providerId.toLowerCase()}:${modelId.toLowerCase()}`;
  }
}

