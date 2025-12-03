import { BaseOpenAIProvider } from "@/ai/providers/base-openai-provider";
import { AIModel } from "@/ai/types";

const provider = { id: "lmstudio", name: "LMStudio" } as const;

const models: AIModel[] = [
  {
    id: "lmstudio-model",
    name: "LMStudio Default Model",
    maxTokens: { input: 4096, output: 2048 },
    provider: provider,
    default: true,
  },
];

export class LMStudioProvider extends BaseOpenAIProvider {
  constructor(config?: any) {

    const baseUrl = config?.baseUrl;
    super({
      baseUrl: baseUrl,
      providerId: "lmstudio",
      providerName: "LMStudio",
      models: models,
      defaultModel: "lmstudio-model",
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.withTimeout(
        this.withRetry(async () => {
          await this.openai.models.list();
        })
      );
      return true;
    } catch {
      return false;
    }
  }
}