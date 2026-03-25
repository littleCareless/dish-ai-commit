import { BaseOpenAIProvider } from "@/ai/providers/base-openai-provider";
import { AIModel } from "@/ai/types";

const perplexityModels: AIModel[] = [
  {
    id: "llama-3.1-sonar-large-128k-online",
    name: "Sonar Large Online",
    maxTokens: { input: 128000, output: 4096 },
    provider: { id: "perplexity", name: "Perplexity AI" },
    default: true,
  },
  {
    id: "llama-3.1-sonar-small-128k-online",
    name: "Sonar Small Online",
    maxTokens: { input: 128000, output: 4096 },
    provider: { id: "perplexity", name: "Perplexity AI" },
  },
];

export class PerplexityAIProvider extends BaseOpenAIProvider {
  constructor(config?: any) {
    super({
      apiKey: config?.apiKey,
      baseUrl: config?.baseUrl || "https://api.perplexity.ai",
      providerId: "perplexity",
      providerName: "Perplexity AI",
      models: config?.models || perplexityModels,
      defaultModel:
        config?.defaultModel || "llama-3.1-sonar-large-128k-online",
      customHeaders: config?.customHeaders,
    });
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }
}
