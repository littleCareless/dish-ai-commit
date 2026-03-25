import { BaseOpenAIProvider } from "@/ai/providers/base-openai-provider";
import { AIModel } from "@/ai/types";

const vertexAIModels: AIModel[] = [
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    maxTokens: { input: 1048576, output: 8192 },
    provider: { id: "vertexai", name: "Vertex AI" },
    default: true,
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    maxTokens: { input: 1048576, output: 8192 },
    provider: { id: "vertexai", name: "Vertex AI" },
  },
];

export class VertexAIProvider extends BaseOpenAIProvider {
  constructor(config?: any) {
    super({
      apiKey: config?.apiKey,
      baseUrl: config?.baseUrl || "https://generativelanguage.googleapis.com/v1beta",
      providerId: "vertexai",
      providerName: "Vertex AI",
      models: config?.models || vertexAIModels,
      defaultModel: config?.defaultModel || "gemini-1.5-flash",
      customHeaders: config?.customHeaders,
    });
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }
}
