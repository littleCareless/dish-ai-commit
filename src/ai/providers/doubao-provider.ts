import { BaseOpenAIProvider } from "@/ai/providers/base-openai-provider";
import { AIModel } from "@/ai/types";

/**
 * 豆包AI支持的模型配置列表
 * 包含Lite和Pro系列的不同规格模型
 */
const doubaoModels: AIModel[] = [
  {
    id: "doubao-seed-code-preview-251028",
    name: "doubao-seed-code (preview-251028) - 深度思考/代码",
    maxTokens: { input: 224 * 1024, output: 32 * 1024 },
    provider: { id: "doubao", name: "豆包 AI" },
    capabilities: {
      functionCalling: true,
      vision: true,
    },
  },
  {
    id: "doubao-seed-1-6-250615",
    name: "doubao-seed-1.6 (250615) - 深度思考/多模态",
    maxTokens: { input: 224 * 1024, output: 32 * 1024 },
    provider: { id: "doubao", name: "豆包 AI" },
    capabilities: {
      functionCalling: true,
      vision: true,
    },
  },
  {
    id: "doubao-seed-1-6-251015",
    name: "doubao-seed-1.6 (251015) - 深度思考/多模态",
    maxTokens: { input: 224 * 1024, output: 32 * 1024 },
    provider: { id: "doubao", name: "豆包 AI" },
    default: true,
    capabilities: {
      functionCalling: true,
      vision: true,
    },
  },
  {
    id: "doubao-seed-1-6-lite-251015",
    name: "doubao-seed-1.6-lite (251015) - 深度思考/多模态/轻量",
    maxTokens: { input: 224 * 1024, output: 32 * 1024 },
    provider: { id: "doubao", name: "豆包 AI" },
    capabilities: {
      functionCalling: true,
      vision: true,
    },
  },
  {
    id: "doubao-seed-translation-250915",
    name: "doubao-seed-translation (250915) - 翻译增强",
    maxTokens: { input: 1 * 1024, output: 3 * 1024 },
    provider: { id: "doubao", name: "豆包 AI" },
  },
  {
    id: "doubao-seed-1-6-flash-250828",
    name: "doubao-seed-1.6-flash (250828) - 深度思考/多模态/高速",
    maxTokens: { input: 224 * 1024, output: 32 * 1024 },
    provider: { id: "doubao", name: "豆包 AI" },
    capabilities: {
      functionCalling: true,
      vision: true,
    },
  },
  {
    id: "doubao-seed-1-6-vision-250815",
    name: "doubao-seed-1.6-vision (250815) - 深度思考/视觉",
    maxTokens: { input: 224 * 1024, output: 32 * 1024 },
    provider: { id: "doubao", name: "豆包 AI" },
    capabilities: {
      functionCalling: true,
      vision: true,
    },
  },
  {
    id: "doubao-1-5-pro-32k-character-250715",
    name: "doubao-1.5-pro-32k (character-250715) - 角色扮演",
    maxTokens: { input: 32 * 1024, output: 12 * 1024 },
    provider: { id: "doubao", name: "豆包 AI" },
  },
];

/**
 * 豆包AI服务提供者实现类
 * 继承自BaseOpenAIProvider，提供对豆包AI API的访问能力
 */
export class DoubaoProvider extends BaseOpenAIProvider {
  /**
   * 创建豆包AI提供者实例
   * 从配置管理器获取API密钥，初始化基类配置
   */
  constructor(config?: any) {
    const apiKey = config?.apiKey;
    super({
      apiKey: apiKey,
      // https://ark.cn-beijing.volces.com/api/v3
      // baseUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
      baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
      providerId: "doubao",
      providerName: "豆包 AI",
      models: doubaoModels,
      defaultModel: "doubao-seed-1-6-251015",
    });
  }

  /**
   * 检查豆包AI服务是否可用
   * @returns 如果API密钥已配置返回true
   */
  async isAvailable(): Promise<boolean> {
    try {
      return !!this.config.apiKey;
    } catch {
      return false;
    }
  }

  /**
   * 获取当前支持的AI模型列表
   * 火山方舟不支持 models.list() API，直接返回静态模型列表
   * @returns Promise<AIModel[]> 支持的模型配置数组
   */
  async getModels(): Promise<AIModel[]> {
    return doubaoModels;
  }

  /**
   * 刷新可用的模型列表
   * 火山方舟不支持 models.list() API，使用轻量级聊天请求验证连接
   * @returns 返回预定义的模型ID列表
   */
  async refreshModels(): Promise<string[]> {
    try {
      await this.executeAIRequest(
        {
          diff: "ping",
          additionalContext: "",
          messages: [{ role: "user", content: "ping" }],
        },
        { maxTokens: 1 },
      );
      // 如果成功，返回静态模型列表
      return doubaoModels.map((m) => m.id);
    } catch (error) {
      console.error("[DoubaoProvider] Failed to verify connection:", error);
      throw error;
    }
  }
}
