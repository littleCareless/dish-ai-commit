import { ExtensionConfiguration, AIProvider } from './types';

export const DEFAULT_CONFIG: ExtensionConfiguration = {
    language: 'English',
    defaultProvider: AIProvider.OPENAI,
    systemPrompt: '你是一个提交消息生成助手',
    openai: {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo'
    },
    ollama: {
        baseUrl: 'http://localhost:11434',
        model: 'llama2'
    }
};