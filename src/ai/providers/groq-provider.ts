import { AbstractAIProvider } from "@/ai/providers/abstract-ai-provider";
import type { OpenAIProviderConfig } from "@/ai/providers/base-openai-provider";
import { AIModel, AIRequestParams, type AIProviders } from "@/ai/types";
import {
  PR_SUMMARY_SYSTEM_TEMPLATE,
  PR_SUMMARY_USER_TEMPLATE,
} from "@/prompt/pr-summary";
import { processPromptTemplate } from "@/utils/prompt-template";
import Groq from "groq-sdk";
import {
  ChatCompletionMessageParam
} from "groq-sdk/resources/chat/completions";

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

  constructor(config?: any) {
    super();

    const apiKey = config?.apiKey;
    this.config = {
      apiKey: apiKey,
      baseUrl: "https://api.groq.com/",
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
    const groq = this.groq;

    const modelId = (params.model?.id || this.config.defaultModel) as string;
    const { systemInstruction, contents } = await this.buildProviderMessages(
      params
    );

    this.logger.debug("[GroqAIProvider] executeAIRequest", {
      data: {
        providerId: this.provider.id,
        modelId,
        messageCount: contents.length,
        hasSystemInstruction: Boolean(systemInstruction),
      },
    });

    try {
      const chatCompletion = await groq.chat.completions.create(
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
      this.logger.error("Groq API request failed", {
        error: error as Error,
        data: {
          providerId: this.provider.id,
          modelId,
        },
      });
      if (error instanceof Groq.APIError) {
        this.logger.warn("[GroqAIProvider] API error details", {
          data: {
            providerId: this.provider.id,
            status: error.status,
            name: error.name,
          },
        });
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
    const groq = this.groq;

    const modelId = (params.model?.id || this.config.defaultModel) as string;
    const { systemInstruction, contents } = await this.buildProviderMessages(
      params
    );

    const processStream = async function* (
      this: GroqAIProvider
    ): AsyncIterable<string> {
      try {
        this.logger.debug("[GroqAIProvider] executeAIStreamRequest", {
          data: {
            providerId: this.provider.id,
            modelId,
            messageCount: contents.length,
            hasSystemInstruction: Boolean(systemInstruction),
          },
        });

        const stream = await groq.chat.completions.create(
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
        this.logger.error("Groq API stream request failed", {
          error: error as Error,
          data: {
            providerId: this.provider.id,
            modelId,
          },
        });
        if (error instanceof Groq.APIError) {
          this.logger.warn("[GroqAIProvider] Stream API error details", {
            data: {
              providerId: this.provider.id,
              status: error.status,
              name: error.name,
            },
          });
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
    if (!this.groq) {
      throw new Error(
        "Groq API client not initialized. Please check your API key."
      );
    }
    const response = await this.groq.models.list();
    return response.data.map((model) => model.id);
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
    this.logger.warn(
      "generatePRSummary is not fully implemented for GroqAIProvider and will return an empty response.",
      {
        data: {
          providerId: this.provider.id,
        },
      },
    );
    const systemPrompt =
      params.systemPrompt ||
      processPromptTemplate(PR_SUMMARY_SYSTEM_TEMPLATE, {
        language: params.language,
      });
    const userPrompt = processPromptTemplate(PR_SUMMARY_USER_TEMPLATE, {
      language: params.language,
    });
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
  protected async buildProviderMessages(params: AIRequestParams): Promise<{
    systemInstruction: string;
    contents: ChatCompletionMessageParam[];
  }> {
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
