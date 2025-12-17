import { AIProviderFactory } from "@/ai/ai-provider-factory";
import { AIModel } from "@/ai/types";
import { getMessage } from "@/utils/i18n";
import { Logger } from "@/utils/logger";

const logger = Logger.getInstance("Dish AI Commit Gen");

interface ValidatedModelResult {
  provider: string;
  model: string;
  selectedModel: AIModel;
  aiProvider: any;
}

interface ProviderAndModels {
  aiProvider: any;
  models: AIModel[];
}

/**
 * 获取provider实例和models列表
 * @param provider - Provider ID
 * @param config - Provider配置（包含 apiKey、baseUrl 等），可选
 */
async function getProviderAndModels(
  provider: string,
  config?: any
): Promise<ProviderAndModels> {
  logger.logOperationStart("getProviderAndModels", {
    data: { provider, hasConfig: !!config },
  });

  try {
    const aiProvider = await AIProviderFactory.getProvider(provider, config);
    const models = await aiProvider.getModels();

    logger.logOperationEnd("getProviderAndModels", undefined, {
      data: { provider, modelCount: models.length },
    });

    return { aiProvider, models };
  } catch (error) {
    logger.logError(
      error as Error,
      `获取 provider 和 models 失败: ${provider}`,
      { operation: "getProviderAndModels", data: { provider } }
    );
    throw error;
  }
}

/**
 * 重新选择并验证模型
 * selectAndUpdateModel 已经从 profile 中读取配置并验证了模型可用性
 * 这里只需要获取完整的模型信息并返回
 */
async function revalidateModel(
  provider: string,
  model: string,
  profile: any
): Promise<ValidatedModelResult> {
  logger.logOperationStart("revalidateModel", {
    data: { provider, model },
  });

  try {
    // selectAndUpdateModel 已经从 profile 读取配置并验证了模型
    const result = await selectAndUpdateModel(provider, model, profile);

    logger.debug("selectAndUpdateModel 完成", {
      data: { provider: result.provider, model: result.model },
    });

    // 获取 provider 实例和模型列表（用于获取完整的模型信息）
    // 传递配置以确保 apiKey 等被正确使用
    const { aiProvider, models } = await getProviderAndModels(
      result.provider,
      result.config
    );

    if (!models?.length) {
      logger.error("模型列表为空", {
        operation: "revalidateModel",
        data: { provider: result.provider },
      });
      throw new Error(getMessage("model.list.empty"));
    }

    const selectedModel = models.find((m) => m.id === result.model);
    if (!selectedModel) {
      // 这种情况理论上不应该发生，因为 selectAndUpdateModel 已经验证过
      logger.error("模型未找到", {
        operation: "revalidateModel",
        data: {
          provider: result.provider,
          model: result.model,
          availableModels: models.map((m) => m.id),
        },
      });
      throw new Error(
        getMessage("model.not.found") +
          `: ${result.model} in provider ${result.provider}`
      );
    }

    logger.logOperationEnd("revalidateModel", undefined, {
      data: { provider: result.provider, model: result.model },
    });

    return {
      provider: result.provider,
      model: result.model,
      selectedModel,
      aiProvider,
    };
  } catch (error) {
    logger.logError(error as Error, `重新验证模型失败: ${provider}/${model}`, {
      operation: "revalidateModel",
      data: { provider, model },
    });
    throw error;
  }
}

/**
 * 验证并获取AI模型配置
 */
