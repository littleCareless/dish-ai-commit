/**
 * 模型注册表使用示例
 * 展示如何使用增强的模型验证和获取功能
 */

import { AIModel } from '../types';
import { 
  getAccurateTokenLimits, 
  getEnhancedModelSpec, 
  validateModelInfo,
  validateMultipleModels,
  clearModelCache
} from './index';

/**
 * 示例1: 基本的token限制获取（推荐用法）
 */
export async function example1_BasicTokenLimits() {
  const model: AIModel = {
    id: 'gpt-4o' as any,
    name: 'GPT-4o',
    maxTokens: { input: 128000, output: 16384 },
    provider: { id: 'openai', name: 'OpenAI' }
  };

  try {
    // 使用增强验证获取准确的token限制
    const tokenLimits = await getAccurateTokenLimits(model, {
      enhanced: true,
      minConfidence: 0.7,
      allowFuzzyMatch: true
    });

    console.log('准确的token限制:', tokenLimits);
    // 输出: { input: 128000, output: 16384 }
    
    return tokenLimits;
  } catch (error) {
    console.error('获取token限制失败:', error);
    // 降级到模型自带的配置
    return model.maxTokens;
  }
}

/**
 * 示例2: 获取完整的增强模型规格信息
 */
export async function example2_EnhancedModelSpec() {
  const model: AIModel = {
    id: 'gpt-4o' as any,
    name: 'GPT-4o',
    maxTokens: { input: 128000, output: 16384 },
    provider: { id: 'openai', name: 'OpenAI' }
  };

  try {
    const enhancedSpec = await getEnhancedModelSpec(model, {
      forceRefresh: false,
      minConfidence: 0.5,
      allowFuzzyMatch: true,
      enableProxyDetection: true
    });

    console.log('增强模型规格:', {
      基本信息: {
        id: enhancedSpec.id,
        name: enhancedSpec.name,
        provider: enhancedSpec.provider.name
      },
      token限制: enhancedSpec.maxTokens,
      验证信息: enhancedSpec.validation,
      代理信息: enhancedSpec.proxyInfo,
      数据来源: enhancedSpec.source
    });

    return enhancedSpec;
  } catch (error) {
    console.error('获取增强模型规格失败:', error);
    throw error;
  }
}

/**
 * 示例3: 验证模型信息的准确性
 */
export async function example3_ValidateModel() {
  const model: AIModel = {
    id: 'gpt-4o' as any,
    name: 'GPT-4o',
    maxTokens: { input: 128000, output: 16384 },
    provider: { id: 'openai', name: 'OpenAI' }
  };

  try {
    const validation = await validateModelInfo(model);

    console.log('模型验证结果:', {
      是否有效: validation.isValid,
      置信度: `${(validation.confidence * 100).toFixed(1)}%`,
      问题: validation.issues,
      建议: validation.recommendations
    });

    if (!validation.isValid) {
      console.warn('模型验证失败，建议:', validation.recommendations.join('; '));
    }

    return validation;
  } catch (error) {
    console.error('模型验证过程出错:', error);
    throw error;
  }
}

/**
 * 示例4: 批量验证多个模型
 */
export async function example4_ValidateMultipleModels() {
  const models: AIModel[] = [
    {
      id: 'gpt-4o' as any,
      name: 'GPT-4o',
      maxTokens: { input: 128000, output: 16384 },
      provider: { id: 'openai', name: 'OpenAI' }
    },
    {
      id: 'gpt-4o-mini' as any,
      name: 'GPT-4o Mini',
      maxTokens: { input: 128000, output: 16384 },
      provider: { id: 'openai', name: 'OpenAI' }
    },
    {
      id: 'gpt-3.5-turbo' as any,
      name: 'GPT-3.5 Turbo',
      maxTokens: { input: 16385, output: 4096 },
      provider: { id: 'openai', name: 'OpenAI' }
    }
  ];

  try {
    const batchValidation = await validateMultipleModels(models);

    console.log('批量验证结果:', {
      总数: batchValidation.summary.total,
      有效: batchValidation.summary.valid,
      无效: batchValidation.summary.invalid,
      平均置信度: `${(batchValidation.summary.averageConfidence * 100).toFixed(1)}%`
    });

    if (batchValidation.invalid.length > 0) {
      console.warn('无效的模型:');
      batchValidation.invalid.forEach(({ model, issues }) => {
        console.warn(`- ${model.name} (${model.id}): ${issues.join(', ')}`);
      });
    }

    return batchValidation;
  } catch (error) {
    console.error('批量验证失败:', error);
    throw error;
  }
}

/**
 * 示例5: 处理代理环境下的模型获取
 */
