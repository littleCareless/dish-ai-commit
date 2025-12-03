import { BaseOpenAIProvider } from "@/ai/providers/base-openai-provider";
import { AIModel } from "@/ai/types";
import { parseQianfanError } from "@/ai/utils/qianfan-error";

/**
 * 百度千帆支持的文本模型ID列表（白名单）
 * 用于从API返回的完整模型列表中过滤出纯文本生成模型
 * 参考文档：https://cloud.baidu.com/doc/WENXINWORKSHOP/s/models
 */
const TEXT_MODEL_WHITELIST = new Set([
  // ERNIE系列-旗舰模型
  "ernie-5.0-thinking-preview",
  "ernie-5.0-thinking-latest",
  "ernie-4.5-turbo-128k",
  "ernie-4.5-turbo-128k-preview",
  "ernie-4.5-turbo-32k",
  "ernie-4.5-turbo-latest",
  "ernie-4.5-turbo-vl-preview",
  "ernie-4.5-turbo-vl",
  "ernie-4.5-turbo-vl-32k",
  "ernie-4.5-turbo-vl-32k-preview",
  "ernie-4.5-turbo-vl-latest",
  "ernie-4.5-8k-preview",
  // ERNIE系列-主力模型
  "ernie-speed-128k",
  "ernie-speed-8k",
  "ernie-speed-pro-128k",
  "ernie-lite-8k",
  "ernie-lite-pro-128k",
  // ERNIE系列-轻量模型
  "ernie-tiny-8k",
  // ERNIE系列-垂直场景模型
  "ernie-char-8k",
  "ernie-char-8k-1010",
  "ernie-char-fiction-8k",
  "ernie-char-fiction-8k-preview",
  "ernie-novel-8k",
  // ERNIE系列-开源模型
  "ernie-4.5-0.3b",
  "ernie-4.5-21b-a3b",
  "ernie-4.5-vl-28b-a3b",
  // QianFan系列
  "qianfan-lightning-128b-a19b",
  "qianfan-8b",
  "qianfan-70b",
  "qianfan-agent-intent-32k",
  "qianfan-agent-lite-8k",
  "qianfan-agent-speed-32k",
  "qianfan-agent-speed-8k",
  "qianfan-chinese-llama-2-13b",
  "qianfan-sug-8k",
  "qianfan-correct",
  "qianfan-toytalk",
  // DeepSeek系列
  "deepseek-v3",
  "deepseek-v3.1-250821",
  "deepseek-v3.2",
  // 其他模型
  "kimi-k2-instruct",
  // Qwen3系列
  "qwen3-coder-480b-a35b-instruct",
  "qwen3-coder-30b-a3b-instruct",
  "qwen3-next-80b-a3b-instruct",
  "qwen3-235b-a22b-instruct-2507",
  "qwen3-30b-a3b-instruct-2507",
  "qwen3-235b-a22b",
  "qwen3-30b-a3b",
  "qwen3-32b",
  "qwen3-14b",
  "qwen3-8b",
  "qwen3-4b",
  "qwen3-1.7b",
  "qwen3-0.6b",
  "qwen2.5-7b-instruct",
  // GLM系列
  "glm-4-32b-0414",
  // Llama系列
  "llama-4-maverick-17b-128e-instruct",
  "llama-4-scout-17b-16e-instruct",
  "meta-llama-3-70b",
  "meta-llama-3-8b",
]);

/**
 * Baidu Qianfan V2版本支持的AI模型配置列表
 * 使用OpenAI兼容接口，参考文档：https://cloud.baidu.com/doc/WENXINWORKSHOP/s/models
 */
