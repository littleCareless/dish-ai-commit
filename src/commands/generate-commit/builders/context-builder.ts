import { ISCMProvider } from "../../../scm/scm-provider";
import { AIModel } from "../../../ai/types";
import { ContextManager, TruncationStrategy } from "../../../utils/context-manager";
import { ContextCollector } from "../utils/context-collector";
import { extractProcessedDiff } from "../utils/diff-extractor";

/**
 * 提交上下文构建器类，负责构建和管理上下文管理器
 */
export class CommitContextBuilder {
  private contextCollector: ContextCollector;

  constructor() {
    this.contextCollector = new ContextCollector();
  }

  /**
   * 构建并配置 ContextManager 实例。
   * 此函数负责收集所有必要的上下文信息（如用户指令、最近提交、相似代码等），
   * 并将它们作为不同的块添加到 ContextManager 中，以便进行智能截断和管理。
   * @param selectedModel - 当前选定的 AI 模型配置。
   * @param systemPrompt - 用于指导 AI 的系统提示。
   * @param scmProvider - SCM 供应器实例。
   * @param diffContent - 文件变更的 diff 内容。
   * @param configuration - 当前应用的配置对象。
   * @param options - 可选的配置选项
   * @returns 配置完成的 ContextManager 实例。
   */
  async buildContextManager(
    selectedModel: AIModel,
    systemPrompt: string,
    scmProvider: ISCMProvider,
    diffContent: string,
    configuration: any,
    options: { exclude?: string[] } = {}
  ): Promise<ContextManager> {
    // 1. 获取所有上下文信息
    const currentInput = await this.contextCollector.getSCMInputContext(scmProvider);
    const { userCommits, repoCommits } = await this.contextCollector.getRecentCommits(
      scmProvider,
      configuration.features.commitMessage.useRecentCommitsAsReference
    );
    const { exclude = [] } = options;
    const similarCodeContext = exclude.includes("similar-code")
      ? ""
      : await this.contextCollector.getSimilarCodeContext(diffContent);
    const reminder = this.contextCollector.getReminder(
      userCommits,
      repoCommits,
      configuration.base.language
    );

    // 2. 构建 ContextManager
    const contextManager = new ContextManager(
      selectedModel,
      systemPrompt,
      configuration.features.suppressNonCriticalWarnings
    );
    const { originalCode, codeChanges } = extractProcessedDiff(diffContent);

    if (userCommits) {
      contextManager.addBlock({
        content: userCommits,
        priority: 700,
        strategy: TruncationStrategy.TruncateTail,
        name: "user-commits",
      });
    }

    if (repoCommits) {
      contextManager.addBlock({
        content: repoCommits,
        priority: 600,
        strategy: TruncationStrategy.TruncateTail,
        name: "recent-commits",
      });
    }
    contextManager.addBlock({
      content: similarCodeContext,
      priority: 320, // This priority is not specified in the user request, keeping it as is.
      strategy: TruncationStrategy.TruncateTail,
      name: "similar-code",
    });
    if (!exclude.includes("original-code")) {
      contextManager.addBlock({
        content: originalCode,
        priority: 800,
        strategy: TruncationStrategy.SmartTruncateDiff,
        name: "original-code",
      });
    }
    contextManager.addBlock({
      content: codeChanges,
      priority: 900,
      strategy: TruncationStrategy.SmartTruncateDiff,
      name: "code-changes",
    });
    contextManager.addBlock({
      content: reminder,
      priority: 900,
      strategy: TruncationStrategy.TruncateTail,
      name: "reminder",
    });
    contextManager.addBlock({
      content: currentInput,
      priority: 750,
      strategy: TruncationStrategy.TruncateTail,
      name: "custom-instructions",
    });

    return contextManager;
  }

  /**
   * 构建分层提交摘要的上下文管理器
   * @param selectedModel - 当前选定的 AI 模型配置
   * @param systemPrompt - 系统提示
   * @param scmProvider - SCM 供应器实例
   * @param formattedFileChanges - 格式化的文件变更内容
   * @param configuration - 当前应用的配置对象
   * @returns 配置完成的 ContextManager 实例
   */
  async buildLayeredSummaryContextManager(
    selectedModel: AIModel,
    systemPrompt: string,
    scmProvider: ISCMProvider,
    formattedFileChanges: string,
    configuration: any
  ): Promise<ContextManager> {
    // 1. 获取上下文信息（不包括需要真实 diff 的部分）
    const currentInput = await this.contextCollector.getSCMInputContext(scmProvider);
    const { userCommits, repoCommits } = await this.contextCollector.getRecentCommits(
      scmProvider,
      configuration.features.commitMessage.useRecentCommitsAsReference
    );
    const reminder = this.contextCollector.getReminder(
      userCommits,
      repoCommits,
      configuration.base.language
    );

    // 2. 构建 ContextManager
    const contextManager = new ContextManager(
      selectedModel,
      systemPrompt,
      configuration.features.suppressNonCriticalWarnings
    );

    // 添加与摘要生成相关的块
    if (userCommits) {
      contextManager.addBlock({
        content: userCommits,
        priority: 700,
        strategy: TruncationStrategy.TruncateTail,
        name: "user-commits",
      });
    }

    if (repoCommits) {
      contextManager.addBlock({
        content: repoCommits,
        priority: 600,
        strategy: TruncationStrategy.TruncateTail,
        name: "recent-commits",
      });
    }

    // 将格式化后的文件变更作为主要内容块添加
    contextManager.addBlock({
      content: formattedFileChanges,
      priority: 900,
      strategy: TruncationStrategy.TruncateTail,
      name: "file-changes-summary",
    });

    contextManager.addBlock({
      content: reminder,
      priority: 900, // 优先级高
      strategy: TruncationStrategy.TruncateTail,
      name: "reminder",
    });

    contextManager.addBlock({
      content: currentInput,
      priority: 750,
      strategy: TruncationStrategy.TruncateTail,
      name: "custom-instructions",
    });

    return contextManager;
  }
}

