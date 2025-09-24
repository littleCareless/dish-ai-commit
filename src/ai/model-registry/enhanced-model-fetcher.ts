/**
 * 增强的模型信息获取器
 * 集成模型验证和智能匹配功能
 */

import { ConfigurationManager } from "../../config/configuration-manager";
import { ModelSpec, findModelSpec, getDefaultTokenLimits } from "./model-specs";
import { AIModel } from "../types";
import {
  ModelValidator,
  ModelValidationResult,
  ProxyDetectionResult,
} from "./model-validator";

export interface EnhancedModelSpec extends ModelSpec {
  /** 验证信息 */
  validation?: {
    isValid: boolean;
    confidence: number;
    actualModelId?: string;
    proxyDetected?: boolean;
    validationMethod:
      | "exact_match"
      | "known_mapping"
      | "fuzzy_match"
      | "local_spec"
      | "fallback";
    reason?: string;
    suggestion?:
      | "use_local_spec"
      | "retry_with_mapping"
      | "fallback_to_default";
  };
  /** 代理信息 */
  proxyInfo?: ProxyDetectionResult;
}

export interface ModelFetchOptions {
  /** 是否强制刷新缓存 */
  forceRefresh?: boolean;
  /** 最小验证置信度阈值 */
  minConfidence?: number;
  /** 是否允许模糊匹配 */
  allowFuzzyMatch?: boolean;
  /** 是否启用代理检测 */
  enableProxyDetection?: boolean;
}

/**
 * 增强的模型信息获取器
 */
export class EnhancedModelFetcher {
  private static instance: EnhancedModelFetcher;
  private validator: ModelValidator;
  private cache = new Map<
    string,
    { spec: EnhancedModelSpec; timestamp: number }
  >();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时

  private constructor() {
    this.validator = ModelValidator.getInstance();
  }

  public static getInstance(): EnhancedModelFetcher {
    if (!EnhancedModelFetcher.instance) {
      EnhancedModelFetcher.instance = new EnhancedModelFetcher();
    }
    return EnhancedModelFetcher.instance;
  }

  /**
   * 获取增强的模型信息
   */
  async getEnhancedModelInfo(
    model: AIModel,
    options: ModelFetchOptions = {}
  ): Promise<EnhancedModelSpec> {
    const {
      forceRefresh = false,
      minConfidence = 0.5,
      allowFuzzyMatch = true,
      enableProxyDetection = true,
    } = options;

    const cacheKey = `${model.provider.id}:${model.id}`;

    // 检查缓存
    if (!forceRefresh) {
      const cached = this.getCachedSpec(cacheKey);
      if (cached) {
        return cached;
      }
    }

    let enhancedSpec: EnhancedModelSpec;

    try {
      // 尝试从API获取
      const apiSpec = await this.fetchFromAPI(model, {
        enableProxyDetection,
        allowFuzzyMatch,
        minConfidence,
      });

      if (
        apiSpec &&
        apiSpec.validation &&
        apiSpec.validation.confidence >= minConfidence
      ) {
        enhancedSpec = apiSpec;
      } else {
        // 降级到本地规格
        enhancedSpec = await this.fallbackToLocalSpec(
          model,
          apiSpec?.validation
        );
      }
    } catch (error) {
      console.warn(`API获取失败，降级到本地规格: ${model.id}`, error);
      enhancedSpec = await this.fallbackToLocalSpec(model);
    }

    // 缓存结果
    this.cacheSpec(cacheKey, enhancedSpec);
    return enhancedSpec;
  }

  /**
   * 从API获取模型信息
   */
  private async fetchFromAPI(
    model: AIModel,
    options: {
      enableProxyDetection: boolean;
      allowFuzzyMatch: boolean;
      minConfidence: number;
    }
  ): Promise<EnhancedModelSpec | null> {
    const providerId = model.provider.id;

    switch (providerId) {
      case "openai":
        return this.fetchOpenAIModelInfo(model, options);
      case "github":
        return this.fetchGitHubModelInfo(model, options);
      default:
        return null;
    }
  }

