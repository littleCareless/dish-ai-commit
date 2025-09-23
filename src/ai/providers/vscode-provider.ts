import * as vscode from "vscode";
import {
  type AIModel,
  type AIProviders,
  type AIRequestParams,
  type AIResponse,
  type ModelNames,
} from "../types";
import { AbstractAIProvider } from "./abstract-ai-provider";
import { getMessage } from "../../utils/i18n";
import {
  getPRSummarySystemPrompt,
  getPRSummaryUserPrompt,
} from "../../prompt/pr-summary";
import { getSystemPrompt } from "../utils/generate-helper"; // Import getSystemPrompt

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
    const messages = (await this.buildProviderMessages(
      params
    )) as vscode.LanguageModelChatMessage[];

    console.log("Final messages for AI:", JSON.stringify(messages, null, 2));

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

    return { content: result?.trim(), jsonContent };

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

    const messages = (await this.buildProviderMessages(
      params
    )) as vscode.LanguageModelChatMessage[];

    console.log("Final messages for AI:", JSON.stringify(messages, null, 2));

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

  async getModels(): Promise<AIModel<AIProviders, ModelNames>[]> {
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

  /**
   * 生成PR摘要
   * @param params AI请求参数
   * @param commitMessages 提交信息列表
   * @returns AI响应
   */
  async generatePRSummary(
    params: AIRequestParams,
    commitMessages: string[]
  ): Promise<AIResponse> {
    const systemPrompt =
      params.systemPrompt || getPRSummarySystemPrompt(params.language);
    const userPrompt = getPRSummaryUserPrompt(params.language);
    const userContent = `- ${commitMessages.join("\n- ")}`;

    const response = await this.executeAIRequest(
      {
        ...params,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
          { role: "user", content: userPrompt },
        ],
      },
      {
        temperature: 0.7,
      }
    );

    // The `usage` property from `executeAIRequest` in VSCodeProvider is currently undefined.
    // If usage data becomes available from the VSCode LM API and is populated in `executeAIRequest`,
    // it will be correctly passed through here.
    return { content: response.content, usage: response.usage };
  }
  /**
   * 构建VS Code特定的消息数组。
   * @param params AI请求参数
   * @returns 转换后的vscode.LanguageModelChatMessage数组
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

    return params.messages.map((message) => {
      // VSCode LM API目前主要区分User和System/Assistant
      // 我们将 system 和 assistant 都映射为 User，因为API当前只接受User和Assistant
      // 且System角色的行为可能不符合预期。
      // 实际使用中，system prompt的内容通常作为第一个User消息传递。
      switch (message.role) {
        case "system":
          // return new vscode.LanguageModelChatMessage(message.content, "system");
          // 当前版本的API似乎更倾向于将所有内容都作为User消息
          return vscode.LanguageModelChatMessage.User(message.content);
        case "assistant":
          return vscode.LanguageModelChatMessage.Assistant(message.content);
        case "user":
        default:
          return vscode.LanguageModelChatMessage.User(message.content);
      }
    });
  }
}
