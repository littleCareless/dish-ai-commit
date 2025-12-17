/**
 * 模型信息更新服务
 * 负责定期更新模型规格数据，确保信息的准确性
 */

import { ModelInfoFetcher } from "@/ai/model-registry/model-info-fetcher";
import { ALL_MODEL_SPECS } from "@/ai/model-registry/model-specs";
import { AIModel } from "@/ai/types";
import { ProfileManagerService } from "@/services/profile-manager/profile-manager-service";
import * as i18n from "@/utils/i18n";
import { notify } from "@/utils/notification/notification-manager";

export interface UpdateResult {
  success: boolean;
  updatedModels: string[];
  failedModels: string[];
  errors: string[];
}

/**
 * 模型更新服务类
 */
export class ModelUpdateService {
  private static instance: ModelUpdateService;
  private fetcher: ModelInfoFetcher;
  private updateInProgress = false;

  private constructor() {
    this.fetcher = ModelInfoFetcher.getInstance();
  }

  public static getInstance(): ModelUpdateService {
    if (!ModelUpdateService.instance) {
      ModelUpdateService.instance = new ModelUpdateService();
    }
    return ModelUpdateService.instance;
  }

  /**
   * 更新所有模型的信息
   */
  async updateAllModels(profile: any): Promise<UpdateResult> {
    if (this.updateInProgress) {
      throw new Error(i18n.formatMessage("model.update.inProgress"));
    }

    this.updateInProgress = true;
    const result: UpdateResult = {
      success: true,
      updatedModels: [],
      failedModels: [],
      errors: [],
    };

    try {
      // 清除缓存以强制重新获取
      this.fetcher.clearCache();

      // 更新所有已知模型
      for (const spec of ALL_MODEL_SPECS) {
        try {
          const aiModel: AIModel = {
            id: spec.id as any,
            name: spec.name,
            maxTokens: spec.maxTokens,
            provider: spec.provider as any,
          };

          await this.fetcher.getModelInfo(aiModel, profile);
          result.updatedModels.push(spec.id);
        } catch (error) {
          result.failedModels.push(spec.id);
          result.errors.push(
            `${spec.id}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      if (result.failedModels.length > 0) {
        result.success = false;
      }

      // 显示更新结果通知
      if (result.success) {
        notify.info("model.update.success", [
          result.updatedModels.length.toString(),
        ]);
      } else {
        notify.warn("model.update.partial", [
          result.updatedModels.length.toString(),
          result.failedModels.length.toString(),
        ]);
      }
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : String(error)
      );
      notify.error("model.update.failed", [
        error instanceof Error ? error.message : String(error),
      ]);
    } finally {
      this.updateInProgress = false;
    }

    return result;
  }

  /**
   * 更新特定提供商的模型信息
   */
  async updateProviderModels(
    providerId: string,
    profile: any
  ): Promise<UpdateResult> {
    if (this.updateInProgress) {
      throw new Error(i18n.formatMessage("model.update.inProgress"));
    }

    this.updateInProgress = true;
    const result: UpdateResult = {
      success: true,
      updatedModels: [],
      failedModels: [],
      errors: [],
    };

    try {
      const providerSpecs = ALL_MODEL_SPECS.filter(
        (spec) => spec.provider.id === providerId
      );

      if (providerSpecs.length === 0) {
        throw new Error(
          i18n.formatMessage("model.update.providerSpecsNotFound", [providerId])
        );
      }

      for (const spec of providerSpecs) {
        try {
          const aiModel: AIModel = {
            id: spec.id as any,
            name: spec.name,
            maxTokens: spec.maxTokens,
            provider: spec.provider as any,
          };

          // 清除特定模型的缓存
          this.fetcher.clearCache();
          await this.fetcher.getModelInfo(aiModel, profile);
          result.updatedModels.push(spec.id);
        } catch (error) {
          result.failedModels.push(spec.id);
          result.errors.push(
            `${spec.id}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      if (result.failedModels.length > 0) {
        result.success = false;
      }

      // 显示更新结果通知
      if (result.success) {
        notify.info("model.provider.update.success", [
          providerId,
          result.updatedModels.length.toString(),
        ]);
      } else {
        notify.warn("model.provider.update.partial", [
          providerId,
          result.updatedModels.length.toString(),
          result.failedModels.length.toString(),
        ]);
      }
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : String(error)
      );
      notify.error("model.provider.update.failed", [
        providerId,
        error instanceof Error ? error.message : String(error),
      ]);
    } finally {
      this.updateInProgress = false;
    }

    return result;
  }

  /**
   * 检查模型信息是否需要更新
   */
  async checkForUpdates(): Promise<{
    needsUpdate: boolean;
    outdatedModels: string[];
    recommendations: string[];
  }> {
    const result = {
      needsUpdate: false,
      outdatedModels: [] as string[],
      recommendations: [] as string[],
    };

    const cacheStats = this.fetcher.getCacheStats();

    // 检查缓存过期情况
    if (cacheStats.expired > 0) {
      result.needsUpdate = true;
      result.recommendations.push(
        i18n.formatMessage("model.update.cacheExpired", [cacheStats.expired])
      );
    }

    // 检查是否有使用默认值的模型
    for (const spec of ALL_MODEL_SPECS) {
      if (spec.source === "fallback") {
        result.needsUpdate = true;
        result.outdatedModels.push(spec.id);
      }
    }

    if (result.outdatedModels.length > 0) {
      result.recommendations.push(
        i18n.formatMessage("model.update.usingFallback", [
          result.outdatedModels.join(", "),
        ])
      );
    }

    return result;
  }

  /**
   * 获取更新状态
   */
  isUpdateInProgress(): boolean {
    return this.updateInProgress;
  }

  /**
   * 获取模型信息统计
   */
  getModelStats(): {
    totalModels: number;
    cachedModels: number;
    expiredCache: number;
    providerBreakdown: Record<string, number>;
  } {
    const cacheStats = this.fetcher.getCacheStats();
    const providerBreakdown: Record<string, number> = {};

    for (const spec of ALL_MODEL_SPECS) {
      const providerId = spec.provider.id;
      providerBreakdown[providerId] = (providerBreakdown[providerId] || 0) + 1;
    }

    return {
      totalModels: ALL_MODEL_SPECS.length,
      cachedModels: cacheStats.total,
      expiredCache: cacheStats.expired,
      providerBreakdown,
    };
  }
}

/**
 * 便捷函数：更新所有模型信息
 */
export async function updateAllModelInfo(): Promise<UpdateResult> {
  const service = ModelUpdateService.getInstance();
  const profileManager = ProfileManagerService.getInstance();
  const profile = profileManager.getProfileForMode();
  return await service.updateAllModels(profile);
}

/**
 * 便捷函数：更新特定提供商的模型信息
 */
export async function updateProviderModelInfo(
  providerId: string
): Promise<UpdateResult> {
  const service = ModelUpdateService.getInstance();
  const profileManager = ProfileManagerService.getInstance();
  const profile = profileManager.getProfileForMode();
  return await service.updateProviderModels(providerId, profile);
}

/**
 * 便捷函数：检查是否需要更新
 */
export async function checkModelUpdates() {
  const service = ModelUpdateService.getInstance();
  return await service.checkForUpdates();
}