export async function validateAndGetModel(
  provider = "Ollama",
  model = "Ollama",
  profile?: any
): Promise<ValidatedModelResult> {
  logger.logOperationStart("validateAndGetModel", {
    data: { provider, model },
  });

  try {
    if (!profile) {
      logger.warn("未找到 profile，使用默认配置", {
        operation: "validateAndGetModel",
        data: { provider, model },
      });
    }

    let providerConfig: any | undefined;

    if (profile) {
      // 使用统一的 ProviderSelectionService（但只获取配置，不改变传入的 provider/model）
      const { ProviderSelectionService } =
        await import("@/services/core/provider-selection-service");

      try {
        const selection = ProviderSelectionService.selectProvider(profile);

        // 如果传入的 provider 匹配选中的 provider，使用选中的配置
        if (selection.provider === provider) {
          providerConfig = selection.config;
          logger.debug("使用 ProviderSelectionService 选中的配置", {
            data: { provider: selection.provider },
          });
        } else {
          // 否则，尝试从 providers 中查找传入的 provider
          if (profile.providers && typeof profile.providers === "object") {
            const providers = profile.providers as Record<string, any>;
            if (providers[provider]) {
              providerConfig = providers[provider];
              logger.debug("使用传入 provider 的配置", {
                data: { provider },
              });
            }
          }
        }
      } catch (error) {
        logger.warn("ProviderSelectionService 选择失败，尝试兼容模式", {
          error: error instanceof Error ? error : new Error(String(error)),
        });

        // 兼容旧的配置结构
        const legacyProfile = profile as any;
        if (legacyProfile.apiProvider === provider) {
          providerConfig = {
            apiKey: legacyProfile.apiKey,
            baseUrl: legacyProfile.baseUrl,
          };
          logger.debug("使用旧配置结构", {
            data: { provider },
          });
        }
      }
    }

    const { aiProvider, models } = await getProviderAndModels(
      provider,
      providerConfig
    );

    if (!models?.length) {
      logger.warn("模型列表为空，尝试重新验证", {
        operation: "validateAndGetModel",
        data: { provider },
      });
      return revalidateModel(provider, model, profile);
    }

    const selectedModel = models.find((m) => m.id === model);
    if (!selectedModel) {
      logger.warn("未找到指定模型，尝试重新验证", {
        operation: "validateAndGetModel",
        data: { provider, model, availableModels: models.map((m) => m.id) },
      });
      return revalidateModel(provider, model, profile);
    }

    logger.logOperationEnd("validateAndGetModel", undefined, {
      data: { provider, model },
    });

    return {
      provider,
      model,
      selectedModel,
      aiProvider,
    };
  } catch (error) {
    logger.logError(
      error as Error,
      `验证并获取模型配置失败: ${provider}/${model}`,
      { operation: "validateAndGetModel", data: { provider, model } }
    );
    throw error;
  }
}

/**
 * 从 profile 中读取配置并验证模型可用性
 * 不再需要 showModelPicker，因为配置已经在 profile 中
 */
