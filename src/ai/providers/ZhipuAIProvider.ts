import { BaseOpenAIProvider } from "./BaseOpenAIProvider";
import { ConfigurationManager } from "../../config/ConfigurationManager";
import { NotificationHandler } from "../../utils/NotificationHandler";
import { LocalizationManager } from "../../utils/LocalizationManager";
import { AIModel } from "../types";

/**
 * 智谱AI模型配置列表
 * 定义了不同型号的GLM-4模型及其参数
 */
const zhipuModels: AIModel[] = [
  {
    id: "glm-4-plus",
    name: "GLM-4 Plus - 高智能旗舰: 性能全面提升, 长文本和复杂任务能力显著增强",
    maxTokens: { input: 128000, output: 8192 },
    provider: { id: "zhipu", name: "zhipu" },
    default: true,
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "glm-4-0520",
    name: "GLM-4 0520 - 高智能模型: 适用于处理高度复杂和多样化的任务",
    maxTokens: { input: 128000, output: 8192 },
    provider: { id: "zhipu", name: "zhipu" },
  },
  {
    id: "glm-4",
    name: "GLM-4 - 旧版旗舰: 发布于2024年1月16日, 目前已被GLM-4-0520取代",
    maxTokens: { input: 128000, output: 8192 },
    provider: { id: "zhipu", name: "zhipu" },
  },
  {
    id: "glm-4-air",
    name: "GLM-4 Air - 高性价比: 推理能力和价格之间最平衡的模型",
    maxTokens: { input: 32768, output: 4096 },
    provider: { id: "zhipu", name: "zhipu" },
  },
  {
    id: "glm-4-airx",
    name: "GLM-4 AirX - 极速推理: 具有超快的推理速度和强大的推理效果",
    maxTokens: { input: 32768, output: 4096 },
    provider: { id: "zhipu", name: "zhipu" },
  },
  {
    id: "glm-4-long",
    name: "GLM-4 Long - 超长输入: 专为处理长文本和记忆型任务设计",
    maxTokens: { input: 1024000, output: 8192 },
    provider: { id: "zhipu", name: "zhipu" },
  },
  {
    id: "glm-4-flashx",
    name: "GLM-4 FlashX - 高速低价: Flash增强版本, 超快推理速度",
    maxTokens: { input: 32768, output: 4096 },
    provider: { id: "zhipu", name: "zhipu" },
  },
  {
    id: "glm-4-flash",
    name: "GLM-4 Flash - 免费调用: 智谱AI首个免费API, 零成本调用大模型",
    maxTokens: { input: 32768, output: 4096 },
    provider: { id: "zhipu", name: "zhipu" },
  },
];

/**
 * 智谱AI服务提供者实现类
 * 继承自BaseOpenAIProvider基类，提供对智谱AI平台的访问能力
 */
export class ZhipuAIProvider extends BaseOpenAIProvider {
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
      defaultModel: "glm-4-flash",
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
          console.error('Background availability check failed:', error);
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
