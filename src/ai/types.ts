export interface AIRequestOptions {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  language?: string; // 新增语言选项
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
  refreshModels(): Promise<string[]>;
  getModels(): Promise<string[]>;
  getName(): string;
  getId(): string;
}

export type AnthropicModels =
  | "claude-3-5-sonnet-latest"
  | "claude-3-5-sonnet-20241022"
  | "claude-3-5-sonnet-20240620"
  | "claude-3-5-haiku-20241022"
  | "claude-3-5-haiku-latest"
  | "claude-3-opus-latest"
  | "claude-3-opus-20240229"
  | "claude-3-sonnet-20240229"
  | "claude-3-haiku-20240307"
  | "claude-2.1";

export type GeminiModels =
  | "gemini-1.5-pro-latest"
  | "gemini-1.5-flash-latest"
  | "gemini-1.5-flash-8b"
  | "gemini-1.0-pro";

export type GitHubModels =
  | "gpt-4o"
  | "gpt-4o-mini"
  | "o1-preview"
  | "o1-mini"
  | "Phi-3.5-MoE-instruct"
  | "Phi-3.5-mini-instruct"
  | "AI21-Jamba-1.5-Large"
  | "AI21-Jamba-1.5-Mini";

export type HuggingFaceModels =
  | "meta-llama/Llama-3.2-11B-Vision-Instruct"
  | "Qwen/Qwen2.5-72B-Instruct"
  | "NousResearch/Hermes-3-Llama-3.1-8B"
  | "mistralai/Mistral-Nemo-Instruct-2407"
  | "microsoft/Phi-3.5-mini-instruct";

export type OpenAIModels =
  | "o1-preview"
  | "o1-preview-2024-09-12"
  | "o1-mini"
  | "o1-mini-2024-09-12"
  | "gpt-4o"
  | "gpt-4o-2024-08-06"
  | "gpt-4o-2024-05-13"
  | "chatgpt-4o-latest"
  | "gpt-4o-mini"
  | "gpt-4o-mini-2024-07-18"
  | "gpt-4-turbo"
  | "gpt-4-turbo-2024-04-09"
  | "gpt-4-turbo-preview"
  | "gpt-4-0125-preview"
  | "gpt-4-1106-preview"
  | "gpt-4"
  | "gpt-4-0613"
  | "gpt-4-32k"
  | "gpt-4-32k-0613"
  | "gpt-3.5-turbo"
  | "gpt-3.5-turbo-0125"
  | "gpt-3.5-turbo-1106"
  | "gpt-3.5-turbo-16k";

export type VSCodeAIModels = `${string}:${string}`;

export type AIProviders = "anthropic" | "github" | "openai" | "vscode";
export type AIModels<Provider extends AIProviders = AIProviders> =
  Provider extends "anthropic"
    ? AnthropicModels
    : Provider extends "github"
    ? GitHubModels
    : Provider extends "openai"
    ? OpenAIModels
    : Provider extends "vscode"
    ? VSCodeAIModels
    : AnthropicModels | OpenAIModels;

export type SupportedAIModels =
  | `anthropic:${AIModels<"anthropic">}`
  | `github:${AIModels<"github">}`
  | `openai:${AIModels<"openai">}`
  | "vscode";