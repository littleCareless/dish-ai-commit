/**
 * 模型注册表测试
 * 验证模型信息获取机制的正确性
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AIModel } from '../../types';
import { 
  getAccurateTokenLimits, 
  getModelSpec, 
  clearModelCache 
} from '../index';
import { 
  findModelSpec, 
  getModelSpecsByProvider, 
  getDefaultTokenLimits 
} from '../model-specs';
import { ModelInfoFetcher } from '../model-info-fetcher';

describe('模型注册表', () => {
  beforeEach(() => {
    // 清除缓存以确保测试独立性
    clearModelCache();
  });

  describe('模型规格查找', () => {
    it('应该能找到OpenAI模型规格', () => {
      const spec = findModelSpec('gpt-4o');
      expect(spec).toBeDefined();
      expect(spec?.id).toBe('gpt-4o');
      expect(spec?.provider.id).toBe('openai');
      expect(spec?.maxTokens.input).toBe(128000);
    });

    it('应该能找到Anthropic模型规格', () => {
      const spec = findModelSpec('claude-3-opus-20240229');
      expect(spec).toBeDefined();
      expect(spec?.provider.id).toBe('anthropic');
      expect(spec?.maxTokens.input).toBe(200000);
    });

    it('应该返回undefined对于未知模型', () => {
      const spec = findModelSpec('unknown-model');
      expect(spec).toBeUndefined();
    });
  });

  describe('按提供商获取模型', () => {
    it('应该能获取OpenAI的所有模型', () => {
      const models = getModelSpecsByProvider('openai');
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.provider.id === 'openai')).toBe(true);
    });

    it('应该能获取Anthropic的所有模型', () => {
      const models = getModelSpecsByProvider('anthropic');
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.provider.id === 'anthropic')).toBe(true);
    });

    it('应该返回空数组对于未知提供商', () => {
      const models = getModelSpecsByProvider('unknown-provider');
      expect(models).toEqual([]);
    });
  });

  describe('默认Token限制', () => {
    it('应该返回OpenAI的默认限制', () => {
      const limits = getDefaultTokenLimits('openai');
      expect(limits.input).toBe(16385);
      expect(limits.output).toBe(4096);
    });

    it('应该返回Anthropic的默认限制', () => {
      const limits = getDefaultTokenLimits('anthropic');
      expect(limits.input).toBe(200000);
      expect(limits.output).toBe(4096);
    });

    it('应该返回通用默认限制对于未知提供商', () => {
      const limits = getDefaultTokenLimits('unknown');
      expect(limits.input).toBe(8192);
      expect(limits.output).toBe(4096);
    });
  });

  describe('准确Token限制获取', () => {
    const mockModel: AIModel = {
      id: 'gpt-4o' as any,
      name: 'GPT-4o',
      maxTokens: { input: 8192, output: 4096 }, // 过时的配置
      provider: { id: 'openai', name: 'OpenAI' }
    };

    it('应该返回准确的token限制而不是过时的配置', async () => {
      const limits = await getAccurateTokenLimits(mockModel);
      
      // 应该返回准确的128000而不是过时的8192
      expect(limits.input).toBe(128000);
      expect(limits.output).toBe(16384);
    });

    it('应该缓存结果以提高性能', async () => {
      const fetcher = ModelInfoFetcher.getInstance();
      const spy = jest.spyOn(fetcher, 'getModelInfo');

      // 第一次调用
      await getAccurateTokenLimits(mockModel);
      expect(spy).toHaveBeenCalledTimes(1);

      // 第二次调用应该使用缓存
      await getAccurateTokenLimits(mockModel);
      expect(spy).toHaveBeenCalledTimes(1); // 仍然是1次，说明使用了缓存

      spy.mockRestore();
    });
  });

  describe('模型规格获取', () => {
    const mockModel: AIModel = {
      id: 'gpt-4o-mini' as any,
      name: 'GPT-4o mini',
      maxTokens: { input: 4096, output: 2048 }, // 过时的配置
      provider: { id: 'openai', name: 'OpenAI' }
    };

    it('应该返回完整的模型规格信息', async () => {
      const spec = await getModelSpec(mockModel);
      
      expect(spec.id).toBe('gpt-4o-mini');
      expect(spec.maxTokens.input).toBe(128000);
      expect(spec.maxTokens.output).toBe(16384);
      expect(spec.capabilities?.streaming).toBe(true);
      expect(spec.capabilities?.functionCalling).toBe(true);
      expect(spec.cost).toBeDefined();
    });

    it('应该包含数据来源信息', async () => {
      const spec = await getModelSpec(mockModel);
      expect(['api', 'manual', 'fallback']).toContain(spec.source);
      expect(spec.lastUpdated).toBeDefined();
    });
  });

//   describe('降级策略', () => {
//     const unknownModel: AIModel = {
//       id: 'unknown-model' as any,
//       name: 'Unknown Model',
//       maxTokens: { input: 1000, output: 500 },
//       provider: { id: 'unknown-provider', name: 'Unknown Provider' }
//     };

//     it('应该为未知模型提供降级方案', async () => {
//       const limits = await getAccurateTokenLimits(unknownModel);
      
//       // 应该使用默认值
//       expect(limits.input).toBe(8192);
//       expect(limits.output).toBe(4096);
//     });

//     it('应该为未知模型创建降级规格', async () => {
//       const spec = await getModelSpec(unknownModel);
      
//       expect(spec.source).toBe('fallback');
//       expect(spec.maxTokens.input).toBe(8192);
//       expect(spec.maxTokens.output).toBe(4096);
//     });
//   });

//   describe('错误处理', () => {
//     it('应该优雅处理网络错误', async () => {
//       // 模拟网络错误的情况
//       const fetcher = ModelInfoFetcher.getInstance();
//       const originalFetch = global.fetch;
      
//       global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

//       const mockModel: AIModel = {
//         id: 'gpt-4' as any,
//         name: 'GPT-4',
//         maxTokens: { input: 4096, output: 2048 },
//         provider: { id: 'openai', name: 'OpenAI' }
//       };

//       // 应该降级到本地规格
//       const limits = await getAccurateTokenLimits(mockModel);
//       expect(limits.input).toBe(8192); // 本地规格中的值
      
//       global.fetch = originalFetch;
//     });
//   });
});

describe('模型信息获取器', () => {
  let fetcher: ModelInfoFetcher;

  beforeEach(() => {
    fetcher = ModelInfoFetcher.getInstance();
    fetcher.clearCache();
  });

  describe('缓存管理', () => {
    it('应该正确管理缓存统计', () => {
      const initialStats = fetcher.getCacheStats();
      expect(initialStats.total).toBe(0);
      expect(initialStats.expired).toBe(0);
    });

    it('应该能清除缓存', () => {
      fetcher.clearCache();
      const stats = fetcher.getCacheStats();
      expect(stats.total).toBe(0);
    });
  });
});