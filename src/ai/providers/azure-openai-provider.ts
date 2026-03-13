import { BaseOpenAIProvider } from "@/ai/providers/base-openai-provider";
import { AIModel } from "@/ai/types";

const azureOpenAIModels: AIModel[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    maxTokens: { input: 128000, output: 16384 },
    provider: { id: "azure-openai", name: "Azure OpenAI" },
    default: true,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    maxTokens: { input: 128000, output: 16384 },
    provider: { id: "azure-openai", name: "Azure OpenAI" },
  },
];

export class AzureOpenAIProvider extends BaseOpenAIProvider {
  constructor(config?: any) {
    super({
      apiKey: config?.apiKey,
      baseUrl: config?.baseUrl,
      apiVersion: config?.apiVersion || "2024-05-01-preview",
      azureApiVersion: config?.azureApiVersion || config?.apiVersion,
      useAzure: true,
      providerId: "azure-openai",
      providerName: "Azure OpenAI",
      models: config?.models || azureOpenAIModels,
      defaultModel: config?.defaultModel || "gpt-4o",
      customHeaders: config?.customHeaders,
      enableReasoningEffort: config?.enableReasoningEffort,
      reasoningEffortLevel: config?.reasoningEffortLevel,
      enableSmoothStreaming: config?.enableSmoothStreaming,
      topP: config?.topP,
      topK: config?.topK,
      presencePenalty: config?.presencePenalty,
      frequencyPenalty: config?.frequencyPenalty,
      stopSequences: config?.stopSequences,
      enableReasoningExtraction: config?.enableReasoningExtraction,
      reasoningExtractionTagName: config?.reasoningExtractionTagName,
      featureOverrides: config?.featureOverrides,
    });
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.config.baseUrl && (this.config.apiKey || this.config.customHeaders));
  }
}