async function selectAndUpdateModel(
  provider: string,
  model: string,
  profile: any
): Promise<{ provider: string; model: string; config?: any }> {
  logger.logOperationStart("selectAndUpdateModel", {
    data: { provider, model },
  });

  try {
    if (!profile) {
      logger.error("未找到 profile", {
        operation: "selectAndUpdateModel",
      });
      throw new Error(getMessage("profile.not.found"));
    }

    logger.debug("从 profile 读取配置", {
      data: {
        hasProviders: !!(
          profile.providers && typeof profile.providers === "object"
        ),
        activeProviderId: profile.activeProviderId,
        hasLegacyConfig: !!profile.apiProvider,
      },
    });

    // 从 profile 中获取 provider 和 model，以及配置
    let configuredProvider: string | undefined;
    let configuredModel: string | undefined;
    let providerConfig: any | undefined;

    if (profile.providers && typeof profile.providers === "object") {
      const providers = profile.providers as Record<string, any>;
      const activeProviderId = profile.activeProviderId;

      if (activeProviderId && providers[activeProviderId]) {
        configuredProvider = activeProviderId;
        configuredModel = providers[activeProviderId].model;
        providerConfig = providers[activeProviderId];

        logger.info("使用 activeProviderId 配置", {
          data: { provider: activeProviderId, model: configuredModel },
        });
      } else {
        // 如果没有 activeProviderId，使用第一个有 model 的 provider
        const providerWithModel = Object.entries(providers).find(
          ([_, config]) => config.model
        );
        if (providerWithModel) {
          configuredProvider = providerWithModel[0];
          configuredModel = providerWithModel[1].model;
          providerConfig = providerWithModel[1];

          logger.info("使用第一个有 model 的 provider", {
            data: { provider: configuredProvider, model: configuredModel },
          });
        } else {
          logger.warn("未找到有 model 的 provider", {
            data: { availableProviders: Object.keys(providers) },
          });
        }
      }
    } else {
      // 兼容旧的配置结构
      configuredProvider = profile.apiProvider;
      configuredModel = profile.apiModelId;

      logger.info("使用旧配置结构", {
        data: { provider: configuredProvider, model: configuredModel },
      });

      // 从旧配置结构中构建 providerConfig
      if (configuredProvider) {
        providerConfig = {
          apiKey: profile.apiKey,
          baseUrl: profile.baseUrl,
          model: configuredModel,
        };
      }
    }

    // 如果没有找到配置，使用传入的参数作为后备
    const finalProvider = configuredProvider || provider;
    const finalModel = configuredModel || model;

    if (!finalProvider || !finalModel) {
      logger.error("配置不完整", {
        operation: "selectAndUpdateModel",
        data: {
          finalProvider,
          finalModel,
          configuredProvider,
          configuredModel,
        },
      });
      throw new Error(getMessage("profile.not.found"));
    }

    logger.debug("开始验证模型可用性", {
      data: { provider: finalProvider, model: finalModel },
    });

    // 验证模型是否可用（传递配置以确保 apiKey 等被正确使用）
    const { aiProvider, models } = await getProviderAndModels(
      finalProvider,
      providerConfig
    );

    if (!models?.length) {
      logger.error("模型列表为空", {
        operation: "selectAndUpdateModel",
        data: { provider: finalProvider },
      });
      throw new Error(getMessage("model.list.empty"));
    }

    const selectedModel = models.find((m) => m.id === finalModel);
    if (!selectedModel) {
      logger.error("模型未找到", {
        operation: "selectAndUpdateModel",
        data: {
          provider: finalProvider,
          model: finalModel,
          availableModels: models.map((m) => m.id),
        },
      });
      throw new Error(
        getMessage("model.not.found") +
          `: ${finalModel} in provider ${finalProvider}`
      );
    }

    // 验证 provider 是否可用（可选，但建议检查）
    try {
      const isAvailable = await aiProvider.isAvailable();
      if (!isAvailable) {
        logger.error("Provider 不可用", {
          operation: "selectAndUpdateModel",
          data: { provider: finalProvider },
        });
        throw new Error(
          `Provider ${finalProvider} is not available. Please check your configuration.`
        );
      }

      logger.debug("Provider 可用性检查通过", {
        data: { provider: finalProvider },
      });
    } catch (error) {
      // isAvailable 可能抛出异常，记录但不阻止验证流程
      logger.warn(`Provider 可用性检查失败: ${finalProvider}`, {
        operation: "selectAndUpdateModel",
        error: error instanceof Error ? error : new Error(String(error)),
        data: { provider: finalProvider },
      });
    }

    logger.logOperationEnd("selectAndUpdateModel", undefined, {
      data: { provider: finalProvider, model: finalModel },
    });

    return {
      provider: finalProvider,
      model: finalModel,
      config: providerConfig,
    };
  } catch (error) {
    // 如果验证失败，抛出更详细的错误信息
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      `选择并更新模型失败: ${provider}/${model}`,
      { operation: "selectAndUpdateModel", data: { provider, model } }
    );

    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      `Failed to validate model ${model} from provider ${provider}: ${String(error)}`
    );
  }
}

// 用于仅需要provider和selectedModel的场景
export function extractProviderAndModel(result: ValidatedModelResult) {
  logger.debug("提取 provider 和 model", {
    data: {
      provider: result.provider,
      model: result.model,
      modelId: result.selectedModel.id,
    },
  });

  return {
    aiProvider: result.aiProvider,
    selectedModel: result.selectedModel,
  };
}
