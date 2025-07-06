import { ConfigurationManager } from "../../config/configuration-manager";
import { AIModel, type TogetherAIModelID } from "../types";
import {
  BaseOpenAIProvider,
  OpenAIProviderConfig,
} from "./base-openai-provider";

const togetherModels: AIModel<"together", TogetherAIModelID>[] = [
  {
    id: "meta-llama/Llama-3-8b-chat-hf",
    name: "Llama 3 8B Instruct",
    maxTokens: { input: 8192, output: 8192 },
    provider: { id: "together", name: "Together AI" },
    capabilities: { streaming: true, functionCalling: true },
  },
  {
    id: "meta-llama/Llama-3-70b-chat-hf",
    name: "Llama 3 70B Instruct",
    maxTokens: { input: 8192, output: 8192 },
    provider: { id: "together", name: "Together AI" },
    capabilities: { streaming: true, functionCalling: true },
  },
  {
    id: "mistralai/Mixtral-8x7B-Instruct-v0.1",
    name: "Mixtral-8x7B Instruct",
    maxTokens: { input: 32768, output: 32768 },
    provider: { id: "together", name: "Together AI" },
    default: true,
    capabilities: { streaming: true, functionCalling: true },
  },
  {
    id: "mistralai/Mistral-7B-Instruct-v0.3",
    name: "Mistral 7B Instruct v0.3",
    maxTokens: { input: 32768, output: 32768 },
    provider: { id: "together", name: "Together AI" },
    capabilities: { streaming: true, functionCalling: true },
  },
  {
    id: "databricks/dbrx-instruct",
    name: "DBRX Instruct",
    maxTokens: { input: 32768, output: 32768 },
    provider: { id: "together", name: "Together AI" },
    capabilities: { streaming: true, functionCalling: true },
  },
  {
    id: "google/gemma-7b-it",
    name: "Gemma 7B",
    maxTokens: { input: 8192, output: 8192 },
    provider: { id: "together", name: "Together AI" },
    capabilities: { streaming: true, functionCalling: true },
  },
];

export class TogetherAIProvider extends BaseOpenAIProvider {
  constructor() {
    const configManager = ConfigurationManager.getInstance();
    const config: OpenAIProviderConfig = {
      apiKey: configManager.getConfig("PROVIDERS_TOGETHER_APIKEY") as string,
      baseURL: "https://api.together.ai/v1",
      providerId: "together",
      providerName: "Together AI",
      models: togetherModels,
      defaultModel: "mistralai/Mixtral-8x7B-Instruct-v0.1",
    };
    super(config);
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }
}
