import { AIProviderFactory } from "@/ai/ai-provider-factory";
import { ModelPickerService } from "@/services/core/model-picker-service";
import { ProfileManagerService } from "@/services/profile-manager/profile-manager-service";
import { PreferencesSettingsManager } from "@/services/settings/preferences-settings-manager";
import { getMessage } from "@/utils/i18n";
import { Logger } from "@/utils/logger";

const logger = Logger.getInstance("Dish AI Commit Gen");

export class ModelConfigurationManager {
  public static async getModelAndProvider(profile: any, featureSettings: any) {
    if (!profile) {
      logger.error("Profile not found in getModelAndProvider", {
        operation: "getModelAndProvider",
      });
      throw new Error(getMessage("profile.not.found"));
    }

    // 使用统一的 ProviderSelectionService 选择 provider
    const { ProviderSelectionService } =
      await import("@/services/core/provider-selection-service");

    const selection = ProviderSelectionService.selectProvider(profile);
    const provider = selection.provider;
    const model = selection.model;
    const providerConfig = selection.config as any;

    const preferences = PreferencesSettingsManager.getInstance().getSettings();

    // 构建完整配置
    const fullConfig = {
      ...providerConfig,
      base: {
        language: preferences.language || "Simplified Chinese",
      },
      features: {
        commitFormat: {
          enableMergeCommit: featureSettings.enableMergeCommit,
          enableEmoji: featureSettings.enableEmoji,
          enableBody: featureSettings.enableBody,
        },
      },
      preferences,
    };

    // 使用统一的验证服务
    const { ModelValidationService } =
      await import("@/services/core/model-validation-service");

    // 尝试直接验证模型
    return ModelValidationService.validateModel(provider, model, fullConfig);
  }

  public static async selectAndUpdateModelConfiguration(
    profileManager: ProfileManagerService,
    profile: any,
    provider = "Ollama",
    model = "Ollama"
  ) {
    const modelSelection = await ModelPickerService.showModelPicker(
      provider,
      model
    );
    if (!modelSelection) {
      return;
    }

    if (!profile) {
      logger.error("Profile not found in selectAndUpdateModelConfiguration", {
        operation: "selectAndUpdateModelConfiguration",
      });
      throw new Error(getMessage("profile.not.found"));
    }

    // 确保保留所有必需字段
    const updatedProfile = {
      ...profile,
      updatedAt: new Date().toISOString(),
    };

    if (
      updatedProfile.providers &&
      typeof updatedProfile.providers === "object"
    ) {
      const providers = { ...updatedProfile.providers } as Record<string, any>;

      // 如果选择的 provider 已存在，更新其 model（保留其他配置）
      if (providers[modelSelection.provider]) {
        providers[modelSelection.provider] = {
          ...providers[modelSelection.provider],
          model: modelSelection.model,
        };
      } else {
        // 如果 provider 不存在，需要创建完整的 provider 配置
        // 从 AIProviderFactory 获取 provider 信息
        // 注意：这里只是获取 provider 的默认配置，不需要实际的 API key
        try {
          const aiProvider = await AIProviderFactory.getProvider(
            modelSelection.provider,
            profile
          );
          const providerConfig = aiProvider.getConfig();

          // 创建完整的 provider 配置
          providers[modelSelection.provider] = {
            id: modelSelection.provider,
            name: providerConfig.name || modelSelection.provider,
            type: providerConfig.type || "openai-compatible",
            model: modelSelection.model,
            // 保留其他可能的配置字段
            ...(providerConfig.baseUrl && { baseUrl: providerConfig.baseUrl }),
            ...(providerConfig.apiKey && { apiKey: providerConfig.apiKey }),
          };
        } catch (error) {
          // 如果无法获取 provider 配置，创建最小配置
          providers[modelSelection.provider] = {
            id: modelSelection.provider,
            name: modelSelection.provider,
            type: "openai-compatible",
            model: modelSelection.model,
          };
        }
      }

      // 设置 activeProviderId
      updatedProfile.activeProviderId = modelSelection.provider;
      updatedProfile.providers = providers;
    } else {
      // 兼容旧的配置结构
      updatedProfile.apiProvider = modelSelection.provider;
      updatedProfile.apiModelId = modelSelection.model;
    }

    await profileManager.saveProfile(updatedProfile);

    return {
      provider: modelSelection.provider,
      model: modelSelection.model,
    };
  }
}
