/**
 * 模型注册表模块入口
 * 提供统一的模型信息获取接口，支持增强的模型验证和代理检测
 */

export {
  EnhancedModelFetcher,
  EnhancedModelSpec,
  ModelFetchOptions,
} from "@/ai/model-registry/enhanced-model-fetcher";
export {
  ModelInfoCache,
  ModelInfoFetcher,
} from "@/ai/model-registry/model-info-fetcher";
export {
  findModelSpec,
  getDefaultTokenLimits,
  getModelSpecsByProvider,
  ModelSpec,
} from "@/ai/model-registry/model-specs";
export {
  ModelValidationResult,
  ModelValidator,
  ProxyDetectionResult,
} from "@/ai/model-registry/model-validator";

import { EnhancedModelFetcher } from "@/ai/model-registry/enhanced-model-fetcher";
import { ModelInfoFetcher } from "@/ai/model-registry/model-info-fetcher";
import { AIModel } from "@/ai/types";
import { formatMessage, getMessage } from "@/utils/i18n";

/**
 * 获取模型的准确token限制信息（增强版）
 * 这是主要的对外接口，替代直接使用 selectedModel.maxTokens?.input
 * 支持代理检测和模型验证
 */
export async function getAccurateTokenLimits(
  model: AIModel,
  profile: any,
  options?: {
    /** 是否启用增强验证 */
    enhanced?: boolean;
    /** 最小验证置信度 */
    minConfidence?: number;
    /** 是否允许模糊匹配 */
    allowFuzzyMatch?: boolean;
  }
): Promise<{ input: number; output: number }> {
  const {
    enhanced = true,
    minConfidence = 0.5,
    allowFuzzyMatch = true,
  } = options || {};

  if (enhanced) {
    // 使用增强的获取器
    const enhancedFetcher = EnhancedModelFetcher.getInstance();
    const modelInfo = await enhancedFetcher.getEnhancedModelInfo(
      model,
      profile,
      {
        minConfidence,
        allowFuzzyMatch,
        enableProxyDetection: true,
      }
    );

    // 如果验证置信度过低，记录警告
    if (modelInfo.validation && modelInfo.validation.confidence < 0.7) {
      console.warn(
        formatMessage("model.registry.validation.low.confidence.log", [
          model.id,
          modelInfo.validation.confidence.toFixed(2),
          modelInfo.validation.validationMethod,
        ])
      );
    }

    return modelInfo.maxTokens;
  } else {
    // 使用原有的获取器
    const fetcher = ModelInfoFetcher.getInstance();
    const modelInfo = await fetcher.getModelInfo(model, profile);
    return modelInfo.maxTokens;
  }
}

/**
 * 获取模型的完整规格信息（增强版）
 */
export async function getModelSpec(
  model: AIModel,
  profile: any,
  options?: {
    enhanced?: boolean;
    minConfidence?: number;
    allowFuzzyMatch?: boolean;
  }
) {
  const { enhanced = true } = options || {};

  if (enhanced) {
    const enhancedFetcher = EnhancedModelFetcher.getInstance();
    return await enhancedFetcher.getEnhancedModelInfo(model, profile, options);
  } else {
    const fetcher = ModelInfoFetcher.getInstance();
    return await fetcher.getModelInfo(model, profile);
  }
}

/**
 * 获取增强的模型规格信息
 * 包含验证信息和代理检测结果
 */
export async function getEnhancedModelSpec(
  model: AIModel,
  profile: any,
  options?: {
    forceRefresh?: boolean;
    minConfidence?: number;
    allowFuzzyMatch?: boolean;
    enableProxyDetection?: boolean;
  }
) {
  const enhancedFetcher = EnhancedModelFetcher.getInstance();
  return await enhancedFetcher.getEnhancedModelInfo(model, profile, options);
}

/**
 * 验证模型信息的准确性
 */
export async function validateModelInfo(
  model: AIModel,
  profile: any
): Promise<{
  isValid: boolean;
  confidence: number;
  issues: string[];
  recommendations: string[];
}> {
  try {
    const enhancedSpec = await getEnhancedModelSpec(model, profile, {
      forceRefresh: true,
      enableProxyDetection: true,
    });

    const result = {
      isValid: true,
      confidence: enhancedSpec.validation?.confidence || 0,
      issues: [] as string[],
      recommendations: [] as string[],
    };

    // 检查验证置信度
    if (result.confidence < 0.5) {
      result.isValid = false;
      result.issues.push(
        formatMessage("model.registry.validation.low.confidence.issue", [
          result.confidence.toFixed(2),
        ])
      );
      result.recommendations.push(
        getMessage("model.registry.validation.check.model.id")
      );
    }

    // 检查代理检测结果
    if (enhancedSpec.proxyInfo?.isProxy) {
      result.issues.push(
        formatMessage("model.registry.proxy.detected", [
          enhancedSpec.proxyInfo.proxyType,
        ])
      );
      result.recommendations.push(
        getMessage("model.registry.proxy.check.accuracy")
      );
    }

    // 检查验证方法
    if (enhancedSpec.validation?.validationMethod === "fallback") {
      result.issues.push(getMessage("model.registry.validation.fallback.used"));
      result.recommendations.push(
        getMessage("model.registry.validation.update.db")
      );
    }

    return result;
  } catch (error) {
    return {
      isValid: false,
      confidence: 0,
      issues: [
        formatMessage("model.registry.validation.error", [
          error instanceof Error ? error.message : String(error),
        ]),
      ],
      recommendations: [getMessage("model.registry.check.network")],
    };
  }
}

/**
 * 清除模型信息缓存
 */
export function clearModelCache(): void {
  const fetcher = ModelInfoFetcher.getInstance();
  const enhancedFetcher = EnhancedModelFetcher.getInstance();

  fetcher.clearCache();
  enhancedFetcher.clearCache();
}

/**
 * 获取缓存统计信息
 */
export function getModelCacheStats() {
  const fetcher = ModelInfoFetcher.getInstance();
  const enhancedFetcher = EnhancedModelFetcher.getInstance();

  const basicStats = fetcher.getCacheStats();
  const enhancedStats = enhancedFetcher.getCacheStats();

  return {
    basic: basicStats,
    enhanced: enhancedStats,
    total: {
      cached: basicStats.total + enhancedStats.total,
      expired: basicStats.expired + enhancedStats.expired,
    },
  };
}

/**
 * 批量验证多个模型
 */
export async function validateMultipleModels(
  models: AIModel[],
  profile: any
): Promise<{
  valid: AIModel[];
  invalid: Array<{ model: AIModel; issues: string[] }>;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    averageConfidence: number;
  };
}> {
  const results = await Promise.allSettled(
    models.map(async (model) => {
      const validation = await validateModelInfo(model, profile);
      return { model, validation };
    })
  );

  const valid: AIModel[] = [];
  const invalid: Array<{ model: AIModel; issues: string[] }> = [];
  let totalConfidence = 0;

  for (const result of results) {
    if (result.status === "fulfilled") {
      const { model, validation } = result.value;
      totalConfidence += validation.confidence;

      if (validation.isValid) {
        valid.push(model);
      } else {
        invalid.push({ model, issues: validation.issues });
      }
    } else {
      // 处理验证失败的情况
      console.error(
        `${getMessage("model.registry.validation.failed")}:`,
        result.reason
      );
    }
  }

  return {
    valid,
    invalid,
    summary: {
      total: models.length,
      valid: valid.length,
      invalid: invalid.length,
      averageConfidence: totalConfidence / models.length,
    },
  };
}
