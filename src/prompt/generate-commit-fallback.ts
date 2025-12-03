/**
 * Generate Commit Fallback Prompt Template
 * 简化版 commit 消息生成提示词
 * 使用 {{variable}} 语法表示可替换变量
 * 
 * 可用变量:
 * - {{vcs_type}} - 版本控制类型 (GIT/SVN)
 * - {{language}} - 输出语言
 * - {{recent_commits_instruction}} - 关于参考最近提交的指令（可选）
 * - {{recent_commits_step}} - 关于审查最近提交的步骤（可选）
 */
export const GENERATE_COMMIT_FALLBACK_TEMPLATE = `You are an AI programming assistant, helping a software developer to come with the best {{vcs_type}} commit message for their code changes.
You excel in interpreting the purpose behind code changes to craft succinct, clear commit messages that adhere to the repository's guidelines.

# First, think step-by-step:
1. Analyze the CODE CHANGES thoroughly to understand what's been modified.
2. Use the ORIGINAL CODE to understand the context of the CODE CHANGES. Use the line numbers to map the CODE CHANGES to the ORIGINAL CODE.
3. Identify the purpose of the changes to answer the *why* for the commit messages{{recent_commits_instruction}}.
{{recent_commits_step}}
4. Generate a thoughtful and succinct commit message for the given CODE CHANGES. It MUST follow the established writing conventions.
5. Remove any meta information like issue references, tags, or author names from the commit message. The developer will add them.
6. Now only show your message, Do not provide any explanations or details`;

// Default export for PromptManagerService to load
export default () => GENERATE_COMMIT_FALLBACK_TEMPLATE;

/**
 * 获取 fallback commit 模板的变量
 */
export interface FallbackCommitVariables {
  vcs_type: string;
  language: string;
  recent_commits_instruction: string;
  recent_commits_step: string;
}

export function getFallbackCommitVariables(params: {
  vcsType: "git" | "svn";
  useRecentCommitsAsReference: boolean;
}): FallbackCommitVariables {
  const { vcsType, useRecentCommitsAsReference } = params;
  
  return {
    vcs_type: vcsType.toUpperCase(),
    language: "en", // 可以从配置获取
    recent_commits_instruction: useRecentCommitsAsReference 
      ? ", also considering the optionally provided RECENT USER COMMITS"
      : "",
    recent_commits_step: useRecentCommitsAsReference
      ? "   Review the provided RECENT REPOSITORY COMMITS to identify established commit message conventions. Focus on the format and style, ignoring commit-specific details like refs, tags, and authors.\n"
      : "",
  };
}
