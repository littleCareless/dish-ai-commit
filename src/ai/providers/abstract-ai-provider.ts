import {
  AIProvider,
  AIRequestParams,
  AIResponse,
  AIModel,
  LayeredCommitMessage,
  CodeReviewResult,
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
import { addSimilarCodeContext } from "../utils/embedding-helper";
import { getWeeklyReportPrompt } from "../../prompt/weekly-report";
import { getCommitMessageTools } from "../../prompt/generate-commit";
import { CodeReviewReportGenerator } from "../../services/code-review-report-generator";
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
      const systemPrompt = getSystemPrompt(params);
      const result = await this.executeWithRetry(
        systemPrompt,
        "",
        params.diff,
        params,
        {
          temperature: 0.3, // 提交信息推荐温度值 0.3
        }
      );
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
      // 注意：流式请求的重试逻辑可能与非流式请求不同。
      // 这里直接调用 executeAIStreamRequest，具体的重试和错误处理
      // 应该在 executeAIStreamRequest 的实现中或专门的流式重试辅助函数中处理。
      // systemPrompt, userPrompt, userContent 将由 executeAIStreamRequest 的实现
      // 从 params 中获取或计算。
      return this.executeAIStreamRequest(params, {
        temperature: 0.3, // 提交信息推荐温度值 0.3
        // maxTokens 可以在这里设置，如果需要的话
      });
    } catch (error) {
      // 流的错误可能在迭代过程中发生，这里的 catch 可能只捕获初始设置错误
      // 需要在调用方迭代流时也处理错误
      throw new Error(
        formatMessage("generation.failed", [
          // 或者一个新的i18n key如 "streamGeneration.failed"
          error instanceof Error ? error.message : String(error),
        ])
      );
    }
  }

  async generateCommitWithFunctionCalling(
    params: AIRequestParams
  ): Promise<AIResponse> {
    try {
      const systemPrompt = getSystemPrompt(params);
      const config = ConfigurationManager.getInstance().getConfiguration();
      const tools = getCommitMessageTools(config);

      const result = await this.executeWithRetry(
        systemPrompt,
        "",
        params.diff,
        params,
        {
          temperature: 0.3,
          tools: tools,
        }
      );

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

      throw new Error("Failed to generate commit message with function calling.");
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
      const systemPrompt = getCodeReviewPrompt(params);
      const result = await this.executeWithRetry(
        systemPrompt,
        "",
        params.diff,
        params,
        {
          // parseAsJSON: true,
          temperature: 0.6, // 代码审查推荐温度值 0.6，范围 0.5-0.6
        }
      );

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
      const systemPrompt = getBranchNameSystemPrompt(params);
      const userPrompt = getBranchNameUserPrompt(params.diff);
      const result = await this.executeWithRetry(
        systemPrompt,
        userPrompt,
        params.diff,
        params,
        {
          temperature: 0.4, // 分支命名推荐温度值 0.4
        }
      );
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
      const result = await this.executeWithRetry(
        systemPrompt,
        "", // userPrompt 通常用于更具体的指令，这里暂时为空
        userContent,
        params,
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
      const summaryResult = await this.executeWithRetry(
        summarySystemPrompt,
        "",
        params.diff,
        params,
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
          const fileResult = await this.executeWithRetry(
            fileSystemPrompt,
            "",
            fileDiff,
            params,
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
   * 使用重试机制执行AI请求
   *
   * @param systemPrompt - 系统提示内容
   * @param userContent - 用户内容
   * @param params - 请求参数
   * @param options - 额外选项
   * @returns Promise<{content: string, usage?: any, jsonContent?: any}>
   */
  protected async executeWithRetry(
    systemPrompt: string,
    userPrompt: string,
    userContent: string,
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
  }> {
    return generateWithRetry(
      params,
      async (truncatedInput) => {
        return this.executeAIRequest(
          systemPrompt,
          userPrompt || "",
          truncatedInput,
          params,
          options
        );
      },
      {
        initialMaxLength: params.model?.maxTokens?.input || 16385,
        provider: this.getId(),
      }
    );
  }

  /**
   * 需要由具体提供者实现的核心方法
   * 执行AI请求并返回结果
   *
   * @param systemPrompt - 系统提示内容
   * @param userContent - 用户内容
   * @param params - 请求参数
   * @param options - 额外选项
   * @returns Promise<{content: string, usage?: any, jsonContent?: any}>
   */
  protected abstract executeAIRequest(
    systemPrompt: string,
    userPrompt: string,
    userContent: string,
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
  abstract refreshModels(): Promise<string[]>;
  abstract isAvailable(): Promise<boolean>;
  abstract getName(): string;
  abstract getId(): string;
}
