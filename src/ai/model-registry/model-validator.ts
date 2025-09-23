/**
 * 模型验证器
 * 负责验证API返回的模型信息是否与请求的模型匹配
 */

import { AIModel } from "../types";

export interface ModelValidationResult {
  /** 验证是否通过 */
  isValid: boolean;
  /** 实际检测到的模型ID */
  actualModel?: string;
  /** 是否检测到代理服务 */
  proxyDetected?: boolean;
  /** 验证置信度 (0-1) */
  confidence: number;
  /** 验证失败的原因 */
  reason?: string;
  /** 建议的处理方式 */
  suggestion?: "use_local_spec" | "retry_with_mapping" | "fallback_to_default";
}

export interface ProxyDetectionResult {
  /** 是否为代理服务 */
  isProxy: boolean;
  /** 代理类型 */
  proxyType?: "openai-compatible" | "azure" | "custom" | "gateway";
  /** 基础URL */
  baseUrl: string;
  /** 支持的模型列表 */
  supportedModels?: string[];
  /** 代理服务标识 */
  proxyIdentifier?: string;
}

/**
 * 模型验证器类
 */
export class ModelValidator {
  private static instance: ModelValidator;
  private proxyCache = new Map<string, ProxyDetectionResult>();
  private readonly PROXY_CACHE_TTL = 60 * 60 * 1000; // 1小时

  private constructor() {}

  public static getInstance(): ModelValidator {
    if (!ModelValidator.instance) {
      ModelValidator.instance = new ModelValidator();
    }
    return ModelValidator.instance;
  }

  /**
   * 验证模型身份
   */
  async validateModelIdentity(
    requestedModel: AIModel,
    apiResponse: any,
    baseUrl: string
  ): Promise<ModelValidationResult> {
    const result: ModelValidationResult = {
      isValid: false,
      confidence: 0,
    };

    // 1. 检查完全匹配
    if (apiResponse.id === requestedModel.id) {
      result.isValid = true;
      result.confidence = 1.0;
      return result;
    }

    // 2. 检查已知的模型映射
    const mapping = this.getKnownModelMappings();
    const possibleMappings = mapping[requestedModel.id as string];
    if (possibleMappings && possibleMappings.includes(apiResponse.id)) {
      result.isValid = true;
      result.actualModel = apiResponse.id;
      result.confidence = 0.9;
      result.reason = "通过已知映射匹配";
      return result;
    }

    // 3. 检测代理服务
    const proxyInfo = await this.detectProxyService(baseUrl);
    if (proxyInfo.isProxy) {
      result.proxyDetected = true;

      // 检查是否为错误的模型类型
      const suspiciousPatterns = ["gemini", "claude", "llama", "qwen", "glm"];
      const requestedProvider = this.extractProviderFromModel(
        requestedModel.id as string
      );
      const responseProvider = this.extractProviderFromModel(apiResponse.id);

      if (requestedProvider !== responseProvider) {
        const isSuspicious = suspiciousPatterns.some(
          (pattern) =>
            apiResponse.id.toLowerCase().includes(pattern) &&
            !requestedModel.id.toLowerCase().includes(pattern)
        );

        if (isSuspicious) {
          result.confidence = 0.1;
          result.reason = `检测到可能的模型类型错误: 请求 ${requestedModel.id}, 返回 ${apiResponse.id}`;
          result.suggestion = "use_local_spec";
          return result;
        }
      }

      // 在代理环境中尝试模糊匹配
      const similarity = this.calculateSimilarity(
        requestedModel.id as string,
        apiResponse.id
      );
      if (similarity > 0.6) {
        result.isValid = true;
        result.actualModel = apiResponse.id;
        result.confidence = similarity * 0.7; // 代理环境降低置信度
        result.reason = `代理环境模糊匹配，相似度: ${similarity.toFixed(2)}`;
        return result;
      }
    }

    // 4. 最终判断
    result.confidence = 0.2;
    result.reason = `模型不匹配: 请求 ${requestedModel.id}, 返回 ${apiResponse.id}`;
    result.suggestion = "use_local_spec";

    return result;
  }

