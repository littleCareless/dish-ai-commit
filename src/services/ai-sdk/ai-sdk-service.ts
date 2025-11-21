import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createAzure } from "@ai-sdk/azure";
import { createCerebras } from "@ai-sdk/cerebras";
import { createCohere } from "@ai-sdk/cohere";
import { createDeepInfra } from "@ai-sdk/deepinfra";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createFireworks } from "@ai-sdk/fireworks";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { createXai } from "@ai-sdk/xai";
import * as aiModelsImport from "@simonorzel26/ai-models";
import { generateText } from "ai";
import { createOllama } from "ollama-ai-provider-v2";
const aiModels = (aiModelsImport as any).default || aiModelsImport;

export interface AISDKModel {
  id: string;
  name: string;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: string[];
  category?: string; // Add category field
  pricing?: {
    input: number;
    output: number;
  };
}

export class AISDKService {
  private static instance: AISDKService;

  private constructor() { }

  public static getInstance(): AISDKService {
    if (!AISDKService.instance) {
      AISDKService.instance = new AISDKService();
    }
    return AISDKService.instance;
  }

  private getProviderInstance(
    providerId: string,
    apiKey?: string,
    baseUrl?: string
  ) {
    switch (providerId) {
      case "openai":
        return createOpenAI({
          apiKey: apiKey,
          baseURL: baseUrl,
        });
      case "anthropic":
        return createAnthropic({
          apiKey: apiKey,
          baseURL: baseUrl,
        });
      case "google":
      case "gemini":
        return createGoogleGenerativeAI({
          apiKey: apiKey,
          baseURL: baseUrl,
        });
      case "bedrock":
        return createAmazonBedrock({
          // Bedrock usually relies on AWS credentials in env or config,
          // but the SDK might allow passing keys if configured.
          // For now assuming standard AWS env setup or specific params if supported.
          // The user prompt implies simple API key usage for most, but Bedrock is different.
          // However, for the purpose of this task, we initialize it.
          // Note: @ai-sdk/amazon-bedrock typically uses aws-sdk credential chain.
          // If the user provides keys via our UI, we might need to pass them differently
          // or assume they are set in the environment.
          // Given the UI has "API Key" field, we might need to adapt or warn.
          // For now, we'll pass what we can or rely on env.
          accessKeyId: apiKey?.split(":")[0], // Hacky assumption if user combines keys
          secretAccessKey: apiKey?.split(":")[1],
          region: baseUrl, // Reusing baseURL field for region if needed
        });
      case "cohere":
        return createCohere({
          apiKey: apiKey,
          baseURL: baseUrl,
        });
      case "fireworks":
        return createFireworks({
          apiKey: apiKey,
          baseURL: baseUrl,
        });
      case "deepinfra":
        return createDeepInfra({
          apiKey: apiKey,
          baseURL: baseUrl,
        });
      case "cerebras":
        return createCerebras({
          apiKey: apiKey,
          baseURL: baseUrl,
        });
      case "azure":
        return createAzure({
          apiKey: apiKey,
          resourceName: baseUrl, // Azure uses resourceName instead of baseURL
        });
      case "mistral":
        return createMistral({
          apiKey: apiKey,
          baseURL: baseUrl,
        });
      case "groq":
        return createGroq({
          apiKey: apiKey,
          baseURL: baseUrl,
        });
      case "deepseek":
        return createDeepSeek({
          apiKey: apiKey,
          baseURL: baseUrl,
        });
      case "togetherai":
        return createTogetherAI({
          apiKey: apiKey,
          baseURL: baseUrl,
        });
      case "xai":
        return createXai({
          apiKey: apiKey,
          baseURL: baseUrl,
        });
      case "google-vertex":
        return createVertex({
          // Vertex requires project and location
          project: apiKey?.split(":")[0] || "", // Hacky: use apiKey field for project:location
          location: apiKey?.split(":")[1] || "us-central1",
        });
      case "ollama":
        let ollamaBase = baseUrl || "http://localhost:11434/api";
        if (ollamaBase.endsWith("/")) {
          ollamaBase = ollamaBase.slice(0, -1);
        }
        if (!ollamaBase.endsWith("/api")) {
          ollamaBase = `${ollamaBase}/api`;
        }
        return createOllama({
          baseURL: ollamaBase,
        });
      default:
        // Fallback for OpenAI compatible providers
        return createOpenAI({
          apiKey: apiKey,
          baseURL: baseUrl,
        });
    }
  }

