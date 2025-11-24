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

export enum PromptCategory {
  Commit = "commit",
  CodeReview = "codeReview",
  PR = "pr",
  Report = "report",
  Git = "git",
  Custom = "custom",
}

export const CATEGORY_DISPLAY_NAMES: Record<PromptCategory, string> = {
  [PromptCategory.Commit]: "提交生成",
  [PromptCategory.CodeReview]: "代码审查",
  [PromptCategory.PR]: "拉取请求",
  [PromptCategory.Report]: "报告",
  [PromptCategory.Git]: "Git操作",
  [PromptCategory.Custom]: "自定义提示词",
};

export const PROMPT_CATEGORIES: Record<PromptKey, PromptCategory> = {
  [PromptKey.BranchNameSystem]: PromptCategory.Git,
  [PromptKey.CodeReviewSystem1]: PromptCategory.CodeReview,
  [PromptKey.CodeReviewSystem]: PromptCategory.CodeReview,
  [PromptKey.GenerateCommitFallbackSystem]: PromptCategory.Commit,
  [PromptKey.GenerateCommitSystem1]: PromptCategory.Commit,
  [PromptKey.GenerateCommitSystem]: PromptCategory.Commit,
  [PromptKey.LayeredCommitFile]: PromptCategory.Commit,
  [PromptKey.PRSummarySystem]: PromptCategory.PR,
  [PromptKey.WeeklyReport]: PromptCategory.Report,
};

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

export interface PromptVariable {
  name: string;
  description: string;
}

export const PROMPT_VARIABLES: Record<PromptKey, PromptVariable[]> = {
  [PromptKey.BranchNameSystem]: [
    { name: "language", description: "Target language for the output" },
  ],
  [PromptKey.CodeReviewSystem1]: [
    { name: "language", description: "Target language for the output" },
  ],
  [PromptKey.CodeReviewSystem]: [
    { name: "language", description: "Target language for the output" },
  ],
  [PromptKey.GenerateCommitFallbackSystem]: [
    { name: "language", description: "Target language for the output" },
  ],
  [PromptKey.GenerateCommitSystem1]: [
    { name: "language", description: "Target language for the output" },
  ],
  [PromptKey.GenerateCommitSystem]: [
    { name: "language", description: "Target language for the output" },
    {
      name: "type_reference",
      description: "Auto-generated commit type table (respects config)",
    },
    {
      name: "format_template",
      description: "Auto-generated format guide (respects config)",
    },
    {
      name: "examples",
      description: "Auto-generated examples (respects config & VCS)",
    },
    {
      name: "thinking_process",
      description: "Auto-generated Chain-of-Thought steps",
    },
  ],
  [PromptKey.LayeredCommitFile]: [
    { name: "language", description: "Target language for the output" },
    { name: "filePath", description: "Path of the file being committed" },
    { name: "globalContext", description: "Global context of the changes" },
    { name: "otherFiles", description: "List of other files in the commit" },
  ],
  [PromptKey.PRSummarySystem]: [
    { name: "language", description: "Target language for the output" },
  ],
  [PromptKey.WeeklyReport]: [
    { name: "language", description: "Target language for the output" },
    { name: "startDate", description: "Start date of the report period" },
    { name: "endDate", description: "End date of the report period" },
  ],
};

export type PromptSource = "workspace" | "global" | "default";

export interface PromptDetail {
  content: string;
  source: PromptSource;
  isCustomized: boolean;
  isNew?: boolean;
}