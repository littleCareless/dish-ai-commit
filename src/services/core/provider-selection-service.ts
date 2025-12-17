import { Profile, ProviderConfig } from "@/types/settings";
import { Logger } from "@/utils/logger";

const logger = Logger.getInstance("Dish AI Commit Gen");

/**
 * Provider 选择结果
 */
export interface ProviderSelectionResult {
  provider: string;
  model: string;
  config: ProviderConfig;
}

/**
 * Provider 选择策略
 */
export enum SelectionStrategy {
  /** 使用 activeProviderId */
  ACTIVE_PROVIDER = "active_provider",
  /** 使用第一个有 model 的 provider */
  FIRST_WITH_MODEL = "first_with_model",
  /** 使用第一个 provider（兜底） */
  FIRST_PROVIDER = "first_provider",
  /** 使用旧配置结构（兼容） */
  LEGACY_CONFIG = "legacy_config",
}

/**
 * 统一的 Provider 选择服务
 *
 * 负责从 profile 中选择合适的 provider，使用三级降级策略：
 * 1. 优先使用 activeProviderId
 * 2. 使用第一个配置了 model 的 provider
 * 3. 使用第一个 provider（兜底）
 */
export class ProviderSelectionService {
  /**
   * 从 profile 中选择 provider
   *
   * @param profile - 用户配置
   * @returns ProviderSelectionResult - 包含 provider ID、model 和完整配置
   * @throws Error - 如果无法选择有效的 provider
   */
  static selectProvider(profile: Profile): ProviderSelectionResult {
    logger.logOperationStart("selectProvider", {
      data: {
        profileId: profile.id,
        activeProviderId: profile.activeProviderId,
        providerCount: profile.providers
          ? Object.keys(profile.providers).length
          : 0,
      },
    });

    // 检查是否使用新的配置结构
    if (profile.providers && typeof profile.providers === "object") {
      return this.selectFromProviders(profile);
    }

    // 兼容旧的配置结构
    return this.selectFromLegacyConfig(profile);
  }

  /**
   * 从新的 providers 结构中选择
   */
  private static selectFromProviders(
    profile: Profile
  ): ProviderSelectionResult {
    const providers = profile.providers as Record<string, ProviderConfig>;

    logger.debug("从 providers 结构中选择", {
      data: {
        availableProviders: Object.keys(providers),
        activeProviderId: profile.activeProviderId,
      },
    });

    // 策略 1: 使用 activeProviderId (优先)
    if (profile.activeProviderId && providers[profile.activeProviderId]) {
      const config = providers[profile.activeProviderId];
      const model = config.defaultModel || (config as any).model;

      if (model) {
        logger.info("使用 activeProviderId 策略", {
          data: {
            strategy: SelectionStrategy.ACTIVE_PROVIDER,
            provider: profile.activeProviderId,
            model,
          },
        });

        return {
          provider: profile.activeProviderId,
          model,
          config,
        };
      }

      logger.warn("activeProviderId 对应的 provider 没有配置 model", {
        data: { activeProviderId: profile.activeProviderId },
      });
    }

    // 策略 2: 找第一个有 model 的提供商
    const providerWithModel = Object.entries(providers).find(
      ([_, config]) => config.defaultModel || (config as any).model
    );

    if (providerWithModel) {
      const [providerId, config] = providerWithModel;
      const model = config.defaultModel || (config as any).model;

      logger.info("使用第一个有 model 的 provider 策略", {
        data: {
          strategy: SelectionStrategy.FIRST_WITH_MODEL,
          provider: providerId,
          model,
        },
      });

      return {
        provider: providerId,
        model,
        config,
      };
    }

    // 策略 3: 使用第一个提供商（兜底）
    const providerIds = Object.keys(providers);
    if (providerIds.length > 0) {
      const firstProviderId = providerIds[0];
      const config = providers[firstProviderId];
      const model = config.defaultModel || (config as any).model;

      logger.warn("使用第一个 provider 策略（兜底）", {
        data: {
          strategy: SelectionStrategy.FIRST_PROVIDER,
          provider: firstProviderId,
          model: model || "undefined",
          warning: "该 provider 可能没有配置 model",
        },
      });

      // 即使 model 为 undefined 也返回，让调用方处理
      return {
        provider: firstProviderId,
        model: model || "",
        config,
      };
    }

    // 所有策略都失败
    logger.error("无法从 profile 中选择 provider", {
      data: {
        profileId: profile.id,
        activeProviderId: profile.activeProviderId,
        availableProviders: Object.keys(providers),
      },
    });

    throw new Error(
      `无法从 profile 中选择 provider。请确保至少配置了一个 provider。`
    );
  }

  /**
   * 从旧的配置结构中选择（兼容性支持）
   */
  private static selectFromLegacyConfig(
    profile: Profile
  ): ProviderSelectionResult {
    const legacyProfile = profile as any;

    // 尝试获取 provider 和 model，兼容多种字段命名
    const provider = legacyProfile.apiProvider || legacyProfile.provider;
    const model =
      legacyProfile.apiModelId || legacyProfile.modelId || legacyProfile.model;

    logger.info("使用旧配置结构", {
      data: {
        strategy: SelectionStrategy.LEGACY_CONFIG,
        provider,
        model,
        originalFields: {
          apiProvider: legacyProfile.apiProvider,
          provider: legacyProfile.provider,
          apiModelId: legacyProfile.apiModelId,
          modelId: legacyProfile.modelId,
          model: legacyProfile.model,
        },
      },
    });

    if (!provider || !model) {
      logger.error("旧配置结构不完整", {
        data: {
          hasProvider: !!provider,
          hasModel: !!model,
          profileKeys: Object.keys(legacyProfile),
        },
      });

      throw new Error(`配置不完整。请确保设置了 provider 和 model。`);
    }

    // 构建一个临时的 ProviderConfig
    const legacyConfig: ProviderConfig = {
      id: provider,
      name: provider,
      type: "openai-compatible" as any,
      apiKey: legacyProfile.apiKey,
      baseUrl: legacyProfile.baseUrl,
    };

    return {
      provider,
      model,
      config: legacyConfig,
    };
  }

  /**
   * 验证选择结果是否完整
   *
   * @param result - 选择结果
   * @returns boolean - 是否完整（provider 和 model 都存在）
   */
  static isSelectionComplete(result: ProviderSelectionResult): boolean {
    return !!(result.provider && result.model);
  }

  /**
   * 获取选择策略的描述（用于日志和调试）
   *
   * @param strategy - 选择策略
   * @returns string - 策略描述
   */
  static getStrategyDescription(strategy: SelectionStrategy): string {
    const descriptions: Record<SelectionStrategy, string> = {
      [SelectionStrategy.ACTIVE_PROVIDER]: "使用配置的 activeProviderId",
      [SelectionStrategy.FIRST_WITH_MODEL]:
        "使用第一个配置了 model 的 provider",
      [SelectionStrategy.FIRST_PROVIDER]: "使用第一个 provider（兜底策略）",
      [SelectionStrategy.LEGACY_CONFIG]: "使用旧的配置结构（兼容模式）",
    };

    return descriptions[strategy] || "未知策略";
  }
}
