import { ConfigurationManager } from "../../config/ConfigurationManager";
import { type AIModel } from "../types";
import { NotificationHandler } from "../../utils/NotificationHandler";
import { LocalizationManager } from "../../utils/LocalizationManager";
import { BaseOpenAIProvider } from "./BaseOpenAIProvider";

const provider = { id: "openai", name: "OpenAI" } as const;
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

export class OpenAIProvider extends BaseOpenAIProvider {
  constructor() {
    const configManager = ConfigurationManager.getInstance();
    super({
      apiKey: configManager.getConfig("PROVIDERS_OPENAI_APIKEY", false),
      baseURL: configManager.getConfig("PROVIDERS_OPENAI_BASEURL", false),
      apiVersion: configManager.getConfig("BASE_MODEL", false),
      providerId: "openai",
      providerName: "OpenAI",
      models: models,
      defaultModel: "gpt-3.5-turbo",
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