  /**
   * 获取OpenAI模型信息（增强版）
   */
  private async fetchOpenAIModelInfo(
    model: AIModel,
    options: {
      enableProxyDetection: boolean;
      allowFuzzyMatch: boolean;
      minConfidence: number;
    }
  ): Promise<EnhancedModelSpec | null> {
    try {
      const config = ConfigurationManager.getInstance();
      const apiKey = config.getConfig("PROVIDERS_OPENAI_APIKEY");
      const baseURL =
        config.getConfig("PROVIDERS_OPENAI_BASEURL") ||
        "https://api.openai.com/v1";

      if (!apiKey) {
        return null;
      }

      // 1. 代理检测
      let proxyInfo: ProxyDetectionResult | undefined;
      if (options.enableProxyDetection) {
        proxyInfo = await this.validator.detectProxyService(baseURL);
      }

      // 2. 获取模型列表
      const response = await fetch(`${baseURL}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `API请求失败: ${response.status} ${response.statusText}`
        );
      }

      const modelsData = await response.json();
      const models = modelsData.data || [];

      if (models.length === 0) {
        throw new Error("API返回空的模型列表");
      }

      // 3. 查找目标模型
      let targetModel = models.find((m: any) => m.id === model.id);
      let validation: ModelValidationResult;

      if (targetModel) {
        // 直接匹配成功
        validation = await this.validator.validateModelIdentity(
          model,
          targetModel,
          baseURL
        );
      } else if (options.allowFuzzyMatch && proxyInfo?.isProxy) {
        // 在代理环境中尝试智能匹配
        targetModel = this.findBestModelMatch(model.id as string, models);
        if (targetModel) {
          validation = await this.validator.validateModelIdentity(
            model,
            targetModel,
            baseURL
          );
        } else {
          validation = {
            isValid: false,
            confidence: 0,
            reason: `未找到匹配的模型，可用模型: ${models
              .map((m: any) => m.id)
              .join(", ")}`,
            suggestion: "use_local_spec",
          };
        }
      } else {
        validation = {
          isValid: false,
          confidence: 0,
          reason: `模型 ${model.id} 不在API返回的模型列表中`,
          suggestion: "use_local_spec",
        };
      }

      // 4. 根据验证结果决定是否使用API数据
      if (
        !validation.isValid ||
        validation.confidence < options.minConfidence
      ) {
        console.warn(`模型验证失败: ${validation.reason}`);
        return null;
      }

      // 5. 构建增强的模型规格
      const tokenLimits = this.getAccurateTokenLimits(
        model.id as string,
        targetModel,
        proxyInfo
      );

      const enhancedSpec: EnhancedModelSpec = {
        id: model.id as string,
        name: model.name,
        provider: model.provider,
        maxTokens: tokenLimits,
        lastUpdated: new Date().toISOString(),
        source: proxyInfo?.isProxy ? "api-proxy" : "api",
        capabilities: {
          streaming: true,
          functionCalling: this.supportsOpenAIFunctionCalling(
            model.id as string
          ),
        },
        validation: {
          isValid: validation.isValid,
          confidence: validation.confidence,
          actualModelId: validation.actualModel || targetModel?.id,
          proxyDetected: validation.proxyDetected,
          validationMethod:
            validation.confidence === 1.0
              ? "exact_match"
              : validation.confidence > 0.8
              ? "known_mapping"
              : "fuzzy_match",
        },
        proxyInfo,
      };

      return enhancedSpec;
    } catch (error) {
      console.warn(`OpenAI API获取失败: ${error}`);
      return null;
    }
  }

  /**
   * 获取GitHub模型信息（增强版）
   */
  private async fetchGitHubModelInfo(
    model: AIModel,
    options: {
      enableProxyDetection: boolean;
      allowFuzzyMatch: boolean;
      minConfidence: number;
    }
  ): Promise<EnhancedModelSpec | null> {
    try {
      const config = ConfigurationManager.getInstance();
      const apiKey = config.getConfig("PROVIDERS_OPENAI_APIKEY");

      if (!apiKey) {
        return null;
      }

      const baseURL = "https://models.inference.ai.azure.com";

      // 代理检测
      let proxyInfo: ProxyDetectionResult | undefined;
      if (options.enableProxyDetection) {
        proxyInfo = await this.validator.detectProxyService(baseURL);
      }

      const response = await fetch(`${baseURL}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return null;
      }

      const modelsData = await response.json();
      const models = modelsData.data || [];
      const targetModel = models.find((m: any) => m.id === model.id);

      if (!targetModel) {
        return null;
      }

      const validation = await this.validator.validateModelIdentity(
        model,
        targetModel,
        baseURL
      );

      if (
        !validation.isValid ||
        validation.confidence < options.minConfidence
      ) {
        return null;
      }

      const enhancedSpec: EnhancedModelSpec = {
        id: model.id as string,
        name: targetModel.name || model.name,
        provider: model.provider,
        maxTokens: {
          input: targetModel.context_length || 128000,
          output: targetModel.max_output_tokens || 16384,
        },
        lastUpdated: new Date().toISOString(),
        source: "api",
        capabilities: {
          streaming: true,
          functionCalling: targetModel.supports_function_calling || false,
        },
        validation: {
          isValid: validation.isValid,
          confidence: validation.confidence,
          actualModelId: validation.actualModel,
          proxyDetected: validation.proxyDetected,
          validationMethod: "exact_match",
        },
        proxyInfo,
      };

      return enhancedSpec;
    } catch (error) {
      console.warn("GitHub Models API获取失败:", error);
      return null;
    }
  }

