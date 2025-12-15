import { AIProviderFactory } from "@/ai/ai-provider-factory";
import { ModelPickerService } from "@/services/core/model-picker-service";
import { ProfileManagerService } from "@/services/profile-manager/profile-manager-service";
import { getMessage } from "@/utils/i18n";

export class ModelConfigurationManager {
  public async getModelAndProvider() {
    const profileManager = ProfileManagerService.getInstance();
    const profile = await profileManager.getProfileForMode();

    if (!profile) {
      throw new Error(getMessage("profile.not.found"));
    }

    // 从 profile 中获取 provider 和 model
    let provider: string | undefined;
    let model: string | undefined;

    if (profile.providers && typeof profile.providers === "object") {
      const providers = profile.providers as Record<string, any>;
      const activeProviderId = profile.activeProviderId;

      if (activeProviderId && providers[activeProviderId]) {
        provider = activeProviderId;
        model = providers[activeProviderId].model;
      } else {
        // 如果没有 activeProviderId，使用第一个有 model 的 provider
        const providerWithModel = Object.entries(providers).find(
          ([_, config]) => config.model
        );
        if (providerWithModel) {
          provider = providerWithModel[0];
          model = providerWithModel[1].model;
        }
      }
    } else {
      // 兼容旧的配置结构
      provider = profile.apiProvider;
      model = profile.apiModelId;
    }

    if (!provider || !model) {
      throw new Error(getMessage("profile.not.found"));
    }

    // 🔥 关键修复：从 profile 中获取 provider 配置并传递
    let providerConfig: any = undefined;
    if (profile.providers && typeof profile.providers === "object") {
      const providers = profile.providers as Record<string, any>;
      providerConfig = providers[provider];
    }

    let aiProvider = AIProviderFactory.getProvider(provider, providerConfig);
    // 确保设置全局配置（包含 preferences 等）
    if (
      aiProvider &&
      typeof aiProvider.setGlobalConfig === "function" &&
      providerConfig
    ) {
      const featureSettings = profileManager.getFeatureSettings();
      const fullConfig = {
        ...providerConfig,
        base: {
          language: profile.preferences?.language || "Simplified Chinese",
        },
        features: {
          commitFormat: {
            enableMergeCommit: featureSettings.enableMergeCommit,
            enableEmoji: featureSettings.enableEmoji,
            enableBody: featureSettings.enableBody,
          },
        },
        preferences: profile.preferences || {},
      };
      aiProvider.setGlobalConfig(fullConfig);
    }
    let models = await aiProvider.getModels();

    if (models && models.length > 0) {
      const selectedModel = models.find((m) => m.id === model);
      if (selectedModel) {
        return { aiProvider, selectedModel };
      }
    }

    const result = await this.selectAndUpdateModelConfiguration(
      provider,
      model
    );
    if (!result) {
      throw new Error(getMessage("model.selection.cancelled"));
    }

    provider = result.provider;
    model = result.model;

    // 🔥 关键修复：从更新后的 profile 中获取 provider 配置并传递
    const updatedProfile = await profileManager.getProfileForMode();
    let updatedProviderConfig: any = undefined;
    if (
      updatedProfile?.providers &&
      typeof updatedProfile.providers === "object"
    ) {
      const providers = updatedProfile.providers as Record<string, any>;
      updatedProviderConfig = providers[provider];
    }

    aiProvider = AIProviderFactory.getProvider(provider, updatedProviderConfig);
    // 确保设置全局配置（包含 preferences 等）
    if (
      aiProvider &&
      typeof aiProvider.setGlobalConfig === "function" &&
      updatedProviderConfig &&
      updatedProfile
    ) {
      const featureSettings = profileManager.getFeatureSettings();
      const fullConfig = {
        ...updatedProviderConfig,
        base: {
          language:
            updatedProfile.preferences?.language || "Simplified Chinese",
        },
        features: {
          commitFormat: {
            enableMergeCommit: featureSettings.enableMergeCommit,
            enableEmoji: featureSettings.enableEmoji,
            enableBody: featureSettings.enableBody,
          },
        },
        preferences: updatedProfile.preferences || {},
      };
      aiProvider.setGlobalConfig(fullConfig);
    }
    models = await aiProvider.getModels();

    if (!models || models.length === 0) {
      throw new Error(getMessage("model.list.empty"));
    }

    const selectedModel = models.find((m) => m.id === model);

    if (!selectedModel) {
      throw new Error(getMessage("model.not.found"));
    }

    return { aiProvider, selectedModel };
  }

  private async selectAndUpdateModelConfiguration(
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

    // 使用 ProfileManagerService 更新配置
    const profileManager = ProfileManagerService.getInstance();
    const profile = await profileManager.getProfileForMode();

    if (!profile) {
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
          const aiProvider = AIProviderFactory.getProvider(
            modelSelection.provider
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
