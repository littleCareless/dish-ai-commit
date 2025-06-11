import { ConfigurationManager } from "../../config/configuration-manager";
import { AIModel, AIRequestParams, type AIProviders } from "../types";
import { AbstractAIProvider } from "./abstract-ai-provider";
import { GenerationConfig, GoogleGenAI, Part } from "@google/genai";
import type { OpenAIProviderConfig } from "./base-openai-provider";

/**
 * Gemini支持的AI模型配置列表
 * 定义了不同版本的Gemini模型及其特性
 */
const geminiModels: AIModel[] = [
  {
    id: "gemini-2.5-flash-preview-05-20",
    name: "Gemini 2.5 Flash 预览版 - 自适应思维，成本效益高",
    maxTokens: { input: 1048576, output: 65536 },
    provider: { id: "gemini", name: "Gemini AI" },
    default: true,
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "gemini-2.5-pro-preview-05-06",
    name: "Gemini 2.5 Pro 预览版 - 增强型思考和推理能力、多模态理解、高级编码",
    maxTokens: { input: 1048576, output: 65536 },
    provider: { id: "gemini", name: "Gemini AI" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash - 新一代功能、速度、思考、实时串流和多模式生成",
    maxTokens: { input: 1048576, output: 8192 },
    provider: { id: "gemini", name: "Gemini AI" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "gemini-2.0-flash-lite",
    name: "Gemini 2.0 Flash-Lite - 成本效益高且延迟时间短",
    maxTokens: { input: 1048576, output: 8192 },
    provider: { id: "gemini", name: "Gemini AI" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash - 在各种任务中提供快速、多样化的性能",
    maxTokens: { input: 1048576, output: 8192 },
    provider: { id: "gemini", name: "Gemini AI" },
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
  {
    id: "gemini-1.5-flash-8b",
    name: "Gemini 1.5 Flash-8B - 适用于量大且智能程度较低的任务",
    maxTokens: { input: 1048576, output: 8192 },
    provider: { id: "gemini", name: "Gemini AI" },
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro - 适用于需要更高智能的复杂推理任务",
    maxTokens: { input: 2097152, output: 8192 },
    provider: { id: "gemini", name: "Gemini AI" },
    capabilities: {
      streaming: true,
      functionCalling: false,
    },
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
  constructor() {
    super();
    const configManager = ConfigurationManager.getInstance();
    this.config = {
      apiKey: configManager.getConfig("PROVIDERS_GEMINI_APIKEY"),
      baseURL: "https://api.gemini.com/",
      providerId: "gemini",
      providerName: "Gemini",
      models: geminiModels,
      defaultModel: "gemini-1.5-flash",
    };

    if (this.config.apiKey) {
      this.genAI = new GoogleGenAI({
        apiKey: this.config.apiKey,
      });
    }
  }

  /**
   * 执行AI请求
   * 使用Google Generative AI库发送请求并获取回复
   */
  protected async executeAIRequest(
    systemPrompt: string,
    userPrompt: string,
    userContent: string,
    params: AIRequestParams,
    options?: {
      parseAsJSON?: boolean;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<{ content: string; usage?: any; jsonContent?: any }> {
    if (!this.genAI) {
      throw new Error(
        "Gemini API client not initialized. Please check your API key."
      );
    }

    // 获取模型ID
    const modelId = (params.model?.id || this.config.defaultModel) as string;

    // 合并用户输入和提示
    const combinedUserContent = [userPrompt, userContent]
      .filter(Boolean)
      .join("\n\n");

    try {
      // 使用systemPrompt作为系统指令，使用combinedUserContent作为用户输入
      const result = await this.genAI.models.generateContent({
        model: modelId,
        contents: [{ role: "user", parts: [{ text: combinedUserContent }] }],
        config: {
          systemInstruction: systemPrompt,
          temperature: options?.temperature || 0.7,
        },
      });

      const response = result.text;

      // 由于Gemini API目前不返回token使用情况，我们无法提供精确的usage数据
      const usage = {
        promptTokens: undefined,
        completionTokens: undefined,
        totalTokens: undefined,
      };

      return { content: response ?? "", usage };
    } catch (error) {
      console.error("Gemini API request failed:", error);
      throw error;
    }
  }

  /**
   * 执行AI流式请求
   * 使用Google Generative AI库发送流式请求并逐步返回结果
   */
  protected async executeAIStreamRequest(
    systemPrompt: string,
    userPrompt: string,
    userContent: string,
    params: AIRequestParams,
    options?: {
      temperature?: number;
      maxTokens?: number; // 注意: Gemini API 可能对 maxTokens 的处理方式不同或在流式中不支持
    }
  ): Promise<AsyncIterable<string>> {
    if (!this.genAI) {
      throw new Error(
        "Gemini API client not initialized. Please check your API key."
      );
    }

    const modelId = (params.model?.id || this.config.defaultModel) as string;
    const combinedUserContent = [userPrompt, userContent]
      .filter(Boolean)
      .join("\n\n");

    const processStream = async function* (
      this: GeminiAIProvider
    ): AsyncIterable<string> {
      try {
        const streamResult = await this.genAI!.models.generateContentStream({
          model: modelId,
          contents: [
            // 将 systemPrompt 作为对话历史的第一个用户部分
            // 注意: Gemini API 对 system prompt 的处理可能需要特定的 'systemInstruction' 参数，
            // 或者将其作为 'contents' 数组的第一个元素，角色可能需要调整。
            // 当前实现将其作为第一个 'user' 消息。
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "user", parts: [{ text: combinedUserContent }] },
          ],
          config: {
            // 保持 'config' 对象
            temperature: options?.temperature || 0.7,
            // maxOutputTokens: options?.maxTokens, // 如果SDK支持，可以取消注释
            // systemInstruction: { parts: [{ text: systemPrompt }], role: "system" } // 另一种可能的系统提示方式, 需确认是否在 config 内
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
                    : ""
                ) // 确保 part.text 是字符串
                .join("");
              if (text) {
                yield text;
              }
            }
          }
        }
      } catch (error) {
        console.error("Gemini API stream request failed:", error);
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
        "Gemini API client not initialized. Please check your API key."
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
      console.warn("获取模型列表失败：", this.config.providerName, error);
      return this.config.models;
    }
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
   * @returns 返回预定义的模型ID列表
   */
  async refreshModels(): Promise<string[]> {
    return Promise.resolve(this.config.models.map((m) => m.id));
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
}
