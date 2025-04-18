import { ConfigurationManager } from "../../config/configuration-manager";
import { AIModel, AIRequestParams } from "../types";
import { AbstractAIProvider } from "./abstract-ai-provider";
import { GenerationConfig, GoogleGenAI } from "@google/genai";

/**
 * Gemini支持的AI模型配置列表
 * 定义了不同版本的Gemini模型及其特性
 */
const geminiModels: AIModel[] = [
  {
    id: "gemini-2.5-flash-preview",
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
    id: "gemini-2.5-pro-preview",
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
  private apiKey: string;
  private models: AIModel[];
  private defaultModelId: string;

  /**
   * 创建Gemini AI提供者实例
   * 从配置管理器获取API密钥，初始化Google Generative AI
   */
  constructor() {
    super();
    const configManager = ConfigurationManager.getInstance();
    this.apiKey = configManager.getConfig("PROVIDERS_GEMINI_APIKEY");
    this.models = geminiModels;
    this.defaultModelId = "gemini-1.5-flash";

    if (this.apiKey) {
      this.genAI = new GoogleGenAI({
        apiKey: this.apiKey,
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
    const modelId = (params.model?.id || this.defaultModelId) as string;

    // 创建生成配置
    const generationConfig: GenerationConfig = {
      temperature: options?.temperature || 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: options?.maxTokens || 8000,
    };

    // 创建模型实例
    // const model = this.genAI.getGenerativeModel({
    //   model: modelId,
    //   generationConfig,
    // });

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
   * 获取默认模型
   */
  protected getDefaultModel(): AIModel {
    const defaultModel = this.models.find((m) => m.default) || this.models[0];
    return defaultModel;
  }

  /**
   * 获取当前支持的AI模型列表
   */
  async getModels(): Promise<AIModel[]> {
    return Promise.resolve(this.models);
  }

  /**
   * 检查Gemini服务是否可用
   * @returns 如果API密钥已配置返回true
   */
  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  /**
   * 刷新可用的Gemini模型列表
   * @returns 返回预定义的模型ID列表
   */
  async refreshModels(): Promise<string[]> {
    return Promise.resolve(this.models.map((m) => m.id));
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
