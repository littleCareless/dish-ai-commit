import {
  ChatCompletionMessageParam,
  ChatCompletionFunctionMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
  ChatCompletionAssistantMessageParam,
  ChatCompletionToolMessageParam,
} from "groq-sdk/resources/chat/completions";
import { ConfigurationManager } from "../../config/configuration-manager";
import { AIModel, AIRequestParams, type AIProviders } from "../types";
import { AbstractAIProvider } from "./abstract-ai-provider";
import Groq from "groq-sdk";
import type { OpenAIProviderConfig } from "./base-openai-provider";
import {
  getPRSummarySystemPrompt,
  getPRSummaryUserPrompt,
} from "../../prompt/pr-summary";
import { getSystemPrompt } from "../utils/generate-helper"; // Import getSystemPrompt

const groqModels: AIModel[] = [
  {
    id: "mixtral-8x7b-32768",
    name: "Mixtral 8x7B",
    maxTokens: { input: 32768, output: 8192 },
    provider: { id: "groq", name: "Groq AI" },
    default: true,
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
];

export class GroqAIProvider extends AbstractAIProvider {
  private groq: Groq | undefined;
  readonly provider = {
    id: "groq" as AIProviders,
    name: "Groq",
  } as const;
  protected config: OpenAIProviderConfig;

  constructor() {
    super();
    const configManager = ConfigurationManager.getInstance();
    this.config = {
      apiKey: configManager.getConfig("PROVIDERS_GROQ_APIKEY"),
      baseURL: "https://api.groq.com/",
      providerId: "groq",
      providerName: "Groq",
      models: groqModels,
      defaultModel: "mixtral-8x7b-32768",
    };

    if (this.config.apiKey) {
      this.groq = new Groq({
        apiKey: this.config.apiKey,
      });
    }
  }

  protected async executeAIRequest(
    params: AIRequestParams,
    options?: {
      parseAsJSON?: boolean;
      temperature?: number;
      maxTokens?: number;
      maxRetries?: number;
    }
  ): Promise<{ content: string; usage?: any; jsonContent?: any }> {
    if (!this.groq) {
      throw new Error(
        "Groq API client not initialized. Please check your API key."
      );
    }

    const modelId = (params.model?.id || this.config.defaultModel) as string;
    const { systemInstruction, contents } =
      this.buildProviderMessages(params);

    console.log(
      "Final messages for AI:",
      JSON.stringify({ systemInstruction, contents }, null, 2)
    );

    try {
      const chatCompletion = await this.groq.chat.completions.create(
        {
          model: modelId,
          messages: contents,
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens,
        },
        { maxRetries: 5 }
      );

      const response = chatCompletion.choices[0].message.content;

      const usage = {
        promptTokens: chatCompletion.usage?.prompt_tokens,
        completionTokens: chatCompletion.usage?.completion_tokens,
        totalTokens: chatCompletion.usage?.total_tokens,
      };

      return { content: response ?? "", usage };
    } catch (error: any) {
      console.error("Groq API request failed:", error);
      if (error instanceof Groq.APIError) {
        console.log(error.status);
        console.log(error.name);
        console.log(error.headers);
      }
      throw error;
    }
  }

  protected async executeAIStreamRequest(
    params: AIRequestParams & { maxRetries?: number },
    options?: {
      temperature?: number;
      maxTokens?: number;
      maxRetries?: number;
    }
  ): Promise<AsyncIterable<string>> {
    if (!this.groq) {
      throw new Error(
        "Groq API client not initialized. Please check your API key."
      );
    }

    const modelId = (params.model?.id || this.config.defaultModel) as string;
    const { systemInstruction, contents } =
      this.buildProviderMessages(params);

    const processStream = async function* (
      this: GroqAIProvider
    ): AsyncIterable<string> {
      try {
        console.log(
          "Final messages for AI:",
          JSON.stringify({ systemInstruction, contents }, null, 2)
        );

        const stream = await this.groq!.chat.completions.create(
          {
            model: modelId,
            messages: contents,
            temperature: options?.temperature || 0.7,
            max_tokens: options?.maxTokens,
            stream: true,
          },
          { maxRetries: 5 }
        );

        for await (const chunk of stream) {
          yield chunk.choices[0]?.delta?.content || "";
        }
      } catch (error: any) {
        console.error("Groq API stream request failed:", error);
        if (error instanceof Groq.APIError) {
          console.log(error.status);
          console.log(error.name);
          console.log(error.headers);
        }
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
    return Promise.resolve(this.config.models);
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }

  async refreshModels(): Promise<string[]> {
    return Promise.resolve(this.config.models.map((m) => m.id));
  }

  getName(): string {
    return "Groq";
  }

  getId(): string {
    return "groq";
  }

  async generatePRSummary(
    params: AIRequestParams,
    commitMessages: string[]
  ): Promise<import("../types").AIResponse> {
    console.warn(
      "generatePRSummary is not fully implemented for GroqAIProvider and will return an empty response."
    );
    const systemPrompt =
      params.systemPrompt || getPRSummarySystemPrompt(params.language);
    const userPrompt = getPRSummaryUserPrompt(params.language);
    const userContent = commitMessages.join("\n- ");

    const response = await this.executeAIRequest(
      {
        ...params,
        messages: [
          { role: "system", content: systemPrompt, name: "system" },
          { role: "user", content: userPrompt, name: "user" },
          { role: "user", content: `- ${userContent}`, name: "userContent" },
        ],
      },
      {
        temperature: 0.7,
      }
    );

    return { content: response.content, usage: response.usage };
  }
  protected buildProviderMessages(params: AIRequestParams): {
    systemInstruction: string;
    contents: ChatCompletionMessageParam[];
  } {
    const messages = params.messages || [];
    let systemInstruction = "";
    const contents: ChatCompletionMessageParam[] = messages.map((message) => {
      const msg: any = {
        role: message.role as ChatCompletionMessageParam["role"],
        content: message.content,
      };
      if (message.name) {
        msg.name = message.name;
      }

      if (message.role === "tool" && message.tool_call_id) {
        msg.tool_call_id = message.tool_call_id;
      }

      return msg as ChatCompletionMessageParam;
    });

    return { systemInstruction, contents };
  }
}
