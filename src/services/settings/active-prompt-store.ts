import { DISH_CONFIG_PREFIX } from "@/config/constants";
import { workspaceManager } from "@/services/core/workspace-manager";
import { PromptManagerService } from "@/services/core/prompt-manager-service";
import {
  ActivePromptSource,
  COMMIT_SUB_CATEGORIES,
  CommitSubCategory,
  PROMPT_CATEGORIES,
  PromptCategory,
  PromptKey,
  StorageLevel,
  WorkspaceActiveState,
} from "@shared/types/prompts";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

export interface ActivePromptSettings {
  activePrompts?: Record<PromptCategory, string>;
  workspaceActivePrompts?: Record<string, Record<PromptCategory, string>>;
  activePromptsBySubCategory?: Record<PromptCategory, Record<string, string>>;
  workspaceActivePromptsBySubCategory?: Record<
    string,
    Record<PromptCategory, Record<string, string>>
  >;
  activePromptKey?: string;
}

export const DEFAULT_ACTIVE_PROMPTS: Record<PromptCategory, string> = {
  [PromptCategory.Commit]: PromptKey.GenerateCommitSystem,
  [PromptCategory.CodeReview]: PromptKey.CodeReviewSystem,
  [PromptCategory.PR]: PromptKey.PRSummarySystem,
  [PromptCategory.Report]: PromptKey.WeeklyReport,
  [PromptCategory.Git]: PromptKey.BranchNameSystem,
  [PromptCategory.Custom]: PromptKey.GenerateCommitSimple,
};

export const DEFAULT_ACTIVE_PROMPTS_BY_SUBCATEGORY: Record<
  PromptCategory,
  Record<string, string>
> = {
  [PromptCategory.Commit]: {
    standard: PromptKey.GenerateCommitSystem,
    layered_file: PromptKey.LayeredCommitFile,
    layered_batch: PromptKey.LayeredCommitBatch,
    system: PromptKey.GenerateCommitFallbackSystem,
  },
  [PromptCategory.CodeReview]: {},
  [PromptCategory.PR]: {},
  [PromptCategory.Report]: {},
  [PromptCategory.Git]: {},
  [PromptCategory.Custom]: {},
};

export class ActivePromptStore {
  private static instance: ActivePromptStore;
  private static readonly STORAGE_KEY = `${DISH_CONFIG_PREFIX}_active_prompts`;
  private static readonly LEGACY_FEATURES_STORAGE_KEY = `${DISH_CONFIG_PREFIX}_features_settings`;

  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  private state: ActivePromptSettings = {
    activePrompts: { ...DEFAULT_ACTIVE_PROMPTS },
    activePromptsBySubCategory: { ...DEFAULT_ACTIVE_PROMPTS_BY_SUBCATEGORY },
    workspaceActivePrompts: {},
    workspaceActivePromptsBySubCategory: {},
    activePromptKey: undefined,
  };

  private constructor(private context: vscode.ExtensionContext) {}

  public static getInstance(
    context: vscode.ExtensionContext,
  ): ActivePromptStore {
    if (!ActivePromptStore.instance) {
      ActivePromptStore.instance = new ActivePromptStore(context);
    }
    return ActivePromptStore.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    if (!this.initializationPromise) {
      this.initializationPromise = this.loadState().then(() => {
        this.initialized = true;
      });
    }
    await this.initializationPromise;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await this.initialize();
  }

  public async getActivePrompts(
    workspaceId?: string,
  ): Promise<Record<PromptCategory, string>> {
    await this.ensureInitialized();

    if (workspaceId) {
      const projectPrompts = await this.getProjectActivePrompts(workspaceId);
      if (projectPrompts && Object.keys(projectPrompts).length > 0) {
        return projectPrompts;
      }
    }

    if (workspaceId && this.state.workspaceActivePrompts?.[workspaceId]) {
      return { ...this.state.workspaceActivePrompts[workspaceId] };
    }

    return { ...(this.state.activePrompts || DEFAULT_ACTIVE_PROMPTS) };
  }

