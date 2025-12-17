import { ProfileManagerService } from "@/services/profile-manager/profile-manager-service";

export interface LanguageSettings {
  language: string;
}

/**
 * 语言设置管理器（使用 Profile 系统）
 */
export class LanguageSettingsManager {
  /**
   * 获取当前语言设置
   */
  public static getLanguage(profile: any): string {
    return profile?.preferences?.language || "Simplified Chinese";
  }

  /**
   * 更新语言设置
   * @param language 新的语言值
   */
  public static async updateLanguage(
    profileManager: ProfileManagerService,
    profile: any,
    language: string
  ): Promise<void> {
    if (!profile) {
      throw new Error("Profile not found");
    }

    // 更新 profile 中的 language
    const updatedProfile = {
      ...profile,
      preferences: {
        ...profile.preferences,
        language: language,
      },
      updatedAt: new Date().toISOString(),
    };

    await profileManager.saveProfile(updatedProfile);
  }

  /**
   * 获取语言设置的有效范围信息
   * @returns 设置的来源（现在总是返回 "profile"）
   */
  public static getLanguageScope(): string {
    // 现在所有配置都存储在 profile 中
    return "profile";
  }
}
