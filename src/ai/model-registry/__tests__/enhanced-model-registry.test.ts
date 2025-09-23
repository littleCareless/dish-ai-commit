/**
 * 增强模型注册表测试
 * 测试模型验证、代理检测和智能匹配功能
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AIModel } from '../../types';
import { ModelValidator } from '../model-validator';
import { EnhancedModelFetcher } from '../enhanced-model-fetcher';
import { 
  getAccurateTokenLimits, 
  getEnhancedModelSpec, 
  validateModelInfo,
  validateMultipleModels 
} from '../index';

// Mock fetch with proper typing
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('增强模型注册表', () => {
  let mockModel: AIModel;

  beforeEach(() => {
    mockModel = {
      id: 'gpt-4o' as any,
      name: 'GPT-4o',
      maxTokens: { input: 128000, output: 16384 },
      provider: { id: 'openai', name: 'OpenAI' }
    };

    // 重置 fetch mock
    mockFetch.mockReset();
  });

  describe('ModelValidator', () => {
    let validator: ModelValidator;

    beforeEach(() => {
      validator = ModelValidator.getInstance();
    });

    it('应该正确验证完全匹配的模型', async () => {
      const apiResponse = { id: 'gpt-4o', name: 'GPT-4o' };
      const result = await validator.validateModelIdentity(
        mockModel, 
        apiResponse, 
        'https://api.openai.com/v1'
      );

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBe(1.0);
    });

    it('应该检测到已知的模型映射', async () => {
      const apiResponse = { id: 'gpt-4o-2024-05-13', name: 'GPT-4o' };
      const result = await validator.validateModelIdentity(
        mockModel, 
        apiResponse, 
        'https://api.openai.com/v1'
      );

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.actualModel).toBe('gpt-4o-2024-05-13');
    });

    it('应该检测到可疑的模型类型错误', async () => {
      const apiResponse = { id: 'gemini-pro', name: 'Gemini Pro' };
      const result = await validator.validateModelIdentity(
        mockModel, 
        apiResponse, 
        'https://proxy.example.com/v1'
      );

      expect(result.isValid).toBe(false);
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.reason).toContain('模型类型错误');
    });

    it('应该检测到代理服务', async () => {
      // Mock 代理服务响应
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'server': 'nginx/1.18.0',
          'x-powered-by': 'openai-proxy'
        }),
        json: async () => ({
          data: [
            { id: 'gpt-4o' },
            { id: 'claude-3-opus' } // 包含非OpenAI模型
          ]
        })
      } as Response);

      const result = await validator.detectProxyService('https://proxy.example.com/v1');

      expect(result.isProxy).toBe(true);
      expect(result.proxyType).toBe('openai-compatible');
      expect(result.supportedModels).toContain('claude-3-opus');
    });
  });

  describe('EnhancedModelFetcher', () => {
    let fetcher: EnhancedModelFetcher;

    beforeEach(() => {
      fetcher = EnhancedModelFetcher.getInstance();
      fetcher.clearCache(); // 清除缓存确保测试独立性
    });

    it('应该成功获取OpenAI模型信息', async () => {
      // Mock 成功的API响应
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({
          data: [{ id: 'gpt-4o', context_length: 128000 }]
        })
      } as Response);

      const result = await fetcher.getEnhancedModelInfo(mockModel);

      expect(result.id).toBe('gpt-4o');
      expect(result.maxTokens.input).toBe(128000);
      expect(result.validation?.confidence).toBeGreaterThan(0.9);
      expect(result.source).toBe('api');
    });

    it('应该在API失败时降级到本地规格', async () => {
      // Mock API失败
      mockFetch.mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await fetcher.getEnhancedModelInfo(mockModel);

      expect(result.id).toBe('gpt-4o');
      expect(result.validation?.validationMethod).toBe('local_spec');
      expect(result.source).toBe('manual'); // 来自本地规格数据库
    });

    it('应该在代理环境中进行模糊匹配', async () => {
      // Mock 代理环境响应
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'server': 'nginx' }),
        json: async () => ({
          data: [{ id: 'gpt-4o-proxy-version', context_length: 128000 }]
        })
      } as Response);

      const result = await fetcher.getEnhancedModelInfo(mockModel, {
        allowFuzzyMatch: true,
        minConfidence: 0.3
      });

      expect(result.validation?.proxyDetected).toBe(true);
      expect(result.validation?.validationMethod).toBe('fuzzy_match');
    });

    it('应该正确处理缓存', async () => {
      // Mock API响应
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => ({
          data: [{ id: 'gpt-4o', context_length: 128000 }]
        })
      } as Response);

      // 首次获取
      const result1 = await fetcher.getEnhancedModelInfo(mockModel);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 第二次获取应该使用缓存
      const result2 = await fetcher.getEnhancedModelInfo(mockModel);
      expect(mockFetch).toHaveBeenCalledTimes(1); // 没有新的API调用
      expect(result1.id).toBe(result2.id);

      // 强制刷新应该重新调用API
      const result3 = await fetcher.getEnhancedModelInfo(mockModel, { forceRefresh: true });
      expect(mockFetch).toHaveBeenCalledTimes(2); // 有新的API调用
    });
  });

  describe('公共API', () => {
    beforeEach(() => {
      // Mock 成功的API响应
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => ({
          data: [{ id: 'gpt-4o', context_length: 128000 }]
        })
      } as Response);
    });

    it('getAccurateTokenLimits 应该返回准确的token限制', async () => {
      const tokenLimits = await getAccurateTokenLimits(mockModel, {
        enhanced: true,
        minConfidence: 0.5
      });

      expect(tokenLimits).toHaveProperty('input');
      expect(tokenLimits).toHaveProperty('output');
      expect(tokenLimits.input).toBeGreaterThan(0);
      expect(tokenLimits.output).toBeGreaterThan(0);
    });

    it('getEnhancedModelSpec 应该返回增强的模型规格', async () => {
      const spec = await getEnhancedModelSpec(mockModel);

      expect(spec).toHaveProperty('id');
      expect(spec).toHaveProperty('validation');
      expect(spec.validation).toHaveProperty('confidence');
      expect(spec.validation).toHaveProperty('validationMethod');
    });

    it('validateModelInfo 应该验证模型信息', async () => {
      const validation = await validateModelInfo(mockModel);

      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('confidence');
      expect(validation).toHaveProperty('issues');
      expect(validation).toHaveProperty('recommendations');
      expect(Array.isArray(validation.issues)).toBe(true);
      expect(Array.isArray(validation.recommendations)).toBe(true);
    });

    it('validateMultipleModels 应该批量验证模型', async () => {
      const models = [
        mockModel,
        {
          ...mockModel,
          id: 'gpt-4o-mini' as any,
          name: 'GPT-4o Mini'
        }
      ];

      const result = await validateMultipleModels(models);

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('invalid');
      expect(result).toHaveProperty('summary');
      expect(result.summary.total).toBe(2);
      expect(Array.isArray(result.valid)).toBe(true);
      expect(Array.isArray(result.invalid)).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该优雅地处理网络错误', async () => {
      mockFetch.mockRejectedValue(
        new Error('Network error')
      );

      const tokenLimits = await getAccurateTokenLimits(mockModel, {
        enhanced: true
      });

      // 应该降级到本地规格或默认值
      expect(tokenLimits).toHaveProperty('input');
      expect(tokenLimits).toHaveProperty('output');
    });

    it('应该处理API返回错误状态码', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      } as Response);

      const spec = await getEnhancedModelSpec(mockModel);

      // 应该降级到本地规格
      expect(spec.validation?.validationMethod).toBe('local_spec');
    });

    it('应该处理空的模型列表', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => ({ data: [] })
      } as Response);

      const spec = await getEnhancedModelSpec(mockModel);

      // 应该降级到本地规格
      expect(spec.validation?.validationMethod).toBe('local_spec');
    });
  });

  describe('性能测试', () => {
    it('缓存应该提高性能', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => ({
          data: [{ id: 'gpt-4o', context_length: 128000 }]
        })
      } as Response);

      const fetcher = EnhancedModelFetcher.getInstance();
      fetcher.clearCache();

      // 测量首次获取时间
      const start1 = Date.now();
      await fetcher.getEnhancedModelInfo(mockModel);
      const time1 = Date.now() - start1;

      // 测量缓存获取时间
      const start2 = Date.now();
      await fetcher.getEnhancedModelInfo(mockModel);
      const time2 = Date.now() - start2;

      // 缓存获取应该更快
      expect(time2).toBeLessThan(time1);
      expect(mockFetch).toHaveBeenCalledTimes(1); // 只调用一次API
    });
  });
});