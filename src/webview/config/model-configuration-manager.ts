import { ConfigurationManager } from "../../config/configuration-manager";
import { ModelPickerService } from "../../services/model-picker-service";
import { getMessage } from "../../utils/i18n";

export class ModelConfigurationManager {
  private readonly configManager = ConfigurationManager.getInstance();

  public async getModelAndProvider() {
    const configuration = this.configManager.getConfiguration();

    let provider = configuration.base.provider;
    let model = configuration.base.model;

    // 使用统一的验证服务
    const { ModelValidationService } = await import(
      "../../services/core/model-validation-service"
    );

    try {
      // 尝试直接验证模型
      const result = await ModelValidationService.validateModel(
        provider,
        model
      );
      return result;
    } catch (error) {
      // 如果验证失败，触发重新选择模型的流程
      const selectionResult = await this.selectAndUpdateModelConfiguration(
        provider,
        model
      );

      if (!selectionResult) {
        throw new Error(getMessage("model.selection.cancelled"));
      }

      provider = selectionResult.provider;
      model = selectionResult.model;

      // 再次验证更新后的模型
      return ModelValidationService.validateModel(provider, model);
    }
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

    await this.configManager.updateAIConfiguration(
      modelSelection.provider,
      modelSelection.model
    );

    return {
      provider: modelSelection.provider,
      model: modelSelection.model,
    };
  }
}
