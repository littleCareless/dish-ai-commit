import { AnthropicAIProvider } from "@/ai/providers/anthropic-provider";
import { AzureOpenAIProvider } from "@/ai/providers/azure-openai-provider";
import { BaiduQianfanProvider } from "@/ai/providers/baidu-qianfan-provider";
import { CloudflareWorkersAIProvider } from "@/ai/providers/cloudflare-workersai-provider";
import { DashScopeProvider } from "@/ai/providers/dashscope-provider";
import { DeepseekAIProvider } from "@/ai/providers/deepseek-provider";
import { DoubaoProvider } from "@/ai/providers/doubao-provider";
import { GeminiAIProvider } from "@/ai/providers/gemini-provider";
import { GroqAIProvider } from "@/ai/providers/groq-provider";
import { LMStudioProvider } from "@/ai/providers/lmstudio-provider";
import { MistralAIProvider } from "@/ai/providers/mistral-provider";
import { OllamaProvider } from "@/ai/providers/ollama-provider";
import { OpenAICompatibleProvider } from "@/ai/providers/openai-compatible-provider";
import { OpenAIProvider } from "@/ai/providers/openai-provider";
import { OpenRouterProvider } from "@/ai/providers/openrouter-provider";
import { SiliconFlowProvider } from "@/ai/providers/siliconflow-provider";
import { TogetherAIProvider } from "@/ai/providers/together-provider"; // Import TogetherAIProvider
import { VertexAIProvider } from "@/ai/providers/vertexai-provider";
import { VSCodeProvider } from "@/ai/providers/vscode-provider";
import { XAIProvider } from "@/ai/providers/xai-provider";
import { XiaomiProvider } from "@/ai/providers/xiaomi-provider";
import { ZhipuAIProvider } from "@/ai/providers/zhipu-provider";
import { AIModel, AIProvider as AIProviderInterface } from "@/ai/types";
import {
  getProviderByEnumKey,
  normalizeProviderType,
} from "@/config/provider-definitions";
import { ProviderConfig } from "@/types/provider-config";
import { Logger } from "@/utils/logger";
import { formatMessage } from "@/utils/i18n/localization-manager";
import { PerplexityAIProvider } from "./providers/perplexity-provider";
import { PremAIProvider } from "./providers/premai-provider";

const logger = Logger.getInstance("Dish AI Commit Gen");

function maskSensitiveValue(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  if (value.length <= 8) {
    return "***";
  }
  return `${value.slice(0, 3)}***${value.slice(-2)}`;
}

function sanitizeConfigForLog(config: ProviderConfig): Record<string, unknown> {
  const sensitiveKeyPattern = /(api[-_]?key|token|secret|password)/i;

  return Object.entries(config || {}).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      if (sensitiveKeyPattern.test(key)) {
        acc[key] = maskSensitiveValue(value);
        return acc;
      }

      if (typeof value === "object" && value !== null) {
        acc[key] = "[object]";
        return acc;
      }

      acc[key] = value;
      return acc;
    },
    {},
  );
}

/**
 * AI提供者工厂类，负责按需创建AI服务提供者的实时实例。
 * 该工厂确保每次创建都使用最新的配置，不使用任何缓存。
 * 支持多种AI提供者，包括:
 * - OpenAI, Ollama, ZhipuAI, DashScope, Doubao, Gemini, Deepseek, etc.
 */
