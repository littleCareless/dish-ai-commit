import { DISH_CONFIG_PREFIX } from "@/config/constants";
import {
  PromptCategory,
  PromptKey,
  StorageLevel,
  ActivePromptSource,
  WorkspaceActiveState,
  COMMIT_SUB_CATEGORIES,
  PROMPT_CATEGORIES,
  CommitSubCategory,
} from "@shared/types/prompts";
import { workspaceManager } from "@/services/core/workspace-manager";
import { PromptManagerService } from "@/services/core/prompt-manager-service";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

export interface FeaturesSettings {
  // Commit Message Generation
  enableEmoji: boolean;
  enableMergeCommit: boolean;
  enableBody: boolean;
  enableLayeredCommit: boolean;
  enableGlobalContext: boolean;
  useRecentCommitsAsReference: boolean;

  // Code Analysis
  simplifyDiff: boolean;
  autoDetectStaged: boolean;
  fallbackToAll: boolean;

  // Other Features
  weeklyReport: boolean;
  codeReview: boolean;
  generateBranchName: boolean;
  generatePRSummary: boolean;

  // Active prompts by category (全局默认) - 保持向后兼容
  activePrompts?: Record<PromptCategory, string>;

  // 工作区级活跃提示词（按 workspace-id 存储）- 保持向后兼容
  workspaceActivePrompts?: Record<string, Record<PromptCategory, string>>;

  // 新增：支持子分类级别的多活跃提示词
  // 格式：category -> subCategory -> promptKey
  activePromptsBySubCategory?: Record<PromptCategory, Record<string, string>>;

  // 新增：工作区级子分类活跃提示词
  workspaceActivePromptsBySubCategory?: Record<
    string,
    Record<PromptCategory, Record<string, string>>
  >;

  // Legacy single active prompt key (for backward compatibility)
  activePromptKey?: string;
}

// Default system prompts for each category
export const DEFAULT_ACTIVE_PROMPTS: Record<PromptCategory, string> = {
  [PromptCategory.Commit]: PromptKey.GenerateCommitSystem,
  [PromptCategory.CodeReview]: PromptKey.CodeReviewSystem,
  [PromptCategory.PR]: PromptKey.PRSummarySystem,
  [PromptCategory.Report]: PromptKey.WeeklyReport,
  [PromptCategory.Git]: PromptKey.BranchNameSystem,
  [PromptCategory.Custom]: PromptKey.GenerateCommitSimple,
};

// Default active prompts by subcategory (for multi-prompt scenarios like layered commits)
export const DEFAULT_ACTIVE_PROMPTS_BY_SUBCATEGORY: Record<
  PromptCategory,
  Record<string, string>
> = {
  [PromptCategory.Commit]: {
    // Standard subcategory - default to standard system prompt
    standard: PromptKey.GenerateCommitSystem,
    // Layered subcategory - default to both file and batch prompts
    layered_file: PromptKey.LayeredCommitFile,
    layered_batch: PromptKey.LayeredCommitBatch,
    // System subcategory - default to fallback system
    system: PromptKey.GenerateCommitFallbackSystem,
  },
  // Other categories can be extended as needed
  [PromptCategory.CodeReview]: {},
  [PromptCategory.PR]: {},
  [PromptCategory.Report]: {},
  [PromptCategory.Git]: {},
  [PromptCategory.Custom]: {},
};

export class FeaturesSettingsManager {
  private static instance: FeaturesSettingsManager;
  private static readonly STORAGE_KEY = `${DISH_CONFIG_PREFIX}_features_settings`;

  private _settings: FeaturesSettings = {
    // Commit Message Generation
    enableEmoji: true,
    enableMergeCommit: false,
    enableBody: true,
    enableLayeredCommit: false,
    enableGlobalContext: true,
    useRecentCommitsAsReference: false,

    // Code Analysis
    simplifyDiff: false,
    autoDetectStaged: true,
    fallbackToAll: true,

    // Other Features
    weeklyReport: true,
    codeReview: true,
    generateBranchName: true,
    generatePRSummary: true,
  };

  private constructor(private context: vscode.ExtensionContext) {}

