import {
  BaseOpenAIProvider,
  OpenAIProviderConfig,
} from "@/ai/providers/base-openai-provider";
import { AIModel } from "@/ai/types";

/**
 * xAI支持的AI模型配置列表
 */
const xaiModels: AIModel[] = [
  {
    id: "grok-1.5-flash",
    name: "Grok 1.5 Flash",
    maxTokens: { input: 131072, output: 8192 },
    provider: { id: "xai", name: "xAI" },
    default: true,
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
  {
    id: "grok-1.5",
    name: "Grok 1.5",
    maxTokens: { input: 131072, output: 8192 },
    provider: { id: "xai", name: "xAI" },
    default: false,
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
];

/**
 * xAI AI服务提供者实现类
 * 继承自BaseOpenAIProvider，提供对xAI OpenAI兼容API的访问能力
 */
export class XAIProvider extends BaseOpenAIProvider {
  /**
   * 创建xAI AI提供者实例
   * 从配置管理器获取API密钥，并设置OpenAI兼容配置
   */
  constructor(config?: any) {

    const apiKey = config?.apiKey;

    const providerConfig: OpenAIProviderConfig = {
      apiKey,
      baseUrl: "https://api.xai.com/v1",
      providerId: "xai",
      providerName: "xAI",
      models: xaiModels,
      defaultModel: "grok-1.5-flash",
    };

    super(providerConfig);
  }

  /**
   * 检查xAI服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }
}
