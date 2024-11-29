export enum AIProvider {
    OPENAI = 'openai',
    OLLAMA = 'ollama'
}

export const ConfigKeys = {
    // Language settings
    AI_COMMIT_LANGUAGE: 'svn-ai-commit.AI_COMMIT_LANGUAGE',
    AI_COMMIT_SYSTEM_PROMPT: 'svn-ai-commit.AI_COMMIT_SYSTEM_PROMPT',
    
    // Provider settings
    DEFAULT_PROVIDER: 'svn-ai-commit.defaultProvider',
    
    // OpenAI settings
    OPENAI_API_KEY: 'svn-ai-commit.openai.apiKey',
    OPENAI_BASE_URL: 'svn-ai-commit.openai.baseUrl',
    OPENAI_MODEL: 'svn-ai-commit.openai.model',
    
    // Ollama settings
    OLLAMA_BASE_URL: 'svn-ai-commit.ollama.baseUrl',
    OLLAMA_MODEL: 'svn-ai-commit.ollama.model'
} as const;

// 创建一个类型，包含所有可能的配置键
export type ConfigKey = keyof typeof ConfigKeys;

export interface ExtensionConfiguration {
    language: string;
    systemPrompt?: string;
    defaultProvider: AIProvider;
    openai: {
        apiKey?: string;
        baseUrl?: string;
        model: string;
    };
    ollama: {
        baseUrl: string;
        model: string;
    };
    azureApiVersion?: string;
}