  public static getInstance(
    context: vscode.ExtensionContext,
  ): FeaturesSettingsManager {
    if (!FeaturesSettingsManager.instance) {
      FeaturesSettingsManager.instance = new FeaturesSettingsManager(context);
    }
    return FeaturesSettingsManager.instance;
  }

  public async initialize(): Promise<void> {
    await this.loadSettings();
  }

  public getSettings(): FeaturesSettings {
    const settings = { ...this._settings };
    console.log("[FeaturesSettingsManager] getSettings():", settings);
    return settings;
  }

  public async updateSettings(
    partialSettings: Partial<FeaturesSettings>,
  ): Promise<void> {
    this._settings = { ...this._settings, ...partialSettings };
    await this.saveSettings();
  }

  /**
   * 获取指定工作区的活跃提示词（向后兼容）
   * 优先级：项目 > 工作区 > 全局
   * @param workspaceId - 工作区 ID（可选，不传则使用全局）
   * @returns 活跃提示词映射
   */
  public async getActivePrompts(
    workspaceId?: string,
  ): Promise<Record<PromptCategory, string>> {
    // 1. 检查项目级配置 (.dish/config.json)
    if (workspaceId) {
      const projectPrompts = await this.getProjectActivePrompts(workspaceId);
      if (projectPrompts && Object.keys(projectPrompts).length > 0) {
        return projectPrompts;
      }
    }

    // 2. 检查工作区级配置
    if (workspaceId && this._settings.workspaceActivePrompts?.[workspaceId]) {
      return this._settings.workspaceActivePrompts[workspaceId];
    }

    // 3. 回退到全局配置
    return this._settings.activePrompts || { ...DEFAULT_ACTIVE_PROMPTS };
  }

  /**
   * 获取指定工作区的子分类活跃提示词（新方法）
   * 支持多活跃提示词场景（如分层提交的单文件和批量描述）
   * @param category - 提示词分类
   * @param subCategory - 子分类（可选）
   * @param workspaceId - 工作区 ID（可选，不传则使用全局）
   * @returns 活跃提示词映射（category -> subCategory -> promptKey）
   */
  public async getActivePromptsBySubCategory(
    category?: PromptCategory,
    subCategory?: string,
    workspaceId?: string,
  ): Promise<Record<PromptCategory, Record<string, string>>> {
    // 1. 检查项目级配置 (.dish/config.json)
    if (workspaceId) {
      const projectPrompts =
        await this.getProjectActivePromptsBySubCategory(workspaceId);
      if (projectPrompts && Object.keys(projectPrompts).length > 0) {
        if (category && subCategory) {
          // 返回完整的结构，但只包含指定的子分类
          const result: Record<
            PromptCategory,
            Record<string, string>
          > = {} as any;
          const subCategoryValue = projectPrompts[category]?.[subCategory];
          if (subCategoryValue) {
            result[category] = { [subCategory]: subCategoryValue } as Record<
              string,
              string
            >;
          }
          return result;
        } else if (category) {
          // 返回指定分类的所有子分类
          const result: Record<
            PromptCategory,
            Record<string, string>
          > = {} as any;
          if (projectPrompts[category]) {
            result[category] = projectPrompts[category];
          }
          return result;
        }
        return projectPrompts;
      }
    }

    // 2. 检查工作区级配置
    if (
      workspaceId &&
      this._settings.workspaceActivePromptsBySubCategory?.[workspaceId]
    ) {
      const workspacePrompts =
        this._settings.workspaceActivePromptsBySubCategory[workspaceId];
      if (category && subCategory) {
        const result: Record<
          PromptCategory,
          Record<string, string>
        > = {} as any;
        const subCategoryValue = workspacePrompts[category]?.[subCategory];
        if (subCategoryValue) {
          result[category] = { [subCategory]: subCategoryValue } as Record<
            string,
            string
          >;
        }
        return result;
      } else if (category) {
        const result: Record<
          PromptCategory,
          Record<string, string>
        > = {} as any;
        if (workspacePrompts[category]) {
          result[category] = workspacePrompts[category];
        }
        return result;
      }
      return workspacePrompts;
    }

    // 3. 回退到全局配置
    const globalPrompts = this._settings.activePromptsBySubCategory || {
      ...DEFAULT_ACTIVE_PROMPTS_BY_SUBCATEGORY,
    };
    if (category && subCategory) {
      const result: Record<PromptCategory, Record<string, string>> = {} as any;
      const subCategoryValue = globalPrompts[category]?.[subCategory];
      if (subCategoryValue) {
        result[category] = { [subCategory]: subCategoryValue } as Record<
          string,
          string
        >;
      }
      return result;
    } else if (category) {
      const result: Record<PromptCategory, Record<string, string>> = {} as any;
      if (globalPrompts[category]) {
        result[category] = globalPrompts[category];
      }
      return result;
    }
    return globalPrompts;
  }

