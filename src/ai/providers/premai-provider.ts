import {
  BaseOpenAIProvider,
  OpenAIProviderConfig,
} from "@/ai/providers/base-openai-provider";
import { AIModel, type PremAIModelID } from "@/ai/types";

/**
 * PremAI支持的AI模型配置列表
 * 定义了不同版本的PremAI模型及其特性
 */
const premaiModels: AIModel<"premai", PremAIModelID>[] = [
  {
    id: "llama3.2-3b",
    name: "Llama3.2 3B",
    maxTokens: { input: 128000, output: 8192 },
    provider: { id: "premai", name: "PremAI" },
    default: true,
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
];

/**
 * PremAI AI服务提供者实现类
 * 继承自BaseOpenAIProvider，通过兼容OpenAI的API格式提供对PremAI API的访问能力
 */
export class PremAIProvider extends BaseOpenAIProvider {
  /**
   * 创建PremAI AI提供者实例
   * 从配置管理器获取API密钥，并设置PremAI的特定baseURL
   */
  constructor(config?: any) {

    const apiKey = config?.apiKey as string;
    const providerConfig: OpenAIProviderConfig = {
      apiKey: apiKey,
      baseUrl: "https://studio.premai.io/api/v1/",
      providerId: "premai",
      providerName: "PremAI",
      models: premaiModels,
      defaultModel: "llama3.2-3b",
    };
    super(providerConfig);
  }

  /**
   * 检查PremAI服务是否可用
   * @returns 如果API密钥已配置返回true
   */
  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }
}