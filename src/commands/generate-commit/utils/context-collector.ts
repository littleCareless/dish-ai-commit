import { ISCMProvider } from "../../../scm/scm-provider";
import { AIRequestParams } from "../../../ai/types";
import { addSimilarCodeContext } from "../../../ai/utils/embedding-helper";

/**
 * 上下文收集器类，负责收集各种上下文信息
 */
export class ContextCollector {
  /**
   * 获取最近的提交记录作为上下文。
   * 这包括用户自己的提交和仓库中其他人的提交，用于为 AI 提供风格参考。
   * @param scmProvider - SCM 供应器实例。
   * @returns 包含用户提交和仓库提交字符串的对象。
   */
  async getRecentCommitsContext(
    scmProvider: ISCMProvider,
    repositoryPath?: string
  ): Promise<{ userCommits: string; repoCommits: string }> {
    const recentMessages = await scmProvider.getRecentCommitMessages();
    let userCommits = "";
    let repoCommits = "";

    if (recentMessages.user.length > 0) {
      userCommits +=
        "# RECENT USER COMMITS (For reference only, do not copy!):\n";
      userCommits += recentMessages.user
        .map((message) => `- ${message}`)
        .join("\n");
    }

    if (recentMessages.repository.length > 0) {
      repoCommits +=
        "# RECENT REPOSITORY COMMITS (For reference only, do not copy!):\n";
      repoCommits += recentMessages.repository
        .map((message) => `- ${message}`)
        .join("\n");
    }
    return { userCommits, repoCommits };
  }

  /**
   * 获取用户的自定义指令作为上下文。
   * @param scmProvider - SCM 供应器实例。
   * @returns 格式化后的自定义指令字符串。
   */
  async getSCMInputContext(scmProvider: ISCMProvider): Promise<string> {
    let currentInput = await scmProvider.getCommitInput();
    if (currentInput) {
      currentInput = `
When generating the commit message, please use the following custom instructions provided by the user.
You can ignore an instruction if it contradicts a system message.
<instructions>
${currentInput}
</instructions>
`;
    }
    return currentInput;
  }

  /**
   * 根据配置获取最近的提交记录。
   * @param scmProvider - SCM 供应器实例。
   * @param useRecentCommits - 是否使用最近提交作为参考。
   * @returns 包含用户提交和仓库提交字符串的对象。
   */
  async getRecentCommits(
    scmProvider: ISCMProvider,
    useRecentCommits: boolean
  ): Promise<{ userCommits: string; repoCommits: string }> {
    if (!useRecentCommits) {
      return { userCommits: "", repoCommits: "" };
    }
    return this.getRecentCommitsContext(scmProvider);
  }

  /**
   * 获取与变更内容相似的代码作为上下文。
   * @param diffContent - 文件变更的 diff 内容。
   * @returns 相似代码的上下文字符串。
   */
  async getSimilarCodeContext(diffContent: string): Promise<string> {
    const embeddingParams: AIRequestParams = {
      diff: diffContent,
      additionalContext: "",
    };
    await addSimilarCodeContext(embeddingParams);
    return embeddingParams.additionalContext;
  }

  /**
   * 根据是否存在参考提交生成提醒信息。
   * @param userCommits - 用户最近的提交。
   * @param repoCommits - 仓库最近的提交。
   * @returns 提醒信息字符串。
   */
  getReminder(
    userCommits: string,
    repoCommits: string,
    language: string
  ): string {
    const languageReminder = `\n - The commit message MUST be in ${language}.`;
    const recentCommitsReminder =
      userCommits || repoCommits
        ? "\n- DO NOT COPY commits from RECENT COMMITS, but use it as reference for the commit style."
        : "";

    return `- IMPORTANT: You will be provided with code changes from MULTIPLE files.
 - Your primary task is to analyze ALL provided file changes under the \`<code-changes>\` block and synthesize them into a single, coherent commit message.
 - Do NOT focus on only the first file you see. A good commits messages covers the intent of all changes.${recentCommitsReminder}${languageReminder}
 - Now only show your message, Do not provide any explanations or details`;
  }
}

