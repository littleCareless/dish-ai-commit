import { BaseOpenAIProvider } from "@/ai/providers/base-openai-provider";
import { AIModel } from "@/ai/types";

/**
 * Xiaomi AI模型配置列表
 * 定义了不同类型的Xiaomi模型及其参数
 */
const xiaomiModels: AIModel[] = [
  {
    id: "mimo-v2-flash",
    name: "MiMo V2 Flash",
    // 假设值，根据通用 Flash 模型配置推断，实际需参考官方详细文档
    maxTokens: { input: 128 * 1024, output: 8 * 1024 },
    provider: { id: "xiaomi", name: "Xiaomi" },
    default: true,
  },
];

/**
 * Xiaomi AI服务提供者实现类
 * 继承自BaseOpenAIProvider基类，提供对Xiaomi MiMo AI平台的访问能力
 */
export class XiaomiProvider extends BaseOpenAIProvider {
  /**
   * 创建Xiaomi AI提供者实例
   * 从配置管理器获取API密钥，初始化基类
   */
  constructor(config?: any) {
    // 支持两种配置结构：
    // 1. 新结构: config.providers.xiaomi.apiKey
    // 2. 直接结构: config.apiKey (来自 ProviderSelectionService)
    const xiaomiConfig = config?.providers?.xiaomi;
    const apiKey = xiaomiConfig?.apiKey || config?.apiKey || "";

    // 仅在开发模式下输出详细调试信息
    if (process.env.NODE_ENV === "development" || !apiKey) {
      console.log("[XiaomiProvider] Constructor called:", {
        hasConfig: !!config,
        hasApiKey: !!apiKey,
        configKeys: config ? Object.keys(config) : [],
        hasProviders: !!config?.providers,
        hasXiaomiConfig: !!xiaomiConfig,
        // 如果没有 apiKey,输出调用栈以便调试
        ...(!apiKey && {
          purpose: "Likely called from getAllProviders() for metadata",
          stack: new Error().stack?.split("\n").slice(1, 3).join("\n"),
        }),
      });
    }

    super({
      apiKey: apiKey,
      baseUrl: "https://api.xiaomimimo.com/v1",
      providerId: "xiaomi",
      providerName: "Xiaomi",
      models: xiaomiModels,
      defaultModel: "mimo-v2-flash",
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
      console.error(`[XiaomiProvider] Availability check failed:`, error);
      return false;
    }
  }

  /**
   * 覆盖基础的API错误处理方法，以处理Xiaomi特定的错误码
   * @param error - 捕获到的错误对象
   */
  protected handleApiError(error: any): void {
    console.log("[XiaomiProvider] handleApiError called:", {
      hasError: !!error,
      errorType: typeof error,
      errorKeys: error ? Object.keys(error) : [],
      status: error?.status,
      code: error?.code,
      message: error?.message,
      type: error?.type,
      param: error?.param,
    });
    if (error.status) {
      const errorMessage = this.mapHttpStatusToMessage(error.status);
      console.error(
        `[XiaomiProvider] HTTP Error: ${errorMessage} (Status: ${error.status})`
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
    console.log("thisconfig", this.config);
    switch (status) {
      case 400:
        return "请求体格式错误，请根据错误信息提示修改请求体或检查模型是否存在";
      case 401:
        return "认证失败，请检查您的 API key 是否正确";
      case 403:
        return "拒绝访问，服务暂不支持当前地区或 API Key 被风控";
      case 429:
        return "请求过于频繁，请稍后重试";
      case 500:
        return "服务器内部故障，请稍后重试或联系小米支持";
      case 503:
        return "服务器负载过高，请稍后重试";
      default:
        return `发生未知的HTTP错误 (状态码: ${status})`;
    }
  }
}