export class AIProviderFactory {
  /**
   * 创建并返回指定类型的AI提供者实例。
   * 该方法确保始终创建新的实例，以反映最新的配置。
   * 如果未提供配置，将自动从 ProfileManagerService 获取当前激活的配置。
   *
   * @param type - 提供者类型标识符。
   * @param config - 可选的配置对象。如果未提供，将获取实时配置。
   * @returns AI提供者实例。
   * @throws Error 当提供者类型未知时抛出错误。
   */
  public static async getProvider(
    type: string,
    config: ProviderConfig
  ): Promise<AIProviderInterface> {
    const providerType = type;
    const normalizedEnumKey = normalizeProviderType(providerType);
    const providerDef = getProviderByEnumKey(normalizedEnumKey);

    if (!providerDef) {
      throw new Error(formatMessage("provider.type.unknown", [providerType]));
    }

    const effectiveConfig = config;

    const providerId = providerDef.id;
    let provider: AIProviderInterface;

    logger.debug("[AIProviderFactory] Creating provider", {
      data: {
        providerId,
        config: sanitizeConfigForLog(effectiveConfig),
      },
    });

    switch (providerId) {
      case "anthropic":
        provider = new AnthropicAIProvider(effectiveConfig);
        break;
      case "openai":
        provider = new OpenAIProvider(effectiveConfig);
        break;
      case "ollama":
        provider = new OllamaProvider(effectiveConfig);
        break;
      case "vscode":
        provider = new VSCodeProvider(effectiveConfig);
        break;
      case "zhipu":
        provider = new ZhipuAIProvider(effectiveConfig);
        break;
      case "dashscope":
        provider = new DashScopeProvider(effectiveConfig);
        break;
      case "doubao":
        provider = new DoubaoProvider(effectiveConfig);
        break;
      case "gemini":
        provider = new GeminiAIProvider(effectiveConfig);
        break;
      case "deepseek":
        provider = new DeepseekAIProvider(effectiveConfig);
        break;
      case "siliconflow":
        provider = new SiliconFlowProvider(effectiveConfig);
        break;
      case "openrouter":
        provider = new OpenRouterProvider(effectiveConfig);
        break;
      case "premai":
        provider = new PremAIProvider(effectiveConfig);
        break;
      case "together":
        provider = new TogetherAIProvider(effectiveConfig);
        break;
      case "xai":
        provider = new XAIProvider(effectiveConfig);
        break;
      case "azure-openai":
        provider = new AzureOpenAIProvider(effectiveConfig);
        break;
      case "cloudflare":
        provider = new CloudflareWorkersAIProvider(effectiveConfig);
        break;
      case "vertexai":
        provider = new VertexAIProvider(effectiveConfig);
        break;
      case "groq":
        provider = new GroqAIProvider(effectiveConfig);
        break;
      case "mistral":
        provider = new MistralAIProvider(effectiveConfig);
        break;
      case "baidu-qianfan":
        provider = new BaiduQianfanProvider(effectiveConfig);
        break;
      case "lmstudio":
        provider = new LMStudioProvider(effectiveConfig);
        break;
      case "openai-compatible":
        provider = new OpenAICompatibleProvider(effectiveConfig);
        break;
      case "perplexity":
        provider = new PerplexityAIProvider(effectiveConfig);
        break;
      case "xiaomi":
        provider = new XiaomiProvider(effectiveConfig);
        break;
      case "iflow":
        provider = new OpenAICompatibleProvider({
          ...effectiveConfig,
          providerId: "iflow",
          providerName: "Alibaba iFlow",
        });
        break;
      case "volcano":
        provider = new OpenAICompatibleProvider({
          ...effectiveConfig,
          providerId: "volcano",
          providerName: "ByteDance Volcano",
        });
        break;
      case "modelscope":
        provider = new OpenAICompatibleProvider({
          ...effectiveConfig,
          providerId: "modelscope",
          providerName: "ModelScope",
        });
        break;
      case "kat":
        provider = new OpenAICompatibleProvider({
          ...effectiveConfig,
          providerId: "kat",
          providerName: "Kuaishou KAT",
        });
        break;
      case "longcat":
        provider = new OpenAICompatibleProvider({
          ...effectiveConfig,
          providerId: "longcat",
          providerName: "Meituan LongCat",
        });
        break;
      case "qiniu":
        provider = new OpenAICompatibleProvider({
          ...effectiveConfig,
          providerId: "qiniu",
          providerName: "Qiniu AI",
        });
        break;
      case "nvidia":
        provider = new OpenAICompatibleProvider({
          ...effectiveConfig,
          providerId: "nvidia",
          providerName: "NVIDIA NIM",
        });
        break;
      case "cerebras":
        provider = new OpenAICompatibleProvider({
          ...effectiveConfig,
          providerId: "cerebras",
          providerName: "Cerebras",
        });
        break;
      case "codebuddy":
        provider = new OpenAICompatibleProvider({
          ...effectiveConfig,
          providerId: "codebuddy",
          providerName: "Tencent CodeBuddy",
        });
        break;
      case "codeflicker":
        provider = new OpenAICompatibleProvider({
          ...effectiveConfig,
          providerId: "codeflicker",
          providerName: "Kuaishou CodeFlicker",
        });
        break;
      case "tongyi":
        provider = new OpenAICompatibleProvider({
          ...effectiveConfig,
          providerId: "tongyi",
          providerName: "Tongyi Lingma",
        });
        break;
      default:
        throw new Error(formatMessage("provider.type.unknown", [providerType]));
    }

    // 注入全局配置 (如果 provider 支持)
    if (typeof provider.setGlobalConfig === "function") {
      provider.setGlobalConfig(effectiveConfig);
    }

    return provider;
  }