  public async validateConnection(
    providerId: string,
    apiKey: string,
    baseUrl?: string
  ): Promise<boolean> {
    try {
      // Special handling for Ollama validation
      if (providerId === "ollama" || providerId === "vscode") {
        // For Ollama, we can't easily validate via generation without knowing a model name.
        // And we can't assume any specific model exists.
        // Best way is to try to list models (tags).
        // If we can list models, connection is good.
        await this.getModels(providerId, apiKey, baseUrl);
        return true; // If getModels succeeds, we are good.
      }

      const provider = this.getProviderInstance(providerId, apiKey, baseUrl);

      // Use a lightweight model for validation if possible, or a standard one
      let modelId = "gpt-3.5-turbo"; // Default for OpenAI
      if (providerId === "anthropic") {
        modelId = "claude-3-haiku-20240307";
      }
      if (providerId === "google" || providerId === "gemini") {
        modelId = "gemini-1.5-flash";
      }
      if (providerId === "cohere") {
        modelId = "command-r";
      }
      if (providerId === "fireworks") {
        modelId = "accounts/fireworks/models/llama-v3-8b-instruct";
      }
      if (providerId === "deepinfra") {
        modelId = "meta-llama/Meta-Llama-3-8B-Instruct";
      }
      if (providerId === "cerebras") {
        modelId = "llama3.1-8b";
      }
      if (providerId === "bedrock") {
        modelId = "anthropic.claude-3-haiku-20240307-v1:0";
      }
      if (providerId === "azure") {
        modelId = "gpt-35-turbo"; // Azure model name format
      }
      if (providerId === "mistral") {
        modelId = "mistral-small-latest";
      }
      if (providerId === "groq") {
        modelId = "llama3-8b-8192";
      }
      if (providerId === "deepseek") {
        modelId = "deepseek-chat";
      }
      if (providerId === "togetherai") {
        modelId = "meta-llama/Llama-3-8b-chat-hf";
      }
      if (providerId === "xai") {
        modelId = "grok-beta";
      }
      if (providerId === "google-vertex") {
        modelId = "gemini-1.5-flash";
      }

      // For custom OpenAI compatible, we might need a different approach or assume a default model exists
      // But for validation, we just want to see if the API key works.
      // Attempting a very short generation.
      await generateText({
        model: provider(modelId),
        prompt: "Hi",
      });

      return true;
    } catch (error) {
      console.error(
        `[AISDKService] Validation failed for ${providerId}:`,
        error
      );
      // Some providers might fail on the specific model but the key is valid.
      // However, usually a failure here means auth failure or connection issue.
      throw error;
    }
  }

  public async getModels(
    providerId: string,
    apiKey: string,
    baseUrl?: string
  ): Promise<AISDKModel[]> {
    // Special handling for VSCode: Fetch from VSCode Language Model API
    if (providerId === "vscode") {
      try {
        const vscode = require("vscode");
        const models = await vscode.lm.selectChatModels();

        if (models && models.length > 0) {
          return models.map((model: any) => ({
            id: model.id,
            name: model.name || model.id,
            contextWindow: model.maxInputTokens || 8192,
            maxOutputTokens: model.maxInputTokens || 8192,
            capabilities: ["text", "chat"],
            category: "text",
          }));
        }

        // If no models available, return empty array
        return [];
      } catch (error) {
        console.error("[AISDKService] Failed to fetch VSCode models:", error);
        // Return empty if VSCode API is not available
        return [];
      }
    }

    // Special handling for Ollama: Fetch dynamically
    if (providerId === "ollama") {
      try {
        // Ollama API to list tags is at /api/tags
        // The provider might have set a base URL, we need to respect it or default
        // If user provided http://localhost:11434/api, we use that.
        // If user provided http://localhost:11434, we add /api.

        let apiBase = baseUrl || "http://localhost:11434/api";
        // Normalize to ensure we don't double slash or miss it
        if (apiBase.endsWith("/")) {
          apiBase = apiBase.slice(0, -1);
        }
        // If it doesn't end in /api, and it looks like a root url, append /api
        // But user might have a custom proxy.
        // Standard Ollama convention: API is at /api
        if (!apiBase.endsWith("/api")) {
          apiBase = `${apiBase}/api`;
        }

        const response = await fetch(`${apiBase}/tags`);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch models from Ollama: ${response.statusText}`
          );
        }
        const data = (await response.json()) as { models: any[] };

        return data.models.map((m: any) => ({
          id: m.name,
          name: m.name,
          contextWindow: 4096, // Default, hard to know from tags
          maxOutputTokens: 4096,
          capabilities: ["text"],
          category: "text", // Ollama models are mostly text/chat
        }));
      } catch (error) {
        console.error("[AISDKService] Failed to fetch Ollama models:", error);
        // Fallback to static list or empty if fetch fails
        // But usually if fetch fails, connection is bad.
        throw error;
      }
    }

    // For now, we rely on static metadata from @simonorzel26/ai-models
    // because the AI SDK doesn't have a universal "list models" API yet
    // (it varies by provider).
    // We filter the static list based on the providerId.

    let providerKeyInLib = providerId;
    if (providerId === "gemini") {
      providerKeyInLib = "google";
    } // Mapping if needed

    // Use the library's helper if available, or filter ALL_MODELS
    let models: any[] = [];

    if (typeof aiModels.getModelsByProvider === "function") {
      // The library might expect specific casing or IDs
      // Try to fetch using the helper
      const result = aiModels.getModelsByProvider(providerKeyInLib);
      if (Array.isArray(result)) {
        models = result;
      }
    }

    // Fallback: if helper didn't return anything or not found, try ALL_MODELS
    if (models.length === 0 && aiModels.ALL_MODELS) {
      models = Object.values(aiModels.ALL_MODELS).filter(
        (model: any) => model.provider === providerKeyInLib
      );
    }

    if (models.length > 0) {
      return models.map((m: any) => ({
        id: m.model,
        name: m.model,
        contextWindow: m.maxInputTokens || 4096, // Fallback
        maxOutputTokens: m.maxOutputTokens || 4096,
        capabilities: [], // Populate if available in lib
        category: m.category, // Map category
        pricing: m.pricing
          ? {
            input: m.pricing.input,
            output: m.pricing.output,
          }
          : undefined,
      }));
    }

    // If no models found in library (e.g. custom provider), return empty or default
    // For custom OpenAI compatible, we might want to try fetching if the endpoint supports it,
    // but standard OpenAI SDK doesn't expose listModels via the 'ai' package easily without direct client access.
    // For this iteration, we'll return an empty list if not found in metadata,
    // or maybe some defaults.

    return [];
  }
}
