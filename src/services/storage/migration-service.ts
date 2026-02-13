import { DISH_CONFIG_PREFIX } from "@/config/constants";
import { ProviderConfig } from "@/types/settings";
import * as vscode from "vscode";
import { AdvancedStorageData } from "./advanced-storage";
import { ApiConfigStorageData } from "./api-config-storage";
import { FeaturesStorageData } from "./features-storage";
import { PreferencesStorageData } from "./preferences-storage";
import { StorageManager } from "./storage-manager";

export interface MigrationDetectionResult {
  migrationNeeded: boolean;
  oldDataFound: boolean;
  details: {
    hasProfileInSecrets: boolean;
    hasPreferencesSettings: boolean;
    hasFeaturesSettings: boolean;
    hasAdvancedSettings: boolean;
    hasLegacyProfileFormat: boolean;
  };
}

export interface MigrationPreview {
  oldData: any;
  newData: {
    apiConfig: ApiConfigStorageData | null;
    preferences: PreferencesStorageData;
    features: FeaturesStorageData;
    advanced: AdvancedStorageData;
  };
  changes: string[];
}

export interface MigrationResult {
  success: boolean;
  migratedBlocks: number;
  errors: string[];
  warnings: string[];
}

/**
 * 迁移服务 - 处理从旧架构到新架构的迁移
 */
export class MigrationService {
  private storageManager: StorageManager;

  constructor(private context: vscode.ExtensionContext) {
    this.storageManager = StorageManager.getInstance(context);
  }

  /**
   * 检测是否需要迁移
   */
  public async detectOldConfiguration(): Promise<MigrationDetectionResult> {
    const result: MigrationDetectionResult = {
      migrationNeeded: false,
      oldDataFound: false,
      details: {
        hasProfileInSecrets: false,
        hasPreferencesSettings: false,
        hasFeaturesSettings: false,
        hasAdvancedSettings: false,
        hasLegacyProfileFormat: false,
      },
    };

    // 检查旧的Profile存储（在secrets中）
    try {
      const oldProfileData = await this.context.secrets.get(
        `${DISH_CONFIG_PREFIX}_profile`,
      );
      if (oldProfileData) {
        result.details.hasProfileInSecrets = true;
        result.oldDataFound = true;
        result.migrationNeeded = true;
      }
    } catch (error) {
      console.warn("Failed to check old profile data:", error);
    }

    // 检查旧的设置存储（在globalState中）
    const oldPreferences = this.context.globalState.get(
      `${DISH_CONFIG_PREFIX}_preferences_settings`,
    );
    const oldFeatures = this.context.globalState.get(
      `${DISH_CONFIG_PREFIX}_features_settings`,
    );
    const oldAdvanced = this.context.globalState.get(
      `${DISH_CONFIG_PREFIX}_advanced_settings`,
    );

    if (oldPreferences) {
      result.details.hasPreferencesSettings = true;
      result.oldDataFound = true;
      result.migrationNeeded = true;
    }
    if (oldFeatures) {
      result.details.hasFeaturesSettings = true;
      result.oldDataFound = true;
      result.migrationNeeded = true;
    }
    if (oldAdvanced) {
      result.details.hasAdvancedSettings = true;
      result.oldDataFound = true;
      result.migrationNeeded = true;
    }

    // 检查是否已经是新格式
    if (result.oldDataFound) {
      const newApiConfig = await this.context.secrets.get(
        `${DISH_CONFIG_PREFIX}_api_config`,
      );
      const newPreferences = this.context.globalState.get(
        `${DISH_CONFIG_PREFIX}_preferences`,
      );

      // 如果新格式已经存在，可能不需要迁移
      if (newApiConfig && newPreferences) {
        result.migrationNeeded = false;
      }
    }

    // 检查旧Profile格式（混合格式）
    const oldProfileData = await this.context.secrets.get(
      `${DISH_CONFIG_PREFIX}_profile`,
    );
    if (oldProfileData) {
      try {
        const profile = JSON.parse(oldProfileData);
        if (profile.providers && profile.preferences) {
          result.details.hasLegacyProfileFormat = true;
        }
      } catch (error) {
        // 忽略解析错误
      }
    }

    return result;
  }

  /**
   * 预览迁移结果
   */
  public async previewMigration(): Promise<MigrationPreview | null> {
    const detection = await this.detectOldConfiguration();
    if (!detection.migrationNeeded) {
      return null;
    }

    const oldData: any = {};
    const changes: string[] = [];

    // 收集旧数据
    try {
      const oldProfileData = await this.context.secrets.get(
        `${DISH_CONFIG_PREFIX}_profile`,
      );
      if (oldProfileData) {
        oldData.profile = JSON.parse(oldProfileData);
        changes.push("迁移Profile中的API配置和偏好设置");
      }
    } catch (error) {
      console.warn("Failed to load old profile:", error);
    }

    const oldPreferences = this.context.globalState.get(
      `${DISH_CONFIG_PREFIX}_preferences_settings`,
    );
    if (oldPreferences) {
      oldData.preferences = oldPreferences;
      changes.push("迁移偏好设置");
    }

    const oldFeatures = this.context.globalState.get(
      `${DISH_CONFIG_PREFIX}_features_settings`,
    );
    if (oldFeatures) {
      oldData.features = oldFeatures;
      changes.push("迁移功能开关设置");
    }

    const oldAdvanced = this.context.globalState.get(
      `${DISH_CONFIG_PREFIX}_advanced_settings`,
    );
    if (oldAdvanced) {
      oldData.advanced = oldAdvanced;
      changes.push("迁移高级设置");
    }

    // 转换为新格式
    const newData = await this.transformToNewFormat(oldData);

    return {
      oldData,
      newData,
      changes,
    };
  }

