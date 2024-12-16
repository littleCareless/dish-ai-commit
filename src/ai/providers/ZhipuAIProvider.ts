import { BaseOpenAIProvider } from "./BaseOpenAIProvider";
import { ConfigurationManager } from "../../config/ConfigurationManager";
import { NotificationHandler } from "../../utils/NotificationHandler";
import { LocalizationManager } from "../../utils/LocalizationManager";
import { AIModel } from "../types";

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

export class ZhipuAIProvider extends BaseOpenAIProvider {
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

  async isAvailable(): Promise<boolean> {
    try {
      return !!this.config.apiKey;
    } catch {
      return false;
    }
  }

  async refreshModels(): Promise<string[]> {
    return Promise.resolve(zhipuModels.map((m) => m.id));
  }
}
