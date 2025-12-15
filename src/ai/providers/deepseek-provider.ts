import { BaseOpenAIProvider } from "@/ai/providers/base-openai-provider";
import { AIModel } from "@/ai/types";

/**
 * Deepseek AI模型配置列表
 * 定义了不同类型的Deepseek模型及其参数
 */
const deepseekModels: AIModel[] = [
  {
    id: "deepseek-v3-1-terminus",
    name: "deepseek-v3.1-terminus - 深度思考/文本",
    maxTokens: { input: 96 * 1024, output: 32 * 1024 },
    provider: { id: "deepseek", name: "deepseek" },
    default: true,
    capabilities: {
      functionCalling: true,
    },
  },
  {
    id: "deepseek-v3-1-250821",
    name: "deepseek-v3.1-250821 - 深度思考/文本",
    maxTokens: { input: 96 * 1024, output: 32 * 1024 },
    provider: { id: "deepseek", name: "deepseek" },
    capabilities: {
      functionCalling: true,
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
  constructor(config?: any) {
    const apiKey = config?.apiKey;
    const apiVersion = config?.apiVersion;

    super({
      apiKey: apiKey,
      baseUrl: "https://api.deepseek.com/v1",
      apiVersion: apiVersion,
      providerId: "deepseek",
      providerName: "Deepseek",
      models: deepseekModels,
      defaultModel: "deepseek-v3-1-terminus",
    });
  }

  /**
   * 检查提供者服务是否可用
   * 主要验证API密钥是否已配置
   */
  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey) {
      return false;
    }
    try {
      await this.withTimeout(
        this.withRetry(async () => {
          // 执行一个轻量的API调用来验证可用性
          await this.openai.models.list();
        })
      );
      return true;
    } catch (error) {
      console.error(`[DeepseekAIProvider] Availability check failed:`, error);
      return false;
    }
  }

  /**
   * 覆盖基础的API错误处理方法，以处理Deepseek特定的错误码
   * @param error - 捕获到的错误对象
   */
  protected handleApiError(error: any): void {
    if (error.status) {
      const errorMessage = this.mapHttpStatusToMessage(error.status);
      console.error(
        `[DeepseekAIProvider] HTTP Error: ${errorMessage} (Status: ${error.status})`
      );
      throw new Error(errorMessage);
    }
    super.handleApiError(error);
  }

  /**
   * 将HTTP状态码映射到可读的错误消息
   * @param status - HTTP状态码
   * @returns 对应的错误消息字符串
   */
  private mapHttpStatusToMessage(status: number): string {
    switch (status) {
      case 400:
        return "请求体格式错误，请根据错误信息提示修改请求体";
      case 401:
        return "认证失败，请检查您的 API key 是否正确";
      case 402:
        return "账号余额不足，请确认账户余额并充值";
      case 422:
        return "请求体参数错误，请根据错误信息提示修改相关参数";
      case 429:
        return "请求速率达到上限，请合理规划您的请求速率";
      case 500:
        return "服务器内部故障，请等待后重试";
      case 503:
        return "服务器负载过高，请稍后重试您的请求";
      default:
        return `发生未知的HTTP错误 (状态码: ${status})`;
    }
  }
}
