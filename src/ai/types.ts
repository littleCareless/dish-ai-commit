export interface AIRequestOptions {
    prompt: string;
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    language?: string;  // 新增语言选项
}

export interface AIResponse {
    content: string;
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    };
}

export interface AIRequestParams {
    prompt: string;
    systemPrompt?: string;
    model?: string;
    language?: string;
}

export interface AIProvider {
    generateResponse(params: AIRequestParams): Promise<AIResponse>;
    isAvailable(): Promise<boolean>;
    // 新增刷新模型列表的方法
    refreshModels(): Promise<string[]>;
}