  /**
   * 获取特定提示词键的活跃内容（支持子分类）
   * @param promptKey - 提示词键
   * @param workspaceId - 工作区 ID（可选）
   * @returns 活跃的提示词内容，如果该提示词不是活跃的则返回 null
   */
  public async getActivePromptContentByKey(
    promptKey: string,
    workspaceId?: string,
  ): Promise<string | null> {
    // 1. 优先尝试从系统映射获取分类
    let category = PROMPT_CATEGORIES[promptKey as PromptKey];

    // 2. 如果没有找到，尝试从提示词元数据获取（支持自定义提示词）
    if (!category) {
      try {
        const promptManager = PromptManagerService.getInstance();
        const promptDetail = promptManager.getPromptDetail(promptKey);
        if (promptDetail.category) {
          category = promptDetail.category;
        }
      } catch (error) {
        // 忽略错误，继续使用默认逻辑
      }
    }

    if (!category) {
      return null;
    }

    // 3. 优先检查系统预定义的子分类映射
    let subCategory = COMMIT_SUB_CATEGORIES[promptKey as PromptKey];

    // 4. 如果没有找到，尝试从提示词元数据获取（支持自定义提示词）
    if (!subCategory && category === PromptCategory.Commit) {
      try {
        const promptManager = PromptManagerService.getInstance();
        const promptDetail = promptManager.getPromptDetail(promptKey);
        if (promptDetail.subCategory) {
          subCategory = promptDetail.subCategory;
        }
      } catch (error) {
        // 忽略错误，继续使用默认逻辑
      }
    }

    // 如果有子分类，使用子分类级别的活跃提示词
    if (subCategory) {
      const subCategoryPrompts = await this.getActivePromptsBySubCategory(
        category,
        subCategory as string,
        workspaceId,
      );
      // 检查当前提示词是否在该子分类中活跃
      const activeKey = subCategoryPrompts[category]?.[subCategory as string];
      if (activeKey === promptKey) {
        return promptKey;
      }
    } else {
      // 没有子分类，使用传统的分类级别活跃提示词
      const categoryPrompts = await this.getActivePrompts(workspaceId);
      if (categoryPrompts[category] === promptKey) {
        return promptKey;
      }
    }

    return null;
  }

  /**
   * 设置活跃提示词（支持多级存储）- 向后兼容
   * @param category - 提示词分类
   * @param promptKey - 提示词键
   * @param storageLevel - 存储级别
   * @param workspaceId - 工作区 ID（workspace/project 级别必需）
   */
  public async setActivePrompt(
    category: PromptCategory,
    promptKey: string,
    storageLevel: StorageLevel,
    workspaceId?: string,
  ): Promise<void> {
    console.log("[FeaturesSettingsManager] setActivePrompt called:", {
      category,
      promptKey,
      storageLevel,
      workspaceId,
    });

    // 1. 优先检查系统预定义的子分类映射
    let subCategory = COMMIT_SUB_CATEGORIES[promptKey as PromptKey];

    // 2. 如果没有找到，尝试从提示词元数据中获取（支持自定义提示词）
    if (!subCategory && category === PromptCategory.Commit) {
      try {
        const promptManager = PromptManagerService.getInstance();
        const promptDetail = promptManager.getPromptDetail(promptKey);
        if (promptDetail.subCategory) {
          subCategory = promptDetail.subCategory;
          console.log(
            "[FeaturesSettingsManager] Found subCategory from metadata:",
            { promptKey, subCategory },
          );
        }
      } catch (error) {
        console.log(
          "[FeaturesSettingsManager] Could not get subCategory from metadata:",
          error,
        );
      }
    }

    if (subCategory) {
      // 使用新的子分类级别方法
      await this.setActivePromptBySubCategory(
        category,
        subCategory as string,
        promptKey,
        storageLevel,
        workspaceId,
      );
    } else {
      // 使用传统的分类级别方法
      await this.setActivePromptByCategory(
        category,
        promptKey,
        storageLevel,
        workspaceId,
      );
    }
  }

