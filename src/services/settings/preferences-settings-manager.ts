import { DISH_CONFIG_PREFIX } from "@/config/constants";
import * as vscode from "vscode";

export interface PreferencesSettings {
  language: string;
  commitTemperature: number;
  reviewTemperature: number;
  branchNameTemperature: number;
  weeklyReportTemperature: number;

  // === Diff 跳过配置 ===
  skipDiffFileExtensions: string[]; // 文件扩展名列表
  maxDiffFileSizeKB: number; // 文件大小限制（KB），0 = 不限制
  autoDetectBinaryFiles: boolean; // 自动检测二进制文件
  skipDiffPathPatterns: string[]; // 路径模式列表（Glob 格式）
  respectGitAttributes: boolean; // 读取 .gitattributes 中的 binary 标记
}

// 默认的跳过文件扩展名列表
const DEFAULT_SKIP_DIFF_EXTENSIONS = [
  // 图片
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
  // 视频
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
  // 音频
  ".mp3",
  ".wav",
  ".ogg",
  ".m4a",
  ".flac",
  ".aac",
  ".wma",
  ".opus",
  // 字体
  ".ttf",
  ".otf",
  ".woff",
  ".woff2",
  ".eot",
  // 压缩包
  ".zip",
  ".tar",
  ".gz",
  ".rar",
  ".7z",
  ".bz2",
  ".xz",
  // Office & PDF
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  // 二进制
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".wasm",
  ".class",
  ".pyc",
  // 数据库
  ".db",
  ".sqlite",
  ".sqlite3",
];

export class PreferencesSettingsManager {
  private static instance: PreferencesSettingsManager;
  private static readonly STORAGE_KEY = `${DISH_CONFIG_PREFIX}_preferences_settings`;

  private _settings: PreferencesSettings = {
    language: "Simplified Chinese",
    commitTemperature: 0.3,
    reviewTemperature: 0.6,
    branchNameTemperature: 0.4,
    weeklyReportTemperature: 0.3,
    // Diff 跳过配置默认值
    skipDiffFileExtensions: DEFAULT_SKIP_DIFF_EXTENSIONS,
    maxDiffFileSizeKB: 500, // 默认 500KB
    autoDetectBinaryFiles: true,
    skipDiffPathPatterns: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "**/*.min.js",
      "**/*.min.css",
    ],
    respectGitAttributes: true,
  };

  private constructor(private context: vscode.ExtensionContext) {}

  public static getInstance(
    context?: vscode.ExtensionContext
  ): PreferencesSettingsManager {
    if (!PreferencesSettingsManager.instance) {
      if (!context) {
        throw new Error(
          "PreferencesSettingsManager not initialized and no context provided"
        );
      }
      PreferencesSettingsManager.instance = new PreferencesSettingsManager(
        context
      );
    }
    return PreferencesSettingsManager.instance;
  }

  public async initialize(): Promise<void> {
    await this.loadSettings();
  }

  public getSettings(): PreferencesSettings {
    return { ...this._settings };
  }

  public async updateSettings(
    partialSettings: Partial<PreferencesSettings>
  ): Promise<void> {
    this._settings = { ...this._settings, ...partialSettings };
    await this.saveSettings();
  }

  private async loadSettings(): Promise<void> {
    const storedSettings = this.context.globalState.get<PreferencesSettings>(
      PreferencesSettingsManager.STORAGE_KEY
    );

    if (storedSettings) {
      // 向后兼容：为旧配置补充新字段的默认值
      if (!storedSettings.skipDiffFileExtensions) {
        storedSettings.skipDiffFileExtensions = DEFAULT_SKIP_DIFF_EXTENSIONS;
      }
      if (storedSettings.maxDiffFileSizeKB === undefined) {
        storedSettings.maxDiffFileSizeKB = 500;
      }
      if (storedSettings.autoDetectBinaryFiles === undefined) {
        storedSettings.autoDetectBinaryFiles = true;
      }
      if (!storedSettings.skipDiffPathPatterns) {
        storedSettings.skipDiffPathPatterns = [
          "node_modules/**",
          "dist/**",
          "build/**",
          "**/*.min.js",
          "**/*.min.css",
        ];
      }
      if (storedSettings.respectGitAttributes === undefined) {
        storedSettings.respectGitAttributes = true;
      }

      this._settings = { ...this._settings, ...storedSettings };
    }
  }

  private async saveSettings(): Promise<void> {
    await this.context.globalState.update(
      PreferencesSettingsManager.STORAGE_KEY,
      this._settings
    );
  }
}
