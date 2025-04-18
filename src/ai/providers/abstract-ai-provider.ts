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
import { getWeeklyReportPrompt } from "../../prompt/weekly-report";
import { CodeReviewReportGenerator } from "../../services/code-review-report-generator";
import { formatMessage } from "../../utils/i18n/localization-manager";

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
      console.log("params", params);
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
    model?: AIModel
  ): Promise<AIResponse> {
    try {
      const systemPrompt = getWeeklyReportPrompt(period);
      const userContent = commits.join("\n");
      const params: AIRequestParams = {
        diff: userContent,
        model: model || this.getDefaultModel(),
        additionalContext: "", // 添加缺失的必需属性
      };
      const result = await this.executeWithRetry(
        systemPrompt,
        "",
        userContent,
        params,
        {
          temperature: 0.7, // 周报生成推荐温度值 0.7
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
    }
  ): Promise<{ content: string; usage?: any; jsonContent?: any }> {
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
    }
  ): Promise<{ content: string; usage?: any; jsonContent?: any }>;

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