  /**
   * 设置分类级别的活跃提示词（传统方法）
   */
  private async setActivePromptByCategory(
    category: PromptCategory,
    promptKey: string,
    storageLevel: StorageLevel,
    workspaceId?: string,
  ): Promise<void> {
    switch (storageLevel) {
      case "global":
        if (!this._settings.activePrompts) {
          this._settings.activePrompts = {} as Record<PromptCategory, string>;
        }
        this._settings.activePrompts[category] = promptKey;
        console.log(
          "[FeaturesSettingsManager] Updated activePrompts:",
          this._settings.activePrompts,
        );
        await this.saveSettings();
        console.log("[FeaturesSettingsManager] Settings saved");
        break;

      case "workspace":
        if (!workspaceId) {
          throw new Error(
            "workspaceId is required for workspace-level storage",
          );
        }
        if (!this._settings.workspaceActivePrompts) {
          this._settings.workspaceActivePrompts = {};
        }
        if (!this._settings.workspaceActivePrompts[workspaceId]) {
          this._settings.workspaceActivePrompts[workspaceId] = {} as Record<
            PromptCategory,
            string
          >;
        }
        this._settings.workspaceActivePrompts[workspaceId][category] =
          promptKey;
        await this.saveSettings();
        break;

      case "project":
        if (!workspaceId) {
          throw new Error("workspaceId is required for project-level storage");
        }
        await this.setProjectActivePrompt(category, promptKey, workspaceId);
        break;
    }
  }

  /**
   * 设置子分类级别的活跃提示词（新方法）
   * @param category - 提示词分类
   * @param subCategory - 子分类
   * @param promptKey - 提示词键
   * @param storageLevel - 存储级别
   * @param workspaceId - 工作区 ID（workspace/project 级别必需）
   */
  public async setActivePromptBySubCategory(
    category: PromptCategory,
    subCategory: string,
    promptKey: string,
    storageLevel: StorageLevel,
    workspaceId?: string,
  ): Promise<void> {
    console.log(
      "[FeaturesSettingsManager] setActivePromptBySubCategory called:",
      { category, subCategory, promptKey, storageLevel, workspaceId },
    );

    switch (storageLevel) {
      case "global":
        if (!this._settings.activePromptsBySubCategory) {
          this._settings.activePromptsBySubCategory = {} as Record<
            PromptCategory,
            Record<string, string>
          >;
        }
        if (!this._settings.activePromptsBySubCategory[category]) {
          this._settings.activePromptsBySubCategory[category] = {};
        }
        this._settings.activePromptsBySubCategory[category][subCategory] =
          promptKey;
        console.log(
          "[FeaturesSettingsManager] Updated activePromptsBySubCategory:",
          this._settings.activePromptsBySubCategory,
        );
        await this.saveSettings();
        console.log("[FeaturesSettingsManager] Settings saved");
        break;

      case "workspace":
        if (!workspaceId) {
          throw new Error(
            "workspaceId is required for workspace-level storage",
          );
        }
        if (!this._settings.workspaceActivePromptsBySubCategory) {
          this._settings.workspaceActivePromptsBySubCategory = {};
        }
        if (!this._settings.workspaceActivePromptsBySubCategory[workspaceId]) {
          this._settings.workspaceActivePromptsBySubCategory[workspaceId] =
            {} as Record<PromptCategory, Record<string, string>>;
        }
        if (
          !this._settings.workspaceActivePromptsBySubCategory[workspaceId][
            category
          ]
        ) {
          this._settings.workspaceActivePromptsBySubCategory[workspaceId][
            category
          ] = {};
        }
        this._settings.workspaceActivePromptsBySubCategory[workspaceId][
          category
        ][subCategory] = promptKey;
        await this.saveSettings();
        break;

      case "project":
        if (!workspaceId) {
          throw new Error("workspaceId is required for project-level storage");
        }
        await this.setProjectActivePromptBySubCategory(
          category,
          subCategory,
          promptKey,
          workspaceId,
        );
        break;
    }
  }

