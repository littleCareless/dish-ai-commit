import { BaseOpenAIProvider } from "./BaseOpenAIProvider";
import { ConfigurationManager } from "../../config/ConfigurationManager";
import { AIModel } from "../types";

const geminiModels: AIModel[] = [
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash - 在各种任务中提供快速、多样化的性能",
    maxTokens: { input: 100000, output: 8000 },
    provider: { id: "gemini", name: "Gemini AI" },
    default: true,
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
  {
    id: "gemini-1.5-flash-8b",
    name: "Gemini 1.5 Flash-8B - 适用于量大且智能程度较低的任务",
    maxTokens: { input: 100000, output: 8000 },
    provider: { id: "gemini", name: "Gemini AI" },
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro - 适用于需要更多智能的复杂推理任务",
    maxTokens: { input: 100000, output: 8000 },
    provider: { id: "gemini", name: "Gemini AI" },
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
  {
    id: "gemini-2.0-flash-exp",
    name: "Gemini 2.0 Flash Experimental - 提供多模态理解和生成，支持原生工具使用",
    maxTokens: { input: 128000, output: 8000 },
    provider: { id: "gemini", name: "Gemini AI" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  // 可以根据需要添加更多模型
];

export class GeminiAIProvider extends BaseOpenAIProvider {
  constructor() {
    const configManager = ConfigurationManager.getInstance();
    super({
      apiKey: configManager.getConfig("PROVIDERS_GEMINI_APIKEY"),
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      providerId: "gemini",
      providerName: "Gemini",
      models: geminiModels,
      defaultModel: "gemini-1",
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
    return Promise.resolve(geminiModels.map((m) => m.id));
  }
}
