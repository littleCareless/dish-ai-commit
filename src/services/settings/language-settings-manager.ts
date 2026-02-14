import { PreferencesSettingsManager } from "@/services/settings/preferences-settings-manager";
import { Logger } from "@/utils/logger";
import { UserPreferences } from "@/types/settings";

const logger = Logger.getInstance("Dish AI Commit Gen");

export interface LanguageSettings {
  language: UserPreferences["language"];
}

/**
 * 语言设置管理器（使用 Profile 系统）
 */
export class LanguageSettingsManager {
  /**
   * 获取当前语言设置
   */
  public static getLanguage(): UserPreferences["language"] {
    const settings = PreferencesSettingsManager.getInstance().getSettings();
    return settings.language || "Simplified Chinese";
  }

  /**
   * 更新语言设置
   * @param language 新的语言值
   */
  public static async updateLanguage(
    language: UserPreferences["language"]
  ): Promise<void> {
    await PreferencesSettingsManager.getInstance().updateSettings({
      language,
    });
  }

  /**
   * 获取语言设置的有效范围信息
   * @returns 设置的来源（现在总是返回 "preferences"）
   */
  public static getLanguageScope(): string {
    return "preferences";
  }
}