  public async getActivePromptsBySubCategory(
    category?: PromptCategory,
    subCategory?: string,
    workspaceId?: string,
  ): Promise<Record<PromptCategory, Record<string, string>>> {
    await this.ensureInitialized();

    if (workspaceId) {
      const projectPrompts =
        await this.getProjectActivePromptsBySubCategory(workspaceId);
      if (projectPrompts && Object.keys(projectPrompts).length > 0) {
        if (category && subCategory) {
          const result: Record<PromptCategory, Record<string, string>> =
            {} as any;
          const subCategoryValue = projectPrompts[category]?.[subCategory];
          if (subCategoryValue) {
            result[category] = { [subCategory]: subCategoryValue } as Record<
              string,
              string
            >;
          }
          return result;
        }
        if (category) {
          const result: Record<PromptCategory, Record<string, string>> =
            {} as any;
          if (projectPrompts[category]) {
            result[category] = projectPrompts[category];
          }
          return result;
        }
        return projectPrompts;
      }
    }

    if (
      workspaceId &&
      this.state.workspaceActivePromptsBySubCategory?.[workspaceId]
    ) {
      const workspacePrompts =
        this.state.workspaceActivePromptsBySubCategory[workspaceId];
      if (category && subCategory) {
        const result: Record<PromptCategory, Record<string, string>> =
          {} as any;
        const subCategoryValue = workspacePrompts[category]?.[subCategory];
        if (subCategoryValue) {
          result[category] = { [subCategory]: subCategoryValue } as Record<
            string,
            string
          >;
        }
        return result;
      }
      if (category) {
        const result: Record<PromptCategory, Record<string, string>> =
          {} as any;
        if (workspacePrompts[category]) {
          result[category] = workspacePrompts[category];
        }
        return result;
      }
      return workspacePrompts;
    }

    const globalPrompts =
      this.state.activePromptsBySubCategory ||
      this.cloneSubCategoryMap(DEFAULT_ACTIVE_PROMPTS_BY_SUBCATEGORY);

    if (category && subCategory) {
      const result: Record<PromptCategory, Record<string, string>> =
        {} as any;
      const subCategoryValue = globalPrompts[category]?.[subCategory];
      if (subCategoryValue) {
        result[category] = { [subCategory]: subCategoryValue } as Record<
          string,
          string
        >;
      }
      return result;
    }
    if (category) {
      const result: Record<PromptCategory, Record<string, string>> =
        {} as any;
      if (globalPrompts[category]) {
        result[category] = globalPrompts[category];
      }
      return result;
    }
    return globalPrompts;
  }

  public async setActivePrompt(
    category: PromptCategory,
    promptKey: string,
    storageLevel: StorageLevel,
    workspaceId?: string,
  ): Promise<void> {
    await this.ensureInitialized();

    let subCategory = COMMIT_SUB_CATEGORIES[promptKey as PromptKey];

    if (!subCategory && category === PromptCategory.Commit) {
      try {
        const promptManager = PromptManagerService.getInstance();
        const promptDetail = promptManager.getPromptDetail(promptKey);
        if (promptDetail.subCategory) {
          subCategory = promptDetail.subCategory;
        }
      } catch (error) {
        console.warn(
          "[ActivePromptStore] Could not determine subCategory from metadata",
          error,
        );
      }
    }

    if (subCategory) {
      await this.setActivePromptBySubCategory(
        category,
        subCategory as string,
        promptKey,
        storageLevel,
        workspaceId,
      );
    } else {
      await this.setActivePromptByCategory(
        category,
        promptKey,
        storageLevel,
        workspaceId,
      );
    }
  }

