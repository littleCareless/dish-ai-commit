import {
  AIProvider,
  AIRequestParams,
  AIResponse,
  AIModel,
  LayeredCommitMessage,
  ContextLengthExceededError,
} from "../types";
import {
  getSystemPrompt,
  getCodeReviewPrompt,
  getBranchNameSystemPrompt,
  getBranchNameUserPrompt,
  getGlobalSummaryPrompt,
  getFileDescriptionPrompt,
  extractModifiedFilePaths,
  generateWithRetry,
} from "../utils/generate-helper";
import { getWeeklyReportPrompt } from "../../prompt/weekly-report";
import { getCommitMessageTools } from "../../prompt/generate-commit";
import { formatMessage } from "../../utils/i18n/localization-manager";
import { ConfigurationManager } from "../../config/configuration-manager";

/**
 * AI提供者的抽象基类
 * 使用模板方法模式实现通用逻辑，具体提供者只需实现特定方法
 */
export abstract class AbstractAIProvider implements AIProvider {
  /**
   * 生成提交信息
   * @param params - AI请求参数
   * @returns 提交信息生成结果
   */
  async generateCommit(params: AIRequestParams): Promise<AIResponse> {
    try {
      if (!params.messages) {
        const systemPrompt = getSystemPrompt(params);
        params.messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: params.diff },
        ];
      }