export async function example5_ProxyEnvironment() {
  const model: AIModel = {
    id: 'gpt-4o' as any,
    name: 'GPT-4o',
    maxTokens: { input: 128000, output: 16384 },
    provider: { id: 'openai', name: 'OpenAI' }
  };

  try {
    // 在代理环境中，可能需要更宽松的验证设置
    const enhancedSpec = await getEnhancedModelSpec(model, {
      minConfidence: 0.3, // 降低置信度要求
      allowFuzzyMatch: true, // 允许模糊匹配
      enableProxyDetection: true // 启用代理检测
    });

    if (enhancedSpec.proxyInfo?.isProxy) {
      console.log('检测到代理环境:', {
        代理类型: enhancedSpec.proxyInfo.proxyType,
        基础URL: enhancedSpec.proxyInfo.baseUrl,
        支持的模型: enhancedSpec.proxyInfo.supportedModels?.slice(0, 5) // 只显示前5个
      });

      // 在代理环境中的特殊处理
      if (enhancedSpec.validation?.confidence && enhancedSpec.validation.confidence < 0.5) {
        console.warn('代理环境下模型验证置信度较低，建议使用本地规格数据');
      }
    }

    return enhancedSpec;
  } catch (error) {
    console.error('代理环境处理失败:', error);
    throw error;
  }
}

/**
 * 示例6: 错误处理和降级策略
 */
export async function example6_ErrorHandlingAndFallback() {
  const model: AIModel = {
    id: 'unknown-model' as any, // 故意使用不存在的模型
    name: 'Unknown Model',
    maxTokens: { input: 8192, output: 4096 },
    provider: { id: 'openai', name: 'OpenAI' }
  };

  try {
    // 尝试获取模型信息
    const tokenLimits = await getAccurateTokenLimits(model, {
      enhanced: true,
      minConfidence: 0.5
    });

    console.log('成功获取token限制:', tokenLimits);
    return tokenLimits;
  } catch (error) {
    console.warn('增强获取失败，尝试基础方法:', error);

    try {
      // 降级到基础方法
      const tokenLimits = await getAccurateTokenLimits(model, {
        enhanced: false
      });

      console.log('基础方法获取成功:', tokenLimits);
      return tokenLimits;
    } catch (fallbackError) {
      console.error('所有方法都失败，使用模型默认配置:', fallbackError);
      
      // 最终降级到模型自带配置
      return model.maxTokens;
    }
  }
}

/**
 * 示例7: 缓存管理
 */
export async function example7_CacheManagement() {
  const model: AIModel = {
    id: 'gpt-4o' as any,
    name: 'GPT-4o',
    maxTokens: { input: 128000, output: 16384 },
    provider: { id: 'openai', name: 'OpenAI' }
  };

  // 首次获取（会缓存结果）
  console.log('首次获取模型信息...');
  const spec1 = await getEnhancedModelSpec(model);
  console.log('首次获取完成，数据来源:', spec1.source);

  // 第二次获取（使用缓存）
  console.log('第二次获取模型信息...');
  const spec2 = await getEnhancedModelSpec(model);
  console.log('第二次获取完成，数据来源:', spec2.source);

  // 强制刷新缓存
  console.log('强制刷新缓存...');
  const spec3 = await getEnhancedModelSpec(model, { forceRefresh: true });
  console.log('刷新后获取完成，数据来源:', spec3.source);

  // 清除所有缓存
  console.log('清除所有缓存...');
  clearModelCache();
  console.log('缓存已清除');

  return { spec1, spec2, spec3 };
}

/**
 * 示例8: 在实际应用中的使用
 */
export async function example8_RealWorldUsage(selectedModel: AIModel, promptLength: number) {
  try {
    // 获取准确的token限制
    const tokenLimits = await getAccurateTokenLimits(selectedModel, {
      enhanced: true,
      minConfidence: 0.6
    });

    const maxInputTokens = tokenLimits.input;
    const maxOutputTokens = tokenLimits.output;

    // 检查提示词长度是否超限
    if (promptLength > maxInputTokens * 0.8) {
      console.warn(`提示词长度 (${promptLength}) 接近模型限制 (${maxInputTokens})，建议截断`);
      
      // 可以在这里实现提示词截断逻辑
      const recommendedLength = Math.floor(maxInputTokens * 0.75);
      console.log(`建议将提示词长度控制在 ${recommendedLength} tokens 以内`);
    }

    // 验证模型信息的可靠性
    const validation = await validateModelInfo(selectedModel);
    if (validation.confidence < 0.7) {
      console.warn(`模型信息置信度较低 (${(validation.confidence * 100).toFixed(1)}%)，请注意可能的不准确性`);
    }

    return {
      tokenLimits,
      validation,
      recommendations: {
        maxSafePromptLength: Math.floor(maxInputTokens * 0.75),
        maxOutputLength: maxOutputTokens,
        shouldTruncate: promptLength > maxInputTokens * 0.8
      }
    };
  } catch (error) {
    console.error('获取模型信息失败，使用默认配置:', error);
    
    // 降级处理
    return {
      tokenLimits: selectedModel.maxTokens,
      validation: { isValid: false, confidence: 0, issues: ['API获取失败'], recommendations: ['使用默认配置'] },
      recommendations: {
        maxSafePromptLength: Math.floor(selectedModel.maxTokens.input * 0.75),
        maxOutputLength: selectedModel.maxTokens.output,
        shouldTruncate: promptLength > selectedModel.maxTokens.input * 0.8
      }
    };
  }
}