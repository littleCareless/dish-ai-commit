import { BaseOpenAIProvider } from "@/ai/providers/base-openai-provider";
import { AIModel } from "@/ai/types";

const ollamaModels: AIModel[] = [
  {
    id: "llama3.1:8b",
    name: "Llama 3.1 8B",
    maxTokens: { input: 32768, output: 8192 },
    provider: { id: "ollama", name: "Ollama" },
    default: true,
  },
  {
    id: "qwen2.5-coder:7b",
    name: "Qwen2.5 Coder 7B",
    maxTokens: { input: 32768, output: 8192 },
    provider: { id: "ollama", name: "Ollama" },
  },
];

const ollamaEmbeddingModels: AIModel[] = [
  {
    id: "nomic-embed-text",
    name: "nomic-embed-text",
    maxTokens: { input: 8192, output: 0 },
    provider: { id: "ollama", name: "Ollama" },
    dimension: 768,
  },
  {
    id: "mxbai-embed-large",
    name: "mxbai-embed-large",
    maxTokens: { input: 8192, output: 0 },
    provider: { id: "ollama", name: "Ollama" },
    dimension: 1024,
  },
];

export class OllamaProvider extends BaseOpenAIProvider {
  constructor(config?: any) {
    super({
      apiKey: config?.apiKey,
      baseUrl: config?.baseUrl || "http://localhost:11434/api",
      providerId: "ollama",
      providerName: "Ollama",
      models: config?.models || ollamaModels,
      defaultModel: config?.defaultModel || "llama3.1:8b",
      customHeaders: config?.customHeaders,
    });
  }

  async getEmbeddingModels(): Promise<AIModel[]> {
    return ollamaEmbeddingModels;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.refreshModels();
      return true;
    } catch {
      return false;
    }
  }
}
