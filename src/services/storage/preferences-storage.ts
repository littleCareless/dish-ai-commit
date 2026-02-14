import { DISH_CONFIG_PREFIX } from "@/config/constants";
import {
  DEFAULT_USER_PREFERENCES,
  UserPreferences,
} from "@/types/settings";
import * as vscode from "vscode";

const clonePreferences = <T extends object>(value: T): T =>
  JSON.parse(JSON.stringify(value));

export type PreferencesStorageData = UserPreferences;

/**
 * 偏好设置存储 - 存储在globalState中
 * 负责管理用户偏好设置
 */
export class PreferencesStorage {
  private static readonly STORAGE_KEY = `${DISH_CONFIG_PREFIX}_preferences`;
  private static instance: PreferencesStorage;

  private readonly defaults: PreferencesStorageData = clonePreferences(
    DEFAULT_USER_PREFERENCES,
  );

  private constructor(private context: vscode.ExtensionContext) {}

  public static getInstance(
    context: vscode.ExtensionContext
  ): PreferencesStorage {
    if (!PreferencesStorage.instance) {
      PreferencesStorage.instance = new PreferencesStorage(context);
    }
    return PreferencesStorage.instance;
  }

  /**
   * 加载偏好设置
   */
  public async load(): Promise<PreferencesStorageData> {
    const stored = this.context.globalState.get<PreferencesStorageData>(
      PreferencesStorage.STORAGE_KEY
    );

    if (!stored) {
      return clonePreferences(this.defaults);
    }

    return {
      ...clonePreferences(this.defaults),
      ...stored,
      skipDiffFileExtensions:
        stored.skipDiffFileExtensions ?? this.defaults.skipDiffFileExtensions,
      skipDiffPathPatterns:
        stored.skipDiffPathPatterns ?? this.defaults.skipDiffPathPatterns,
      maxDiffFileSizeKB:
        stored.maxDiffFileSizeKB ?? this.defaults.maxDiffFileSizeKB,
      autoDetectBinaryFiles:
        stored.autoDetectBinaryFiles ?? this.defaults.autoDetectBinaryFiles,
      respectGitAttributes:
        stored.respectGitAttributes ?? this.defaults.respectGitAttributes,
    };
  }

  /**
   * 保存偏好设置
   */
  public async save(data: PreferencesStorageData): Promise<void> {
    await this.context.globalState.update(PreferencesStorage.STORAGE_KEY, data);
  }

  /**
   * 更新部分设置
   */
  public async update(partial: Partial<PreferencesStorageData>): Promise<void> {
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
  public async get<K extends keyof PreferencesStorageData>(
    key: K
  ): Promise<PreferencesStorageData[K]> {
    const data = await this.load();
    return data[key];
  }

  /**
   * 设置单个设置值
   */
  public async set<K extends keyof PreferencesStorageData>(
    key: K,
    value: PreferencesStorageData[K]
  ): Promise<void> {
    const data = await this.load();
    data[key] = value;
    await this.save(data);
  }
}
