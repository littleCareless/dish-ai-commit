import { DISH_CONFIG_PREFIX } from "@/config/constants";
import { PromptCategory, PromptKey, StorageLevel, ActivePromptSource, WorkspaceActiveState } from "@shared/types/prompts";
import { workspaceManager } from "@/services/core/workspace-manager";
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

  // Active prompts by category (全局默认)
  activePrompts?: Record<PromptCategory, string>;

  // 工作区级活跃提示词（按 workspace-id 存储）
  workspaceActivePrompts?: Record<string, Record<PromptCategory, string>>;

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
    context: vscode.ExtensionContext
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
    console.log('[FeaturesSettingsManager] getSettings():', settings);
    return settings;
  }

  public async updateSettings(
    partialSettings: Partial<FeaturesSettings>
  ): Promise<void> {
    this._settings = { ...this._settings, ...partialSettings };
    await this.saveSettings();
  }

  /**
   * 获取指定工作区的活跃提示词
   * 优先级：项目 > 工作区 > 全局
   * @param workspaceId - 工作区 ID（可选，不传则使用全局）
   * @returns 活跃提示词映射
   */
  public async getActivePrompts(
    workspaceId?: string
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
   * 设置活跃提示词（支持多级存储）
   * @param category - 提示词分类
   * @param promptKey - 提示词键
   * @param storageLevel - 存储级别
   * @param workspaceId - 工作区 ID（workspace/project 级别必需）
   */
  public async setActivePrompt(
    category: PromptCategory,
    promptKey: string,
    storageLevel: StorageLevel,
    workspaceId?: string
  ): Promise<void> {
    console.log('[FeaturesSettingsManager] setActivePrompt called:', { category, promptKey, storageLevel, workspaceId });
    switch (storageLevel) {
      case 'global':
        if (!this._settings.activePrompts) {
          this._settings.activePrompts = {} as Record<PromptCategory, string>;
        }
        this._settings.activePrompts[category] = promptKey;
        console.log('[FeaturesSettingsManager] Updated activePrompts:', this._settings.activePrompts);
        await this.saveSettings();
        console.log('[FeaturesSettingsManager] Settings saved');
        break;

      case 'workspace':
        if (!workspaceId) {
          throw new Error('workspaceId is required for workspace-level storage');
        }
        if (!this._settings.workspaceActivePrompts) {
          this._settings.workspaceActivePrompts = {};
        }
        if (!this._settings.workspaceActivePrompts[workspaceId]) {
          this._settings.workspaceActivePrompts[workspaceId] = {} as Record<PromptCategory, string>;
        }
        this._settings.workspaceActivePrompts[workspaceId][category] = promptKey;
        await this.saveSettings();
        break;

      case 'project':
        if (!workspaceId) {
          throw new Error('workspaceId is required for project-level storage');
        }
        await this.setProjectActivePrompt(category, promptKey, workspaceId);
        break;
    }
  }

  /**
   * 获取项目级活跃提示词
   * @param workspaceId - 工作区 ID
   * @returns 活跃提示词映射，如果不存在则返回 null
   */
  private async getProjectActivePrompts(
    workspaceId: string
  ): Promise<Record<PromptCategory, string> | null> {
    const workspace = workspaceManager.getWorkspaceById(workspaceId);
    if (!workspace) return null;

    const configPath = path.join(workspace.path, '.dish', 'config.json');

    try {
      if (fs.existsSync(configPath)) {
        const content = await fs.promises.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        return config.activePrompts || null;
      }
    } catch (error) {
      console.error('Failed to read project config:', error);
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
    workspaceId: string
  ): Promise<void> {
    const workspace = workspaceManager.getWorkspaceById(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found for ID: ${workspaceId}`);
    }

    const configPath = path.join(workspace.path, '.dish', 'config.json');

    let config: any = { activePrompts: {} };

    // 读取现有配置
    if (fs.existsSync(configPath)) {
      try {
        const content = await fs.promises.readFile(configPath, 'utf-8');
        config = JSON.parse(content);
      } catch (error) {
        console.error('Failed to parse project config:', error);
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
      await fs.promises.writeFile(
        configPath,
        JSON.stringify(config, null, 2)
      );
    } catch (error) {
      throw new Error(`Failed to save project config: ${error}`);
    }
  }

  /**
   * 获取活跃提示词的存储位置信息（用于 UI 显示）
   * @param category - 提示词分类
   * @param workspaceId - 工作区 ID（可选）
   * @returns 存储位置信息
   */
  public async getActivePromptSource(
    category: PromptCategory,
    workspaceId?: string
  ): Promise<ActivePromptSource> {
    console.log('[FeaturesSettingsManager] getActivePromptSource called:', { category, workspaceId });
    // 1. 检查项目级
    if (workspaceId) {
      const projectPrompts = await this.getProjectActivePrompts(workspaceId);
      if (projectPrompts?.[category]) {
        console.log('[FeaturesSettingsManager] Found project level');
        return { source: 'project', workspaceId, category };
      }
    }

    // 2. 检查工作区级
    if (workspaceId && this._settings.workspaceActivePrompts?.[workspaceId]?.[category]) {
      console.log('[FeaturesSettingsManager] Found workspace level');
      return { source: 'workspace', workspaceId, category };
    }

    // 3. 全局级
    console.log('[FeaturesSettingsManager] Using global level');
    return { source: 'global', category };
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

      // 获取任意一个分类的源信息（用于显示该工作区的配置来源）
      const anyCategory = PromptCategory.Commit;
      const sourceInfo = await this.getActivePromptSource(anyCategory, workspace.id);

      result.push({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        activePrompts,
        source: sourceInfo.source,
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
    workspaceId?: string
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
      FeaturesSettingsManager.STORAGE_KEY
    );

    if (storedSettings) {
      this._settings = { ...this._settings, ...storedSettings };
    } else {
      // No stored settings: initialize with default active prompts
      this._settings.activePrompts = { ...DEFAULT_ACTIVE_PROMPTS };
    }
  }

  private async saveSettings(): Promise<void> {
    await this.context.globalState.update(
      FeaturesSettingsManager.STORAGE_KEY,
      this._settings
    );
  }
}
