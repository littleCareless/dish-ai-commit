import { AbstractAIProvider } from "@/ai/providers/abstract-ai-provider";
import { AIModel, AIRequestParams } from "@/ai/types";
import { getSystemPrompt } from "@/ai/utils/generate-helper";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import {
  Output,
  defaultSettingsMiddleware,
  extractReasoningMiddleware,
  generateObject,
  generateText,
  jsonSchema,
  smoothStream,
  streamText,
  wrapLanguageModel,
} from "ai";
import { createOllama } from "ollama-ai-provider-v2";

export interface OpenAIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  apiVersion?: string;
  organization?: string;
  providerId: string;
  providerName: string;
  defaultModel?: string;
  models: AIModel[];
  timeout?: number;
  maxRetries?: number;
  customHeaders?: Record<string, string>;
  includeMaxTokens?: boolean;
  maxTokens?: number;
  enableR1Models?: boolean;
  enableReasoningEffort?: boolean;
  reasoningEffortLevel?: "low" | "medium" | "high" | string;
  enableSmoothStreaming?: boolean;
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stopSequences?: string[] | string;
  enableReasoningExtraction?: boolean;
  reasoningExtractionTagName?: string;
  featureOverrides?: Record<
    string,
    {
      topP?: number;
      topK?: number;
      presencePenalty?: number;
      frequencyPenalty?: number;
      stopSequences?: string[] | string;
    }
  > | string;
  [key: string]: any;
}

type ModelListResponse = {
  data: Array<{ id: string; context_window?: number }>;
};

export abstract class BaseOpenAIProvider extends AbstractAIProvider {
  private readonly TIMEOUT = 120000;
  private readonly MAX_RETRIES = 3;

  // kept for compatibility with subclasses that referenced this field
  protected openai: { models: { list: () => Promise<ModelListResponse> } };
  protected config: OpenAIProviderConfig;
  protected provider: { id: string; name: string };

  constructor(config: OpenAIProviderConfig) {
    super();
    this.config = config;
    this.provider = { id: config.providerId, name: config.providerName };
    this.openai = {
      models: {
        list: () => this._fetchModelsFromApi(),
      },
    };
  }

