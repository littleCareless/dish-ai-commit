import { DISH_CONFIG_PREFIX } from "@/config/constants";
import * as vscode from "vscode";

export interface PreferencesStorageData {
  language: string;
  commitTemperature: number;
  reviewTemperature: number;
  branchNameTemperature: number;
  weeklyReportTemperature: number;

  // Diff 跳过配置
  skipDiffFileExtensions: string[];
  skipDiffPathPatterns: string[];
  maxDiffFileSizeKB: number;
  autoDetectBinaryFiles: boolean;
  respectGitAttributes: boolean;

  // 超时和重试
  timeout: number;
  retryAttempts: number;
  rateLimitSeconds: number;
  consecutiveMistakeLimit: number;
  maxTokens?: number;
}

/**
 * 偏好设置存储 - 存储在globalState中
 * 负责管理用户偏好设置
 */
export class PreferencesStorage {
  private static readonly STORAGE_KEY = `${DISH_CONFIG_PREFIX}_preferences`;
  private static instance: PreferencesStorage;

  // 默认值
  private readonly defaults: PreferencesStorageData = {
    language: "Simplified Chinese",
    commitTemperature: 0.3,
    reviewTemperature: 0.6,
    branchNameTemperature: 0.4,
    weeklyReportTemperature: 0.3,

    skipDiffFileExtensions: [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".bmp",
      ".ico",
      ".webp",
      ".svg",
      ".tiff",
      ".tif",
      ".psd",
      ".ai",
      ".eps",
      ".raw",
      ".heic",
      ".avif",
      ".mp4",
      ".avi",
      ".mov",
      ".mkv",
      ".webm",
      ".flv",
      ".wmv",
      ".m4v",
      ".mpg",
      ".mpeg",
      ".3gp",
      ".ogv",
      ".mp3",
      ".wav",
      ".ogg",
      ".m4a",
      ".flac",
      ".aac",
      ".wma",
      ".opus",
      ".ttf",
      ".otf",
      ".woff",
      ".woff2",
      ".eot",
      ".zip",
      ".tar",
      ".gz",
      ".rar",
      ".7z",
      ".bz2",
      ".xz",
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".exe",
      ".dll",
      ".so",
      ".dylib",
      ".wasm",
      ".class",
      ".pyc",
      ".db",
      ".sqlite",
      ".sqlite3",
    ],
    maxDiffFileSizeKB: 500,
    autoDetectBinaryFiles: true,
    skipDiffPathPatterns: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "**/*.min.js",
      "**/*.min.css",
    ],
    respectGitAttributes: true,

    timeout: 30000,
    retryAttempts: 3,
    rateLimitSeconds: 0,
    consecutiveMistakeLimit: 3,
  };

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
      return { ...this.defaults };
    }

    // 向后兼容：补充新字段的默认值
    return {
      ...this.defaults,
      ...stored,
      skipDiffFileExtensions:
        stored.skipDiffFileExtensions || this.defaults.skipDiffFileExtensions,
      skipDiffPathPatterns:
        stored.skipDiffPathPatterns || this.defaults.skipDiffPathPatterns,
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
