import { BaseOpenAIProvider } from "@/ai/providers/base-openai-provider";
import { AIModel } from "@/ai/types";

const geminiModels: AIModel[] = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    maxTokens: { input: 1048576, output: 65536 },
    provider: { id: "gemini", name: "Gemini" },
    default: true,
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    maxTokens: { input: 1048576, output: 65536 },
    provider: { id: "gemini", name: "Gemini" },
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    maxTokens: { input: 1048576, output: 8192 },
    provider: { id: "gemini", name: "Gemini" },
  },
];

const geminiEmbeddingModels: AIModel[] = [
  {
    id: "gemini-embedding-001",
    name: "Gemini Embedding 001 (768)",
    maxTokens: { input: 2048, output: 0 },
    provider: { id: "gemini", name: "Gemini" },
    dimension: 768,
  },
  {
    id: "gemini-embedding-001",
    name: "Gemini Embedding 001 (1536)",
    maxTokens: { input: 2048, output: 0 },
    provider: { id: "gemini", name: "Gemini" },
    dimension: 1536,
  },
  {
    id: "gemini-embedding-001",
    name: "Gemini Embedding 001 (3072)",
    maxTokens: { input: 2048, output: 0 },
    provider: { id: "gemini", name: "Gemini" },
    dimension: 3072,
  },
];

export class GeminiAIProvider extends BaseOpenAIProvider {
  constructor(config?: any) {
    super({
      apiKey: config?.apiKey,
      baseUrl: config?.baseUrl || "https://generativelanguage.googleapis.com/v1beta",
      providerId: "gemini",
      providerName: "Gemini",
      models: config?.models || geminiModels,
      defaultModel: config?.defaultModel || "gemini-2.5-flash",
      customHeaders: config?.customHeaders,
    });
  }

  async getEmbeddingModels(): Promise<AIModel[]> {
    return geminiEmbeddingModels;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }
}
