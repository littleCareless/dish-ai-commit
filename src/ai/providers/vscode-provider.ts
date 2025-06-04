import * as vscode from "vscode";
import {
  getMaxCharacters,
  type AIModel,
  type AIRequestParams,
  type AIResponse,
} from "../types";
import { AbstractAIProvider } from "./abstract-ai-provider";
import { getMessage } from "../../utils/i18n";

export class VSCodeProvider extends AbstractAIProvider {
  private readonly provider = {
    id: "vscode",
    name: "VS Code Provided",
  } as const;

  constructor() {
    super();
  }

  /**
   * 实现抽象方法：执行AI请求
   * 使用VS Code Language Model API执行请求
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
    const models = await vscode.lm.selectChatModels();
    if (!models || models.length === 0) {
      throw new Error(getMessage("vscode.no.models.available"));
    }

    const chatModel =
      models.find((model) => model.id === params.model?.id) || models[0];

    // let maxCodeCharacters =
    //   options?.maxTokens ||
    //   getMaxCharacters(params.model ?? this.getDefaultModel(), 2600) - 1000;

    // let retries = 0;

    // while (true) {
    const messages = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(userContent),
      vscode.LanguageModelChatMessage.User(userPrompt ?? ""),
    ];

    // try {
    // if (userContent.length > maxCodeCharacters) {
    //   console.warn(getMessage("input.truncated"));
    // }

    const response = await chatModel.sendRequest(messages, {
      modelOptions: {
        // VSCode API中如果支持temperature参数
        temperature: options?.temperature,
      },
    });

    let result = "";
    for await (const fragment of response.text) {
      result += fragment;
    }

    let jsonContent;
    if (options?.parseAsJSON) {
      try {
        // 尝试解析为JSON
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        jsonContent = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result);
      } catch (e) {
        console.warn("Failed to parse response as JSON", e);
      }
    }

    return { content: result.trim(), jsonContent };

    // } catch (ex: any) {
    //   let message = ex instanceof Error ? ex.message : String(ex);

    //   if (
    //     ex instanceof Error &&
    //     "cause" in ex &&
    //     ex.cause instanceof Error &&
    //     retries++ < 2 &&
    //     ex.cause.message.includes("exceeds token limit")
    //   ) {
    //     maxCodeCharacters -= 500 * retries;
    //     continue;
    //   }

    //   throw ex;
    // }
    // }
  }

  /**
   * 实现抽象方法：执行AI流式请求
   * 使用VS Code Language Model API执行请求并流式返回结果
   */
  protected async executeAIStreamRequest(
    systemPrompt: string,
    userPrompt: string,
    userContent: string,
    params: AIRequestParams,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<AsyncIterable<string>> {
    const models = await vscode.lm.selectChatModels();
    if (!models || models.length === 0) {
      throw new Error(getMessage("vscode.no.models.available"));
    }

    const chatModel =
      models.find((model) => model.id === params.model?.id) || models[0];

    const messages = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(userContent),
      vscode.LanguageModelChatMessage.User(userPrompt ?? ""),
    ];

    const response = await chatModel.sendRequest(messages, {
      modelOptions: {
        temperature: options?.temperature,
        // maxTokens: options?.maxTokens, // VSCode API 当前版本似乎不直接支持 maxTokens 在 modelOptions 中
      },
    });

    return response.text;
  }

  /**
   * 获取默认模型
   */
  protected getDefaultModel(): AIModel {
    // 改为同步方法，直接返回默认模型配置
    return {
      id: "gpt-4o" as any,
      name: "gpt-4o",
      maxTokens: { input: 4096, output: 4096 },
      provider: this.provider,
    };
  }

  async refreshModels(): Promise<string[]> {
    // VSCode的模型是动态的，不需要刷新
    return Promise.resolve([]);
  }

  async getModels(): Promise<AIModel[]> {
    try {
      const models = await vscode.lm.selectChatModels();
      if (models.length > 0) {
        return Promise.resolve(
          models.map((model) => ({
            id: model.id as any,
            name: `${model.name}`,
            maxTokens: {
              input: model.maxInputTokens || 81638,
              output: model.maxInputTokens || 81638,
            },
            provider: this.provider,
          }))
        );
      } else {
        return Promise.resolve([]);
        // NO chat models available
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      return true;
    } catch {
      return false;
    }
  }

  getName(): string {
    return this.provider.name;
  }

  getId(): string {
    return this.provider.id;
  }

  dispose() {}
}
