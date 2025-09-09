import { BaseOpenAIProvider } from "./base-openai-provider";
import { ConfigurationManager } from "../../config/configuration-manager";
import { AIModel, type AIProviders } from "../types";

/**
 * 智谱AI模型配置列表
 * 定义了不同型号的GLM模型及其参数
 * 更新时间: 2024年最新版本
 */
const zhipuModels: AIModel[] = [
  // GLM-4.5 系列 - 最新高智能旗舰模型
  {
    id: "glm-4.5",
    name: "GLM-4.5 高智能旗舰 - 性能最优: 强大的推理能力、代码生成能力以及工具调用能力",
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
    name: "GLM-4.5-X 高智能旗舰-极速版 - 推理速度更快: 适用于搜索问答、智能助手、实时翻译等时效性较强场景",
    maxTokens: { input: 128000, output: 96000 },
    provider: { id: "zhipu", name: "zhipu" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "glm-4.5-air",
    name: "GLM-4.5-Air 高性价比 - 同参数规模性能最佳: 在推理、编码和智能体任务上表现强劲",
    maxTokens: { input: 128000, output: 96000 },
    provider: { id: "zhipu", name: "zhipu" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "glm-4.5-airx",
    name: "GLM-4.5-AirX 高性价比-极速版 - 推理速度快，且价格适中: 适用于时效性有较强要求的场景",
    maxTokens: { input: 128000, output: 96000 },
    provider: { id: "zhipu", name: "zhipu" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "glm-4.5-flash",
    name: "GLM-4.5-Flash 免费模型 - 最新基座模型的普惠版本",
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
    name: "GLM-4-Plus 性能优秀 - 性能最优: 语言理解、逻辑推理、指令遵循、长文本处理效果领先",
    maxTokens: { input: 128000, output: 4000 },
    provider: { id: "zhipu", name: "zhipu" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "glm-4-air-250414",
    name: "GLM-4-Air-250414 高性价比 - 快速执行复杂任务: 擅长工具调用、联网搜索、代码",
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
    name: "GLM-4-AirX 极速推理 - 超快的推理速度: 强大的推理效果",
    maxTokens: { input: 8000, output: 4000 },
    provider: { id: "zhipu", name: "zhipu" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "glm-4-flashx-250414",
    name: "GLM-4-FlashX-250414 高速低价 - Flash增强版本: 超快推理速度，更快并发保障",
    maxTokens: { input: 128000, output: 16000 },
    provider: { id: "zhipu", name: "zhipu" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "glm-4-flash-250414",
    name: "GLM-4-Flash-250414 免费模型 - 超长上下文处理能力: 多语言支持，支持外部工具调用",
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
  constructor() {
    const configManager = ConfigurationManager.getInstance();
    super({
      apiKey: configManager.getConfig("PROVIDERS_ZHIPU_APIKEY"),
      baseURL: "https://open.bigmodel.cn/api/paas/v4/",
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

      // 异步执行检查
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
   * 由于智谱AI模型列表是静态的，直接返回预定义模型ID列表
   *
   * @returns Promise<string[]> 返回所有支持的模型ID数组
   */
  async refreshModels(): Promise<string[]> {
    return Promise.resolve(zhipuModels.map((m) => m.id));
  }
}
