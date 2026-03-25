import { BaseOpenAIProvider } from "@/ai/providers/base-openai-provider";
import { AIModel } from "@/ai/types";

const anthropicModels: AIModel[] = [
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    maxTokens: { input: 200000, output: 4096 },
    provider: { id: "anthropic", name: "Anthropic" },
  },
  {
    id: "claude-3-sonnet-20240229",
    name: "Claude 3 Sonnet",
    maxTokens: { input: 200000, output: 4096 },
    provider: { id: "anthropic", name: "Anthropic" },
    default: true,
  },
  {
    id: "claude-3-haiku-20240307",
    name: "Claude 3 Haiku",
    maxTokens: { input: 200000, output: 4096 },
    provider: { id: "anthropic", name: "Anthropic" },
  },
];

export class AnthropicAIProvider extends BaseOpenAIProvider {
  constructor(config?: any) {
    super({
      apiKey: config?.apiKey,
      baseUrl: config?.baseUrl || "https://api.anthropic.com/v1",
      providerId: "anthropic",
      providerName: "Anthropic",
      models: config?.models || anthropicModels,
      defaultModel: config?.defaultModel || "claude-3-sonnet-20240229",
      customHeaders: config?.customHeaders,
    });
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }
}
