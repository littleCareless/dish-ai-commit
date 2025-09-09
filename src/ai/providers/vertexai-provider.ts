import { ConfigurationManager } from "../../config/configuration-manager";
import { AIModel, AIRequestParams, type AIProviders } from "../types";
import { AbstractAIProvider } from "./abstract-ai-provider";
import { VertexAI, Content, Part } from "@google-cloud/vertexai";
import { GoogleAuthOptions } from "google-auth-library";
import {
  getPRSummarySystemPrompt,
  getPRSummaryUserPrompt,
} from "../../prompt/pr-summary";
import { getSystemPrompt } from "../utils/generate-helper";

/**
 * Vertex AI Provider Configuration Interface
 */
interface VertexAIProviderConfig {
  project: string;
  location: string;
  apiEndpoint?: string;
  googleAuthOptions?: GoogleAuthOptions;
  providerId: AIProviders;
  providerName: string;
  models: AIModel[];
  defaultModel: string;
}

/**
 * Supported AI models for Google Vertex AI
 */
const vertexAIModels: AIModel[] = [
  {
    id: "gemini-1.5-flash-preview-0514",
    name: "Vertex AI Gemini 1.5 Flash",
    maxTokens: { input: 1048576, output: 8192 },
    provider: { id: "vertexai", name: "Vertex AI" },
    default: true,
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "gemini-1.5-pro-preview-0409",
    name: "Vertex AI Gemini 1.5 Pro",
    maxTokens: { input: 1048576, output: 8192 },
    provider: { id: "vertexai", name: "Vertex AI" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "gemini-1.0-pro",
    name: "Vertex AI Gemini 1.0 Pro",
    maxTokens: { input: 30720, output: 2048 },
    provider: { id: "vertexai", name: "Vertex AI" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "code-bison@002",
    name: "Vertex AI Codey - Code Bison",
    maxTokens: { input: 6144, output: 2048 },
    provider: { id: "vertexai", name: "Vertex AI" },
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
];

/**
 * Google Vertex AI service provider implementation
 */
export class VertexAIProvider extends AbstractAIProvider {
  private vertexAI: VertexAI | undefined;
  readonly provider = {
    id: "vertexai" as AIProviders,
    name: "Vertex AI",
  } as const;
  protected config: VertexAIProviderConfig;

  constructor() {
    super();
    const configManager = ConfigurationManager.getInstance();

    const apiEndpoint = configManager.getConfig(
      "PROVIDERS_VERTEXAI_APIENDPOINT"
    );
    const authOptionsString = configManager.getConfig(
      "PROVIDERS_VERTEXAI_GOOGLEAUTHOPTIONS"
    );

    let googleAuthOptions: GoogleAuthOptions | undefined;
    if (authOptionsString) {
      try {
        googleAuthOptions = JSON.parse(authOptionsString);
      } catch (error) {
        console.error(
          "Failed to parse Vertex AI GoogleAuthOptions from settings:",
          error
        );
      }
    }

    this.config = {
      project: configManager.getConfig("PROVIDERS_VERTEXAI_PROJECTID"),
      location: configManager.getConfig("PROVIDERS_VERTEXAI_LOCATION"),
      apiEndpoint: apiEndpoint || undefined,
      googleAuthOptions,
      providerId: "vertexai",
      providerName: "Vertex AI",
      models: vertexAIModels,
      defaultModel: "gemini-1.5-flash-preview-0514",
    };

    if (this.config.project && this.config.location) {
      try {
        this.vertexAI = new VertexAI({
          project: this.config.project,
          location: this.config.location,
          apiEndpoint: this.config.apiEndpoint,
          googleAuthOptions: this.config.googleAuthOptions,
        });
      } catch (error) {
        console.error("Failed to initialize Vertex AI client:", error);
      }
    }
  }

  protected async executeAIRequest(
    params: AIRequestParams,
    options?: {
      parseAsJSON?: boolean;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<{ content: string; usage?: any; jsonContent?: any }> {
    if (!this.vertexAI) {
      throw new Error(
        "Vertex AI client not initialized. Please check your Project ID and Location."
      );
    }

    const modelId = (params.model?.id || this.config.defaultModel) as string;
    const { systemInstruction, contents } = (await this.buildProviderMessages(
      params
    )) as {
      systemInstruction?: { role: string; parts: Part[] };
      contents: Content[];
    };

    try {
      const generativeModel = this.vertexAI.getGenerativeModel({
        model: modelId,
        systemInstruction: systemInstruction,
      });

      const result = await generativeModel.generateContent({
        contents: contents,
        generationConfig: {
          temperature: options?.temperature || 0.7,
          maxOutputTokens: options?.maxTokens,
        },
      });

      const response = result.response;
      const responseText =
        response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      // Vertex AI API may not return token usage in the same way.
      const usage = {
        promptTokens: response.usageMetadata?.promptTokenCount,
        completionTokens: response.usageMetadata?.candidatesTokenCount,
        totalTokens: response.usageMetadata?.totalTokenCount,
      };

      return { content: responseText, usage };
    } catch (error) {
      console.error("Vertex AI API request failed:", error);
      throw error;
    }
  }

  protected async executeAIStreamRequest(
    params: AIRequestParams,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<AsyncIterable<string>> {
    if (!this.vertexAI) {
      throw new Error(
        "Vertex AI client not initialized. Please check your Project ID and Location."
      );
    }

    const modelId = (params.model?.id || this.config.defaultModel) as string;
    const { systemInstruction, contents } = (await this.buildProviderMessages(
      params
    )) as {
      systemInstruction?: { role: string; parts: Part[] };
      contents: Content[];
    };

    const processStream = async function* (
      this: VertexAIProvider
    ): AsyncIterable<string> {
      try {
        const generativeModel = this.vertexAI!.getGenerativeModel({
          model: modelId,
          systemInstruction: systemInstruction,
        });

        const streamResult = await generativeModel.generateContentStream({
          contents: contents,
          generationConfig: {
            temperature: options?.temperature || 0.7,
            maxOutputTokens: options?.maxTokens,
          },
        });

        for await (const item of streamResult.stream) {
          const text = item.candidates?.[0]?.content?.parts?.[0]?.text;
          if (typeof text === "string" && text) {
            yield text;
          }
        }
      } catch (error) {
        console.error("Vertex AI API stream request failed:", error);
        throw error;
      }
    };

    return Promise.resolve(processStream.call(this));
  }

  protected getDefaultModel(): AIModel {
    const defaultModel =
      this.config.models.find((m) => m.default) || this.config.models[0];
    return defaultModel;
  }

  async getModels(): Promise<AIModel[]> {
    // TODO: Implement dynamic model fetching from Vertex AI API
    if (!this.vertexAI) {
      console.warn(
        "Vertex AI client not initialized, returning static model list."
      );
    }
    return Promise.resolve(this.config.models);
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.project && !!this.config.location;
  }

  async refreshModels(): Promise<string[]> {
    return Promise.resolve(this.config.models.map((m) => m.id));
  }

  getName(): string {
    return "Vertex AI";
  }

  getId(): string {
    return "vertexai";
  }

  async generatePRSummary(
    params: AIRequestParams,
    commitMessages: string[]
  ): Promise<import("../types").AIResponse> {
    console.warn(
      "generatePRSummary is not fully implemented for VertexAIProvider and will return an empty response."
    );
    const systemPrompt =
      params.systemPrompt || getPRSummarySystemPrompt(params.language);
    const userPrompt = getPRSummaryUserPrompt(params.language);
    const userContent = commitMessages.join("\n- ");

    const response = await this.executeAIRequest(
      {
        ...params,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
          { role: "user", content: `- ${userContent}` },
        ],
      },
      {
        temperature: 0.7,
      }
    );

    return { content: response.content, usage: response.usage };
  }

  protected async buildProviderMessages(params: AIRequestParams): Promise<{}> {
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

    let systemInstruction: { role: string; parts: Part[] } | undefined;
    const contents: Content[] = [];
    let currentParts: Part[] = [];

    for (const message of params.messages) {
      if (message.role === "system") {
        // Vertex AI's system instruction is a structured object
        systemInstruction = {
          role: "system", // Although the SDK implies this, let's be explicit
          parts: [{ text: message.content }],
        };
      } else {
        if (message.role === "user") {
          currentParts.push({ text: message.content });
        } else if (message.role === "assistant") {
          if (currentParts.length > 0) {
            contents.push({ role: "user", parts: currentParts });
            currentParts = [];
          }
          contents.push({ role: "model", parts: [{ text: message.content }] });
        }
      }
    }

    if (currentParts.length > 0) {
      contents.push({ role: "user", parts: currentParts });
    }

    return { systemInstruction, contents };
  }
}
