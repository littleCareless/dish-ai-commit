export enum PromptKey {
  BranchNameSystem = "branchNameSystem",
  CodeReviewSystem1 = "codeReviewSystem1",
  CodeReviewSystem = "codeReviewSystem",
  GenerateCommitFallbackSystem = "generateCommitFallbackSystem",
  GenerateCommitSystem1 = "generateCommitSystem1",
  GenerateCommitSystem = "generateCommitSystem",
  LayeredCommitFile = "layeredCommitFile",
  PRSummarySystem = "prSummarySystem",
  WeeklyReport = "weeklyReport",
}

export const PROMPT_DISPLAY_NAMES: Record<PromptKey, string> = {
  [PromptKey.BranchNameSystem]: "分支名称",
  [PromptKey.CodeReviewSystem1]: "代码审查 (简版)",
  [PromptKey.CodeReviewSystem]: "代码审查 (高级)",
  [PromptKey.GenerateCommitFallbackSystem]: "Commit 消息回退",
  [PromptKey.GenerateCommitSystem1]: "Commit 消息 (简版)",
  [PromptKey.GenerateCommitSystem]: "Commit 消息 (高级)",
  [PromptKey.LayeredCommitFile]: "分层 Commit",
  [PromptKey.PRSummarySystem]: "PR 摘要",
  [PromptKey.WeeklyReport]: "周报",
};

export type PromptSource = "workspace" | "global" | "default";

export interface PromptDetail {
  content: string;
  source: PromptSource;
  isCustomized: boolean;
  isNew?: boolean;
}