  /**
   * 获取项目级活跃提示词
   * @param workspaceId - 工作区 ID
   * @returns 活跃提示词映射，如果不存在则返回 null
   */
  private async getProjectActivePrompts(
    workspaceId: string,
  ): Promise<Record<PromptCategory, string> | null> {
    const workspace = workspaceManager.getWorkspaceById(workspaceId);
    if (!workspace) {
      return null;
    }

    const configPath = path.join(workspace.path, ".dish", "config.json");

    try {
      if (fs.existsSync(configPath)) {
        const content = await fs.promises.readFile(configPath, "utf-8");
        const config = JSON.parse(content);
        return config.activePrompts || null;
      }
    } catch (error) {
      console.error("Failed to read project config:", error);
    }

    return null;
  }

  /**
   * 设置项目级活跃提示词
   * @param category - 提示词分类
   * @param promptKey - 提示词键
   * @param workspaceId - 工作区 ID
   */
  private async setProjectActivePrompt(
    category: PromptCategory,
    promptKey: string,
    workspaceId: string,
  ): Promise<void> {
    const workspace = workspaceManager.getWorkspaceById(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found for ID: ${workspaceId}`);
    }

    const configPath = path.join(workspace.path, ".dish", "config.json");

    let config: any = { activePrompts: {} };

    // 读取现有配置
    if (fs.existsSync(configPath)) {
      try {
        const content = await fs.promises.readFile(configPath, "utf-8");
        config = JSON.parse(content);
      } catch (error) {
        console.error("Failed to parse project config:", error);
      }
    }

    // 更新配置
    if (!config.activePrompts) {
      config.activePrompts = {};
    }
    config.activePrompts[category] = promptKey;

    // 保存配置
    try {
      await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
      await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save project config: ${error}`);
    }
  }

  /**
   * 获取项目级子分类活跃提示词
   * @param workspaceId - 工作区 ID
   * @returns 子分类活跃提示词映射，如果不存在则返回 null
   */
  private async getProjectActivePromptsBySubCategory(
    workspaceId: string,
  ): Promise<Record<PromptCategory, Record<string, string>> | null> {
    const workspace = workspaceManager.getWorkspaceById(workspaceId);
    if (!workspace) {
      return null;
    }

    const configPath = path.join(workspace.path, ".dish", "config.json");

    try {
      if (fs.existsSync(configPath)) {
        const content = await fs.promises.readFile(configPath, "utf-8");
        const config = JSON.parse(content);
        return config.activePromptsBySubCategory || null;
      }
    } catch (error) {
      console.error("Failed to read project config:", error);
    }

    return null;
  }

  /**
   * 设置项目级子分类活跃提示词
   * @param category - 提示词分类
   * @param subCategory - 子分类
   * @param promptKey - 提示词键
   * @param workspaceId - 工作区 ID
   */
  private async setProjectActivePromptBySubCategory(
    category: PromptCategory,
    subCategory: string,
    promptKey: string,
    workspaceId: string,
  ): Promise<void> {
    const workspace = workspaceManager.getWorkspaceById(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found for ID: ${workspaceId}`);
    }

    const configPath = path.join(workspace.path, ".dish", "config.json");

    let config: any = { activePromptsBySubCategory: {} };

    // 读取现有配置
    if (fs.existsSync(configPath)) {
      try {
        const content = await fs.promises.readFile(configPath, "utf-8");
        config = JSON.parse(content);
      } catch (error) {
        console.error("Failed to parse project config:", error);
      }
    }

    // 更新配置
    if (!config.activePromptsBySubCategory) {
      config.activePromptsBySubCategory = {};
    }
    if (!config.activePromptsBySubCategory[category]) {
      config.activePromptsBySubCategory[category] = {};
    }
    config.activePromptsBySubCategory[category][subCategory] = promptKey;

    // 保存配置
    try {
      await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
      await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save project config: ${error}`);
    }
  }

  /**
   * 获取活跃提示词的存储位置信息（用于 UI 显示）- 向后兼容
   * @param category - 提示词分类
   * @param workspaceId - 工作区 ID（可选）
   * @returns 存储位置信息
   */
  public async getActivePromptSource(
    category: PromptCategory,
    workspaceId?: string,
  ): Promise<ActivePromptSource> {
    console.log("[FeaturesSettingsManager] getActivePromptSource called:", {
      category,
      workspaceId,
    });
    // 1. 检查项目级
    if (workspaceId) {
      const projectPrompts = await this.getProjectActivePrompts(workspaceId);
      if (projectPrompts?.[category]) {
        console.log("[FeaturesSettingsManager] Found project level");
        return { source: "project", workspaceId, category };
      }
    }

    // 2. 检查工作区级
    if (
      workspaceId &&
      this._settings.workspaceActivePrompts?.[workspaceId]?.[category]
    ) {
      console.log("[FeaturesSettingsManager] Found workspace level");
      return { source: "workspace", workspaceId, category };
    }

    // 3. 全局级
    console.log("[FeaturesSettingsManager] Using global level");
    return { source: "global", category };
  }

  /**
   * 获取特定提示词键的存储位置信息（支持子分类级别）
   * @param promptKey - 提示词键
   * @param workspaceId - 工作区 ID（可选）
   * @returns 存储位置信息，如果该提示词不是活跃的则返回 null
   */
  public async getPromptSource(
    promptKey: string,
    workspaceId?: string,
  ): Promise<ActivePromptSource | null> {
    // 1. 优先尝试从系统映射获取分类
    let category = PROMPT_CATEGORIES[promptKey as PromptKey];

    // 2. 如果没有找到，尝试从提示词元数据获取（支持自定义提示词）
    if (!category) {
      try {
        const promptManager = PromptManagerService.getInstance();
        const promptDetail = promptManager.getPromptDetail(promptKey);
        if (promptDetail.category) {
          category = promptDetail.category;
        }
      } catch (error) {
        // 忽略错误，继续使用默认逻辑
      }
    }

    if (!category) {
      return null;
    }

    // 3. 优先检查系统预定义的子分类映射
    let subCategory = COMMIT_SUB_CATEGORIES[promptKey as PromptKey];

    // 4. 如果没有找到，尝试从提示词元数据获取（支持自定义提示词）
    if (!subCategory && category === PromptCategory.Commit) {
      try {
        const promptManager = PromptManagerService.getInstance();
        const promptDetail = promptManager.getPromptDetail(promptKey);
        if (promptDetail.subCategory) {
          subCategory = promptDetail.subCategory;
        }
      } catch (error) {
        // 忽略错误，继续使用默认逻辑
      }
    }

    if (subCategory) {
      // 子分类级别检查
      // 1. 检查项目级
      if (workspaceId) {
        const projectPrompts =
          await this.getProjectActivePromptsBySubCategory(workspaceId);
        if (
          projectPrompts &&
          projectPrompts[category]?.[subCategory as string] === promptKey
        ) {
          return {
            source: "project",
            workspaceId,
            category,
            promptKey,
            subCategory: subCategory as CommitSubCategory,
          };
        }
      }

      // 2. 检查工作区级
      if (
        workspaceId &&
        this._settings.workspaceActivePromptsBySubCategory?.[workspaceId]?.[
          category
        ]?.[subCategory as string] === promptKey
      ) {
        return {
          source: "workspace",
          workspaceId,
          category,
          promptKey,
          subCategory: subCategory as CommitSubCategory,
        };
      }

      // 3. 全局级
      const globalPrompts = this._settings.activePromptsBySubCategory || {
        ...DEFAULT_ACTIVE_PROMPTS_BY_SUBCATEGORY,
      };
      if (globalPrompts[category]?.[subCategory as string] === promptKey) {
        return {
          source: "global",
          category,
          promptKey,
          subCategory: subCategory as CommitSubCategory,
        };
      }
    } else {
      // 传统分类级别检查
      // 1. 检查项目级
      if (workspaceId) {
        const projectPrompts = await this.getProjectActivePrompts(workspaceId);
        if (projectPrompts && projectPrompts[category] === promptKey) {
          return { source: "project", workspaceId, category, promptKey };
        }
      }

      // 2. 检查工作区级
      if (
        workspaceId &&
        this._settings.workspaceActivePrompts?.[workspaceId]?.[category] ===
          promptKey
      ) {
        return { source: "workspace", workspaceId, category, promptKey };
      }

      // 3. 全局级
      const globalPrompts = this._settings.activePrompts || {
        ...DEFAULT_ACTIVE_PROMPTS,
      };
      if (globalPrompts[category] === promptKey) {
        return { source: "global", category, promptKey };
      }
    }

    return null;
  }

  /**
   * 获取所有工作区的活跃提示词状态（用于 UI 显示）
   * @returns 工作区活跃状态数组
   */
  public async getAllWorkspaceActiveStates(): Promise<WorkspaceActiveState[]> {
    const workspaces = workspaceManager.getAllWorkspaces();
    const result: WorkspaceActiveState[] = [];

    for (const workspace of workspaces) {
      const activePrompts = await this.getActivePrompts(workspace.id);
      const activePromptsBySubCategory =
        (await this.getActivePromptsBySubCategory(
          undefined,
          undefined,
          workspace.id,
        )) as Record<PromptCategory, Record<string, string>>;

      // 获取任意一个分类的源信息（用于显示该工作区的配置来源）
      // 优先检查子分类级别，如果没有则检查分类级别
      let source: StorageLevel = "global";
      const anyCategory = PromptCategory.Commit;

      // 检查项目级
      const projectPrompts = await this.getProjectActivePrompts(workspace.id);
      const projectSubPrompts = await this.getProjectActivePromptsBySubCategory(
        workspace.id,
      );
      if (projectPrompts?.[anyCategory] || projectSubPrompts?.[anyCategory]) {
        source = "project";
      } else if (
        workspace.id &&
        this._settings.workspaceActivePrompts?.[workspace.id]?.[anyCategory]
      ) {
        // 检查工作区级
        source = "workspace";
      } else if (
        workspace.id &&
        this._settings.workspaceActivePromptsBySubCategory?.[workspace.id]?.[
          anyCategory
        ]
      ) {
        // 检查工作区级子分类
        source = "workspace";
      } else {
        // 全局级
        source = "global";
      }

      result.push({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        activePrompts,
        activePromptsBySubCategory,
        source,
      });
    }

    return result;
  }

  /**
   * 获取指定工作区的活跃提示词（向后兼容）
   * @param category - 提示词分类
   * @param workspaceId - 工作区 ID
   * @returns 活跃提示词键
   */
  public getActivePromptByCategory(
    category: PromptCategory,
    workspaceId?: string,
  ): string | undefined {
    // 如果有工作区 ID，优先从工作区配置获取
    if (workspaceId && this._settings.workspaceActivePrompts?.[workspaceId]) {
      return this._settings.workspaceActivePrompts[workspaceId][category];
    }
    // 回退到全局
    return this._settings.activePrompts?.[category];
  }

  private async loadSettings(): Promise<void> {
    const storedSettings = this.context.globalState.get<FeaturesSettings>(
      FeaturesSettingsManager.STORAGE_KEY,
    );

    if (storedSettings) {
      this._settings = { ...this._settings, ...storedSettings };
    } else {
      // No stored settings: initialize with default active prompts
      this._settings.activePrompts = { ...DEFAULT_ACTIVE_PROMPTS };
      this._settings.activePromptsBySubCategory = {
        ...DEFAULT_ACTIVE_PROMPTS_BY_SUBCATEGORY,
      };
    }

    // 确保子分类默认值存在（向后兼容）
    if (!this._settings.activePromptsBySubCategory) {
      this._settings.activePromptsBySubCategory = {
        ...DEFAULT_ACTIVE_PROMPTS_BY_SUBCATEGORY,
      };
    }
  }

  private async saveSettings(): Promise<void> {
    await this.context.globalState.update(
      FeaturesSettingsManager.STORAGE_KEY,
      this._settings,
    );
  }
}
