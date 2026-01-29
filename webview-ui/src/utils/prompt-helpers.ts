import {
  PROMPT_CATEGORIES,
  PROMPT_VARIABLES,
  CATEGORY_VARIABLES,
  PromptCategory,
  PromptKey,
  PromptVariable,
  CommitSubCategory,
  COMMIT_SUB_CATEGORIES,
} from "@shared/types/prompts";

export interface Prompts {
  [key: string]: {
    content: string;
    source: string;
    isCustomized: boolean;
    isNew?: boolean;
    isSystemGenerated?: boolean;
    category?: PromptCategory;
    subCategory?: CommitSubCategory;
  };
}

/**
 * 根据提示词 key 获取分类
 */
export const getCategoryFromKey = (
  key: string,
  prompts: Prompts,
): PromptCategory => {
  // First try standard mapping
  const category = PROMPT_CATEGORIES[key as PromptKey];
  if (category) return category;

  // Then try custom prompt category
  const promptDetail = prompts[key];
  if (promptDetail?.category) {
    return promptDetail.category;
  }

  // Fallback for legacy keys
  const legacyMap: Record<string, PromptCategory> = {
    "generate-commit": PromptCategory.Commit,
    "code-review": PromptCategory.CodeReview,
    "pr-summary": PromptCategory.PR,
    "weekly-report": PromptCategory.Report,
    "branch-name": PromptCategory.Git,
  };

  return legacyMap[key] || PromptCategory.Custom;
};

/**
 * 根据提示词 key 获取子分类
 */
export const getSubCategoryFromKey = (
  key: string,
): CommitSubCategory | null => {
  return COMMIT_SUB_CATEGORIES[key as PromptKey] || null;
};

/**
 * 获取默认选中的活跃提示词（支持子分类级别）
 */
export const getActivePromptForDefaultSelection = (
  prompts: Prompts,
  activePromptsByCategory: Record<PromptCategory, string>,
  activePromptsBySubCategory?: Record<PromptCategory, Record<string, string>>,
): string | null => {
  // First, try to find an active prompt from subcategory level
  if (activePromptsBySubCategory) {
    for (const category of Object.values(PromptCategory)) {
      const subCategoryPrompts = activePromptsBySubCategory[category];
      if (subCategoryPrompts) {
        for (const subCategory in subCategoryPrompts) {
          const activeKey = subCategoryPrompts[subCategory];
          if (activeKey && prompts[activeKey]) {
            return activeKey;
          }
        }
      }
    }
  }

  // Then, try to find an active prompt from category level
  for (const category of Object.values(PromptCategory)) {
    const activeKey = activePromptsByCategory[category];
    if (activeKey && prompts[activeKey]) {
      return activeKey;
    }
  }
  return null;
};

/**
 * 获取可用的变量列表
 */
export const getAvailableVariables = (
  key: string,
  prompts: Prompts,
): PromptVariable[] => {
  if (!key) return [];

  const category = getCategoryFromKey(key, prompts);
  const categoryVars = CATEGORY_VARIABLES[category] || [];
  const promptVars = PROMPT_VARIABLES[key as PromptKey] || [];

  return [...new Set([...categoryVars, ...promptVars])];
};
