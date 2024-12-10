import * as vscode from "vscode";
import {
  getMaxCharacters,
  type AIModel,
  type AIProvider,
  type AIRequestParams,
  type AIResponse,
} from "../types";
import { generateCommitMessageSystemPrompt } from "../../prompt/prompt";
import { DEFAULT_CONFIG } from "../../config/default";
import { LocalizationManager } from "../../utils/LocalizationManager";

interface DiffBlock {
  header: string;
  fileName: string;
  content: string;
  stats: {
    additions: number;
    deletions: number;
  };
  type: "modified" | "added" | "deleted" | "renamed" | "unknown";
  oldPath?: string;
  newPath?: string;
}

export class VSCodeProvider implements AIProvider {
  private readonly provider = {
    id: "vscode",
    name: "VS Code Provided",
  } as const;
  constructor() {}

  async generateResponse(params: AIRequestParams): Promise<AIResponse> {
    try {
      const models = await vscode.lm.selectChatModels();
      if (!models || models.length === 0) {
        throw new Error(
          LocalizationManager.getInstance().getMessage(
            "vscode.no.models.available"
          )
        );
      }

      const chatModel =
        models.find((model) => model.id === params.model.id) || models[0];
      let maxCodeCharacters = getMaxCharacters(params.model, 2600) - 1000;
      let retries = 0;

      while (true) {
        const messages = [
          vscode.LanguageModelChatMessage.User(
            params.systemPrompt ||
              generateCommitMessageSystemPrompt(
                params.language || DEFAULT_CONFIG.language,
                params.allowMergeCommits || false,
                params.splitChangesInSingleFile || false,
                params.scm || "git"
              )
          ),
          vscode.LanguageModelChatMessage.User(
            params.diff.substring(0, maxCodeCharacters)
          ),
        ];
        console.log("messages", messages);

        try {
          if (params.diff.length > maxCodeCharacters) {
            console.warn(
              LocalizationManager.getInstance().getMessage("input.truncated")
            );
          }

          const response = await chatModel.sendRequest(messages);

          let result = "";
          for await (const fragment of response.text) {
            result += fragment;
          }

          return { content: result.trim() };
        } catch (ex: Error | any) {
          let message = ex instanceof Error ? ex.message : String(ex);

          if (
            ex instanceof Error &&
            "cause" in ex &&
            ex.cause instanceof Error
          ) {
            message += `\n${ex.cause.message}`;

            if (
              retries++ < 2 &&
              ex.cause.message.includes("exceeds token limit")
            ) {
              maxCodeCharacters -= 500 * retries;
              continue;
            }
          }

          throw new Error(
            LocalizationManager.getInstance().format(
              "vscode.generation.failed",
              message
            )
          );
        }
      }
    } catch (error) {
      throw new Error(
        LocalizationManager.getInstance().format(
          "vscode.generation.failed",
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  async refreshModels(): Promise<any> {
    // VSCode的模型是动态的，不需要刷新
    return Promise.resolve();
  }

  async getModels(): Promise<AIModel[]> {
    try {
      const models = await vscode.lm.selectChatModels();
      console.log("model", models);
      if (models.length > 0) {
        return Promise.resolve(
          models.map((model) => ({
            id: model.id as any,
            name: `${model.name}`,
            maxTokens: {
              input: model.maxInputTokens || 4096,
              output: model.maxInputTokens || 4096,
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
