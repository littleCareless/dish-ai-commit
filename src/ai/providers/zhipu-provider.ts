import { BaseOpenAIProvider } from "@/ai/providers/base-openai-provider";
import { AIModel, type AIProviders } from "@/ai/types";

/**
 * 智谱AI模型配置列表
 * 定义了不同型号的GLM模型及其参数
 * 更新时间: 2024年最新版本
 */
const zhipuModels: AIModel[] = [
  // GLM-4.6 系列 - 最新旗舰模型
  {
    id: "glm-4.6",
    name: "GLM-4.6 - 最新旗舰: 对齐 Claude Sonnet 4 的高级编码能力",
    maxTokens: { input: 200000, output: 128000 },
    provider: { id: "zhipu", name: "zhipu" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  // GLM-4.5 系列 - 最新高智能旗舰模型
  {
    id: "glm-4.5",
    name: "GLM-4.5 - 我们强大的推理模型，3550亿参数",
    maxTokens: { input: 128000, output: 96000 },
    provider: { id: "zhipu", name: "zhipu" },
    default: true,
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "glm-4.5-x",
    name: "GLM-4.5-X - 高性能 强推理 极速响应",
    maxTokens: { input: 128000, output: 96000 },
    provider: { id: "zhipu", name: "zhipu" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "glm-4.5-air",
    name: "GLM-4.5-Air - 高性价比 轻量级 强性能",
    maxTokens: { input: 128000, output: 96000 },
    provider: { id: "zhipu", name: "zhipu" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "glm-4.5-airx",
    name: "GLM-4.5-AirX - 轻量级 强性能 极速响应",
    maxTokens: { input: 128000, output: 96000 },
    provider: { id: "zhipu", name: "zhipu" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "glm-4.5-flash",
    name: "GLM-4.5-Flash - 免费 高效 多功能",
    maxTokens: { input: 128000, output: 96000 },
    provider: { id: "zhipu", name: "zhipu" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },

  // GLM-4 系列 - 经典高性能模型
  {
    id: "glm-4-plus",
    name: "GLM-4-Plus - 高性能",
    maxTokens: { input: 128000, output: 4000 },
    provider: { id: "zhipu", name: "zhipu" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "glm-4-air-250414",
    name: "GLM-4-Air-250414 - 高性价比",
    maxTokens: { input: 128000, output: 16000 },
    provider: { id: "zhipu", name: "zhipu" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "glm-4-long",
    name: "GLM-4-Long 超长输入 - 支持高达1M的上下文长度: 能够理解和回应复杂的查询，专为处理超长文本和记忆型任务设计",
    maxTokens: { input: 1000000, output: 4000 },
    provider: { id: "zhipu", name: "zhipu" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "glm-4-airx",
    name: "GLM-4-AirX - 极速推理",
    maxTokens: { input: 8000, output: 4000 },
    provider: { id: "zhipu", name: "zhipu" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "glm-4-flashx-250414",
    name: "GLM-4-FlashX-250414 - 高速低价",
    maxTokens: { input: 128000, output: 16000 },
    provider: { id: "zhipu", name: "zhipu" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "glm-4-flash-250414",
    name: "GLM-4-Flash-250414 - 免费版",
    maxTokens: { input: 128000, output: 16000 },
    provider: { id: "zhipu", name: "zhipu" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },

  // GLM-Z1 系列 - 深度思考能力模型
  {
    id: "glm-z1-air",
    name: "GLM-Z1-Air 高性价比 - 高性价比: 具备深度思考能力，数理推理能力显著增强",
    maxTokens: { input: 128000, output: 32000 },
    provider: { id: "zhipu", name: "zhipu" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "glm-z1-airx",
    name: "GLM-Z1-AirX 极速推理 - 国内最快的推理速度: 支持8倍推理速度，问题即问即答",
    maxTokens: { input: 32000, output: 30000 },
    provider: { id: "zhipu", name: "zhipu" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "glm-z1-flashx",
    name: "GLM-Z1-FlashX 高速低价 - 超快推理速度: 更快并发保障，极致性价比",
    maxTokens: { input: 128000, output: 32000 },
    provider: { id: "zhipu", name: "zhipu" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "glm-z1-flash",
    name: "GLM-Z1-Flash 免费模型 - 复杂任务推理: 轻量级应用",
    maxTokens: { input: 128000, output: 32000 },
    provider: { id: "zhipu", name: "zhipu" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
];

/**
 * 智谱AI服务提供者实现类
 * 继承自BaseOpenAIProvider基类，提供对智谱AI平台的访问能力
 */
export class ZhipuAIProvider extends BaseOpenAIProvider {
  /** 提供者标识信息 */
  readonly provider = {
    id: "zhipu" as AIProviders,
    name: "Zhipu",
  } as const;
  /**
   * 创建智谱AI提供者实例
   * 从配置管理器获取API密钥，初始化基类
   */
  constructor(config?: any) {
    const apiKey = config?.apiKey;
    super({
      apiKey: apiKey,
      baseUrl: "https://open.bigmodel.cn/api/paas/v4/",
      providerId: "zhipu",
      providerName: "zhipu",
      models: zhipuModels,
      defaultModel: "glm-4.5",
    });
  }

  /**
   * 检查提供者服务是否可用
   * 主要验证API密钥是否已配置
   *
   * @returns Promise<boolean> 如果API密钥已配置则返回true，否则返回false
   */
  async isAvailable(): Promise<boolean> {
    // Since Zhipu doesn't support listing models via API,
    // we'll consider the provider available if the API key is set.
    return Promise.resolve(!!this.config.apiKey);
  }

  /**
   * 刷新可用模型列表
   * 尝试从API获取模型列表以验证连接，如果失败则回退到静态列表
   *
   * @returns Promise<string[]> 返回所有支持的模型ID数组
   */
  async refreshModels(): Promise<string[]> {
    try {
      // 尝试调用 API 获取模型列表，主要用于验证 API Key 是否有效
      // 虽然 Zhipu 可能不返回完整的模型列表，但如果 Key 错误会抛出 401
      await this._fetchModelsFromApi();
      return zhipuModels.map((m) => m.id);
    } catch (error) {
      console.warn(
        `[ZhipuAIProvider] Failed to refresh models from API, falling back to static list. Error:`,
        error
      );
      // 如果是鉴权失败，则抛出错误，不要回退
      if (error instanceof Error && error.message.includes("鉴权失败")) {
        throw error;
      }
      // 其他错误（如网络问题、API 不支持等）则回退到静态列表
      return zhipuModels.map((m) => m.id);
    }
  }
  /**
   * 覆盖基础的API错误处理方法，以处理智谱特定的错误码
   * @param error - 捕获到的错误对象
   */
  protected handleApiError(error: any): void {
    // Check for HTTP status code from the error object
    if (error.status) {
      const httpErrorMessage = this.mapHttpStatusToMessage(error.status);

      // Try to get more specific business error from the response body
      const zhipuErrorCode = error.error?.code;
      if (zhipuErrorCode) {
        const businessErrorMessage =
          this.mapZhipuErrorCodeToMessage(zhipuErrorCode);
        const finalMessage = `${httpErrorMessage} - ${businessErrorMessage}`;
        console.error(
          `[ZhipuAIProvider] API Error: ${finalMessage} (HTTP Status: ${error.status}, Business Code: ${zhipuErrorCode})`
        );
        throw new Error(finalMessage);
      }

      console.error(
        `[ZhipuAIProvider] HTTP Error: ${httpErrorMessage} (Status: ${error.status})`
      );
      throw new Error(httpErrorMessage);
    }

    // Fallback for errors that might not have a status code but have a business code
    const zhipuErrorCode = error.error?.code;
    if (zhipuErrorCode) {
      const errorMessage = this.mapZhipuErrorCodeToMessage(zhipuErrorCode);
      console.error(
        `[ZhipuAIProvider] API Error: ${errorMessage} (Code: ${zhipuErrorCode})`
      );
      throw new Error(errorMessage);
    }

    // If no specific error is identified, use the base handler
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
        return "参数错误或文件内容异常";
      case 401:
        return "鉴权失败或 Token 超时";
      case 429:
        return "接口请求并发超额、频率过快、账户余额已用完或账户异常";
      case 435:
        return "文件大小超过 100MB";
      case 500:
        return "服务器处理请求时发生错误";
      default:
        return `发生未知的HTTP错误 (状态码: ${status})`;
    }
  }

  /**
   * 将智谱错误码映射到可读的错误消息
   * @param errorCode - 智谱API返回的错误码
   * @returns 对应的错误消息字符串
   */
  private mapZhipuErrorCodeToMessage(errorCode: string): string {
    const errorMessages: { [key: string]: string } = {
      // 基础错误
      "500": "内部错误",
      // 身份验证错误
      "1000": "身份验证失败",
      "1001": "Header 中未收到 Authentication 参数，无法进行身份验证",
      "1002": "Authentication Token 非法，请确认 Authentication Token 正确传递",
      "1003": "Authentication Token 已过期，请重新生成/获取",
      "1004": "通过 Authentication Token 的验证失败",
      // 账户错误
      "1110": "您的账户当前处于非活动状态。请检查账户信息",
      "1111": "您的账户不存在",
      "1112": "您的账户已被锁定，请联系客服解锁",
      "1113": "您的账户已欠费，请充值后重试",
      "1120": "无法成功访问您的账户，请稍后重试",
      "1121": "账户存违规行为，账号已被锁定",
      // API 调用错误
      "1200": "API 调用错误",
      "1210": "API 调用参数有误，请检查文档",
      "1211": "模型不存在，请检查模型代码",
      "1212": "当前模型不支持该调用方式",
      "1213": "未正常接收到参数",
      "1214": "参数非法。请检查文档",
      "1215": "参数冲突，请检查文档",
      "1220": "您无权访问该API",
      "1221": "API 已下线",
      "1222": "API 不存在",
      "1230": "API 调用流程出错",
      "1231": "您已有同ID的请求",
      "1234": "网络错误，请联系客服",
      // API 策略阻止错误
      "1300": "API 调用被策略阻止",
      "1301":
        "系统检测到输入或生成内容可能包含不安全或敏感内容，请您避免输入易产生敏感内容的提示语，感谢您的配合",
      "1302": "您当前使用该 API 的并发数过高，请降低并发，或联系客服增加限额",
      "1303": "您当前使用该 API 的频率过高，请降低频率，或联系客服增加限额",
      "1304": "该 API 已达今日调用次数限额，如有更多需求，请联系客服购买",
      "1308": "已达到使用上限",
      "1309": "您的 GLM Coding Plan 套餐已到期，暂无法使用",
    };
    return errorMessages[errorCode] || `发生未知错误，错误码: ${errorCode}`;
  }
}
