import { AIProvider as AIProviderInterface } from './types';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { AIProvider, ConfigKeys } from '../config/types';
import { ConfigurationManager } from '../config/ConfigurationManager';

export class AIProviderFactory {
    private static providers: Map<string, AIProviderInterface> = new Map();

    public static getProvider(type?: string): AIProviderInterface {
        // 如果未指定类型，使用默认提供商
        const providerType = type || ConfigurationManager.getInstance().getConfig<string>(
            'DEFAULT_PROVIDER'
        ) || AIProvider.OPENAI;

        let provider = this.providers.get(providerType);
        
        if (!provider) {
            switch (providerType.toLowerCase()) {
                case AIProvider.OPENAI:
                    provider = new OpenAIProvider();
                    break;
                case AIProvider.OLLAMA:
                    provider = new OllamaProvider();
                    break;
                default:
                    throw new Error(`Unknown AI provider type: ${type}`);
            }
            this.providers.set(providerType, provider);
        }

        return provider;
    }
}
