import * as vscode from "vscode";
import { BaseCommand } from "./BaseCommand";
import { ConfigurationManager } from "../config/ConfigurationManager";
import { NotificationHandler } from "../utils/NotificationHandler";
import { AIProviderFactory } from "../ai/AIProviderFactory";
import { getProviderModelConfig } from "../config/types";
import { LocalizationManager } from "../utils/LocalizationManager";
import { ModelPickerService } from "../services/ModelPickerService";

export class SelectModelCommand extends BaseCommand {
  async execute(): Promise<void> {
    if (!(await this.validateConfig())) {
      return;
    }

    const config = ConfigurationManager.getInstance();
    const configuration = config.getConfiguration();
    const modelSelection = await this.showModelPicker(
      configuration.provider,
      getProviderModelConfig(configuration, configuration.provider)
    );

    if (modelSelection) {
      await config.updateConfig("MODEL", modelSelection.model);
      await config.updateConfig("PROVIDER", modelSelection.provider);
      await NotificationHandler.info(
        "model.update.success",
        modelSelection.provider,
        modelSelection.model
      );
    }
  }

  private async showModelPicker(currentProvider: string, currentModel: string) {
    return ModelPickerService.showModelPicker(currentProvider, currentModel);
  }
}
