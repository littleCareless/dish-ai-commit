import { AIProviderFactory } from "../../ai/ai-provider-factory";
import { ConfigurationManager } from "../../config/configuration-manager";
import { getMessage } from "../../utils/i18n";
import { ModelPickerService } from "../../services/model-picker-service";

export class ModelConfigurationManager {
  private readonly configManager = ConfigurationManager.getInstance();

  public async getModelAndProvider() {
    const configuration = this.configManager.getConfiguration();

    let provider = configuration.base.provider;
    let model = configuration.base.model;

    let aiProvider = AIProviderFactory.getProvider(provider);
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

    aiProvider = AIProviderFactory.getProvider(provider);
    models = await aiProvider.getModels();

    if (!models || models.length === 0) {
      throw new Error(getMessage("model.list.empty"));
    }

    const selectedModel = models.find((m) => m.id === model);
    console.log("selectedModel", selectedModel);

    if (!selectedModel) {
      throw new Error(getMessage("model.notFound"));
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
