import { ConfigurationManager } from "../../config/ConfigurationManager";
import { LocalizationManager } from "../../utils/LocalizationManager";
import { NotificationHandler } from "../../utils/NotificationHandler";
import { type AIModel } from "../types";
import { BaseOpenAIProvider } from "./BaseOpenAIProvider";

/** OpenAI服务提供者标识信息 */
const provider = { id: "openai", name: "OpenAI" } as const;

/**
 * OpenAI支持的模型列表配置
 * 包含不同版本的GPT模型及其参数设置
 */
const models: AIModel[] = [
  {
    id: "o1-preview",
    name: "o1 preview - 实验性旗舰: 最新的技术突破和创新特性",
    maxTokens: { input: 128000, output: 32768 },
    provider: provider,
  },
  {
    id: "o1-mini",
    name: "o1 mini - 轻量版: 快速响应的精简版本",
    maxTokens: { input: 128000, output: 65536 },
    provider: provider,
  },
  {
    id: "gpt-4o",
    name: "GPT-4o - 增强版: 全面优化的GPT-4模型",
    maxTokens: { input: 128000, output: 16384 },
    provider: provider,
    default: true,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o mini - 精简版: 平衡性能和效率的GPT-4变体",
    maxTokens: { input: 128000, output: 16384 },
    provider: provider,
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo - 高速版: 更快的响应速度和更新的知识库",
    maxTokens: { input: 128000, output: 4096 },
    provider: provider,
  },
  {
    id: "gpt-4-turbo-preview",
    name: "GPT-4 Turbo preview - 预览版: 抢先体验最新功能",
    maxTokens: { input: 128000, output: 4096 },
    provider: provider,
  },
  {
    id: "gpt-4",
    name: "GPT-4 - 标准版: 稳定可靠的基础模型",
    maxTokens: { input: 8192, output: 4096 },
    provider: provider,
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo - 经典版: 兼顾性能与成本的主力模型",
    maxTokens: { input: 16385, output: 4096 },
    provider: provider,
  },
];

/**
 * OpenAI服务提供者实现类
 * 继承自BaseOpenAIProvider，提供对OpenAI API的标准访问能力
 */
export class OpenAIProvider extends BaseOpenAIProvider {
  /**
   * 创建OpenAI提供者实例
   * 从配置管理器获取必要的配置信息并初始化基类
   */
  constructor() {
    const configManager = ConfigurationManager.getInstance();
    super({
      apiKey: configManager.getConfig("PROVIDERS_OPENAI_APIKEY"),
      baseURL: configManager.getConfig("PROVIDERS_OPENAI_BASEURL"),
      apiVersion: configManager.getConfig("BASE_MODEL"),
      providerId: "openai",
      providerName: "OpenAI",
      models: models,
      defaultModel: "gpt-3.5-turbo",
    });
  }

  /**
   * 检查OpenAI服务是否可用
   * 验证API密钥是否已正确配置
   *
   * @returns Promise<boolean> 如果API密钥已配置则返回true，否则返回false
   */
  async isAvailable(): Promise<boolean> {
    try {
      // 快速返回,异步检查
      if (!this.config.apiKey) {
        return false;
      }

      const checkPromise = this.withTimeout(
        this.withRetry(async () => {
          try {
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

      return !!this.config.apiKey;
    } catch {
      return false;
    }
  }

  /**
   * 刷新可用的OpenAI模型列表
   * 通过API获取最新的模型列表
   *
   * @returns Promise<string[]> 返回可用模型ID的数组
   * @throws 如果API调用失败会记录错误并返回空数组
   */
  async refreshModels(): Promise<string[]> {
    try {
      const models = await this.openai.models.list();
      NotificationHandler.info(
        LocalizationManager.getInstance().getMessage(
          "openai.models.update.success"
        )
      );
      return models.data.map((model) => model.id);
    } catch (error) {
      console.error("Failed to fetch OpenAI models:", error);
      NotificationHandler.error(
        LocalizationManager.getInstance().getMessage(
          "openai.models.fetch.failed"
        )
      );
      return [];
    }
  }
}