  /**
   * 降级到本地规格
   */
  private async fallbackToLocalSpec(
    model: AIModel,
    previousValidation?: ModelValidationResult
  ): Promise<EnhancedModelSpec> {
    const localSpec = findModelSpec(model.id as string);

    if (localSpec) {
      return {
        ...localSpec,
        validation: {
          isValid: true,
          confidence: 0.8,
          validationMethod: "local_spec",
        },
      };
    }

    // 最终降级到默认值
    const defaultLimits = getDefaultTokenLimits(model.provider.id);
    return {
      id: model.id as string,
      name: model.name,
      provider: model.provider,
      maxTokens: defaultLimits,
      lastUpdated: new Date().toISOString(),
      source: "fallback",
      capabilities: model.capabilities,
      validation: {
        isValid: false,
        confidence: 0.3,
        validationMethod: "fallback",
      },
    };
  }

  /**
   * 智能模型匹配
   */
  private findBestModelMatch(
    requestedId: string,
    availableModels: any[]
  ): any | null {
    // 1. 精确匹配
    let match = availableModels.find((m) => m.id === requestedId);
    if (match) {
      return match;
    }

    // 2. 前缀匹配
    const requestedPrefix = requestedId?.split("-")[0];
    match = availableModels.find((m) => m.id.startsWith(requestedPrefix));
    if (match) {
      return match;
    }

    // 3. 相似度匹配
    const similarities = availableModels.map((m) => ({
      model: m,
      score: this.calculateSimilarity(requestedId, m.id),
    }));

    similarities.sort((a, b) => b.score - a.score);

    if (similarities[0]?.score > 0.6) {
      console.log(
        `模糊匹配: ${requestedId} -> ${
          similarities[0].model.id
        } (相似度: ${similarities[0].score.toFixed(2)})`
      );
      return similarities[0].model;
    }

    return null;
  }

  /**
   * 获取准确的token限制
   */
  private getAccurateTokenLimits(
    requestedId: string,
    apiModel: any,
    proxyInfo?: ProxyDetectionResult
  ): { input: number; output: number } {
    // 1. 优先使用本地已知规格
    const localSpec = findModelSpec(requestedId);
    if (localSpec) {
      return localSpec.maxTokens;
    }

    // 2. 尝试从API响应提取
    if (apiModel?.context_length) {
      return {
        input: apiModel.context_length,
        output: Math.min(
          apiModel.max_output_tokens || 4096,
          apiModel.context_length * 0.25
        ),
      };
    }

    // 3. 基于模型ID推断
    return this.inferTokenLimitsByModelId(requestedId);
  }

  /**
   * 根据模型ID推断token限制
   */
  private inferTokenLimitsByModelId(modelId: string): {
    input: number;
    output: number;
  } {
    const knownLimits: Record<string, { input: number; output: number }> = {
      "o1-preview": { input: 128000, output: 32768 },
      "o1-mini": { input: 128000, output: 65536 },
      "gpt-4o": { input: 128000, output: 16384 },
      "gpt-4o-mini": { input: 128000, output: 16384 },
      "gpt-4-turbo": { input: 128000, output: 4096 },
      "gpt-4": { input: 8192, output: 4096 },
      "gpt-3.5-turbo": { input: 16385, output: 4096 },
    };

    // 精确匹配
    if (knownLimits[modelId]) {
      return knownLimits[modelId];
    }

    // 模糊匹配
    for (const [pattern, limits] of Object.entries(knownLimits)) {
      if (modelId.includes(pattern?.split("-")[0])) {
        return limits;
      }
    }

    // 默认值
    return { input: 16385, output: 4096 };
  }

  /**
   * 检查是否支持函数调用
   */
  private supportsOpenAIFunctionCalling(modelId: string): boolean {
    const supportedModels = [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-4",
      "gpt-3.5-turbo",
    ];

    return supportedModels.some(
      (supported) =>
        modelId.includes(supported) ||
        supported.includes(modelId?.split("-")[0])
    );
  }

  /**
   * 计算字符串相似度
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * 计算编辑距离
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 从缓存获取模型规格
   */
  private getCachedSpec(cacheKey: string): EnhancedModelSpec | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.spec;
  }

  /**
   * 缓存模型规格
   */
  private cacheSpec(cacheKey: string, spec: EnhancedModelSpec): void {
    this.cache.set(cacheKey, {
      spec,
      timestamp: Date.now(),
    });
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { total: number; expired: number } {
    const now = Date.now();
    let total = 0;
    let expired = 0;

    for (const cached of this.cache.values()) {
      total++;
      if (now - cached.timestamp > this.CACHE_TTL) {
        expired++;
      }
    }

    return { total, expired };
  }
}
