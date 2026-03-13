import { BaseOpenAIProvider } from "@/ai/providers/base-openai-provider";
import { AIModel } from "@/ai/types";

const cloudflareModels: AIModel[] = [
  {
    id: "@cf/meta/llama-3.1-8b-instruct",
    name: "Llama 3.1 8B Instruct",
    maxTokens: { input: 32768, output: 4096 },
    provider: { id: "cloudflare", name: "Cloudflare AI" },
    default: true,
  },
  {
    id: "@cf/meta/llama-3.1-70b-instruct",
    name: "Llama 3.1 70B Instruct",
    maxTokens: { input: 32768, output: 4096 },
    provider: { id: "cloudflare", name: "Cloudflare AI" },
  },
];

export class CloudflareWorkersAIProvider extends BaseOpenAIProvider {
  constructor(config?: any) {
    super({
      apiKey: config?.apiKey,
      baseUrl: config?.baseUrl,
      providerId: "cloudflare",
      providerName: "Cloudflare AI",
      models: config?.models || cloudflareModels,
      defaultModel: config?.defaultModel || "@cf/meta/llama-3.1-8b-instruct",
      customHeaders: config?.customHeaders,
    });
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.config.baseUrl && this.config.apiKey);
  }
}