  protected async executeAIRequest(
    params: AIRequestParams,
    options?: {
      parseAsJSON?: boolean;
      temperature?: number;
      maxTokens?: number;
      tools?: any[];
      outputSchema?: {
        schema: any;
        key?: string;
      };
    },
  ): Promise<{ content: string; usage?: any; jsonContent?: any; tool_calls?: any[] }> {
    const messages = await this.buildProviderMessages(params);
    const filteredMessages = this.filterEmptyMessages(messages);
    const modelId = this.resolveModelId(params);

    if (options?.outputSchema?.schema) {
      const result = await generateObject({
        model: this.createLanguageModel(modelId, params.model),
        messages: filteredMessages as any,
        schema: options.outputSchema.schema,
        temperature: this.resolveTemperature(options?.temperature),
        topP: this.resolveTopP(params.feature),
        topK: this.resolveTopK(params.feature),
        presencePenalty: this.resolvePresencePenalty(params.feature),
        frequencyPenalty: this.resolveFrequencyPenalty(params.feature),
        maxOutputTokens: this.resolveMaxTokensValue(options?.maxTokens),
        maxRetries: this.config.maxRetries ?? this.MAX_RETRIES,
        abortSignal: AbortSignal.timeout(this.config.timeout ?? this.TIMEOUT),
      });
      this.logSDKWarnings(result.warnings, modelId, "generateObject");

      const jsonContent = result.object;
      const outputKey = options.outputSchema.key;
      const outputValue =
        outputKey && jsonContent && typeof jsonContent === "object"
          ? (jsonContent as Record<string, unknown>)[outputKey]
          : undefined;

      return {
        content:
          typeof outputValue === "string"
            ? outputValue
            : JSON.stringify(jsonContent ?? {}),
        usage: this.mapUsage(result.usage),
        jsonContent,
      };
    }

    if (options?.tools?.length) {
      const firstTool = options.tools[0];
      const functionName = firstTool?.function?.name;
      const parameters = firstTool?.function?.parameters;

      if (functionName && parameters) {
        const result = await generateText({
          model: this.createLanguageModel(modelId, params.model),
          messages: filteredMessages as any,
          output: Output.object({
            schema: jsonSchema(parameters),
            name: functionName,
            description: firstTool?.function?.description,
          }),
          temperature: this.resolveTemperature(options?.temperature),
          topP: this.resolveTopP(params.feature),
          topK: this.resolveTopK(params.feature),
          presencePenalty: this.resolvePresencePenalty(params.feature),
          frequencyPenalty: this.resolveFrequencyPenalty(params.feature),
          stopSequences: this.resolveStopSequences(params.feature),
          maxOutputTokens: this.resolveMaxTokensValue(options?.maxTokens),
          maxRetries: this.config.maxRetries ?? this.MAX_RETRIES,
          abortSignal: AbortSignal.timeout(this.config.timeout ?? this.TIMEOUT),
        });
        this.logSDKWarnings(result.warnings, modelId, "generateText/object");

        return {
          content: "",
          usage: this.mapUsage(result.usage),
          tool_calls: [
            {
              function: {
                name: functionName,
                arguments: JSON.stringify(result.output ?? {}),
              },
            },
          ],
        };
      }
    }

    const result = await generateText({
      model: this.createLanguageModel(modelId, params.model),
      messages: filteredMessages as any,
      temperature: this.resolveTemperature(options?.temperature),
      topP: this.resolveTopP(params.feature),
      topK: this.resolveTopK(params.feature),
      presencePenalty: this.resolvePresencePenalty(params.feature),
      frequencyPenalty: this.resolveFrequencyPenalty(params.feature),
      stopSequences: this.resolveStopSequences(params.feature),
      maxOutputTokens: this.resolveMaxTokensValue(options?.maxTokens),
      maxRetries: this.config.maxRetries ?? this.MAX_RETRIES,
      abortSignal: AbortSignal.timeout(this.config.timeout ?? this.TIMEOUT),
    });
    this.logSDKWarnings(result.warnings, modelId, "generateText");

    const content = result.text ?? "";
    let jsonContent: any;
    if (options?.parseAsJSON) {
      jsonContent = this.tryParseJson(content);
    }

    return {
      content,
      usage: this.mapUsage(result.usage),
      jsonContent,
    };
  }

  protected async executeAIStreamRequest(
    params: AIRequestParams,
    options?: {
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<AsyncIterable<string>> {
    const messages = await this.buildProviderMessages(params);
    const filteredMessages = this.filterEmptyMessages(messages);
    const modelId = this.resolveModelId(params);

    const stream = streamText({
      model: this.createLanguageModel(modelId, params.model),
      messages: filteredMessages as any,
      temperature: this.resolveTemperature(options?.temperature),
      topP: this.resolveTopP(params.feature),
      topK: this.resolveTopK(params.feature),
      presencePenalty: this.resolvePresencePenalty(params.feature),
      frequencyPenalty: this.resolveFrequencyPenalty(params.feature),
      stopSequences: this.resolveStopSequences(params.feature),
      maxOutputTokens: this.resolveMaxTokensValue(options?.maxTokens),
      experimental_transform: this.resolveStreamTransform(),
      onFinish: ({ warnings }) => {
        this.logSDKWarnings(warnings, modelId, "streamText");
      },
      maxRetries: this.config.maxRetries ?? this.MAX_RETRIES,
      abortSignal: AbortSignal.timeout(this.config.timeout ?? this.TIMEOUT),
    });

    const processStream = async function* (): AsyncIterable<string> {
      for await (const chunk of stream.textStream) {
        if (chunk) {
          yield chunk;
        }
      }
    };

    return processStream();
  }

  protected getDefaultModel(): AIModel {
    const modelId = this.config.defaultModel || "gpt-4o-mini";
    return {
      id: modelId,
      name: modelId,
      maxTokens: { input: 4096, output: 2048 },
      provider: {
        id: this.provider.id as any,
        name: this.provider.name,
      },
    } as AIModel;
  }

  async getModels(): Promise<AIModel[]> {
    if (!this.shouldFetchModelsFromApi()) {
      return this.config.models;
    }

    try {
      const response = await this._fetchModelsFromApi();
      if (!response?.data?.length) {
        return this.config.models;
      }

      return response.data.map(
        (model) =>
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
          }) as AIModel,
      );
    } catch {
      return this.config.models;
    }
  }

