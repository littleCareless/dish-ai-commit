
import { AIRequestOptions, AIResponse } from '../types';

export interface IAIProvider {
    generateResponse(options: AIRequestOptions): Promise<AIResponse>;
    isAvailable(): Promise<boolean>;
}