import { BaseOpenAIProvider } from "@/ai/providers/base-openai-provider";
import { AIModel, AIRequestParams } from "@/ai/types";
import OpenAI, { AzureOpenAI } from "openai";
import { ChatCompletionMessageParam } from "openai/resources";

/**
 * OpenAI Compatible Provider
 * Allows connecting to any OpenAI-compatible API
 */
export class OpenAICompatibleProvider extends BaseOpenAIProvider {
  constructor(config?: any) {
    super({
      apiKey: config?.apiKey,
      baseUrl: config?.baseUrl,
      apiVersion: config?.apiVersion,
      providerId: "openai-compatible",
      providerName: "OpenAI Compatible",
      models: [], // Models will be fetched dynamically or from config
      defaultModel: config?.model || "gpt-3.5-turbo",
      useAzure: config?.useAzure,
      azureApiVersion: config?.azureApiVersion,
      customHeaders: config?.customHeaders,
    });
  }

  /**
   * Create OpenAI API Client
   * Overridden to support Azure and custom headers
   */
  protected createClient(): OpenAI {
    const providerConfig = this.config;

    const apiKey = providerConfig.apiKey || "not-provided";
    const baseUrl = providerConfig.baseUrl;
    const useAzure = providerConfig.useAzure;
    const azureApiVersion = providerConfig.azureApiVersion;
    const isAzureAiInference = this._isAzureAiInference(baseUrl);
    const urlHost = this._getUrlHost(baseUrl);
    const isAzureOpenAi =
      urlHost === "azure.com" ||
      urlHost.endsWith(".azure.com") ||
      useAzure;

    // Get custom headers from config
    // customHeaders is already an object { [key: string]: string }
    const customHeaders: Record<string, string> =
      typeof providerConfig.customHeaders === "object" &&
        providerConfig.customHeaders !== null
        ? (providerConfig.customHeaders as Record<string, string>)
        : {};

    const defaultHeaders: Record<string, string> = {
      ...customHeaders,
    };

    // Only add api-key if not already in customHeaders
    if (!defaultHeaders["api-key"]) {
      defaultHeaders["api-key"] = apiKey;
    }

    if (isAzureAiInference) {
      // Azure AI Inference Service (e.g., for DeepSeek) uses a different path structure
      return new OpenAI({
        baseURL: baseUrl,
        apiKey,
        defaultHeaders,
        defaultQuery: {
          "api-version": azureApiVersion || "2024-05-01-preview",
        },
      });
    } else if (isAzureOpenAi) {
      return new AzureOpenAI({
        apiKey,
        baseURL: baseUrl,
        apiVersion: azureApiVersion || "2024-05-01-preview",
        defaultHeaders,
      });
    } else {
      return new OpenAI({
        apiKey,
        baseURL: baseUrl,
        defaultHeaders,
      });
    }
  }

  private _getUrlHost(baseUrl?: string): string {
    try {
      return new URL(baseUrl ?? "").host;
    } catch (error) {
      return "";
    }
  }

  private _isAzureAiInference(baseUrl?: string): boolean {
    const urlHost = this._getUrlHost(baseUrl);
    return urlHost.endsWith(".services.ai.azure.com");
  }

