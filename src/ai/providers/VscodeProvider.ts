import * as vscode from "vscode";
import type { AIProvider, AIRequestParams, AIResponse } from "../types";
import { generateCommitMessageSystemPrompt } from "../../prompt/prompt";
import { DEFAULT_CONFIG } from "../../config/default";

export class VSCodeProvider implements AIProvider {
  private readonly provider = {
    id: "vscode",
    name: "VS Code Provided",
  } as const;
  constructor() {}

  async generateResponse(params: AIRequestParams): Promise<AIResponse> {
    try {
      // 使用VSCode的语言模型API
      const models = await vscode.lm.selectChatModels();
      if (!models || models.length === 0) {
        throw new Error("未找到可用的VSCode语言模型");
      }

      const chatModel = models[0];
      const messages = [
        vscode.LanguageModelChatMessage.User(
          params.systemPrompt ||
            generateCommitMessageSystemPrompt(
              params.language || DEFAULT_CONFIG.language
            )
        ),
        vscode.LanguageModelChatMessage.User(params.prompt),
      ];

      // 发送请求
      const response = await chatModel.sendRequest(messages);

      let result = "";
      for await (const fragment of response.text) {
        result += fragment;
      }

      return { content: result.trim() };
    } catch (error) {
      throw new Error(
        `VSCode AI生成失败: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async refreshModels(): Promise<any> {
    // VSCode的模型是动态的，不需要刷新
    return Promise.resolve();
  }

  async getModels(): Promise<string[]> {
    const models = await vscode.lm.selectChatModels();
    // name: `${capitalize(model.vendor)} ${model.name}`,
    return models.map((model) => `${model.family}`);
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
