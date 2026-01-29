// ============================================================================
// Prompt Types - Shared between Extension and Webview
// 统一的提示词类型定义，避免前后端重复
// ============================================================================

// ============================================================================
// 基础枚举和常量
// ============================================================================

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

/**
 * 提交生成的子分类
 * 用于更精细地组织 Commit 类别下的提示词
 */
export enum CommitSubCategory {
  Standard = "standard", // 标准提交模式
  Layered = "layered", // 分层提交模式（通用）
  LayeredFile = "layered_file", // 分层提交 - 单文件描述
  LayeredBatch = "layered_batch", // 分层提交 - 批量描述
  System = "system", // 系统机制
}

/**
 * 子分类类型（支持其他分类未来的扩展）
 */
export type SubCategory = CommitSubCategory;

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

/**
 * 提交生成的子分类映射
 * 用于将 Commit 类别的提示词进一步分组
 */
export const COMMIT_SUB_CATEGORIES: Partial<
  Record<PromptKey, CommitSubCategory>
> = {
  // 标准提交模式
  [PromptKey.GenerateCommitSystem]: CommitSubCategory.Standard,
  [PromptKey.GenerateCommitSimple]: CommitSubCategory.Standard,

  // 分层提交模式 - 区分单文件和批量
  [PromptKey.LayeredCommitBatch]: CommitSubCategory.LayeredBatch,
  [PromptKey.LayeredCommitFile]: CommitSubCategory.LayeredFile,

  // 系统机制
  [PromptKey.GenerateCommitFallbackSystem]: CommitSubCategory.System,
};

/**
 * 子分类显示名称
 */
export const SUB_CATEGORY_DISPLAY_NAMES: Record<CommitSubCategory, string> = {
  [CommitSubCategory.Standard]: "标准提交模式",
  [CommitSubCategory.Layered]: "分层提交模式",
  [CommitSubCategory.LayeredFile]: "分层提交 - 单文件",
  [CommitSubCategory.LayeredBatch]: "分层提交 - 批量描述",
  [CommitSubCategory.System]: "系统机制",
};

export const PROMPT_DISPLAY_NAMES: Record<PromptKey, string> = {
  [PromptKey.BranchNameSystem]: "分支名称",
  [PromptKey.CodeReviewSimple]: "代码审查 (简版)",
  [PromptKey.CodeReviewSystem]: "代码审查 (高级)",
  [PromptKey.GenerateCommitFallbackSystem]: "回退机制",
  [PromptKey.GenerateCommitSimple]: "提交消息 (简版)",
  [PromptKey.GenerateCommitSystem]: "提交消息",
  [PromptKey.LayeredCommitFile]: "文件描述 (单文件)",
  [PromptKey.LayeredCommitBatch]: "文件描述生成",
  [PromptKey.PRSummarySystem]: "PR 摘要",
  [PromptKey.WeeklyReport]: "周报",
};

// ============================================================================
// 变量定义
// ============================================================================

export interface PromptVariable {
  name: string;
  description: string;
}

// 按分类的变量（用于创建新提示词）
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
      description: "Date range for the report (YYYY/MM/DD - YYYY/MM/DD)",
    },
  ],
};

// ============================================================================
// 系统生成型提示词
// ============================================================================

/**
 * 系统生成型提示词列表
 * 这些提示词包含复杂的动态生成逻辑，不应该被直接编辑
 *
 * 注意：已转换为纯文本模板的 prompts 不在此列表中：
 * - CodeReviewSimple (code-review-simple.ts) - 已转换为纯文本模板
 * - GenerateCommitFallbackSystem - 已转换为纯文本模板
 * - PRSummarySystem - 已转换为纯文本模板
 * - BranchNameSystem - 已转换为纯文本模板
 * - LayeredCommitFile - 已是纯文本模板
 * - WeeklyReport - 已转换为纯文本模板
 */
export const SYSTEM_GENERATED_PROMPTS: Set<PromptKey> = new Set([
  PromptKey.GenerateCommitSimple,
  PromptKey.CodeReviewSystem,
]);

// ============================================================================
// 核心接口类型
// ============================================================================

export type PromptSource = "workspace" | "global" | "default" | "project";

export interface PromptDetail {
  content: string;
  source: PromptSource;
  isCustomized: boolean;
  isNew?: boolean;
  isSystemGenerated?: boolean; // 标识是否为系统生成型提示词
  category?: PromptCategory; // 用于 UI 显示分类
  subCategory?: CommitSubCategory; // 提交生成的子分类（仅 Commit 类型使用）
  title?: string; // 用户友好的标题，用于显示
}

/**
 * 提示词元数据接口
 * 用于存储提示词的附加信息
 */
export interface PromptMetadata {
  category?: PromptCategory;
  subCategory?: CommitSubCategory;
  title?: string; // 用户友好的标题
}

// ============================================================================
// 多工作区支持类型
// ============================================================================

/**
 * 工作区信息接口
 */
export interface WorkspaceInfo {
  id: string;
  name: string;
  path: string;
}

/**
 * 存储位置级别
 */
export type StorageLevel = "global" | "workspace" | "project";

/**
 * 活跃提示词源信息
 */
export interface ActivePromptSource {
  source: StorageLevel;
  workspaceId?: string;
  category?: PromptCategory;
  promptKey?: string; // 支持更细粒度的活跃提示词追踪
  subCategory?: CommitSubCategory; // 支持子分类级别
}

/**
 * 工作区活跃提示词状态（用于 UI 显示）
 */
export interface WorkspaceActiveState {
  workspaceId: string;
  workspaceName: string;
  activePrompts: Record<PromptCategory, string>;
  activePromptsBySubCategory?: Record<PromptCategory, Record<string, string>>;
  source: StorageLevel;
}