  /**
   * Execute AI Request
   * Overridden to support R1 parameters and max tokens
   */
  protected async executeAIRequest(
    params: AIRequestParams,
    options?: {
      parseAsJSON?: boolean;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<{ content: string; usage?: any; jsonContent?: any }> {

    // Get additional provider-specific settings from globalConfig or default values
    const enableR1Models = this.config.enableR1Models || false;
    const useLegacyFormat = this.config.useLegacyFormat || false;
    const customModelSupportsPromptCache =
      this.config.customModelSupportsPromptCache || false;
    const includeMaxTokens = this.config.includeMaxTokens !== false; // Default to true if undefined
    const maxTokensConfig = this.config.maxTokens;

    const messages = (await this.buildProviderMessages(
      params
    )) as ChatCompletionMessageParam[];

    // Handle Prompt Caching if enabled
    if (customModelSupportsPromptCache && messages.length > 0) {
      // 1. Cache System Message
      let systemMessageIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "system") {
          systemMessageIndex = i;
          break;
        }
      }

      if (systemMessageIndex !== -1) {
        (messages[systemMessageIndex] as any).cache_control = {
          type: "ephemeral",
        };
      }

      // 2. Cache Last Two User Messages (Reference Implementation)
      // Filter for user messages
      const userMessages = messages.filter((msg) => msg.role === "user");
      // Get the last two
      const lastTwoUserMessages = userMessages.slice(-2);

      lastTwoUserMessages.forEach((msg) => {
        // Ensure content is an array to attach cache_control to a text part if needed
        // Or attach to the message object itself if supported by the provider (DeepSeek supports message-level)
        // For broad compatibility with "OpenAI Format" extensions, we'll try message-level first as it's cleaner,
        // but some providers might want it on the content part.
        // The reference implementation puts it on the last text part of the content array.

        if (typeof msg.content === "string") {
          msg.content = [{ type: "text", text: msg.content }];
        }

        if (Array.isArray(msg.content)) {
          let lastTextPart = msg.content
            .filter((part) => part.type === "text")
            .pop();

          if (!lastTextPart) {
            lastTextPart = { type: "text", text: "..." };
            msg.content.push(lastTextPart);
          }

          // @ts-ignore
          lastTextPart["cache_control"] = { type: "ephemeral" };
        }
      });
    }

    let temperature = options?.temperature;

    // Determine max tokens
    let maxTokens = options?.maxTokens;
    if (includeMaxTokens && maxTokensConfig && maxTokensConfig !== -1) {
      maxTokens = maxTokensConfig;
    }

    const requestOptions: any = {
      model:
        (params.model && params.model.id) ||
        this.config.defaultModel ||
        "gpt-3.5-turbo",
      messages,
    };

    // R1 Model Logic (Reasoning Models)
    if (enableR1Models) {
      // Reasoning models often don't support temperature (or require it to be 1/default)
      // We'll omit temperature if it's set, or strictly set it if required.
      // For now, let's omit it to be safe as many reasoning models error on temperature.
      // If the user explicitly wants to control it, they might need to disable R1 mode or we need a more granular setting.
      // But usually R1/O1 models manage their own temperature.
      // requestOptions.temperature = 1; // Some might require explicit 1, others omit. Omitting is safer for O1-preview.

      // Use max_completion_tokens instead of max_tokens for reasoning models
      if (includeMaxTokens && maxTokens) {
        requestOptions.max_completion_tokens = maxTokens;
      }
    } else {
      // Standard models
      if (temperature !== undefined) {
        requestOptions.temperature = temperature;
      }
      if (includeMaxTokens && maxTokens) {
        requestOptions.max_tokens = maxTokens;
      }
    }

    // Add reasoning_effort parameter if enabled
    if (this.config.enableReasoningEffort && this.config.reasoningEffortLevel) {
      requestOptions.reasoning_effort = this.config.reasoningEffortLevel;
    }

    // Legacy Format Logic
    if (useLegacyFormat) {
      // Strip parameters that might not be supported by older/compatible APIs
      delete requestOptions.parallel_tool_calls;
      delete requestOptions.tool_choice;
      delete requestOptions.tools;
      // Also ensure no newer params like response_format are sent if not strictly needed (though we don't set them here yet)
    }

    try {
      const completion =
        await this.openai.chat.completions.create(requestOptions);

      const content = completion.choices[0]?.message?.content || "";
      const usage = {
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens,
      };

      let jsonContent;
      if (options?.parseAsJSON) {
        try {
          const jsonString = content.replace(/^```json\n|\n```$/g, "").trim();
          jsonContent = JSON.parse(jsonString);
        } catch (e) {
          console.warn("Failed to parse response as JSON", e);
        }
      }

      return { content, usage, jsonContent };
    } catch (error: any) {
      if (enableR1Models && error.status === 400) {
        console.warn(
          "R1 model 400 error. If this is a parameter error, try disabling 'Enable R1 Model Parameters' or adjusting settings."
        );
      }
      throw error;
    }
  }

