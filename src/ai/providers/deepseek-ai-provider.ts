import { BaseOpenAIProvider } from "./base-open-ai-provider";
import { ConfigurationManager } from "../../config/configuration-manager";
import { AIModel } from "../types";

/**
 * Deepseek AI模型配置列表
 * 定义了不同类型的Deepseek模型及其参数
 */
const deepseekModels: AIModel[] = [
  {
    id: "deepseek-chat",
    name: "Deepseek Chat - 通用大语言模型: 对话流畅自然,知识面广",
    maxTokens: { input: 65536, output: 8192 },
    provider: { id: "deepseek", name: "deepseek" },
    default: true,
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
    cost: {
      input: 0.000001,
      output: 0.000002,
    },
  },
  {
    id: "deepseek-reasoner",
    name: "Deepseek Reasoner - 强化推理能力的大模型",
    maxTokens: { input: 65536, output: 8192 },
    provider: { id: "deepseek", name: "deepseek" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
    cost: {
      input: 0.000004,
      output: 0.000016,
    },
  },
];

/**
 * Deepseek AI服务提供者实现类
 * 继承自BaseOpenAIProvider基类，提供对Deepseek AI平台的访问能力
 */
export class DeepseekAIProvider extends BaseOpenAIProvider {
  /**
   * 创建Deepseek AI提供者实例
   * 从配置管理器获取API密钥，初始化基类
   */
  constructor() {
    const configManager = ConfigurationManager.getInstance();
    super({
      apiKey: configManager.getConfig("PROVIDERS_DEEPSEEK_APIKEY"),
      baseURL: "https://api.deepseek.com/v1/",
      providerId: "deepseek",
      providerName: "deepseek",
      models: deepseekModels,
      defaultModel: "deepseek-chat",
    });
  }

  /**
   * 检查提供者服务是否可用
   * 主要验证API密钥是否已配置
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        return false;
      }

      const checkPromise = this.withTimeout(
        this.withRetry(async () => {
          try {
            // 执行一个轻量的API调用来验证可用性
            await this.openai.models.list();
            return true;
          } catch {
            return false;
          }
        })
      );

      setTimeout(async () => {
        try {
          await checkPromise;
        } catch (error) {
          console.error("Background availability check failed:", error);
        }
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 刷新可用模型列表
   * 由于Deepseek AI模型列表是静态的，直接返回预定义模型ID列表
   */
  async refreshModels(): Promise<string[]> {
    return Promise.resolve(deepseekModels.map((m) => m.id));
  }
}
