import {
  AIModel,
  AIProvider,
  AIRequestParams,
  AIResponse,
  ContextLengthExceededError,
  LayeredCommitMessage,
} from "@/ai/types";
import {
  extractModifiedFilePaths,
  generateWithRetry,
  getBranchNameSystemPrompt,
  getBranchNameUserPrompt,
  getCodeReviewPrompt,
  getFileDescriptionPrompt,
  getGlobalSummaryPrompt,
  getPRSummaryPrompt,
  getSystemPrompt,
  getWeeklyReportPrompt,
} from "@/ai/utils/generate-helper";
import { getCommitMessageTools } from "@/prompt/generate-commit";
import { PromptManagerService } from "@/services/core/prompt-manager-service";
import { TokenStatsService } from "@/services/core/token-stats-service";
import { PreferencesSettingsManager } from "@/services/settings/preferences-settings-manager";
import { PromptKey, PromptCategory } from "@shared/types/prompts";
import { formatMessage } from "@/utils/i18n/localization-manager";
import { Logger } from "@/utils/logger";
import { tokenizerService } from "@/utils/tokenizer";

/**
 * AI调用时的提示词信息接口
 */
interface PromptLogInfo {
  /** 提示词标识 */
  promptKey: PromptKey;
  /** 提示词分类 */
  promptCategory?: PromptCategory;
  /** 提示词内容（截断后） */
  promptContent: string;
  /** 提示词来源 */
  promptSource?: string;
}

/**
 * 功能到提示词键的映射
 */
const PROMPT_KEY_MAP: Record<string, PromptKey> = {
  'commit': PromptKey.GenerateCommitSystem,
  'commit-stream': PromptKey.GenerateCommitSystem,
  'commit-function-calling': PromptKey.GenerateCommitSystem,
  'code-review': PromptKey.CodeReviewSystem,
  'branch-name': PromptKey.BranchNameSystem,
  'weekly-report': PromptKey.WeeklyReport,
  'layered-commit': PromptKey.LayeredCommitFile,
  'pr-summary': PromptKey.PRSummarySystem,
};

/**
 * AI提供者的抽象基类
 * 使用模板方法模式实现通用逻辑，具体提供者只需实现特定方法
 */
export abstract class AbstractAIProvider implements AIProvider {
  protected logger: Logger;
  protected config: any;
  protected globalConfig: any = {};

  constructor() {
    this.logger = Logger.getInstance("Dish AI Commit Gen");
  }

  public setGlobalConfig(config: any): void {
    // 保存全局配置到单独的属性
    this.globalConfig = config;
    // 合并配置，而不是覆盖，保留构造函数设置的重要属性（如 baseUrl）
    if (this.config) {
      this.config = { ...this.config, ...config };
    } else {
      this.config = config;
    }
  }

  /**
   * 生成提交信息
   * @param params - AI请求参数
   * @returns 提交信息生成结果
   */
  async generateCommit(params: AIRequestParams): Promise<AIResponse> {
    this.logger.info(`Generating commit with provider: ${this.getId()}`);
    try {
      if (!params.messages) {
        const systemPrompt = await getSystemPrompt(
          params,
          false,
          false,
          this.globalConfig
        );
        params.messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: params.diff },
        ];
      }

      // 记录提示词使用日志
      const preferences =
        this.globalConfig.preferences ||
        PreferencesSettingsManager.getInstance().getSettings();

      await this.logPromptUsage("commit", params, {
        temperature: preferences.commitTemperature,
        diffLength: params.diff.length,
        messageCount: params.messages?.length,
      });

      const result = await this.executeAIRequest(params, {
        temperature: preferences.commitTemperature,
      });

      await this.recordTokenUsage(result, params);

