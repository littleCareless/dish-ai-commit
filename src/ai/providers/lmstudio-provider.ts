import { ConfigurationManager } from "../../config/configuration-manager";
import { AIModel } from "../types";
import { BaseOpenAIProvider } from "./base-openai-provider";

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
  constructor() {
    const configManager = ConfigurationManager.getInstance();
    super({
      baseURL: configManager.getConfig("PROVIDERS_LMSTUDIO_BASEURL"),
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