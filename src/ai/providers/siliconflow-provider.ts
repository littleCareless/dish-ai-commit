import { ConfigurationManager } from "../../config/configuration-manager";
import { getMessage } from "../../utils/i18n";
import { notify } from "../../utils/notification/notification-manager";
import { type AIModel } from "../types";
import { BaseOpenAIProvider } from "./base-openai-provider";

/** 硅基流动服务提供者标识信息 */
const provider = { id: "siliconflow", name: "SiliconFlow" } as const;

/**
 * 硅基流动支持的模型列表配置
 * 根据最新官方支持的模型列表更新
 */
const models: AIModel[] = [
  // Qwen高级模型
  {
    id: "Qwen/QwQ-32B",
    name: "QwQ-32B - 通义千问最新高级模型，通用领域出色表现",
    maxTokens: { input: 32000, output: 8000 },
    provider: provider,
    default: true,
  },
  {
    id: "Qwen/Qwen2.5-72B-Instruct-128K",
    name: "Qwen2.5-72B-128K - 超大窗口高性能模型，适合长文本任务",
    maxTokens: { input: 128000, output: 16000 },
    provider: provider,
  },
  {
    id: "Qwen/Qwen2.5-72B-Instruct",
    name: "Qwen2.5-72B - 通义千问2.5旗舰版，强大的思考和创作能力",
    maxTokens: { input: 32000, output: 8000 },
    provider: provider,
  },
  {
    id: "Qwen/Qwen2.5-32B-Instruct",
    name: "Qwen2.5-32B - 通义千问2.5高级版，平衡性能与效率",
    maxTokens: { input: 32000, output: 8000 },
    provider: provider,
  },
  {
    id: "Qwen/Qwen2.5-14B-Instruct",
    name: "Qwen2.5-14B - 通义千问2.5中型版，良好的通用能力",
    maxTokens: { input: 32000, output: 8000 },
    provider: provider,
  },
  {
    id: "Qwen/Qwen2.5-7B-Instruct",
    name: "Qwen2.5-7B - 通义千问2.5基础版，高效实用",
    maxTokens: { input: 32000, output: 8000 },
    provider: provider,
  },
  // Qwen编程专用模型
  {
    id: "Qwen/Qwen2.5-Coder-32B-Instruct",
    name: "Qwen2.5-Coder-32B - 编程专用大模型，代码生成与理解能力强",
    maxTokens: { input: 32000, output: 8000 },
    provider: provider,
  },
  {
    id: "Qwen/Qwen2.5-Coder-7B-Instruct",
    name: "Qwen2.5-Coder-7B - 编程专用基础模型，代码生成高效",
    maxTokens: { input: 32000, output: 8000 },
    provider: provider,
  },
  // DeepSeek系列模型
  {
    id: "deepseek-ai/DeepSeek-R1",
    name: "DeepSeek-R1 - 深度求索最新版强大推理能力",
    maxTokens: { input: 32000, output: 8000 },
    provider: provider,
  },
  {
    id: "deepseek-ai/DeepSeek-V3",
    name: "DeepSeek-V3 - 深度求索V3版本，全面升级的性能",
    maxTokens: { input: 32000, output: 8000 },
    provider: provider,
  },
  {
    id: "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B",
    name: "DeepSeek-R1-Qwen-32B - 深度求索R1与通义千问结合的蒸馏版",
    maxTokens: { input: 32000, output: 8000 },
    provider: provider,
  },
  // GLM和InternLM系列
  {
    id: "THUDM/glm-4-9b-chat",
    name: "GLM-4-9B - 智谱AI通用大模型，性能均衡",
    maxTokens: { input: 32000, output: 8000 },
    provider: provider,
  },
  {
    id: "internlm/internlm2_5-20b-chat",
    name: "InternLM2.5-20B - 书生浦语中型开源模型，中英文理解佳",
    maxTokens: { input: 32000, output: 8000 },
    provider: provider,
  },
  {
    id: "internlm/internlm2_5-7b-chat",
    name: "InternLM2.5-7B - 书生浦语轻量版，性价比高",
    maxTokens: { input: 32000, output: 8000 },
    provider: provider,
  },
  // 专业版模型
  {
    id: "Pro/Qwen/Qwen2.5-7B-Instruct",
    name: "Pro-Qwen2.5-7B - 企业级通义千问2.5，专业优化",
    maxTokens: { input: 32000, output: 8000 },
    provider: provider,
  },
  {
    id: "Pro/deepseek-ai/DeepSeek-R1",
    name: "Pro-DeepSeek-R1 - 企业级深度求索R1，专业推理能力",
    maxTokens: { input: 32000, output: 8000 },
    provider: provider,
  },
  // 其他特色模型
  {
    id: "TeleAI/TeleChat2",
    name: "TeleChat2 - 多语言能力出色的对话模型",
    maxTokens: { input: 32000, output: 8000 },
    provider: provider,
  },
];

/**
 * 硅基流动服务提供者实现类
 * 继承自BaseOpenAIProvider，提供对硅基流动API的访问能力
 */
export class SiliconFlowProvider extends BaseOpenAIProvider {
  /**
   * 创建硅基流动提供者实例
   * 从配置管理器获取必要的配置信息并初始化基类
   */
  constructor() {
    const configManager = ConfigurationManager.getInstance();
    super({
      apiKey: configManager.getConfig("PROVIDERS_SILICONFLOW_APIKEY"),
      baseURL: "https://api.siliconflow.cn/v1", // 硅基流动API端点
      apiVersion: configManager.getConfig("BASE_MODEL"),
      providerId: "siliconflow",
      providerName: "SiliconFlow",
      models: models,
      defaultModel: "Qwen/QwQ-32B", // 设置默认模型为QwQ-32B
    });
  }

  /**
   * 检查硅基流动服务是否可用
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
   * 刷新可用的硅基流动模型列表
   * 通过API获取最新的模型列表
   *
   * @returns Promise<string[]> 返回可用模型ID的数组
   * @throws 如果API调用失败会记录错误并返回空数组
   */
  async refreshModels(): Promise<string[]> {
    try {
      const models = await this.openai.models.list();
      notify.info("siliconflow.models.update.success");
      return models.data.map((model) => model.id);
    } catch (error) {
      console.error("Failed to fetch SiliconFlow models:", error);
      notify.error("siliconflow.models.fetch.failed");
      return [];
    }
  }
}