      return result;
    } catch (error) {
      this.logger.logError(
        error as Error,
        formatMessage("generation.failed", [
          error instanceof Error ? error.message : String(error),
        ])
      );
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
    this.logger.info(`Generating commit stream with provider: ${this.getId()}`);
    console.log("[AbstractAIProvider] generateCommitStream - params:", {
      feature: params.feature,
      hasModel: !!params.model,
      hasMessages: Array.isArray(params.messages),
      messageCount: params.messages?.length,
    });
    try {
      if (!params.messages) {
        const systemPrompt = await getSystemPrompt(
          params,
          false,
          false,
          this.globalConfig
        );
        params.messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: params.diff },
        ];
      }

      const preferences =
        this.globalConfig.preferences ||
        PreferencesSettingsManager.getInstance().getSettings();

      // 记录提示词使用日志（流式）
      await this.logPromptUsage("commit-stream", params, {
        temperature: preferences.commitTemperature,
        diffLength: params.diff.length,
        messageCount: params.messages?.length,
        isStreaming: true,
      });

      const stream = await this.executeAIStreamRequest(params, {
        temperature: preferences.commitTemperature,
      });

      const self = this;
      // 确保 params.model 存在，用于后续的 token 统计
      if (!params.model) {
        params.model = this.getDefaultModel();
      }
      const model = params.model;
      let fullContent = "";

      async function* wrappedStream() {
        for await (const chunk of stream) {
          fullContent += chunk;
          yield chunk;
        }

        // Stream finished, count tokens
        try {
          const promptTokens = tokenizerService.countTokens(
            JSON.stringify(params.messages),
            model
          );
          const completionTokens = tokenizerService.countTokens(
            fullContent,
            model
          );
          const totalTokens = promptTokens + completionTokens;

          await self.recordTokenUsage(
            {
              content: fullContent,
              usage: {
                promptTokens,
                completionTokens,
                totalTokens,
              },
            },
            params
          );
        } catch (e) {
          console.warn("Failed to record token usage for stream:", e);
        }
      }

      return wrappedStream();
    } catch (error) {
      // 错误现在由 executeStreamWithRetry 内部处理和抛出
      // 这里只捕获最终的、不可重试的错误
      this.logger.logError(
        error as Error,
        formatMessage("generation.failed", [
          error instanceof Error ? error.message : String(error),
        ])
      );
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
    this.logger.info(
      `Generating commit with function calling with provider: ${this.getId()}`
    );
    try {
      if (!params.messages) {
        const systemPrompt = await getSystemPrompt(
          params,
          false,
          false,
          this.globalConfig
        );
        params.messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: params.diff },
        ];
      }
      // Directly await the async function
      const { loadCommitlintConfig } = await import("../../utils/commitlint");
      const commitlintConfig = await loadCommitlintConfig(params.workspaceRoot);

      // We need to construct a config object for getCommitMessageTools if it expects one
      // But getCommitMessageTools likely expects the full config object.
      // Let's check getCommitMessageTools signature.
      // Assuming we can pass a mock config or update getCommitMessageTools.
      // For now, let's construct a minimal config object from FeatureSettings.
      const preferences =
        this.globalConfig.preferences ||
        PreferencesSettingsManager.getInstance().getSettings();

      const mockConfig = {
        base: {
          language: preferences.language,
        },
        features: {
          commitFormat: {
            enableBody: this.globalConfig.features?.commitFormat?.enableBody,
            enableEmoji: this.globalConfig.features?.commitFormat?.enableEmoji,
          },
        },
      } as any;

      const tools = getCommitMessageTools(mockConfig, commitlintConfig);

      // 记录提示词使用日志（函数调用）
      await this.logPromptUsage("commit-function-calling", params, {
        temperature: preferences.commitTemperature,
        diffLength: params.diff.length,
        messageCount: params.messages?.length,
        hasTools: !!tools,
      });

      const result = await this.executeAIRequest(params, {
        temperature: preferences.commitTemperature,
        tools: tools,
      });

      if (result.tool_calls && result.tool_calls.length > 0) {
        const toolCall = result.tool_calls[0];
        if (toolCall.function.name === "generate_commit_message") {
          const args = JSON.parse(toolCall.function.arguments);
          const { enableBody, enableEmoji } =
            this.globalConfig.features?.commitFormat || {};
          const scope = args.scope ? `(${args.scope})` : "";
          const emoji = enableEmoji && args.emoji ? `${args.emoji} ` : "";
          const body = enableBody && args.body ? `\n\n${args.body}` : "";
          const commitMessage = `${emoji}${args.type}${scope}: ${args.subject}${body}`;

          const finalResult = {
            content: commitMessage,
            usage: result.usage,
          };

          await this.recordTokenUsage(finalResult, params);

          return finalResult;
        }
      }

      // Fallback to content if no function call was made
      if (result.content) {
        await this.recordTokenUsage(result, params);
        return result;
      }

      throw new Error(
        "Failed to generate commit message with function calling."
      );
    } catch (error) {
      this.logger.logError(
        error as Error,
        formatMessage("generation.failed", [
          error instanceof Error ? error.message : String(error),
        ])
      );
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
    this.logger.info(`Generating code review with provider: ${this.getId()}`);
    try {
      if (!params.messages) {
        const systemPrompt = await getCodeReviewPrompt(
          params,
          false,
          this.globalConfig
        );
        params.messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: params.diff },
        ];
      }
      const preferences =
        this.globalConfig.preferences ||
        PreferencesSettingsManager.getInstance().getSettings();

      // 记录提示词使用日志（代码审查）
      await this.logPromptUsage("code-review", params, {
        temperature: preferences.reviewTemperature,
        diffLength: params.diff.length,
        messageCount: params.messages?.length,
      });

      const result = await this.executeAIRequest(params, {
        // parseAsJSON: true,
        temperature: preferences.reviewTemperature,
      });

      if (result.content) {
        const finalResult = {
          // content: CodeReviewReportGenerator.generateMarkdownReport(
          //   result.jsonContent as CodeReviewResult
          // ),
          content: result.content,
          usage: result.usage,
        };

        await this.recordTokenUsage(finalResult, params);
        return finalResult;
      } else {
        throw new Error("Failed to parse code review result as JSON");
      }
    } catch (error) {
      this.logger.logError(
        error as Error,
        formatMessage("codeReview.generation.failed", [
          error instanceof Error ? error.message : String(error),
        ])
      );
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
    this.logger.info(`Generating branch name with provider: ${this.getId()}`);
    try {
      if (!params.messages) {
        const systemPrompt = await getBranchNameSystemPrompt(
          params,
          false,
          this.globalConfig
        );
        const userPrompt = getBranchNameUserPrompt(params.diff);
        params.messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
          { role: "user", content: params.diff },
        ];
      }
      const preferences =
        this.globalConfig.preferences ||
        PreferencesSettingsManager.getInstance().getSettings();

      // 记录提示词使用日志（分支名称）
      await this.logPromptUsage("branch-name", params, {
        temperature: preferences.branchNameTemperature,
        diffLength: params.diff.length,
        messageCount: params.messages?.length,
      });

      const result = await this.executeAIRequest(params, {
        temperature: preferences.branchNameTemperature,
      });

      await this.recordTokenUsage(result, params);

      return result;
    } catch (error) {
      this.logger.logError(
        error as Error,
        formatMessage("branchName.generation.failed", [
          error instanceof Error ? error.message : String(error),
        ])
      );
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
    this.logger.info(`Generating weekly report with provider: ${this.getId()}`);
    try {
      // 使用新的支持活跃提示词的函数
      const baseLanguage = this.globalConfig.preferences?.language || "English";
      const systemPrompt = await getWeeklyReportPrompt(
        { language: baseLanguage } as AIRequestParams,
        period.startDate,
        period.endDate,
        false,
        this.globalConfig
      );

      // 如果有用户信息，可以附加到 systemPrompt
      let finalSystemPrompt = systemPrompt;
      if (users && users.length > 0) {
        finalSystemPrompt += `\nThis weekly report is for the team members: ${users.join(
          ", "
        )}. Please summarize their collective work.`;
      }

      const userContent = commits.join("\n\n---\n\n"); // 使用更明显的分隔符
      const params: AIRequestParams = {
        diff: userContent, // diff 字段现在承载的是 commit messages
        model: model || this.getDefaultModel(),
        additionalContext: users ? `Team members: ${users.join(", ")}` : "", // 可以用 additionalContext
        feature: "weekly-report",
      };

      // 记录提示词使用日志（周报）
      const preferences = this.globalConfig.preferences || PreferencesSettingsManager.getInstance().getSettings();
      await this.logPromptUsage("weekly-report", params, {
        temperature: preferences.weeklyReportTemperature,
        commitCount: commits.length,
        dateRange: `${period.startDate} - ${period.endDate}`,
        users: users,
      });

      const result = await this.executeAIRequest(
        {
          ...params,
          messages: [
            { role: "system", content: finalSystemPrompt },
            { role: "user", content: userContent },
          ],
        },
        {
          temperature: preferences.weeklyReportTemperature,
        }
      );

      await this.recordTokenUsage(result, params);

      return result;
    } catch (error) {
      this.logger.logError(
        error as Error,
        formatMessage("weeklyReport.generation.failed", [
          error instanceof Error ? error.message : String(error),
        ])
      );
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
    this.logger.info(
      `Generating layered commit with provider: ${this.getId()}`
    );
    try {
      const modifiedFiles = extractModifiedFilePaths(params.diff);
      const preferences = this.globalConfig.preferences || PreferencesSettingsManager.getInstance().getSettings();

      // 记录提示词使用日志（分层提交 - 批量）
      await this.logPromptUsage("layered-commit", params, {
        temperature: preferences.commitTemperature,
        diffLength: params.diff.length,
        modifiedFileCount: modifiedFiles.length,
        isBatch: true,
      });

      // 步骤1: 生成全局摘要
      this.logger.info("Generating global summary for layered commit...");
      const summarySystemPrompt = await getGlobalSummaryPrompt(
        params,
        this.globalConfig
      );

      // 记录全局摘要的详细日志
      await this.logPromptUsage("layered-commit", params, {
        step: "global-summary",
        temperature: preferences.commitTemperature,
      });

      const summaryResult = await this.executeAIRequest(
        {
          ...params,
          messages: [
            { role: "system", content: summarySystemPrompt },
            { role: "user", content: params.diff },
          ],
        },
        {
          temperature: preferences.commitTemperature,
        }
      );
      await this.recordTokenUsage(summaryResult, params);
      const summary = summaryResult.content;

      // 步骤2: 为每个文件生成描述
      const fileChanges = [];
      for (const filePath of modifiedFiles) {
        this.logger.info(`Generating description for file: ${filePath}`);
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
          const fileSystemPrompt = await getFileDescriptionPrompt(
            params,
            filePath,
            this.globalConfig
          );
          const fileResult = await this.executeAIRequest(
            {
              ...params,
              messages: [
                { role: "system", content: fileSystemPrompt },
                { role: "user", content: fileDiff },
              ],
            },
            {
              temperature: (
                this.globalConfig.preferences ||
                PreferencesSettingsManager.getInstance().getSettings()
              ).commitTemperature,
            }
          );

          await this.recordTokenUsage(fileResult, params);

          fileChanges.push({
            filePath,
            description: fileResult.content,
          });
        }
      }

      return { summary, fileChanges };
    } catch (error) {
      this.logger.logError(
        error as Error,
        formatMessage("layeredCommit.generation.failed", [
          error instanceof Error ? error.message : String(error),
        ])
      );
      throw new Error(
        formatMessage("layeredCommit.generation.failed", [
          error instanceof Error ? error.message : String(error),
        ])
      );
    }
  }

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
    // 使用新的支持活跃提示词的函数
    const fullPrompt = await getPRSummaryPrompt(
      params,
      false,
      this.globalConfig
    );

    const userContent = commitMessages.join("\n- ");
    const commitMessagesString = commitMessages.join("\n- ");

    // 记录提示词使用日志（PR摘要）
    const prParams = {
      ...params,
      diff: commitMessagesString,
      additionalContext: commitMessagesString,
    };
    await this.logPromptUsage("pr-summary", prParams, {
      temperature: 0.7,
      commitCount: commitMessages.length,
    });

    return generateWithRetry(
      prParams,
      async (_truncatedContent: string) => {
        const response = await this.executeAIRequest(
          {
            ...params,
            messages: [
              { role: "system", content: fullPrompt },
              { role: "user", content: `- ${userContent}` },
            ],
          },
          {
            temperature: 0.7,
          }
        );

        await this.recordTokenUsage(response, params);

        return { content: response.content, usage: response.usage };
      },
      {
        initialMaxLength: commitMessagesString.length,
        provider: this.getId(),
      }
    );
  }

  /**
   * 记录Token使用情况
   * @param result AI响应结果
   * @param params AI请求参数
   */
  protected async recordTokenUsage(
    result: AIResponse,
    params: AIRequestParams
  ): Promise<void> {
    if (result.usage?.totalTokens) {
      const tokenStatsService = TokenStatsService.getInstance();
      const model =
        (params.model && params.model.id) ||
        this.getConfig()?.defaultModel ||
        "unknown-model";
      const feature = params.feature || "unknown";

      console.log(
        `[AbstractAIProvider] Recording token usage for ${this.getId()}:`,
        {
          tokens: result.usage.totalTokens,
          model,
          feature,
        }
      );

      await tokenStatsService.addTokens(
        result.usage.totalTokens,
        model,
        this.getId(),
        feature
      );
    }
  }

  /**
   * 获取提示词信息用于日志记录
   * @param feature 功能标识
   * @param params AI请求参数
   * @returns 提示词信息对象
   */
  protected async getPromptLogInfo(
    feature: string,
    params: AIRequestParams
  ): Promise<PromptLogInfo | null> {
    try {
      // 从功能映射获取提示词键
      const promptKey = PROMPT_KEY_MAP[feature] || PromptKey.GenerateCommitSystem;

      // 获取当前活跃的提示词内容
      const promptManager = PromptManagerService.getInstance();
      const promptContent = await promptManager.getActivePromptContent(promptKey);

      // 获取提示词详情（包含来源等信息）
      const promptDetail = promptManager.getPromptDetail(promptKey);

      // 截断提示词内容，避免日志过长
      const truncatedContent = promptContent.length > 200
        ? promptContent.substring(0, 200) + '...'
        : promptContent;

      // 获取分类信息
      const promptCategory = promptDetail.category;
      const promptSource = promptDetail.source;

      return {
        promptKey,
        promptCategory,
        promptContent: truncatedContent,
        promptSource,
      };
    } catch (error) {
      console.warn('[AbstractAIProvider] Failed to get prompt log info:', error);
      return null;
    }
  }

  /**
   * 记录AI调用的提示词信息
   * @param feature 功能标识
   * @param params AI请求参数
   * @param additionalInfo 额外的上下文信息
   */
  protected async logPromptUsage(
    feature: string,
    params: AIRequestParams,
    additionalInfo: Record<string, any> = {}
  ): Promise<void> {
    const promptInfo = await this.getPromptLogInfo(feature, params);

    // 构建日志消息
    const provider = this.getId();
    const modelName = params.model?.id || this.getConfig()?.defaultModel || 'unknown-model';

    let logMessage = `[AI调用] 提供者: ${provider} | 模型: ${modelName} | 功能: ${feature}`;

    if (promptInfo) {
      logMessage += ` | 提示词: ${promptInfo.promptKey}`;
      if (promptInfo.promptCategory) {
        logMessage += ` | 分类: ${promptInfo.promptCategory}`;
      }
      if (promptInfo.promptSource) {
        logMessage += ` | 来源: ${promptInfo.promptSource}`;
      }

      // 记录主日志
      this.logger.info(logMessage);

      // 单独记录提示词内容（便于查看）
      this.logger.info(`[提示词内容] ${promptInfo.promptContent}`);

      // 记录额外信息
      if (Object.keys(additionalInfo).length > 0) {
        this.logger.info(`[调用详情] ${JSON.stringify(additionalInfo, null, 2)}`);
      }
    } else {
      // 无法获取提示词信息时的降级日志
      this.logger.info(logMessage);
      if (Object.keys(additionalInfo).length > 0) {
        this.logger.info(`[调用详情] ${JSON.stringify(additionalInfo, null, 2)}`);
      }
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
  protected abstract buildProviderMessages(
    params: AIRequestParams
  ): Promise<any>;

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

  public getConfig(): any {
    return this.config;
  }

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
