/**
 * 模型注册表模块入口
 * 提供统一的模型信息获取接口，支持增强的模型验证和代理检测
 */

export { ModelSpec, findModelSpec, getModelSpecsByProvider, getDefaultTokenLimits } from './model-specs';
export { ModelInfoFetcher, ModelInfoCache } from './model-info-fetcher';
export { EnhancedModelFetcher, EnhancedModelSpec, ModelFetchOptions } from './enhanced-model-fetcher';
export { ModelValidator, ModelValidationResult, ProxyDetectionResult } from './model-validator';

import { ModelInfoFetcher } from './model-info-fetcher';
import { EnhancedModelFetcher } from './enhanced-model-fetcher';
import { AIModel } from '../types';

/**
 * 获取模型的准确token限制信息（增强版）
 * 这是主要的对外接口，替代直接使用 selectedModel.maxTokens?.input
 * 支持代理检测和模型验证
 */
export async function getAccurateTokenLimits(
  model: AIModel,
  options?: {
    /** 是否启用增强验证 */
    enhanced?: boolean;
    /** 最小验证置信度 */
    minConfidence?: number;
    /** 是否允许模糊匹配 */
    allowFuzzyMatch?: boolean;
  }
): Promise<{ input: number; output: number }> {
  const { enhanced = true, minConfidence = 0.5, allowFuzzyMatch = true } = options || {};

  if (enhanced) {
    // 使用增强的获取器
    const enhancedFetcher = EnhancedModelFetcher.getInstance();
    const modelInfo = await enhancedFetcher.getEnhancedModelInfo(model, {
      minConfidence,
      allowFuzzyMatch,
      enableProxyDetection: true
    });
    
    // 如果验证置信度过低，记录警告
    if (modelInfo.validation && modelInfo.validation.confidence < 0.7) {
      console.warn(`模型信息验证置信度较低: ${model.id}, 置信度: ${modelInfo.validation.confidence.toFixed(2)}, 方法: ${modelInfo.validation.validationMethod}`);
    }
    
    return modelInfo.maxTokens;
  } else {
    // 使用原有的获取器
    const fetcher = ModelInfoFetcher.getInstance();
    const modelInfo = await fetcher.getModelInfo(model);
    return modelInfo.maxTokens;
  }
}

/**
 * 获取模型的完整规格信息（增强版）
 */
export async function getModelSpec(
  model: AIModel,
  options?: {
    enhanced?: boolean;
    minConfidence?: number;
    allowFuzzyMatch?: boolean;
  }
) {
  const { enhanced = true } = options || {};

  if (enhanced) {
    const enhancedFetcher = EnhancedModelFetcher.getInstance();
    return await enhancedFetcher.getEnhancedModelInfo(model, options);
  } else {
    const fetcher = ModelInfoFetcher.getInstance();
    return await fetcher.getModelInfo(model);
  }
}

/**
 * 获取增强的模型规格信息
 * 包含验证信息和代理检测结果
 */
export async function getEnhancedModelSpec(
  model: AIModel,
  options?: {
    forceRefresh?: boolean;
    minConfidence?: number;
    allowFuzzyMatch?: boolean;
    enableProxyDetection?: boolean;
  }
) {
  const enhancedFetcher = EnhancedModelFetcher.getInstance();
  return await enhancedFetcher.getEnhancedModelInfo(model, options);
}

/**
 * 验证模型信息的准确性
 */
export async function validateModelInfo(model: AIModel): Promise<{
  isValid: boolean;
  confidence: number;
  issues: string[];
  recommendations: string[];
}> {
  try {
    const enhancedSpec = await getEnhancedModelSpec(model, {
      forceRefresh: true,
      enableProxyDetection: true
    });

    const result = {
      isValid: true,
      confidence: enhancedSpec.validation?.confidence || 0,
      issues: [] as string[],
      recommendations: [] as string[]
    };

    // 检查验证置信度
    if (result.confidence < 0.5) {
      result.isValid = false;
      result.issues.push(`模型验证置信度过低: ${result.confidence.toFixed(2)}`);
      result.recommendations.push('建议检查模型ID是否正确或更新模型规格数据');
    }

    // 检查代理检测结果
    if (enhancedSpec.proxyInfo?.isProxy) {
      result.issues.push(`检测到代理服务: ${enhancedSpec.proxyInfo.proxyType}`);
      result.recommendations.push('在代理环境中，建议定期验证模型信息的准确性');
    }

    // 检查验证方法
    if (enhancedSpec.validation?.validationMethod === 'fallback') {
      result.issues.push('使用了降级的默认配置');
      result.recommendations.push('建议更新模型规格数据库或检查API连接');
    }

    return result;
  } catch (error) {
    return {
      isValid: false,
      confidence: 0,
      issues: [`验证过程出错: ${error instanceof Error ? error.message : String(error)}`],
      recommendations: ['请检查网络连接和API配置']
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
      expired: basicStats.expired + enhancedStats.expired
    }
  };
}

/**
 * 批量验证多个模型
 */
export async function validateMultipleModels(models: AIModel[]): Promise<{
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
      const validation = await validateModelInfo(model);
      return { model, validation };
    })
  );

  const valid: AIModel[] = [];
  const invalid: Array<{ model: AIModel; issues: string[] }> = [];
  let totalConfidence = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { model, validation } = result.value;
      totalConfidence += validation.confidence;
      
      if (validation.isValid) {
        valid.push(model);
      } else {
        invalid.push({ model, issues: validation.issues });
      }
    } else {
      // 处理验证失败的情况
      console.error('模型验证失败:', result.reason);
    }
  }

  return {
    valid,
    invalid,
    summary: {
      total: models.length,
      valid: valid.length,
      invalid: invalid.length,
      averageConfidence: totalConfidence / models.length
    }
  };
}
