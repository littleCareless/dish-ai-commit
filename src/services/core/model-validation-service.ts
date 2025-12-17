import { AIProviderFactory } from "@/ai/ai-provider-factory";
import { AIModel, AIProvider } from "@/ai/types";
import { getMessage } from "@/utils/i18n";
import { Logger } from "@/utils/logger";

const logger = Logger.getInstance("Dish AI Commit Gen");

/**
 * 模型验证结果
 */
export interface ModelValidationResult {
  aiProvider: AIProvider;
  selectedModel: AIModel;
}

/**
 * 统一的模型验证服务
 * 提供标准化的模型可用性校验功能，消除项目中的重复验证逻辑
 */
export class ModelValidationService {
  /**
   * 验证模型并返回完整的 provider 实例和模型对象
   *
   * @param provider - Provider ID
   * @param model - 模型 ID
   * @param config - Provider 配置（包含 apiKey、baseUrl 等），可选
   * @returns Promise<ModelValidationResult> - 验证成功返回 provider 实例和模型对象
   * @throws Error - 如果模型列表为空或未找到指定模型
   */
  static async validateModel(
    provider: string,
    model: string,
    config?: any,
    profile?: any
  ): Promise<ModelValidationResult> {
    logger.logOperationStart("validateModel", {
      data: { provider, model, hasConfig: !!config },
    });

    try {
      // 1. 获取 AI Provider 实例
      const effectiveConfig = config ?? profile;
      const aiProvider = await AIProviderFactory.getProvider(
        provider,
        effectiveConfig
      );

      // 2. 设置全局配置（如果提供了 config 且 provider 支持）
      if (
        aiProvider &&
        typeof aiProvider.setGlobalConfig === "function" &&
        config
      ) {
        aiProvider.setGlobalConfig(config);
      }

      // 3. 获取模型列表
      const models = await aiProvider.getModels();

      // 4. 验证模型列表不为空
      if (!models || models.length === 0) {
        logger.error("模型列表为空", {
          operation: "validateModel",
          data: { provider },
        });
        throw new Error(getMessage("model.list.empty"));
      }

      // 5. 查找指定模型
      const selectedModel = models.find((m: AIModel) => m.id === model);

      // 6. 验证模型存在
      if (!selectedModel) {
        logger.error("模型未找到", {
          operation: "validateModel",
          data: {
            provider,
            model,
            availableModels: models.map((m) => m.id),
          },
        });
        throw new Error(getMessage("model.not.found"));
      }

      logger.logOperationEnd("validateModel", undefined, {
        data: { provider, model },
      });

      return {
        aiProvider: await aiProvider,
        selectedModel,
      };
    } catch (error) {
      logger.logError(error as Error, `模型验证失败: ${provider}/${model}`, {
        operation: "validateModel",
        data: { provider, model },
      });
      throw error;
    }
  }

  /**
   * 仅验证模型是否存在（轻量级检查）
   * 不返回完整的模型信息，适用于只需要确认模型可用性的场景
   *
   * @param provider - Provider ID
   * @param model - 模型 ID
   * @param config - Provider 配置（包含 apiKey、baseUrl 等），可选
   * @throws Error - 如果模型列表为空、未找到指定模型或验证失败
   */
  static async verifyModelExists(
    provider: string,
    model: string,
    config?: any,
    profile?: any
  ): Promise<void> {
    logger.logOperationStart("verifyModelExists", {
      data: { provider, model, hasConfig: !!config },
    });

    try {
      // 复用 validateModel 方法进行验证
      await this.validateModel(provider, model, config, profile);

      logger.logOperationEnd("verifyModelExists", undefined, {
        data: { provider, model },
      });
    } catch (error) {
      logger.logError(
        error as Error,
        `模型存在性验证失败: ${provider}/${model}`,
        {
          operation: "verifyModelExists",
          data: { provider, model },
        }
      );
      // 重新包装错误为更友好的消息
      throw new Error(getMessage("model.verification.failed"));
    }
  }

  /**
   * 获取 provider 实例和模型列表
   *
   * @param provider - Provider ID
   * @param config - Provider 配置（包含 apiKey、baseUrl 等），可选
   * @returns Promise<{ aiProvider: AIProvider; models: AIModel[] }> - provider 实例和模型列表
   */
  static async getProviderAndModels(
    provider: string,
    config?: any
  ): Promise<{ aiProvider: AIProvider; models: AIModel[] }> {
    logger.logOperationStart("getProviderAndModels", {
      data: { provider, hasConfig: !!config },
    });

    try {
      const aiProvider = await AIProviderFactory.getProvider(provider, config);

      // 设置全局配置（如果提供了 config 且 provider 支持）
      if (
        aiProvider &&
        typeof aiProvider.setGlobalConfig === "function" &&
        config
      ) {
        aiProvider.setGlobalConfig(config);
      }

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
}
