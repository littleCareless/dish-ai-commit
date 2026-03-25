import { AbstractAIProvider } from "@/ai/providers/abstract-ai-provider";
import type { OpenAIProviderConfig } from "@/ai/providers/base-openai-provider";
import { AIModel, AIRequestParams, type AIProviders } from "@/ai/types";
import { getSystemPrompt } from "@/ai/utils/generate-helper"; // Import getSystemPrompt
import {
  PR_SUMMARY_SYSTEM_TEMPLATE,
  PR_SUMMARY_USER_TEMPLATE,
} from "@/prompt/pr-summary";
import { processPromptTemplate } from "@/utils/prompt-template";
import { Content, GoogleGenAI, Part } from "@google/genai";

/**
 * Gemini支持的AI模型配置列表
 * 定义了不同版本的Gemini模型及其特性
 * 更新于 2025年7月 - 基于官方 Gemini API Coding Guidelines
 */
const geminiModels: AIModel[] = [
  // Gemini 3 系列 (最新预览版)
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash 预览版 - 通用文本和多模态任务",
    maxTokens: { input: 1048576, output: 65536 },
    provider: { id: "gemini", name: "Gemini AI" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro 预览版 - 编码和复杂推理任务",
    maxTokens: { input: 1048576, output: 65536 },
    provider: { id: "gemini", name: "Gemini AI" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "gemini-3-pro-image-preview",
    name: "Gemini 3 Pro Image 预览版 - 高质量图像生成和编辑",
    maxTokens: { input: 1048576, output: 65536 },
    provider: { id: "gemini", name: "Gemini AI" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  // Gemini 2.5 系列 (稳定版)
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash - 自适应思维，成本效益高（推荐）",
    maxTokens: { input: 1048576, output: 65536 },
    provider: { id: "gemini", name: "Gemini AI" },
    default: true,
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro - 增强型思考和推理能力、多模态理解、高级编码",
    maxTokens: { input: 1048576, output: 65536 },
    provider: { id: "gemini", name: "Gemini AI" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite - 低延迟、高吞吐量任务",
    maxTokens: { input: 1048576, output: 65536 },
    provider: { id: "gemini", name: "Gemini AI" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  // Gemini 2.0 系列 (可选)
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash - 新一代功能、速度、实时串流",
    maxTokens: { input: 1048576, output: 8192 },
    provider: { id: "gemini", name: "Gemini AI" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "gemini-2.0-flash-lite",
    name: "Gemini 2.0 Flash Lite - 成本效益高且延迟时间短",
    maxTokens: { input: 1048576, output: 8192 },
    provider: { id: "gemini", name: "Gemini AI" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  // 图像生成模型
  {
    id: "gemini-2.5-flash-image",
    name: "Gemini 2.5 Flash Image - 快速图像生成和编辑 (Nano Banana)",
    maxTokens: { input: 1048576, output: 8192 },
    provider: { id: "gemini", name: "Gemini AI" },
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
];

const geminiEmbeddingModels: AIModel[] = [
  {
    id: "gemini-embedding-001",
    name: "Gemini Embedding 001 (768)",
    maxTokens: { input: 2048, output: 0 },
    provider: { id: "gemini", name: "Gemini AI" },
    capabilities: {
      streaming: false,
      functionCalling: false,
    },
    dimension: 768,
  },
  {
    id: "gemini-embedding-001",
    name: "Gemini Embedding 001 (1536)",
    maxTokens: { input: 2048, output: 0 },
    provider: { id: "gemini", name: "Gemini AI" },
    capabilities: {
      streaming: false,
      functionCalling: false,
    },
    dimension: 1536,
  },
  {
    id: "gemini-embedding-001",
    name: "Gemini Embedding 001 (3072)",
    maxTokens: { input: 2048, output: 0 },
    provider: { id: "gemini", name: "Gemini AI" },
    capabilities: {
      streaming: false,
      functionCalling: false,
    },
    dimension: 3072,
  },
];

/**
 * Google Gemini AI服务提供者实现类
 * 继承自AbstractAIProvider，提供对Gemini API的访问能力
 */
export class GeminiAIProvider extends AbstractAIProvider {
  private genAI: GoogleGenAI | undefined;
  /** 提供者标识信息 */
  readonly provider = {
    id: "gemini" as AIProviders,
    name: "Gemini",
  } as const;
  /** 提供者配置信息 */
  protected config: OpenAIProviderConfig;

  /**
   * 创建Gemini AI提供者实例
   * 从配置管理器获取API密钥，初始化Google Generative AI
   */
  constructor(config?: any) {
    super();

    // 使用用户配置的 baseUrl，如果没有则使用官方默认地址
    const baseUrl =
      config?.baseUrl || "https://generativelanguage.googleapis.com/v1beta";

    this.config = {
      apiKey: config?.apiKey,
      baseUrl: baseUrl,
      providerId: "gemini",
      providerName: "Gemini",
      models: geminiModels,
      defaultModel: "gemini-2.5-flash",
    };

    if (this.config.apiKey) {
      // 构建 GoogleGenAI 配置选项
      const genAIOptions: {
        apiKey: string;
        httpOptions?: { baseUrl: string };
      } = {
        apiKey: this.config.apiKey,
      };

      // 如果用户配置了自定义 baseUrl，则通过 httpOptions 传递
      // 注意：仅当 baseUrl 是有效的 http/https URL 时才设置
      if (
        config?.baseUrl &&
        (config.baseUrl.startsWith("http://") ||
          config.baseUrl.startsWith("https://"))
      ) {
        genAIOptions.httpOptions = {
          baseUrl: config.baseUrl,
        };
      }

      this.genAI = new GoogleGenAI(genAIOptions);
    }
  }

  /**
   * 执行AI请求
   * 使用Google Generative AI库发送请求并获取回复
   */
  protected async executeAIRequest(
    params: AIRequestParams,
    options?: {
      parseAsJSON?: boolean;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<{ content: string; usage?: any; jsonContent?: any }> {
    if (!this.genAI) {
      throw new Error(
        "Gemini API client not initialized. Please check your API key.",
      );
    }

    // 获取模型ID
    const modelId = (params.model?.id || this.config.defaultModel) as string;
    const { systemInstruction, contents } = (await this.buildProviderMessages(
      params,
    )) as {
      systemInstruction?: string;
      contents: Content[];
    };

    this.logger.debug("[GeminiAIProvider] executeAIRequest", {
      data: {
        providerId: this.provider.id,
        modelId,
        messageCount: contents.length,
        hasSystemInstruction: Boolean(systemInstruction),
      },
    });

    try {
      // 使用systemPrompt作为系统指令，使用combinedUserContent作为用户输入
      const response = await this.genAI.models.generateContent({
        model: modelId,
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: options?.temperature || 0.7,
        },
      });

      let content = response.text;

      if (!content && response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (
          candidate &&
          candidate.content &&
          Array.isArray(candidate.content.parts) &&
          candidate.content.parts.length > 0
        ) {
          content = candidate.content.parts
            .map((part: Part) =>
              part && "text" in part && typeof part.text === "string"
                ? part.text
                : "",
            )
            .join("");
        }
      }

      const usage = {
        promptTokens: response.usageMetadata?.promptTokenCount,
        completionTokens: response.usageMetadata?.candidatesTokenCount,
        totalTokens: response.usageMetadata?.totalTokenCount,
      };

      return { content: content ?? "", usage };
    } catch (error) {
      this.logger.error("Gemini API request failed", {
        error: error as Error,
        data: {
          providerId: this.provider.id,
          modelId,
        },
      });
      throw error;
    }
  }

  /**
   * 执行AI流式请求
   * 使用Google Generative AI库发送流式请求并逐步返回结果
   */
  protected async executeAIStreamRequest(
    params: AIRequestParams,
    options?: {
      temperature?: number;
      maxTokens?: number; // 注意: Gemini API 可能对 maxTokens 的处理方式不同或在流式中不支持
    },
  ): Promise<AsyncIterable<string>> {
    if (!this.genAI) {
      throw new Error(
        "Gemini API client not initialized. Please check your API key.",
      );
    }
    const genAI = this.genAI;

    const modelId = (params.model?.id || this.config.defaultModel) as string;
    const { systemInstruction, contents } = (await this.buildProviderMessages(
      params,
    )) as {
      systemInstruction?: string;
      contents: Content[];
    };

    const processStream = async function* (
      this: GeminiAIProvider,
    ): AsyncIterable<string> {
      try {
        this.logger.debug("[GeminiAIProvider] executeAIStreamRequest", {
          data: {
            providerId: this.provider.id,
            modelId,
            messageCount: contents.length,
            hasSystemInstruction: Boolean(systemInstruction),
          },
        });
        const streamResult = await genAI.models.generateContentStream({
          model: modelId,
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: options?.temperature || 0.7,
            // maxOutputTokens: options?.maxTokens, // 如果SDK支持，可以取消注释
          },
        });

        // streamResult 本身就是异步生成器，直接迭代
        for await (const item of streamResult) {
          // 修正 item.text 的访问方式，它是一个属性而非函数
          const textResponse = item.text;
          if (typeof textResponse === "string" && textResponse) {
            yield textResponse;
          } else if (item.candidates && item.candidates.length > 0) {
            const candidate = item.candidates[0];
            // 加强对 candidate.content.parts 的检查
            if (
              candidate &&
              candidate.content &&
              Array.isArray(candidate.content.parts) &&
              candidate.content.parts.length > 0
            ) {
              const text = candidate.content.parts
                .map((part: Part) =>
                  part && "text" in part && typeof part.text === "string"
                    ? part.text
                    : "",
                ) // 确保 part.text 是字符串
                .join("");
              if (text) {
                yield text;
              }
            }
          }
        }
      } catch (error) {
        this.logger.error("Gemini API stream request failed", {
          error: error as Error,
          data: {
            providerId: this.provider.id,
            modelId,
          },
        });
        throw error;
      }
    };

    return Promise.resolve(processStream.call(this));
  }

  /**
   * 获取默认模型
   */
  protected getDefaultModel(): AIModel {
    const defaultModel =
      this.config.models.find((m) => m.default) || this.config.models[0];
    return defaultModel;
  }

  /**
   * 获取当前支持的AI模型列表
   */
  /**
   * 获取当前支持的AI模型列表
   * 优先从API获取，如果失败则返回配置的静态列表
   *
   * @returns Promise<AIModel[]> 支持的模型配置数组
   */
  async getModels(): Promise<AIModel[]> {
    if (!this.genAI) {
      throw new Error(
        "Gemini API client not initialized. Please check your API key.",
      );
    }

    try {
      // 尝试通过 API 获取模型列表
      const pager = await this.genAI.models.list({
        config: { pageSize: 20 }, // 可根据需要设置 pageSize
      });

      const models: AIModel[] = [];

      // 通过 Pager 迭代器遍历所有分页结果
      for await (const model of pager) {
        // 只取模型名（去掉 models/）
        const modelId = model.name ? model.name.replace(/^models\//, "") : "";

        // 解析并组装 AIModel
        models.push({
          id: modelId as any,
          name: model.displayName || modelId,
          maxTokens: {
            input: model.inputTokenLimit || 4096,
            output: Math.floor((model.outputTokenLimit || 4096) / 2),
          },
          provider: {
            id: this.provider.id as AIProviders,
            name: this.provider.name,
          },
        });
      }

      return models;
    } catch (error) {
      // 如果通过 API 获取失败，则返回配置的静态列表
      this.logger.warn(`获取模型列表失败：${this.config.providerName}`, {
        error: error as Error,
      });
      return this.config.models;
    }
  }
  async getEmbeddingModels(): Promise<AIModel[]> {
    return Promise.resolve(geminiEmbeddingModels);
  }

  /**
   * 检查Gemini服务是否可用
   * @returns 如果API密钥已配置返回true
   */
  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }

  /**
   * 刷新可用的Gemini模型列表
   * @returns 返回模型ID列表
   */
  async refreshModels(): Promise<string[]> {
    if (!this.genAI) {
      throw new Error(
        "Gemini API client not initialized. Please check your API key.",
      );
    }
    const pager = await this.genAI.models.list({
      config: { pageSize: 20 },
    });
    const models: string[] = [];
    for await (const model of pager) {
      const modelId = model.name ? model.name.replace(/^models\//, "") : "";
      if (modelId) {
        models.push(modelId);
      }
    }
    return models;
  }

  /**
   * 获取提供者显示名称
   */
  getName(): string {
    return "Gemini";
  }

  /**
   * 获取提供者唯一标识符
   */
  getId(): string {
    return "gemini";
  }

  /**
   * 生成PR摘要 (占位符实现)
   * @param params AI请求参数
   * @param commitMessages 提交信息列表
   * @returns AI响应
   */
  async generatePRSummary(
    params: AIRequestParams,
    commitMessages: string[],
  ): Promise<import("../types").AIResponse> {
    this.logger.warn(
      "generatePRSummary is not fully implemented for GeminiAIProvider and will return an empty response.",
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

    // Gemini的executeAIRequest会将userPrompt和userContent合并
    // 所以这里我们将commit列表作为userContent，userPrompt作为引导
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
      },
    );

    return { content: response.content, usage: response.usage };
  }
  /**
   * 构建特定于提供商的消息数组。
   * Gemini API 使用 systemInstruction 和 contents 数组。
   * @param params - AI请求参数
   * @returns 包含 systemInstruction 和 contents 的对象
   */
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

    let systemInstruction: string | undefined;
    const contents: Content[] = [];
    let currentParts: Part[] = [];

    for (const message of params.messages) {
      if (message.role === "system") {
        systemInstruction = message.content;
      } else {
        // Gemini API expects alternating user/model roles.
        // We'll merge consecutive user messages.
        if (message.role === "user") {
          currentParts.push({ text: message.content });
        } else if (message.role === "assistant") {
          // If we have pending user parts, add them as a user message first.
          if (currentParts.length > 0) {
            contents.push({ role: "user", parts: currentParts });
            currentParts = [];
          }
          contents.push({ role: "model", parts: [{ text: message.content }] });
        }
      }
    }

    // Add any remaining user parts
    if (currentParts.length > 0) {
      contents.push({ role: "user", parts: currentParts });
    }

    return { systemInstruction, contents };
  }

  /**
   * 计算给定内容的token数量
   * @param params AI请求参数
   * @returns 包含总token数的Promise
   */
  async countTokens(params: AIRequestParams): Promise<{ totalTokens: number }> {
    if (!this.genAI) {
      throw new Error(
        "Gemini API client not initialized. Please check your API key.",
      );
    }

    const modelId = (params.model?.id || this.config.defaultModel) as string;
    const { systemInstruction, contents } = (await this.buildProviderMessages(
      params,
    )) as {
      systemInstruction?: string;
      contents: Content[];
    };

    // 将 systemInstruction 和所有 parts 的文本内容连接成一个字符串
    const contentsText = contents
      .flatMap((content) =>
        (content.parts || []).map((part) => ("text" in part ? part.text : "")),
      )
      .join("\n");

    const combinedText = [systemInstruction, contentsText]
      .filter(Boolean)
      .join("\n\n");

    try {
      const countTokensResponse = await this.genAI.models.countTokens({
        model: modelId,
        contents: combinedText,
      });
      return { totalTokens: countTokensResponse.totalTokens ?? 0 };
    } catch (error) {
      this.logger.error("Gemini countTokens failed", {
        error: error as Error,
        data: {
          providerId: this.provider.id,
          modelId,
        },
      });
      throw error;
    }
  }
}
