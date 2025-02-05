import * as vscode from "vscode";
import {
  getMaxCharacters,
  type AIModel,
  type AIProvider,
  type AIRequestParams,
  type AIResponse,
  type CodeReviewResult,
} from "../types";
import { generateCommitMessageSystemPrompt } from "../../prompt/prompt";
import { getCodeReviewPrompt, getSystemPrompt } from "../utils/generateHelper";
import { getWeeklyReportPrompt } from "../../prompt/weeklyReport";
import { getMessage, formatMessage } from "../../utils/i18n";
import { CodeReviewReportGenerator } from "../../utils/review/CodeReviewReportGenerator";

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
        throw new Error(getMessage("vscode.no.models.available"));
      }

      const chatModel =
        models.find((model) => model.id === params.model.id) || models[0];
      let maxCodeCharacters = getMaxCharacters(params.model, 2600) - 1000;
      let retries = 0;

      while (true) {
        const messages = [
          vscode.LanguageModelChatMessage.User(getSystemPrompt(params)),
          vscode.LanguageModelChatMessage.User(
            params.diff.substring(0, maxCodeCharacters)
          ),
        ];

        try {
          if (params.diff.length > maxCodeCharacters) {
            console.warn(getMessage("input.truncated"));
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

          throw new Error(formatMessage("vscode.generation.failed", [message]));
        }
      }
    } catch (error) {
      throw new Error(
        formatMessage("vscode.generation.failed", [
          error instanceof Error ? error.message : String(error),
        ])
      );
    }
  }

  async generateCodeReview(params: AIRequestParams): Promise<AIResponse> {
    try {
      const models = await vscode.lm.selectChatModels();
      if (!models || models.length === 0) {
        throw new Error(getMessage("vscode.no.models.available"));
      }

      const chatModel =
        models.find((model) => model.id === params.model.id) || models[0];
      let maxCodeCharacters = getMaxCharacters(params.model, 2600) - 1000;
      let retries = 0;

      while (true) {
        // 更新JSON schema格式以匹配CodeReviewIssue接口
        const systemMessage = `${getCodeReviewPrompt(params)}
IMPORTANT: You must respond with a valid JSON object following this schema:
{
  "summary": string,  // Overall review summary
  "issues": [        // Array of code review issues
    {
      "description": string,   // Issue description 
      "suggestion": string,    // Suggested fix
      "filePath": string,     // File path
      "startLine": number,    // Issue start line
      "endLine"?: number,     // Optional end line
      "severity": "NOTE" | "WARNING" | "ERROR",
      "documentation"?: string,   // Optional documentation link
      "code"?: string            // Optional code snippet
    }
  ]
}`;

        const messages = [
          vscode.LanguageModelChatMessage.User(systemMessage),
          vscode.LanguageModelChatMessage.User(
            params.diff.substring(0, maxCodeCharacters)
          ),
        ];

        try {
          if (params.diff.length > maxCodeCharacters) {
            console.warn(getMessage("input.truncated"));
          }

          const response = await chatModel.sendRequest(messages, {
            // temperature: 0.3,
          });

          let result = "";
          for await (const fragment of response.text) {
            result += fragment;
          }

          let reviewResult: CodeReviewResult;
          try {
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            const jsonContent = jsonMatch ? jsonMatch[0] : result;

            reviewResult = JSON.parse(jsonContent);
          } catch (e) {
            // 修改fallback对象结构以符合CodeReviewIssue接口
            reviewResult = {
              summary: "Code Review Summary",
              issues: [
                {
                  description: result,
                  suggestion: "Please review the generated content.",
                  filePath: "unknown",
                  startLine: 1,
                  severity: "NOTE",
                  code: result,
                },
              ],
            };
          }

          return {
            content:
              CodeReviewReportGenerator.generateMarkdownReport(reviewResult),
          };
        } catch (ex: Error | any) {
          console.log("ex", ex);

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
            formatMessage("codeReview.generation.failed", [message])
          );
        }
      }
    } catch (error) {
      throw new Error(
        formatMessage("codeReview.generation.failed", [
          error instanceof Error ? error.message : String(error),
        ])
      );
    }
  }

  async generateWeeklyReport(
    commits: string[],
    model?: AIModel
  ): Promise<AIResponse> {
    try {
      const models = await vscode.lm.selectChatModels();
      if (!models || models.length === 0) {
        throw new Error(getMessage("vscode.no.models.available"));
      }

      const chatModel = model
        ? models.find((m) => m.id === model.id) || models[0]
        : models[0];

      const messages = [
        vscode.LanguageModelChatMessage.User(getWeeklyReportPrompt()),
        vscode.LanguageModelChatMessage.User(commits.join("\n")),
      ];

      const response = await chatModel.sendRequest(messages);

      let result = "";
      for await (const fragment of response.text) {
        result += fragment;
      }

      return { content: result.trim() };
    } catch (error) {
      throw new Error(
        formatMessage("weeklyReport.generation.failed", [
          error instanceof Error ? error.message : String(error),
        ])
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
