import { BaseOpenAIProvider } from "@/ai/providers/base-openai-provider";
import { AIModel } from "@/ai/types";

const fallbackModels: AIModel[] = [
  {
    id: "gpt-4o-mini",
    name: "gpt-4o-mini",
    maxTokens: { input: 128000, output: 16384 },
    provider: { id: "openai-compatible", name: "OpenAI Compatible" },
    default: true,
  },
];

export class OpenAICompatibleProvider extends BaseOpenAIProvider {
  constructor(config?: any) {
    super({
      apiKey: config?.apiKey,
      baseUrl: config?.baseUrl,
      apiVersion: config?.apiVersion,
      providerId: config?.providerId || "openai-compatible",
      providerName: config?.providerName || "OpenAI Compatible",
      models: config?.models || fallbackModels,
      defaultModel: config?.model || config?.defaultModel || "gpt-4o-mini",
      useAzure: config?.useAzure,
      azureApiVersion: config?.azureApiVersion,
      customHeaders: config?.customHeaders,
      includeMaxTokens: config?.includeMaxTokens,
      maxTokens: config?.maxTokens,
      enableR1Models: config?.enableR1Models,
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
    return !!(this.config.apiKey || this.config.baseUrl);
  }
}