  /**
   * 创建并返回所有支持的AI提供者的新实例
   * 注意: 这些实例不会被缓存，每次调用都会创建新实例
   *
   * @returns 包含所有可用AI提供者实例的数组
   */
  public static getAllProviders(): AIProviderInterface[] {
    return [
      new VSCodeProvider(),
      new OllamaProvider(),
      new OpenAIProvider(),
      new ZhipuAIProvider(),
      new DashScopeProvider(),
      new DoubaoProvider(),
      new GeminiAIProvider(),
      new DeepseekAIProvider(),
      new SiliconFlowProvider(),
      new OpenRouterProvider(),
      new PremAIProvider(),
      new TogetherAIProvider(),
      new XAIProvider(),
      new AnthropicAIProvider(),
      new AzureOpenAIProvider(),
      new CloudflareWorkersAIProvider(),
      new VertexAIProvider(),
      new MistralAIProvider(),
      new GroqAIProvider(),
      new BaiduQianfanProvider(),
      new LMStudioProvider(),
      new OpenAICompatibleProvider(),
      new XiaomiProvider(),
      new OpenAICompatibleProvider({
        providerId: "iflow",
        providerName: "Alibaba iFlow",
      }),
      new OpenAICompatibleProvider({
        providerId: "volcano",
        providerName: "ByteDance Volcano",
      }),
      new OpenAICompatibleProvider({
        providerId: "modelscope",
        providerName: "ModelScope",
      }),
      new OpenAICompatibleProvider({
        providerId: "kat",
        providerName: "Kuaishou KAT",
      }),
      new OpenAICompatibleProvider({
        providerId: "longcat",
        providerName: "Meituan LongCat",
      }),
      new OpenAICompatibleProvider({
        providerId: "qiniu",
        providerName: "Qiniu AI",
      }),
      new OpenAICompatibleProvider({
        providerId: "nvidia",
        providerName: "NVIDIA NIM",
      }),
      new OpenAICompatibleProvider({
        providerId: "cerebras",
        providerName: "Cerebras",
      }),
      new OpenAICompatibleProvider({
        providerId: "codebuddy",
        providerName: "Tencent CodeBuddy",
      }),
      new OpenAICompatibleProvider({
        providerId: "codeflicker",
        providerName: "Kuaishou CodeFlicker",
      }),
      new OpenAICompatibleProvider({
        providerId: "tongyi",
        providerName: "Tongyi Lingma",
      }),
    ];
  }

  /**
   * 获取所有提供者支持的嵌入式模型列表
   * @returns Promise<AIModel[]> 返回一个包含所有嵌入式模型的数组
   */
  public static async getAllEmbeddingModels(): Promise<AIModel[]> {
    const allProviders = this.getAllProviders();
    const allEmbeddingModels: AIModel[] = [];

    for (const provider of allProviders) {
      if (provider.getEmbeddingModels) {
        try {
          const models = await provider.getEmbeddingModels();
          allEmbeddingModels.push(...models);
        } catch (error) {
          logger.warn(
            `Failed to get embedding models from ${provider.getName()}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    return allEmbeddingModels;
  }
}