  /**
   * 检测代理服务
   */
  async detectProxyService(baseUrl: string): Promise<ProxyDetectionResult> {
    // 检查缓存
    const cached = this.proxyCache.get(baseUrl);
    if (cached) {
      return cached;
    }

    const result: ProxyDetectionResult = {
      isProxy: false,
      baseUrl,
    };

    try {
      // 1. URL模式检查
      if (!baseUrl.includes("api.openai.com")) {
        result.isProxy = true;

        if (baseUrl.includes("azure")) {
          result.proxyType = "azure";
        } else if (baseUrl.includes("gateway") || baseUrl.includes("proxy")) {
          result.proxyType = "gateway";
        } else {
          result.proxyType = "openai-compatible";
        }
      }

      // 2. 发送探测请求
      const response = await fetch(`${baseUrl}/models`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // 检查响应头
        const serverHeader =
          response.headers.get("server")?.toLowerCase() || "";
        const viaHeader = response.headers.get("via")?.toLowerCase() || "";
        const xPoweredBy =
          response.headers.get("x-powered-by")?.toLowerCase() || "";

        // 常见代理服务标识
        const proxyIndicators = [
          "nginx",
          "cloudflare",
          "fastly",
          "varnish",
          "haproxy",
          "envoy",
          "traefik",
          "kong",
        ];

        if (
          proxyIndicators.some(
            (indicator) =>
              serverHeader.includes(indicator) ||
              viaHeader.includes(indicator) ||
              xPoweredBy.includes(indicator)
          )
        ) {
          result.isProxy = true;
          result.proxyType = "gateway";
          result.proxyIdentifier = serverHeader || viaHeader || xPoweredBy;
        }

        // 检查模型列表
        const data = await response.json();
        const models = data.data || [];

        if (models.length > 0) {
          result.supportedModels = models.map((m: any) => m.id);

          // 检查是否包含非OpenAI模型
          const nonOpenAIModels = models.filter(
            (m: any) => !this.isOpenAIModel(m.id)
          );

          if (nonOpenAIModels.length > 0) {
            result.isProxy = true;
            result.proxyType = result.proxyType || "openai-compatible";
          }
        }
      }
    } catch (error) {
      console.warn("代理检测失败:", error);
    }

    // 缓存结果
    this.proxyCache.set(baseUrl, result);
    setTimeout(() => {
      this.proxyCache.delete(baseUrl);
    }, this.PROXY_CACHE_TTL);

    return result;
  }

  /**
   * 获取已知的模型映射关系
   */
  private getKnownModelMappings(): Record<string, string[]> {
    return {
      // OpenAI 模型映射
      "gpt-4o": [
        "gpt-4o",
        "gpt-4o-2024-05-13",
        "gpt-4o-2024-08-06",
        "gpt-4o-2024-11-20",
        "gpt-4o-2025-01-29",
        "gpt-4o-2025-03-26",
      ],
      "gpt-4": ["gpt-4", "gpt-4-0314", "gpt-4-0613"],
      "gpt-4.5": ["gpt-4.5", "gpt-4.5‑Orion", "gpt-4.5‑preview"],
      "gpt-4.1": ["gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano"],
      o3: ["o3"],
      "o4-mini": ["o4-mini"],
      "gpt-oss": ["gpt-oss-120b", "gpt-oss-20b"],
      "gpt-4o-mini": ["gpt-4o-mini", "gpt-4o-mini-2024-07-18"],
      "gpt-3.5-turbo": [
        "gpt-3.5-turbo",
        "gpt-3.5-turbo-0125",
        "gpt-3.5-turbo-1106",
      ],
      "o1-preview": ["o1-preview", "o1-preview-2024-09-12"],
      "o1-mini": ["o1-mini", "o1-mini-2024-09-12"],

      // 常见的代理服务映射
      "claude-3-opus": ["claude-3-opus-20240229"],
      "claude-3-sonnet": ["claude-3-sonnet-20240229"],
      "claude-3-haiku": ["claude-3-haiku-20240229"],

      // Gemini 映射
      "gemini-pro": [
        "gemini-2.5-pro",
        "gemini-2.5-pro-preview-05-06",
        "gemini-2.5-pro-preview-06-05",
      ],
      "gemini-flash": ["gemini-2.5-flash"],
      "gemini-flash-lite": ["gemini-2.5-flash-lite-preview-06-17"],
      "gemini-1.5-pro": ["gemini-1.5-pro", "gemini-1.5-pro-latest"],
      "gemini-1.5-flash": ["gemini-1.5-flash", "gemini-1.5-flash-latest"],
    };
  }

  /**
   * 从模型ID中提取提供商信息
   */
  private extractProviderFromModel(modelId: string): string {
    const lowerModelId = modelId.toLowerCase();

    if (lowerModelId.startsWith("gpt-") || lowerModelId.startsWith("o1-")) {
      return "openai";
    } else if (lowerModelId.includes("claude")) {
      return "anthropic";
    } else if (lowerModelId.includes("gemini")) {
      return "google";
    } else if (lowerModelId.includes("llama")) {
      return "meta";
    } else if (lowerModelId.includes("qwen")) {
      return "alibaba";
    } else if (lowerModelId.includes("glm")) {
      return "zhipu";
    }

    return "unknown";
  }

  /**
   * 检查是否为OpenAI模型
   */
  private isOpenAIModel(modelId: string): boolean {
    const openaiPatterns = [
      "gpt-",
      "text-",
      "davinci",
      "curie",
      "babbage",
      "ada",
      "o1-",
    ];

    return openaiPatterns.some((pattern) =>
      modelId.toLowerCase().startsWith(pattern)
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
   * 清除代理检测缓存
   */
  clearProxyCache(): void {
    this.proxyCache.clear();
  }
}
