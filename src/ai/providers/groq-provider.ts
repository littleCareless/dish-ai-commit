import { BaseOpenAIProvider } from "@/ai/providers/base-openai-provider";
import { AIModel } from "@/ai/types";

const groqModels: AIModel[] = [
  {
    id: "llama-3.1-70b-versatile",
    name: "Llama 3.1 70B Versatile",
    maxTokens: { input: 131072, output: 8192 },
    provider: { id: "groq", name: "Groq" },
    default: true,
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B Versatile",
    maxTokens: { input: 131072, output: 8192 },
    provider: { id: "groq", name: "Groq" },
  },
];

export class GroqAIProvider extends BaseOpenAIProvider {
  constructor(config?: any) {
    super({
      apiKey: config?.apiKey,
      baseUrl: config?.baseUrl || "https://api.groq.com/openai/v1",
      providerId: "groq",
      providerName: "Groq",
      models: config?.models || groqModels,
      defaultModel: config?.defaultModel || "llama-3.1-70b-versatile",
      customHeaders: config?.customHeaders,
    });
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }
}
