/**
 * 模型信息动态获取器
 * 负责从各个AI提供商的API动态获取最新的模型信息
 */

import { ConfigurationManager } from "../../config/configuration-manager";
import { ModelSpec, findModelSpec, getDefaultTokenLimits } from "./model-specs";
import { AIModel } from "../types";

export interface ModelInfoCache {
  [modelId: string]: {
    spec: ModelSpec;
    timestamp: number;
    ttl: number; // 缓存生存时间（毫秒）
  };
}

/**
 * 模型信息获取器类
 */
export class ModelInfoFetcher {
  private static instance: ModelInfoFetcher;
  private cache: ModelInfoCache = {};
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时缓存

  private constructor() {}

  public static getInstance(): ModelInfoFetcher {
    if (!ModelInfoFetcher.instance) {
      ModelInfoFetcher.instance = new ModelInfoFetcher();
    }
    return ModelInfoFetcher.instance;
  }

  /**
   * 获取模型的详细信息，优先级：缓存 > API > 本地规格 > 默认值
   */
  async getModelInfo(model: AIModel): Promise<ModelSpec> {
    const modelId = model.id;

    // 1. 检查缓存
    const cached = this.getCachedModelInfo(modelId);
    if (cached) {
      return cached;
    }

    // 2. 尝试从API获取
    try {
      const apiInfo = await this.fetchModelInfoFromAPI(model);
      if (apiInfo) {
        this.cacheModelInfo(modelId, apiInfo);
        return apiInfo;
      }
    } catch (error) {
      console.warn(
        `Failed to fetch model info from API for ${modelId}:`,
        error
      );
    }

    // 3. 使用本地规格数据库
    const localSpec = findModelSpec(modelId);
    if (localSpec) {
      this.cacheModelInfo(modelId, localSpec);
      return localSpec;
    }

    // 4. 使用默认值
    const defaultLimits = getDefaultTokenLimits(model.provider.id);
    const fallbackSpec: ModelSpec = {
      id: modelId,
      name: model.name,
      provider: model.provider,
      maxTokens: defaultLimits,
      lastUpdated: new Date().toISOString(),
      source: "fallback",
      capabilities: model.capabilities,
    };

    this.cacheModelInfo(modelId, fallbackSpec);
    return fallbackSpec;
  }

  /**
   * 从缓存获取模型信息
   */
  private getCachedModelInfo(modelId: string): ModelSpec | null {
    const cached = this.cache[modelId];
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      delete this.cache[modelId];
      return null;
    }

    return cached.spec;
  }

  /**
   * 缓存模型信息
   */
  private cacheModelInfo(modelId: string, spec: ModelSpec): void {
    this.cache[modelId] = {
      spec,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL,
    };
  }

  /**
   * 从API获取模型信息
   */
  private async fetchModelInfoFromAPI(
    model: AIModel
  ): Promise<ModelSpec | null | undefined> {
    const providerId = model.provider.id;

    switch (providerId) {
      case "openai":
        return this.fetchOpenAIModelInfo(model);
      case "anthropic":
        return this.fetchAnthropicModelInfo(model);
      case "github":
        return this.fetchGitHubModelInfo(model);
      default:
        return null;
    }
  }

  /**
   * 从OpenAI API获取模型信息
   */
  private async fetchOpenAIModelInfo(
    model: AIModel
  ): Promise<ModelSpec | null> {
    try {
      const config = ConfigurationManager.getInstance();
      const apiKey = config.getConfig("PROVIDERS_OPENAI_APIKEY");
      const baseURL =
        config.getConfig("PROVIDERS_OPENAI_BASEURL") ||
        "https://api.openai.com/v1";

      if (!apiKey) {
        return null;
      }

      const response = await fetch(`${baseURL}/models/${model.id}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return null;
      }

      const modelData = await response.json();

      // OpenAI API 通常不直接返回token限制，需要根据模型ID推断
      const tokenLimits = this.inferOpenAITokenLimits(model.id);

      return {
        id: model.id,
        name: modelData.id || model.name,
        provider: model.provider,
        maxTokens: tokenLimits,
        lastUpdated: new Date().toISOString(),
        source: "api",
        capabilities: {
          streaming: true, // 大多数OpenAI模型支持流式
          functionCalling: this.supportsOpenAIFunctionCalling(model.id),
        },
      };
    } catch (error) {
      console.warn("Failed to fetch OpenAI model info:", error);
      return null;
    }
  }

  /**
   * 推断OpenAI模型的token限制
   */
  private inferOpenAITokenLimits(modelId: string): {
    input: number;
    output: number;
  } {
    // 基于已知的模型规格进行推断
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
      if (
        modelId.includes(pattern) ||
        pattern.includes(modelId?.split("-")[0])
      ) {
        return limits;
      }
    }

    // 默认值
    return { input: 16385, output: 4096 };
  }

  /**
   * 检查OpenAI模型是否支持函数调用
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
   * 从Anthropic API获取模型信息
   */
  private async fetchAnthropicModelInfo(
    model: AIModel
  ): Promise<ModelSpec | undefined> {
    // Anthropic 目前没有公开的模型列表API，使用本地规格
    return findModelSpec(model.id);
  }

  /**
   * 从GitHub Models API获取模型信息
   */
  private async fetchGitHubModelInfo(
    model: AIModel
  ): Promise<ModelSpec | null> {
    try {
      const config = ConfigurationManager.getInstance();
      const apiKey = config.getConfig("PROVIDERS_OPENAI_APIKEY"); // 暂时使用OpenAI的配置，后续需要添加GitHub配置

      if (!apiKey) {
        return null;
      }

      // GitHub Models API 端点
      const response = await fetch(
        `https://models.inference.ai.azure.com/models`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const modelsData = await response.json();
      const modelInfo = modelsData.data?.find((m: any) => m.id === model.id);

      if (!modelInfo) {
        return null;
      }

      return {
        id: model.id,
        name: modelInfo.name || model.name,
        provider: model.provider,
        maxTokens: {
          input: modelInfo.context_length || 128000,
          output: modelInfo.max_output_tokens || 16384,
        },
        lastUpdated: new Date().toISOString(),
        source: "api",
        capabilities: {
          streaming: true,
          functionCalling: modelInfo.supports_function_calling || false,
        },
      };
    } catch (error) {
      console.warn("Failed to fetch GitHub model info:", error);
      return null;
    }
  }

  /**
   * 清除缓存
   */
  public clearCache(): void {
    this.cache = {};
  }

  /**
   * 获取缓存统计信息
   */
  public getCacheStats(): { total: number; expired: number } {
    const now = Date.now();
    let total = 0;
    let expired = 0;

    for (const cached of Object.values(this.cache)) {
      total++;
      if (now - cached.timestamp > cached.ttl) {
        expired++;
      }
    }

    return { total, expired };
  }
}
