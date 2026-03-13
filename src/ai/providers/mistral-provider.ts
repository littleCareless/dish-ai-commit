import { BaseOpenAIProvider } from "@/ai/providers/base-openai-provider";
import { AIModel } from "@/ai/types";

const mistralModels: AIModel[] = [
  {
    id: "mistral-large-latest",
    name: "Mistral Large",
    maxTokens: { input: 32768, output: 4096 },
    provider: { id: "mistral", name: "Mistral AI" },
    default: true,
  },
  {
    id: "mistral-small-latest",
    name: "Mistral Small",
    maxTokens: { input: 32768, output: 4096 },
    provider: { id: "mistral", name: "Mistral AI" },
  },
];

export class MistralAIProvider extends BaseOpenAIProvider {
  constructor(config?: any) {
    super({
      apiKey: config?.apiKey,
      baseUrl: config?.baseUrl || "https://api.mistral.ai/v1",
      providerId: "mistral",
      providerName: "Mistral AI",
      models: config?.models || mistralModels,
      defaultModel: config?.defaultModel || "mistral-large-latest",
      customHeaders: config?.customHeaders,
    });
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }
}
