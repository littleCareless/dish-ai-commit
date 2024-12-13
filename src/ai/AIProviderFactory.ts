import { AIProvider as AIProviderInterface } from "./types";
import { OpenAIProvider } from "./providers/OpenAIProvider";
import { OllamaProvider } from "./providers/OllamaProvider";
import { AIProvider, ConfigKeys } from "../config/types";
import { ConfigurationManager } from "../config/ConfigurationManager";
import { VSCodeProvider } from "./providers/VscodeProvider";
import { LocalizationManager } from "../utils/LocalizationManager";
import { ZhipuAIProvider } from "./providers/ZhipuAIProvider";
import { DashScopeProvider } from "./providers/DashScopeProvider";
import { DoubaoProvider } from "./providers/DoubaoProvider";
import { GeminiAIProvider } from "./providers/GeminiAIProvider";

export class AIProviderFactory {
  private static providers: Map<string, AIProviderInterface> = new Map();
  private static readonly PROVIDER_CACHE_TTL = 1000 * 60 * 30; // 30分钟缓存
  private static providerTimestamps: Map<string, number> = new Map();

  private static cleanStaleProviders() {
    const now = Date.now();
    for (const [id, timestamp] of this.providerTimestamps.entries()) {
      if (now - timestamp > this.PROVIDER_CACHE_TTL) {
        this.providers.delete(id);
        this.providerTimestamps.delete(id);
      }
    }
  }

  public static getProvider(type?: string): AIProviderInterface {
    this.cleanStaleProviders();
    const providerType =
      type ||
      ConfigurationManager.getInstance().getConfig("PROVIDERS") ||
      AIProvider.OPENAI;

    let provider = this.providers.get(providerType);
    console.log("AIProvider", AIProvider);
    console.log("providerType", providerType.toLowerCase());
    console.log("AIProvider.VSCODE", AIProvider.ZHIPUAI);
    if (!provider) {
      switch (providerType.toLowerCase()) {
        case AIProvider.OPENAI:
          provider = new OpenAIProvider();
          break;
        case AIProvider.OLLAMA:
          provider = new OllamaProvider();
          break;
        case AIProvider.VS_CODE_PROVIDED:
          provider = new VSCodeProvider();
          break;
        case AIProvider.ZHIPUAI:
          provider = new ZhipuAIProvider();
          break;
        case AIProvider.DASHSCOPE:
          provider = new DashScopeProvider();
          break;
        case AIProvider.DOUBAO:
          provider = new DoubaoProvider();
          break;
        case AIProvider.Gemini:
          provider = new GeminiAIProvider();
          break;
        default:
          throw new Error(
            LocalizationManager.getInstance().format(
              "provider.type.unknown",
              type
            )
          );
      }
      this.providers.set(providerType, provider);
      this.providerTimestamps.set(providerType, Date.now());
    }

    return provider;
  }

  public static getAllProviders(): AIProviderInterface[] {
    return [
      new OpenAIProvider(),
      new OllamaProvider(),
      new VSCodeProvider(),
      new ZhipuAIProvider(),
      new DashScopeProvider(),
      new DoubaoProvider(),
      new GeminiAIProvider(),
    ];
  }

  public static reinitializeProvider(providerId: string): void {
    const provider = this.providers.get(providerId);
    if (provider && "reinitialize" in provider) {
      (provider as any).reinitialize();
    }
  }
}
