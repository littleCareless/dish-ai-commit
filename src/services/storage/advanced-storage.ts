import { DISH_CONFIG_PREFIX } from "@/config/constants";
import * as vscode from "vscode";

export interface AdvancedStorageData {
  verbosity: number;
  rateLimitSeconds: number;
  timeout: number;
  retryAttempts: number;
  consecutiveMistakeLimit: number;
  maxTokens?: number;
}

/**
 * 高级设置存储 - 存储在globalState中
 * 负责管理高级设置
 */
export class AdvancedStorage {
  private static readonly STORAGE_KEY = `${DISH_CONFIG_PREFIX}_advanced`;
  private static instance: AdvancedStorage;

  // 默认值
  private readonly defaults: AdvancedStorageData = {
    verbosity: 1,
    rateLimitSeconds: 0,
    timeout: 30000,
    retryAttempts: 3,
    consecutiveMistakeLimit: 3,
  };

  private constructor(private context: vscode.ExtensionContext) {}

  public static getInstance(context: vscode.ExtensionContext): AdvancedStorage {
    if (!AdvancedStorage.instance) {
      AdvancedStorage.instance = new AdvancedStorage(context);
    }
    return AdvancedStorage.instance;
  }

  /**
   * 加载高级设置
   */
  public async load(): Promise<AdvancedStorageData> {
    const stored = this.context.globalState.get<AdvancedStorageData>(
      AdvancedStorage.STORAGE_KEY
    );

    if (!stored) {
      return { ...this.defaults };
    }

    return { ...this.defaults, ...stored };
  }

  /**
   * 保存高级设置
   */
  public async save(data: AdvancedStorageData): Promise<void> {
    await this.context.globalState.update(AdvancedStorage.STORAGE_KEY, data);
  }

  /**
   * 更新部分设置
   */
  public async update(partial: Partial<AdvancedStorageData>): Promise<void> {
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
   * 获取单个设置值
   */
  public async get<K extends keyof AdvancedStorageData>(
    key: K
  ): Promise<AdvancedStorageData[K]> {
    const data = await this.load();
    return data[key];
  }

  /**
   * 设置单个设置值
   */
  public async set<K extends keyof AdvancedStorageData>(
    key: K,
    value: AdvancedStorageData[K]
  ): Promise<void> {
    const data = await this.load();
    data[key] = value;
    await this.save(data);
  }

  /**
   * 获取调试模式状态
   */
  public async isDebugMode(): Promise<boolean> {
    const verbosity = await this.get("verbosity");
    return verbosity >= 2;
  }

  /**
   * 设置调试模式
   */
  public async setDebugMode(enabled: boolean): Promise<void> {
    await this.set("verbosity", enabled ? 2 : 1);
  }
}
