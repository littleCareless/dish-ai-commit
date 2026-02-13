import { DISH_CONFIG_PREFIX } from "@/config/constants";
import * as vscode from "vscode";

export interface FeaturesStorageData {
  // Large Prompt Handling
  largePromptAction: "ask" | "useFallback" | "continue";

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
  diffTarget: "staged" | "all" | "auto";

  // Other Features
  suppressNonCriticalWarnings: boolean;
  weeklyReport: boolean;
  codeReview: boolean;
  generateBranchName: boolean;
  generatePRSummary: boolean;
}

/**
 * 功能开关存储 - 存储在globalState中
 * 负责管理功能开关设置
 */
export class FeaturesStorage {
  private static readonly STORAGE_KEY = `${DISH_CONFIG_PREFIX}_features`;
  private static instance: FeaturesStorage;

  // 默认值
  private readonly defaults: FeaturesStorageData = {
    largePromptAction: "ask",
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
    diffTarget: "auto",

    // Other Features
    suppressNonCriticalWarnings: true,
    weeklyReport: true,
    codeReview: true,
    generateBranchName: true,
    generatePRSummary: true,
  };

  private constructor(private context: vscode.ExtensionContext) {}

  public static getInstance(context: vscode.ExtensionContext): FeaturesStorage {
    if (!FeaturesStorage.instance) {
      FeaturesStorage.instance = new FeaturesStorage(context);
    }
    return FeaturesStorage.instance;
  }

  /**
   * 加载功能设置
   */
  public async load(): Promise<FeaturesStorageData> {
    const stored = this.context.globalState.get<FeaturesStorageData>(
      FeaturesStorage.STORAGE_KEY
    );

    if (!stored) {
      return { ...this.defaults };
    }

    return { ...this.defaults, ...stored };
  }

  /**
   * 保存功能设置
   */
  public async save(data: FeaturesStorageData): Promise<void> {
    await this.context.globalState.update(FeaturesStorage.STORAGE_KEY, data);
  }

  /**
   * 更新部分设置
   */
  public async update(partial: Partial<FeaturesStorageData>): Promise<void> {
    const current = await this.load();
    const updated = { ...current, ...partial };
    await this.save(updated);
  }

  /**
   * 重置为默认值
   */
  public async reset(): Promise<void> {
    await this.save({ ...this.defaults });
  }

  /**
   * 获取单个功能开关
   */
  public async get<K extends keyof FeaturesStorageData>(
    key: K
  ): Promise<FeaturesStorageData[K]> {
    const data = await this.load();
    return data[key];
  }

  /**
   * 设置单个功能开关
   */
  public async set<K extends keyof FeaturesStorageData>(
    key: K,
    value: FeaturesStorageData[K]
  ): Promise<void> {
    const data = await this.load();
    data[key] = value;
    await this.save(data);
  }

  /**
   * 启用指定功能
   */
  public async enable(feature: keyof FeaturesStorageData): Promise<void> {
    await this.set(feature, true as any);
  }

  /**
   * 禁用指定功能
   */
  public async disable(feature: keyof FeaturesStorageData): Promise<void> {
    await this.set(feature, false as any);
  }

  /**
   * 切换功能状态
   */
  public async toggle(feature: keyof FeaturesStorageData): Promise<boolean> {
    const current = await this.get(feature);
    const newValue = !current;
    await this.set(feature, newValue as any);
    return newValue;
  }
}