  async refreshModels(): Promise<string[]> {
    if (!this.shouldFetchModelsFromApi()) {
      return this.config.models.map((m) => m.id);
    }

    const response = await this._fetchModelsFromApi();
    return response.data.map((model) => model.id);
  }

  getName(): string {
    return this.provider.name;
  }

  getId(): string {
    return this.provider.id;
  }

  protected async withTimeout<T>(
    promise: Promise<T>,
    timeout = this.TIMEOUT,
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), timeout);
    });
    return Promise.race([promise, timeoutPromise]);
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    retries = this.MAX_RETRIES,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return this.withRetry(operation, retries - 1);
      }
      throw error;
    }
  }

  protected async buildProviderMessages(params: AIRequestParams): Promise<any> {
    if (!params.messages || params.messages.length === 0) {
      const systemPrompt = await getSystemPrompt(params);
      const userPrompt = params.additionalContext || "";
      const userContent = params.diff;

      params.messages = [{ role: "system", content: systemPrompt }];
      if (userContent) {
        params.messages.push({ role: "user", content: userContent });
      }
      if (userPrompt) {
        params.messages.push({ role: "user", content: userPrompt });
      }
    }

    return params.messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
  }

  abstract isAvailable(): Promise<boolean>;

  protected handleApiError(error: any): void {
    if (error?.code === "context_length_exceeded") {
      this.handleContextLengthError(error, "unknown");
    }
    throw error;
  }

  protected handleContextLengthError(error: any, modelId: string): void {
    throw new Error(
      `Context length exceeded for model ${modelId}. ${error?.message ?? ""}`.trim(),
    );
  }

  protected async _fetchModelsFromApi(): Promise<ModelListResponse> {
    const baseUrl = this.normalizeBaseUrl(this.config.baseUrl);
    const url = `${baseUrl}/models`;
    const headers = this.resolveOpenAICompatibleHeaders();

    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch models: ${response.status} ${text}`);
    }

    const data = (await response.json()) as ModelListResponse;
    if (!data?.data) {
      return { data: [] };
    }

    return data;
  }

  private shouldFetchModelsFromApi(): boolean {
    const nonOpenAIStyle = new Set(["anthropic", "gemini", "ollama", "vertexai"]);
    if (nonOpenAIStyle.has(this.provider.id)) {
      return false;
    }

    return !!this.config.apiKey || this.provider.id === "ollama";
  }

  private resolveModelId(params: AIRequestParams): string {
    return (params.model?.id || this.config.defaultModel || "gpt-4o-mini") as string;
  }

  private resolveMaxTokensValue(requestMaxTokens?: number): number | undefined {
    if (this.config.includeMaxTokens === false) {
      return undefined;
    }
    if (this.config.maxTokens && this.config.maxTokens > 0) {
      return this.config.maxTokens;
    }
    return requestMaxTokens;
  }

  private resolveTemperature(requestTemperature?: number): number | undefined {
    if (this.config.enableR1Models) {
      return undefined;
    }
    return requestTemperature;
  }

  private resolveProviderOptions() {
    const reasoningEffort = this.resolveReasoningEffort();
    if (!reasoningEffort) {
      return undefined;
    }

    const options: Record<string, Record<string, unknown>> = {};

    // Keep both keys for maximum compatibility:
    // - "openai": official AI SDK provider key
    // - provider id: custom OpenAI-compatible provider names in this codebase
    options.openai = { reasoningEffort };
    options[this.provider.id] = { reasoningEffort };

    return options as any;
  }

  private resolveReasoningEffort(): "low" | "medium" | "high" | undefined {
    if (!this.config.enableReasoningEffort) {
      return undefined;
    }

    const level = this.config.reasoningEffortLevel;
    if (level === "low" || level === "medium" || level === "high") {
      return level;
    }

    return "medium";
  }

  private resolveTopP(feature?: string): number | undefined {
    const candidate = this.resolveFeatureOverride(feature, "topP");
    if (typeof candidate !== "number") {
      return undefined;
    }

    if (candidate <= 0 || candidate > 1) {
      return undefined;
    }

    return candidate;
  }

  private resolveTopK(feature?: string): number | undefined {
    const candidate = this.resolveFeatureOverride(feature, "topK");
    if (typeof candidate !== "number") {
      return undefined;
    }

    if (candidate <= 0) {
      return undefined;
    }

    return Math.floor(candidate);
  }

  private resolvePresencePenalty(feature?: string): number | undefined {
    const candidate = this.resolveFeatureOverride(feature, "presencePenalty");
    return typeof candidate === "number"
      ? candidate
      : undefined;
  }

  private resolveFrequencyPenalty(feature?: string): number | undefined {
    const candidate = this.resolveFeatureOverride(feature, "frequencyPenalty");
    return typeof candidate === "number"
      ? candidate
      : undefined;
  }

  private resolveStopSequences(feature?: string): string[] | undefined {
    const raw = this.resolveFeatureOverride(feature, "stopSequences");
    const values = Array.isArray(raw)
      ? raw
      : typeof raw === "string"
        ? raw.split(/[\n,]/g)
        : [];

    const sequences = values
      .map((value) => value?.trim())
      .filter((value): value is string => !!value);

    return sequences.length > 0 ? sequences : undefined;
  }

  private resolveFeatureOverride(
    feature: string | undefined,
    key:
      | "topP"
      | "topK"
      | "presencePenalty"
      | "frequencyPenalty"
      | "stopSequences",
  ): unknown {
    if (!feature) {
      return this.config[key];
    }

    const overrides = this.resolveFeatureOverridesMap();
    const featureConfig = overrides?.[feature];
    if (featureConfig && key in featureConfig) {
      return featureConfig[key];
    }

    return this.config[key];
  }

  private resolveFeatureOverridesMap():
    | Record<
        string,
        {
          topP?: number;
          topK?: number;
          presencePenalty?: number;
          frequencyPenalty?: number;
          stopSequences?: string[] | string;
        }
      >
    | undefined {
    const raw = this.config.featureOverrides;

    if (!raw) {
      return undefined;
    }

    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          return parsed as Record<
            string,
            {
              topP?: number;
              topK?: number;
              presencePenalty?: number;
              frequencyPenalty?: number;
              stopSequences?: string[] | string;
            }
          >;
        }
      } catch {
        return undefined;
      }
      return undefined;
    }

    return raw;
  }

  private logSDKWarnings(
    warnings: ReadonlyArray<unknown> | undefined,
    modelId: string,
    stage: string,
  ): void {
    if (!warnings?.length) {
      return;
    }

    this.logger.warn("AI SDK returned model warnings", {
      data: {
        provider: this.provider.id,
        model: modelId,
        stage,
        warnings,
      },
    });
  }

  private resolveStreamTransform() {
    if (!this.config.enableSmoothStreaming) {
      return undefined;
    }

    return smoothStream();
  }

  private filterEmptyMessages(messages: Array<{ role: string; content: any }>) {
    return messages.filter((msg) => {
      if (typeof msg.content === "string") {
        return msg.content.trim() !== "";
      }
      return msg.content !== null && msg.content !== undefined;
    });
  }

  private tryParseJson(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      try {
        const jsonString = content.replace(/^```json\s*|\s*```$/g, "").trim();
        return JSON.parse(jsonString);
      } catch {
        return undefined;
      }
    }
  }

  private mapUsage(usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  }) {
    return {
      promptTokens: usage?.inputTokens,
      completionTokens: usage?.outputTokens,
      totalTokens: usage?.totalTokens,
    };
  }

  private createLanguageModel(modelId: string, model?: AIModel) {
    const baseUrl = this.normalizeBaseUrl(model?.baseUrl || this.config.baseUrl);
    const apiKey = this.config.apiKey;
    const providerId = this.provider.id;

    if (providerId === "anthropic") {
      const anthropic = createAnthropic({
        apiKey,
        baseURL: baseUrl || "https://api.anthropic.com/v1",
        headers: this.config.customHeaders,
        name: "anthropic",
      });
      return this.wrapLanguageModelWithDefaults(anthropic(modelId as any));
    }

    if (providerId === "gemini" || providerId === "vertexai") {
      const google = createGoogleGenerativeAI({
        apiKey,
        baseURL: baseUrl || "https://generativelanguage.googleapis.com/v1beta",
        headers: this.config.customHeaders,
        name: "google.generative-ai",
      });
      return this.wrapLanguageModelWithDefaults(google(modelId as any));
    }

    if (providerId === "ollama") {
      const ollama = createOllama({
        baseURL: this.normalizeOllamaBaseUrl(baseUrl || "http://localhost:11434"),
        headers: this.config.customHeaders,
        compatibility: "strict",
        name: "ollama",
      });
      return this.wrapLanguageModelWithDefaults(ollama(modelId as any));
    }

    const openai = createOpenAI({
      apiKey: apiKey || "local-dummy-key",
      baseURL: baseUrl,
      headers: this.resolveOpenAICompatibleHeaders(),
      name: this.provider.id,
      fetch: this.createProviderFetch(),
    });
    return this.wrapLanguageModelWithDefaults(openai(modelId as any));
  }

  private wrapLanguageModelWithDefaults(model: any) {
    const settings: Record<string, unknown> = {};

    const topP = this.resolveTopP();
    const topK = this.resolveTopK();
    const presencePenalty = this.resolvePresencePenalty();
    const frequencyPenalty = this.resolveFrequencyPenalty();
    const providerOptions = this.resolveProviderOptions();

    if (topP !== undefined) {
      settings.topP = topP;
    }
    if (topK !== undefined) {
      settings.topK = topK;
    }
    if (presencePenalty !== undefined) {
      settings.presencePenalty = presencePenalty;
    }
    if (frequencyPenalty !== undefined) {
      settings.frequencyPenalty = frequencyPenalty;
    }
    if (providerOptions !== undefined) {
      settings.providerOptions = providerOptions;
    }

    const middlewares: any[] = [];
    if (Object.keys(settings).length > 0) {
      middlewares.push(
        defaultSettingsMiddleware({
          settings: settings as any,
        }),
      );
    }

    const reasoningMiddleware = this.resolveReasoningExtractionMiddleware();
    if (reasoningMiddleware) {
      middlewares.push(reasoningMiddleware);
    }

    if (middlewares.length === 0) {
      return model;
    }

    return wrapLanguageModel({
      model,
      middleware: middlewares,
    });
  }

  private resolveReasoningExtractionMiddleware() {
    if (!this.config.enableReasoningExtraction) {
      return undefined;
    }

    const tagName = this.config.reasoningExtractionTagName?.trim() || "think";
    return extractReasoningMiddleware({ tagName });
  }

  private resolveOpenAICompatibleHeaders(): Record<string, string> {
    const apiKey = this.config.apiKey || "local-dummy-key";
    const headers: Record<string, string> = {
      ...this.config.customHeaders,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
    };

    if (!headers.Authorization) {
      headers.Authorization = `Bearer ${apiKey}`;
    }
    if (!headers["api-key"]) {
      headers["api-key"] = apiKey;
    }

    return headers;
  }

  private createProviderFetch(): typeof fetch | undefined {
    if (!(this.provider.id === "azure-openai" || this.config.useAzure)) {
      return undefined;
    }

    const apiVersion = this.config.azureApiVersion || this.config.apiVersion;
    if (!apiVersion) {
      return undefined;
    }

    return async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      if (!url.searchParams.has("api-version")) {
        url.searchParams.set("api-version", apiVersion);
      }
      return fetch(url.toString(), init);
    };
  }

  private normalizeBaseUrl(baseUrl?: string): string | undefined {
    if (!baseUrl) {
      return undefined;
    }
    return baseUrl.replace(/\/+$/, "");
  }

  private normalizeOllamaBaseUrl(baseUrl: string): string {
    const normalized = this.normalizeBaseUrl(baseUrl) || "http://localhost:11434";
    return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
  }
}