      const result = await this.executeAIRequest(params, {
        temperature: 0.3, // 提交信息推荐温度值 0.3
      });
      return result;
    } catch (error) {
      throw new Error(
        formatMessage("generation.failed", [
          error instanceof Error ? error.message : String(error),
        ])
      );
    }
  }
  /**
   * 生成提交信息 (流式)
   * @param params - AI请求参数
   * @returns 一个Promise，解析为一个异步迭代器，用于逐块生成提交信息
   * @remarks 此方法为新增，AIProvider接口也需要相应更新
   */
  async generateCommitStream(
    params: AIRequestParams
  ): Promise<AsyncIterable<string>> {
    try {
      if (!params.messages) {
        const systemPrompt = getSystemPrompt(params);
        params.messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: params.diff },
        ];
      }

      return this.executeAIStreamRequest(params, {
        temperature: 0.3, // 提交信息推荐温度值 0.3
      });
    } catch (error) {
      // 错误现在由 executeStreamWithRetry 内部处理和抛出
      // 这里只捕获最终的、不可重试的错误
      console.log("error", error);
      throw new Error(
        formatMessage("generation.failed", [
          error instanceof Error ? error.message : String(error),
        ])
      );
    }
  }

  async generateCommitWithFunctionCalling(
    params: AIRequestParams
  ): Promise<AIResponse> {
    try {
      if (!params.messages) {
        const systemPrompt = getSystemPrompt(params);
        params.messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: params.diff },
        ];
      }
      const config = ConfigurationManager.getInstance().getConfiguration();
      const tools = getCommitMessageTools(config);

      const result = await this.executeAIRequest(params, {
        temperature: 0.3,
        tools: tools,
      });

      if (result.tool_calls && result.tool_calls.length > 0) {
        const toolCall = result.tool_calls[0];
        if (toolCall.function.name === "generate_commit_message") {
          const args = JSON.parse(toolCall.function.arguments);
          const { enableBody, enableEmoji } = config.features.commitFormat;
          const scope = args.scope ? `(${args.scope})` : "";
          const emoji = enableEmoji && args.emoji ? `${args.emoji} ` : "";
          const body = enableBody && args.body ? `\n\n${args.body}` : "";
          const commitMessage = `${emoji}${args.type}${scope}: ${args.subject}${body}`;
          return {
            content: commitMessage,
            usage: result.usage,
          };
        }
      }

      // Fallback to content if no function call was made
      if (result.content) {
        return result;
      }

      throw new Error(
        "Failed to generate commit message with function calling."
      );
    } catch (error) {
      throw new Error(
        formatMessage("generation.failed", [
          error instanceof Error ? error.message : String(error),
        ])
      );
    }
  }

  /**
   * 生成代码评审报告
   * @param params - AI请求参数
   * @returns 包含评审报告的Promise
   */
  async generateCodeReview(params: AIRequestParams): Promise<AIResponse> {
    try {
      if (!params.messages) {
        const systemPrompt = getCodeReviewPrompt(params);
        params.messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: params.diff },
        ];
      }
      const result = await this.executeAIRequest(params, {
        // parseAsJSON: true,
        temperature: 0.6, // 代码审查推荐温度值 0.6，范围 0.5-0.6
      });

      if (result.content) {
        return {
          // content: CodeReviewReportGenerator.generateMarkdownReport(
          //   result.jsonContent as CodeReviewResult
          // ),
          content: result.content,
          usage: result.usage,
        };
      } else {
        throw new Error("Failed to parse code review result as JSON");
      }
    } catch (error) {
      throw new Error(
        formatMessage("codeReview.generation.failed", [
          error instanceof Error ? error.message : String(error),
        ])
      );
    }
  }

  /**
   * 生成分支名称
   * @param params - AI请求参数
   * @returns 分支名称生成结果
   */
  async generateBranchName(params: AIRequestParams): Promise<AIResponse> {
    try {
      if (!params.messages) {
        const systemPrompt = getBranchNameSystemPrompt(params);
        const userPrompt = getBranchNameUserPrompt(params.diff);
        params.messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
          { role: "user", content: params.diff },
        ];
      }
      const result = await this.executeAIRequest(params, {
        temperature: 0.4, // 分支命名推荐温度值 0.4
      });
      return result;
    } catch (error) {
      throw new Error(
        formatMessage("branchName.generation.failed", [
          error instanceof Error ? error.message : String(error),
        ])
      );
    }
  }

  /**
   * 生成周报
   * @param commits - 提交记录数组
   * @param model - 可选的指定模型
   * @returns 周报内容和统计信息
   */
  async generateWeeklyReport(
    commits: string[],
    period: {
      startDate: string;
      endDate: string;
    },
    model?: AIModel,
    users?: string[] // 新增可选的 users 参数
  ): Promise<AIResponse> {
    try {
      let systemPrompt = getWeeklyReportPrompt(period);
      if (users && users.length > 0) {
        // 如果有用户信息，可以附加到 systemPrompt 或 userContent
        // 例如，附加到 systemPrompt
        systemPrompt += `\nThis weekly report is for the team members: ${users.join(
          ", "
        )}. Please summarize their collective work.`;
        // 或者，如果希望AI更关注每个人的贡献，可以在userContent中对commits按用户分组或标记
      }

      const userContent = commits.join("\n\n---\n\n"); // 使用更明显的分隔符
      const params: AIRequestParams = {
        diff: userContent, // diff 字段现在承载的是 commit messages
        model: model || this.getDefaultModel(),
        additionalContext: users ? `Team members: ${users.join(", ")}` : "", // 可以用 additionalContext
      };
      const result = await this.executeAIRequest(
        {
          ...params,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
        },
        {
          temperature: 0.3, // 周报生成推荐温度值 0.3
        }
      );
      return result;
    } catch (error) {
      throw new Error(
        formatMessage("weeklyReport.generation.failed", [
          error instanceof Error ? error.message : String(error),
        ])
      );
    }
  }

  /**
   * 生成分层提交信息
   * @param params - AI请求参数
   * @returns 包含全局摘要和文件描述的分层提交信息
   */
  async generateLayeredCommit(
    params: AIRequestParams
  ): Promise<LayeredCommitMessage> {
    try {
      const modifiedFiles = extractModifiedFilePaths(params.diff);

      // 步骤1: 生成全局摘要
      const summarySystemPrompt = getGlobalSummaryPrompt(params);
      const summaryResult = await this.executeAIRequest(
        {
          ...params,
          messages: [
            { role: "system", content: summarySystemPrompt },
            { role: "user", content: params.diff },
          ],
        },
        {
          temperature: 0.3, // 与提交信息一致使用 0.3
        }
      );
      const summary = summaryResult.content;

      // 步骤2: 为每个文件生成描述
      const fileChanges = [];
      for (const filePath of modifiedFiles) {
        // 从diff中提取特定文件的变更
        const filePattern = new RegExp(
          `diff --git a/${filePath.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )}.*?(?=diff --git|$)`,
          "gs"
        );
        const fileDiff = params.diff.match(filePattern)?.[0] || "";

        if (fileDiff) {
          const fileSystemPrompt = getFileDescriptionPrompt(params, filePath);
          const fileResult = await this.executeAIRequest(
            {
              ...params,
              messages: [
                { role: "system", content: fileSystemPrompt },
                { role: "user", content: fileDiff },
              ],
            },
            {
              temperature: 0.3, // 文件描述也使用提交信息的温度值 0.3
            }
          );

          fileChanges.push({
            filePath,
            description: fileResult.content,
          });
        }
      }

      return { summary, fileChanges };
    } catch (error) {
      throw new Error(
        formatMessage("layeredCommit.generation.failed", [
          error instanceof Error ? error.message : String(error),
        ])
      );
    }
  }

  /**
   * 需要由具体提供者实现的核心方法
   * 执行AI请求并返回结果
   *
   * @param params - 请求参数
   * @param options - 额外选项
   * @returns Promise<{content: string, usage?: any, jsonContent?: any}>
   */
  protected abstract executeAIRequest(
    params: AIRequestParams,
    options?: {
      parseAsJSON?: boolean;
      temperature?: number;
      maxTokens?: number;
      tools?: any[];
    }
  ): Promise<{
    content: string;
    usage?: any;
    jsonContent?: any;
    tool_calls?: any[];
  }>;

  /**
   * 构建特定于提供商的消息结构。
   * @param params - AI请求参数
   * @returns 适合提供商API的消息结构
   */
  protected abstract buildProviderMessages(params: AIRequestParams): any;

  /**
   * 需要由具体提供者实现的核心流式方法。
   * 执行AI流式请求并返回一个异步迭代器。
   * 实现类应从此方法内部的 `params` 对象中获取或生成 `systemPrompt`, `userPrompt`, 和 `userContent`。
   * - `systemPrompt` 通常通过调用 `getSystemPrompt(params)` 生成。
   * - `userPrompt` 通常取自 `params.additionalContext` (如果存在)，否则为空字符串。
   * - `userContent` 通常取自 `params.diff`。
   *
   * @param params - AI请求参数，包含构建提示所需的所有信息及模型配置。
   * @param options - 额外选项，如 `temperature` 和 `maxTokens`。
   * @returns 一个Promise，解析为一个异步迭代器，用于逐块生成内容。
   */
  protected abstract executeAIStreamRequest(
    params: AIRequestParams,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<AsyncIterable<string>>;

  /**
   * 获取默认模型
   * 由子类实现
   */
  protected abstract getDefaultModel(): AIModel;

  // 以下方法来自AIProvider接口，需要由具体提供者实现
  abstract getModels(): Promise<AIModel[]>;

  /**
   * 获取支持的嵌入式模型列表
   * 默认返回空数组，具体提供者可以覆盖此方法
   * @returns 嵌入式模型列表
   */
  async getEmbeddingModels(): Promise<AIModel[]> {
    return Promise.resolve([]);
  }

  abstract refreshModels(): Promise<string[]>;
  abstract isAvailable(): Promise<boolean>;
  abstract getName(): string;
  abstract getId(): string;

  /**
   * 计算文本的token数量。
   * 这是一个可选方法，如果提供者支持，则应覆盖此方法。
   * @param params - AI请求参数
   * @returns 一个Promise，解析为包含token总数的对象
   */
  async countTokens(params: AIRequestParams): Promise<{ totalTokens: number }> {
    // 动态导入以避免循环依赖
    const { tokenizerService } = await import("../../utils/tokenizer");
    const model = params.model || this.getDefaultModel();

    if (!params.messages || params.messages.length === 0) {
      console.warn(
        `countTokens called with no messages for ${this.getName()}.`
      );
      return { totalTokens: 0 };
    }

    const totalTokens = params.messages.reduce((acc, message) => {
      const content =
        typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content);
      return acc + tokenizerService.countTokens(content, model);
    }, 0);

    return { totalTokens };
  }

  /**
   * 检查并处理上下文长度超出的错误。
   * 如果错误信息匹配已知的上下文超长模式，则抛出统一的 `ContextLengthExceededError`。
   * @param error - 捕获到的原始错误对象。
   * @param modelId - 当前使用的模型ID，用于提供更详细的错误信息。
   * @throws {ContextLengthExceededError} - 如果确认为上下文超长错误。
   * @throws {Error} - 如果是其他类型的错误，则重新抛出原始错误。
   */
  protected handleContextLengthError(error: any, modelId: string): void {
    const errorMessage = (error.message || "").toLowerCase();
    const isContextLengthError =
      errorMessage.includes("maximum context length") ||
      errorMessage.includes("context length exceeded") ||
      errorMessage.includes("exceeds token limit") ||
      errorMessage.includes("is too large") || // OpenAI new error
      errorMessage.includes("input is too long"); // Anthropic error

    if (isContextLengthError) {
      throw new ContextLengthExceededError(
        `The context for model ${modelId} is too long. Original error: ${error.message}`
      );
    }

    throw error;
  }
}