  /**
   * Execute AI Stream Request
   * Overridden to support R1 parameters and max tokens
   */
  protected async executeAIStreamRequest(
    params: AIRequestParams,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<AsyncIterable<string>> {

    const enableR1Models = this.config.enableR1Models || false;
    const useLegacyFormat = this.config.useLegacyFormat || false;
    const customModelSupportsPromptCache =
      this.config.customModelSupportsPromptCache || false;
    const includeMaxTokens = this.config.includeMaxTokens !== false;
    const maxTokensConfig = this.config.maxTokens;

    const messages = (await this.buildProviderMessages(
      params
    )) as ChatCompletionMessageParam[];

    // Handle Prompt Caching if enabled
    if (customModelSupportsPromptCache && messages.length > 0) {
      // 1. Cache System Message
      let systemMessageIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "system") {
          systemMessageIndex = i;
          break;
        }
      }

      if (systemMessageIndex !== -1) {
        (messages[systemMessageIndex] as any).cache_control = {
          type: "ephemeral",
        };
      }

      // 2. Cache Last Two User Messages (Reference Implementation)
      const userMessages = messages.filter((msg) => msg.role === "user");
      const lastTwoUserMessages = userMessages.slice(-2);

      lastTwoUserMessages.forEach((msg) => {
        if (typeof msg.content === "string") {
          msg.content = [{ type: "text", text: msg.content }];
        }

        if (Array.isArray(msg.content)) {
          let lastTextPart = msg.content
            .filter((part) => part.type === "text")
            .pop();

          if (!lastTextPart) {
            lastTextPart = { type: "text", text: "..." };
            msg.content.push(lastTextPart);
          }

          // @ts-ignore
          lastTextPart["cache_control"] = { type: "ephemeral" };
        }
      });
    }

    let temperature = options?.temperature;
    let maxTokens = options?.maxTokens;
    if (includeMaxTokens && maxTokensConfig && maxTokensConfig !== -1) {
      maxTokens = maxTokensConfig;
    }

    const requestOptions: any = {
      model:
        (params.model && params.model.id) ||
        this.config.defaultModel ||
        "gpt-3.5-turbo",
      messages,
      stream: true,
    };

    // Add stream_options to get usage stats in streaming response
    // This is supported by OpenAI and many compatible providers (like DeepSeek)
    if (!useLegacyFormat) {
      requestOptions.stream_options = { include_usage: true };
    }

    // R1 Model Logic (Reasoning Models)
    if (enableR1Models) {
      // Use max_completion_tokens instead of max_tokens for reasoning models
      if (includeMaxTokens && maxTokens) {
        requestOptions.max_completion_tokens = maxTokens;
      }
      // Omit temperature for R1 models as discussed
    } else {
      // Standard models
      if (temperature !== undefined) {
        requestOptions.temperature = temperature;
      }
      if (includeMaxTokens && maxTokens) {
        requestOptions.max_tokens = maxTokens;
      }
    }

    // Add reasoning_effort parameter if enabled
    if (this.config.enableReasoningEffort && this.config.reasoningEffortLevel) {
      requestOptions.reasoning_effort = this.config.reasoningEffortLevel;
    }

    // Legacy Format Logic
    if (useLegacyFormat) {
      delete requestOptions.parallel_tool_calls;
      delete requestOptions.tool_choice;
      delete requestOptions.tools;
      delete requestOptions.stream_options; // Ensure stream_options is removed if legacy format is forced
    }

    const processStream = async function* (
      this: OpenAICompatibleProvider
    ): AsyncIterable<string> {
      try {
        const stream = (await this.openai.chat.completions.create(
          requestOptions
        )) as unknown as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;

          if (delta?.content) {
            yield delta.content;
          }
        }
      } catch (error) {
        this.handleContextLengthError(
          error,
          (params.model && params.model.id) ||
          this.config.defaultModel ||
          "gpt-3.5-turbo"
        );
      }
    };

    return Promise.resolve(processStream.call(this));
  }

  /**
   * Check if the provider is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (!this.config.baseUrl) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get models from the provider
   */
  async getModels(): Promise<AIModel[]> {
    // Get configured model from provider config
    const configuredModel = this.config.model || this.config.defaultModel || "gpt-3.5-turbo";

    try {
      const response = await this.withTimeout(
        this.withRetry(async () => {
          return await this.openai.models.list();
        })
      );

      return response.data.map(
        (model: any) =>
          ({
            id: model.id,
            name: model.id,
            maxTokens: {
              input: model.context_window || 4096,
              output: Math.floor((model.context_window || 4096) / 2),
            },
            provider: {
              id: this.provider.id,
              name: this.provider.name,
            },
          }) as AIModel
      );
    } catch (error) {
      console.warn("Failed to fetch models for OpenAI Compatible:", error);
      // 使用配置中实际指定的模型作为后备,而不是硬编码的默认值
      console.warn(`Using configured model as fallback: ${configuredModel}`);
      return [
        {
          id: configuredModel,
          name: configuredModel,
          maxTokens: { input: 4096, output: 2048 },
          provider: {
            id: this.provider.id,
            name: this.provider.name,
          },
        },
      ];
    }
  }
}
