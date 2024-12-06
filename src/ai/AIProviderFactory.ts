import { AIProvider as AIProviderInterface } from "./types";
import { OpenAIProvider } from "./providers/OpenAIProvider";
import { OllamaProvider } from "./providers/OllamaProvider";
import { AIProvider, ConfigKeys } from "../config/types";
import { ConfigurationManager } from "../config/ConfigurationManager";
import { VSCodeProvider } from "./providers/VscodeProvider";

export class AIProviderFactory {
  private static providers: Map<string, AIProviderInterface> = new Map();

  public static getProvider(type?: string): AIProviderInterface {
    // 如果未指定类型，使用默认提供商
    const providerType =
      type ||
      ConfigurationManager.getInstance().getConfig<string>("PROVIDER") ||
      AIProvider.OPENAI;

    let provider = this.providers.get(providerType);
    console.log("provider", providerType);
    if (!provider) {
      switch (providerType.toLowerCase()) {
        case AIProvider.OPENAI:
          provider = new OpenAIProvider();
          break;
        case AIProvider.OLLAMA:
          provider = new OllamaProvider();
          break;
        case AIProvider.VSCODE:
          provider = new VSCodeProvider();
          break;
        default:
          throw new Error(`Unknown AI provider type: ${type}`);
      }
      this.providers.set(providerType, provider);
    }

    return provider;
  }

  public static getAllProviders(): AIProviderInterface[] {
    // 返回所有可用的 AI Provider 实例
    return [new OpenAIProvider(), new OllamaProvider(), new VSCodeProvider()];
  }

  public static reinitializeProvider(providerId: string): void {
    const provider = this.providers.get(providerId);
    if (provider && "reinitialize" in provider) {
      (provider as any).reinitialize();
    }
  }
}
