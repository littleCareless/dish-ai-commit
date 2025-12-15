export enum PromptKey {
  BranchNameSystem = "branchNameSystem",
  CodeReviewSimple = "codeReviewSimple",
  CodeReviewSystem = "codeReviewSystem",
  GenerateCommitFallbackSystem = "generateCommitFallbackSystem",
  GenerateCommitSimple = "generateCommitSimple",
  GenerateCommitSystem = "generateCommitSystem",
  LayeredCommitFile = "layeredCommitFile",
  LayeredCommitBatch = "layeredCommitBatch",
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
  [PromptKey.CodeReviewSimple]: PromptCategory.CodeReview,
  [PromptKey.CodeReviewSystem]: PromptCategory.CodeReview,
  [PromptKey.GenerateCommitFallbackSystem]: PromptCategory.Commit,
  [PromptKey.GenerateCommitSimple]: PromptCategory.Commit,
  [PromptKey.GenerateCommitSystem]: PromptCategory.Commit,
  [PromptKey.LayeredCommitFile]: PromptCategory.Commit,
  [PromptKey.LayeredCommitBatch]: PromptCategory.Commit,
  [PromptKey.PRSummarySystem]: PromptCategory.PR,
  [PromptKey.WeeklyReport]: PromptCategory.Report,
};

export const PROMPT_DISPLAY_NAMES: Record<PromptKey, string> = {
  [PromptKey.BranchNameSystem]: "分支名称",
  [PromptKey.CodeReviewSimple]: "代码审查 (简版)",
  [PromptKey.CodeReviewSystem]: "代码审查 (高级)",
  [PromptKey.GenerateCommitFallbackSystem]: "Commit 消息回退",
  [PromptKey.GenerateCommitSimple]: "Commit 消息 (简版)",
  [PromptKey.GenerateCommitSystem]: "Commit 消息 (高级)",
  [PromptKey.LayeredCommitFile]: "分层 Commit (单文件)",
  [PromptKey.LayeredCommitBatch]: "分层 Commit (批量)",
  [PromptKey.PRSummarySystem]: "PR 摘要",
  [PromptKey.WeeklyReport]: "周报",
};

export interface PromptVariable {
  name: string;
  description: string;
}

// Variables available per category (for creating new prompts)
export const CATEGORY_VARIABLES: Record<PromptCategory, PromptVariable[]> = {
  [PromptCategory.Commit]: [
    { name: "language", description: "Target language for the output" },
    { name: "vcs_type", description: "Version control system type (GIT/SVN)" },
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
    {
      name: "body_instruction",
      description: "Instruction for body content based on config",
    },
    {
      name: "context_section",
      description: "Global context and other files info",
    },
    { name: "filePath", description: "Path of the file being committed" },
  ],
  [PromptCategory.CodeReview]: [
    { name: "language", description: "Target language for the output" },
  ],
  [PromptCategory.PR]: [
    { name: "language", description: "Target language for the output" },
  ],
  [PromptCategory.Report]: [
    { name: "language", description: "Target language for the output" },
    {
      name: "date_range",
      description: "Date range for the report (YYYY/MM/DD - YYYY/MM/DD)",
    },
  ],
  [PromptCategory.Git]: [
    {
      name: "diffContent",
      description: "Git/SVN diff content for branch name generation",
    },
  ],
  [PromptCategory.Custom]: [],
};

export const PROMPT_VARIABLES: Record<PromptKey, PromptVariable[]> = {
  [PromptKey.BranchNameSystem]: [
    {
      name: "diffContent",
      description: "Git/SVN diff content for branch name generation",
    },
  ],
  [PromptKey.CodeReviewSimple]: [
    { name: "language", description: "Target language for the output" },
  ],
  [PromptKey.CodeReviewSystem]: [
    { name: "language", description: "Target language for the output" },
  ],
  [PromptKey.GenerateCommitFallbackSystem]: [
    { name: "vcs_type", description: "Version control system type (GIT/SVN)" },
    { name: "language", description: "Target language for the output" },
    {
      name: "recent_commits_instruction",
      description: "Optional instruction about referencing recent commits",
    },
    {
      name: "recent_commits_step",
      description: "Optional step for reviewing recent commits",
    },
  ],
  [PromptKey.GenerateCommitSimple]: [
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
    {
      name: "body_instruction",
      description: "Instruction for body content based on config",
    },
    {
      name: "context_section",
      description: "Global context and other files info",
    },
  ],
  [PromptKey.LayeredCommitBatch]: [
    { name: "language", description: "Target language for the output" },
    {
      name: "body_instruction",
      description: "Instruction for body content based on config",
    },
    {
      name: "context_section",
      description: "Global context and other files info",
    },
  ],
  [PromptKey.PRSummarySystem]: [
    { name: "language", description: "Target language for the output" },
  ],
  [PromptKey.WeeklyReport]: [
    { name: "language", description: "Target language for the output" },
    {
      name: "date_range",
      description: "Date range for the weekly report (YYYY/MM/DD - YYYY/MM/DD)",
    },
  ],
};

export type PromptSource = "workspace" | "global" | "default" | "project";

export interface PromptDetail {
  content: string;
  source: PromptSource;
  isCustomized: boolean;
  isNew: boolean;
  isSystemGenerated?: boolean;
  category?: PromptCategory;
}