const qianfanModels: AIModel[] = [
  {
    id: "ernie-4.0-8k",
    name: "ERNIE 4.0 8K - 百度最新、最强大的基础模型",
    maxTokens: { input: 5120, output: 2048 },
    provider: { id: "baidu-qianfan", name: "Baidu Qianfan" },
    default: true,
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "ernie-3.5-8k",
    name: "ERNIE 3.5 8K - 功能强大、速度快、性能均衡",
    maxTokens: { input: 5120, output: 2048 },
    provider: { id: "baidu-qianfan", name: "Baidu Qianfan" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "ernie-speed-8k",
    name: "ERNIE Speed 8K - 百度自研的高效语言模型",
    maxTokens: { input: 7168, output: 1024 },
    provider: { id: "baidu-qianfan", name: "Baidu Qianfan" },
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
  {
    id: "ernie-lite-8k",
    name: "ERNIE Lite 8K - 轻量级模型，响应快速",
    maxTokens: { input: 7168, output: 2048 },
    provider: { id: "baidu-qianfan", name: "Baidu Qianfan" },
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
  {
    id: "ernie-tiny-8k",
    name: "ERNIE Tiny 8K - 超轻量、高性价比模型",
    maxTokens: { input: 7168, output: 2048 },
    provider: { id: "baidu-qianfan", name: "Baidu Qianfan" },
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
];

/**
 * Baidu Qianfan AI服务提供者实现类
 * 使用OpenAI兼容接口，继承自BaseOpenAIProvider
 * API文档：https://cloud.baidu.com/doc/WENXINWORKSHOP/s/openai-compatible
 */
export class BaiduQianfanProvider extends BaseOpenAIProvider {
  /**
   * 创建Baidu Qianfan AI提供者实例
   * 使用V2版本OpenAI兼容接口
   */
  constructor(config?: any) {
    super({
      apiKey: config?.apiKey,
      baseUrl: "https://qianfan.baidubce.com/v2",
      providerId: "baidu-qianfan",
      providerName: "Baidu Qianfan",
      models: qianfanModels,
      defaultModel: "ernie-4.0-8k",
    });
  }

  /**
   * 检查Qianfan服务是否可用
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
   * 刷新可用的Qianfan模型列表
   * 通过调用OpenAI兼容接口获取模型列表，并过滤出文本生成模型
   * @returns 返回过滤后的文本模型ID列表
   */
  async refreshModels(): Promise<string[]> {
    try {
      // 调用 models.list() API 获取所有可用模型
      const response = await this.openai.models.list();
      const allModels = response.data || [];

      // 过滤出文本模型（使用白名单）
      const textModels = allModels
        .filter((model: any) => TEXT_MODEL_WHITELIST.has(model.id))
        .map((model: any) => model.id);

      console.log(
        `[BaiduQianfanProvider] 获取到 ${allModels.length} 个模型，过滤后剩余 ${textModels.length} 个文本模型`
      );

      if (textModels.length === 0) {
        console.warn(
          "[BaiduQianfanProvider] 未找到任何支持的文本模型，返回默认模型列表"
        );
        return qianfanModels.map((m) => m.id);
      }

      return textModels;
    } catch (error) {
      console.error("[BaiduQianfanProvider] Failed to fetch models:", error);
      // 使用错误处理工具解析错误
      const errorMessage = parseQianfanError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * 获取当前支持的AI模型列表
   * 从API获取模型列表，并过滤出文本生成模型
   * @returns Promise<AIModel[]> 过滤后的文本模型配置数组
   */
  override async getModels(): Promise<AIModel[]> {
    try {
      // 调用 models.list() API 获取所有可用模型
      const response = await this.openai.models.list();
      const allModels = response.data || [];

      // 过滤出文本模型（使用白名单）
      const textModels = allModels.filter((model: any) =>
        TEXT_MODEL_WHITELIST.has(model.id)
      );

      console.log(
        `[BaiduQianfanProvider] getModels: 获取到 ${allModels.length} 个模型，过滤后剩余 ${textModels.length} 个文本模型`
      );

      if (textModels.length === 0) {
        console.warn(
          "[BaiduQianfanProvider] getModels: 未找到任何支持的文本模型，返回默认模型列表"
        );
        return this.config.models as AIModel[];
      }

      // 将过滤后的模型转换为 AIModel 对象
      return textModels.map(
        (model: any) =>
          ({
            id: model.id,
            name: model.id,
            maxTokens: {
              input: model.context_window || 4096,
              output: Math.floor((model.context_window || 4096) / 2),
            },
            provider: {
              id: this.provider.id,
              name: this.provider.name,
            },
          }) as AIModel
      );
    } catch (error) {
      console.warn(
        `[BaiduQianfanProvider] getModels: 获取模型失败，返回默认模型列表`,
        error
      );
      return this.config.models as AIModel[];
    }
  }
}