  public async setActivePromptBySubCategory(
    category: PromptCategory,
    subCategory: string,
    promptKey: string,
    storageLevel: StorageLevel,
    workspaceId?: string,
  ): Promise<void> {
    await this.ensureInitialized();

    switch (storageLevel) {
      case "global":
        if (!this.state.activePromptsBySubCategory) {
          this.state.activePromptsBySubCategory =
            this.cloneSubCategoryMap(DEFAULT_ACTIVE_PROMPTS_BY_SUBCATEGORY);
        }
        if (!this.state.activePromptsBySubCategory[category]) {
          this.state.activePromptsBySubCategory[category] = {};
        }
        this.state.activePromptsBySubCategory[category][subCategory] =
          promptKey;
        await this.saveState();
        break;
      case "workspace":
        if (!workspaceId) {
          throw new Error(
            "workspaceId is required for workspace-level storage",
          );
        }
        if (!this.state.workspaceActivePromptsBySubCategory) {
          this.state.workspaceActivePromptsBySubCategory = {};
        }
        if (!this.state.workspaceActivePromptsBySubCategory[workspaceId]) {
          this.state.workspaceActivePromptsBySubCategory[workspaceId] = {} as Record<
            PromptCategory,
            Record<string, string>
          >;
        }
        if (
          !this.state.workspaceActivePromptsBySubCategory[workspaceId][
            category
          ]
        ) {
          this.state.workspaceActivePromptsBySubCategory[workspaceId][
            category
          ] = {};
        }
        this.state.workspaceActivePromptsBySubCategory[workspaceId][category][
          subCategory
        ] = promptKey;
        await this.saveState();
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

  private async setActivePromptByCategory(
    category: PromptCategory,
    promptKey: string,
    storageLevel: StorageLevel,
    workspaceId?: string,
  ): Promise<void> {
    switch (storageLevel) {
      case "global":
        if (!this.state.activePrompts) {
          this.state.activePrompts = { ...DEFAULT_ACTIVE_PROMPTS };
        }
        this.state.activePrompts[category] = promptKey;
        await this.saveState();
        break;
      case "workspace":
        if (!workspaceId) {
          throw new Error(
            "workspaceId is required for workspace-level storage",
          );
        }
        if (!this.state.workspaceActivePrompts) {
          this.state.workspaceActivePrompts = {};
        }
        if (!this.state.workspaceActivePrompts[workspaceId]) {
          this.state.workspaceActivePrompts[workspaceId] = {} as Record<
            PromptCategory,
            string
          >;
        }
        this.state.workspaceActivePrompts[workspaceId][category] = promptKey;
        await this.saveState();
        break;
      case "project":
        if (!workspaceId) {
          throw new Error("workspaceId is required for project-level storage");
        }
        await this.setProjectActivePrompt(category, promptKey, workspaceId);
        break;
    }
  }

  public async getActivePromptSource(
    category: PromptCategory,
    workspaceId?: string,
  ): Promise<ActivePromptSource> {
    await this.ensureInitialized();

    if (workspaceId) {
      const projectPrompts = await this.getProjectActivePrompts(workspaceId);
      if (projectPrompts?.[category]) {
        return { source: "project", workspaceId, category };
      }
    }

    if (
      workspaceId &&
      this.state.workspaceActivePrompts?.[workspaceId]?.[category]
    ) {
      return { source: "workspace", workspaceId, category };
    }

    return { source: "global", category };
  }

  public async getPromptSource(
    promptKey: string,
    workspaceId?: string,
  ): Promise<ActivePromptSource | null> {
    await this.ensureInitialized();

    let category = PROMPT_CATEGORIES[promptKey as PromptKey];

    if (!category) {
      try {
        const promptManager = PromptManagerService.getInstance();
        const promptDetail = promptManager.getPromptDetail(promptKey);
        if (promptDetail.category) {
          category = promptDetail.category;
        }
      } catch (error) {
        console.warn(
          "[ActivePromptStore] Failed to read prompt metadata for category",
          error,
        );
      }
    }

    if (!category) {
      return null;
    }

    let subCategory = COMMIT_SUB_CATEGORIES[promptKey as PromptKey];

    if (!subCategory && category === PromptCategory.Commit) {
      try {
        const promptManager = PromptManagerService.getInstance();
        const promptDetail = promptManager.getPromptDetail(promptKey);
        if (promptDetail.subCategory) {
          subCategory = promptDetail.subCategory;
        }
      } catch (error) {
        console.warn(
          "[ActivePromptStore] Failed to read prompt metadata for subCategory",
          error,
        );
      }
    }

    if (subCategory) {
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

      if (
        workspaceId &&
        this.state.workspaceActivePromptsBySubCategory?.[workspaceId]?.[
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

      const globalPrompts = this.state.activePromptsBySubCategory ||
        this.cloneSubCategoryMap(DEFAULT_ACTIVE_PROMPTS_BY_SUBCATEGORY);
      if (globalPrompts[category]?.[subCategory as string] === promptKey) {
        return {
          source: "global",
          category,
          promptKey,
          subCategory: subCategory as CommitSubCategory,
        };
      }
    } else {
      if (workspaceId) {
        const projectPrompts = await this.getProjectActivePrompts(workspaceId);
        if (projectPrompts && projectPrompts[category] === promptKey) {
          return { source: "project", workspaceId, category, promptKey };
        }
      }

      if (
        workspaceId &&
        this.state.workspaceActivePrompts?.[workspaceId]?.[category] ===
          promptKey
      ) {
        return { source: "workspace", workspaceId, category, promptKey };
      }

      const globalPrompts = this.state.activePrompts || {
        ...DEFAULT_ACTIVE_PROMPTS,
      };
      if (globalPrompts[category] === promptKey) {
        return { source: "global", category, promptKey };
      }
    }

    return null;
  }

  public async getAllWorkspaceActiveStates(): Promise<WorkspaceActiveState[]> {
    await this.ensureInitialized();

    const workspaces = workspaceManager.getAllWorkspaces();
    const result: WorkspaceActiveState[] = [];

    for (const workspace of workspaces) {
      const activePrompts = await this.getActivePrompts(workspace.id);
      const activePromptsBySubCategory =
        await this.getActivePromptsBySubCategory(
          undefined,
          undefined,
          workspace.id,
        );

      let source: StorageLevel = "global";
      const anyCategory = PromptCategory.Commit;

      const projectPrompts = await this.getProjectActivePrompts(workspace.id);
      const projectSubPrompts = await this.getProjectActivePromptsBySubCategory(
        workspace.id,
      );

      if (projectPrompts?.[anyCategory] || projectSubPrompts?.[anyCategory]) {
        source = "project";
      } else if (
        workspace.id &&
        this.state.workspaceActivePrompts?.[workspace.id]?.[anyCategory]
      ) {
        source = "workspace";
      } else if (
        workspace.id &&
        this.state.workspaceActivePromptsBySubCategory?.[workspace.id]?.[
          anyCategory
        ]
      ) {
        source = "workspace";
      } else {
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

  public getActivePromptByCategory(
    category: PromptCategory,
    workspaceId?: string,
  ): string | undefined {
    if (workspaceId && this.state.workspaceActivePrompts?.[workspaceId]) {
      return this.state.workspaceActivePrompts[workspaceId][category];
    }
    return this.state.activePrompts?.[category];
  }

  private async loadState(): Promise<void> {
    const stored = this.context.globalState.get<ActivePromptSettings>(
      ActivePromptStore.STORAGE_KEY,
    );

    if (stored) {
      this.state = this.applyDefaults(stored);
      return;
    }

    const migrated = await this.migrateFromLegacy();
    this.state = this.applyDefaults(migrated || {});
    await this.saveState();
  }

  private applyDefaults(
    data: Partial<ActivePromptSettings>,
  ): ActivePromptSettings {
    return {
      activePrompts: {
        ...DEFAULT_ACTIVE_PROMPTS,
        ...(data.activePrompts || {}),
      },
      workspaceActivePrompts: this.cloneWorkspaceMap(
        data.workspaceActivePrompts,
      ),
      activePromptsBySubCategory: this.mergeSubCategoryDefaults(
        data.activePromptsBySubCategory,
      ),
      workspaceActivePromptsBySubCategory: this.cloneWorkspaceSubMap(
        data.workspaceActivePromptsBySubCategory,
      ),
      activePromptKey: data.activePromptKey,
    };
  }

  private mergeSubCategoryDefaults(
    overrides?: Record<PromptCategory, Record<string, string>>,
  ): Record<PromptCategory, Record<string, string>> {
    const result = this.cloneSubCategoryMap(DEFAULT_ACTIVE_PROMPTS_BY_SUBCATEGORY);
    if (!overrides) {
      return result;
    }
    for (const category of Object.keys(overrides) as PromptCategory[]) {
      result[category] = {
        ...(result[category] || {}),
        ...overrides[category],
      };
    }
    return result;
  }

  private cloneSubCategoryMap(
    map: Record<PromptCategory, Record<string, string>>,
  ): Record<PromptCategory, Record<string, string>> {
    const result: Record<PromptCategory, Record<string, string>> = {} as any;
    for (const category of Object.keys(map) as PromptCategory[]) {
      result[category] = { ...map[category] };
    }
    return result;
  }

  private cloneWorkspaceMap(
    map?: Record<string, Record<PromptCategory, string>>,
  ): Record<string, Record<PromptCategory, string>> {
    if (!map) {
      return {};
    }
    const result: Record<string, Record<PromptCategory, string>> = {};
    for (const workspace of Object.keys(map)) {
      result[workspace] = { ...map[workspace] } as Record<
        PromptCategory,
        string
      >;
    }
    return result;
  }

  private cloneWorkspaceSubMap(
    map?: Record<string, Record<PromptCategory, Record<string, string>>>,
  ): Record<string, Record<PromptCategory, Record<string, string>>> {
    if (!map) {
      return {};
    }
    const result: Record<
      string,
      Record<PromptCategory, Record<string, string>>
    > = {};
    for (const workspace of Object.keys(map)) {
      result[workspace] = this.cloneSubCategoryMap(map[workspace]);
    }
    return result;
  }

  private async migrateFromLegacy(): Promise<ActivePromptSettings | null> {
    const legacy = this.context.globalState.get<any>(
      ActivePromptStore.LEGACY_FEATURES_STORAGE_KEY,
    );

    if (!legacy || typeof legacy !== "object") {
      return null;
    }

    const {
      activePrompts,
      workspaceActivePrompts,
      activePromptsBySubCategory,
      workspaceActivePromptsBySubCategory,
      activePromptKey,
      ...featureSettings
    } = legacy as ActivePromptSettings & Record<string, unknown>;

    const hasPromptData = Boolean(
      activePrompts ||
        workspaceActivePrompts ||
        activePromptsBySubCategory ||
        workspaceActivePromptsBySubCategory ||
        activePromptKey,
    );

    if (!hasPromptData) {
      return null;
    }

    await this.context.globalState.update(
      ActivePromptStore.LEGACY_FEATURES_STORAGE_KEY,
      featureSettings,
    );

    return {
      activePrompts,
      workspaceActivePrompts,
      activePromptsBySubCategory,
      workspaceActivePromptsBySubCategory,
      activePromptKey,
    };
  }

  private async saveState(): Promise<void> {
    await this.context.globalState.update(
      ActivePromptStore.STORAGE_KEY,
      this.state,
    );
  }

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

    if (fs.existsSync(configPath)) {
      try {
        const content = await fs.promises.readFile(configPath, "utf-8");
        config = JSON.parse(content);
      } catch (error) {
        console.error("Failed to parse project config:", error);
      }
    }

    if (!config.activePrompts) {
      config.activePrompts = {};
    }
    config.activePrompts[category] = promptKey;

    await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
    await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
  }

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

    if (fs.existsSync(configPath)) {
      try {
        const content = await fs.promises.readFile(configPath, "utf-8");
        config = JSON.parse(content);
      } catch (error) {
        console.error("Failed to parse project config:", error);
      }
    }

    if (!config.activePromptsBySubCategory) {
      config.activePromptsBySubCategory = {};
    }
    if (!config.activePromptsBySubCategory[category]) {
      config.activePromptsBySubCategory[category] = {};
    }
    config.activePromptsBySubCategory[category][subCategory] = promptKey;

    await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
    await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
  }
}