  /**
   * 执行迁移
   */
  public async performMigration(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedBlocks: 0,
      errors: [],
      warnings: [],
    };

    try {
      const preview = await this.previewMigration();
      if (!preview) {
        result.warnings.push("未检测到需要迁移的旧数据");
        return result;
      }

      // 保存新格式数据
      const { apiConfig, preferences, features, advanced } = preview.newData;

      if (apiConfig) {
        await this.storageManager.apiConfig.save(apiConfig);
        result.migratedBlocks++;
      }

      if (preferences) {
        await this.storageManager.preferences.save(preferences);
        result.migratedBlocks++;
      }

      if (features) {
        await this.storageManager.features.save(features);
        result.migratedBlocks++;
      }

      if (advanced) {
        await this.storageManager.advanced.save(advanced);
        result.migratedBlocks++;
      }

      // 标记迁移状态
      await this.context.globalState.update(
        `${DISH_CONFIG_PREFIX}_migration_completed`,
        true,
      );

      result.success = true;
    } catch (error) {
      result.errors.push(`迁移失败: ${error}`);
    }

    return result;
  }

  /**
   * 清理旧数据
   */
  public async cleanupLegacyStorage(): Promise<void> {
    // 删除旧的Profile数据
    try {
      await this.context.secrets.delete(`${DISH_CONFIG_PREFIX}_profile`);
    } catch (error) {
      console.warn("Failed to delete old profile:", error);
    }

    // 删除旧的设置数据
    const oldKeys = [
      `${DISH_CONFIG_PREFIX}_preferences_settings`,
      `${DISH_CONFIG_PREFIX}_features_settings`,
      `${DISH_CONFIG_PREFIX}_advanced_settings`,
      `${DISH_CONFIG_PREFIX}_profile_settings`,
    ];

    for (const key of oldKeys) {
      try {
        await this.context.globalState.update(key, undefined);
      } catch (error) {
        console.warn(`Failed to delete ${key}:`, error);
      }
    }
  }

  /**
   * 转换旧数据为新格式
   */
  private async transformToNewFormat(oldData: any): Promise<{
    apiConfig: ApiConfigStorageData | null;
    preferences: PreferencesStorageData;
    features: FeaturesStorageData;
    advanced: AdvancedStorageData;
  }> {
    // API配置转换
    let apiConfig: ApiConfigStorageData | null = null;
    if (oldData.profile) {
      const profile = oldData.profile;

      // 处理新旧两种Profile格式
      if (profile.providers && profile.activeProviderId) {
        // 新格式Profile，直接使用
        apiConfig = {
          providers: profile.providers,
          activeProviderId: profile.activeProviderId,
        };
      } else if (profile.apiKey || profile.provider) {
        // 旧格式Profile，转换为新格式
        const providerId = profile.provider || "openai";
        const providers: Record<string, ProviderConfig> = {};

        providers[providerId] = {
          id: providerId,
          name: profile.name || providerId,
          type: this.getProviderType(providerId),
          apiKey: profile.apiKey || "",
          baseUrl: profile.baseUrl || this.getDefaultBaseUrl(providerId),
          defaultModel: profile.modelId || this.getDefaultModel(providerId),
          createdAt: profile.createdAt || new Date(),
          updatedAt: profile.updatedAt || new Date(),
        };

        apiConfig = {
          providers,
          activeProviderId: providerId,
        };
      }
    }

    // 偏好设置转换
    const preferences: PreferencesStorageData = {
      language:
        oldData.preferences?.language ||
        oldData.profile?.language ||
        "Simplified Chinese",
      commitTemperature:
        oldData.preferences?.commitTemperature ||
        oldData.profile?.temperature ||
        0.3,
      reviewTemperature: oldData.preferences?.reviewTemperature || 0.6,
      branchNameTemperature: oldData.preferences?.branchNameTemperature || 0.4,
      weeklyReportTemperature:
        oldData.preferences?.weeklyReportTemperature || 0.3,
      skipDiffFileExtensions: oldData.preferences?.skipDiffFileExtensions || [
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".bmp",
        ".ico",
        ".pdf",
        ".zip",
        ".rar",
        ".7z",
        ".tar",
        ".gz",
        ".bz2",
        ".xz",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".ppt",
        ".pptx",
        ".o",
        ".a",
        ".so",
        ".dll",
        ".exe",
        ".jar",
        ".war",
        ".ear",
        ".class",
        ".pyc",
        ".swo",
        ".swp",
        ".DS_Store",
        ".lock",
        ".log",
      ],
      skipDiffPathPatterns: oldData.preferences?.skipDiffPathPatterns || [
        "**/package-lock.json",
        "**/pnpm-lock.yaml",
        "**/yarn.lock",
      ],
      maxDiffFileSizeKB: oldData.preferences?.maxDiffFileSizeKB || 500,
      autoDetectBinaryFiles: oldData.preferences?.autoDetectBinaryFiles ?? true,
      respectGitAttributes: oldData.preferences?.respectGitAttributes ?? true,
      timeout:
        oldData.preferences?.timeout || oldData.profile?.timeout || 30000,
      retryAttempts:
        oldData.preferences?.retryAttempts ||
        oldData.profile?.retryAttempts ||
        3,
      rateLimitSeconds:
        oldData.preferences?.rateLimitSeconds ||
        oldData.profile?.rateLimitSeconds ||
        0,
      consecutiveMistakeLimit:
        oldData.preferences?.consecutiveMistakeLimit || 3,
      maxTokens: oldData.preferences?.maxTokens || oldData.profile?.maxTokens,
    };

    // 功能开关转换
    const features: FeaturesStorageData = {
      largePromptAction: "ask",
      enableEmoji: oldData.features?.enableEmoji ?? true,
      enableMergeCommit: oldData.features?.enableMergeCommit ?? false,
      enableBody: oldData.features?.enableBody ?? true,
      enableLayeredCommit: oldData.features?.enableLayeredCommit ?? false,
      enableGlobalContext: oldData.features?.enableGlobalContext ?? true,
      useRecentCommitsAsReference:
        oldData.features?.useRecentCommitsAsReference ?? false,
      simplifyDiff: oldData.features?.simplifyDiff ?? false,
      autoDetectStaged: oldData.features?.autoDetectStaged ?? true,
      fallbackToAll: oldData.features?.fallbackToAll ?? true,
      diffTarget: oldData.features?.diffTarget || "auto",
      suppressNonCriticalWarnings:
        oldData.features?.suppressNonCriticalWarnings ?? true,
      weeklyReport: oldData.features?.weeklyReport ?? true,
      codeReview: oldData.features?.codeReview ?? true,
      generateBranchName: oldData.features?.generateBranchName ?? true,
      generatePRSummary: oldData.features?.generatePRSummary ?? true,
    };

    // 高级设置转换
    const advanced: AdvancedStorageData = {
      verbosity:
        oldData.advanced?.verbosity || oldData.preferences?.verbosity || 1,
      rateLimitSeconds:
        oldData.advanced?.rateLimitSeconds ||
        oldData.preferences?.rateLimitSeconds ||
        0,
      timeout:
        oldData.advanced?.timeout || oldData.preferences?.timeout || 30000,
      retryAttempts:
        oldData.advanced?.retryAttempts ||
        oldData.preferences?.retryAttempts ||
        3,
      consecutiveMistakeLimit:
        oldData.advanced?.consecutiveMistakeLimit ||
        oldData.preferences?.consecutiveMistakeLimit ||
        3,
      maxTokens: oldData.advanced?.maxTokens || oldData.preferences?.maxTokens,
    };

    return { apiConfig, preferences, features, advanced };
  }

  /**
   * 获取提供者类型
   */
  private getProviderType(providerId: string): any {
    const typeMap: Record<string, string> = {
      openai: "first-party",
      anthropic: "first-party",
      gemini: "first-party",
      ollama: "local",
      bedrock: "cloud",
    };
    return typeMap[providerId] || "openai-compatible";
  }

  /**
   * 获取默认baseUrl
   */
  private getDefaultBaseUrl(providerId: string): string {
    const baseUrlMap: Record<string, string> = {
      openai: "https://api.openai.com/v1",
      anthropic: "https://api.anthropic.com/v1",
      gemini: "https://generativelanguage.googleapis.com/v1beta",
      ollama: "http://localhost:11434",
      bedrock: "https://runtime.sagemaker.us-east-1.amazonaws.com",
    };
    return baseUrlMap[providerId] || "http://localhost:8080";
  }

  /**
   * 获取默认模型
   */
  private getDefaultModel(providerId: string): string {
    const modelMap: Record<string, string> = {
      openai: "gpt-4o-mini",
      anthropic: "claude-3-haiku-20240307",
      gemini: "gemini-2.5-flash",
      ollama: "llama2",
      bedrock: "anthropic.claude-v2",
    };
    return modelMap[providerId] || "gpt-3.5-turbo";
  }

  /**
   * 检查迁移状态
   */
  public async isMigrationCompleted(): Promise<boolean> {
    return this.context.globalState.get(
      `${DISH_CONFIG_PREFIX}_migration_completed`,
      false,
    );
  }

  /**
   * 自动执行迁移（如果需要）
   */
  public async autoMigrate(): Promise<MigrationResult | null> {
    const detection = await this.detectOldConfiguration();
    if (!detection.migrationNeeded) {
      return null;
    }

    const result = await this.performMigration();
    if (result.success) {
      await this.cleanupLegacyStorage();
    }
    return result;
  }
}
