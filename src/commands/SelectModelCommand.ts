import * as vscode from "vscode";
import { BaseCommand } from "./BaseCommand";
import { ConfigurationManager } from "../config/ConfigurationManager";
import { NotificationHandler } from "../utils/NotificationHandler";
import { ModelPickerService } from "../services/ModelPickerService";

export class SelectModelCommand extends BaseCommand {
  constructor(context: vscode.ExtensionContext) {
    super(context);
  }

  async execute(): Promise<void> {
    const configManager = ConfigurationManager.getInstance();

    // 只获取需要的配置项
    const currentProvider = configManager.getConfig("BASE_PROVIDER");
    const currentModel = configManager.getConfig("BASE_MODEL");

    const modelSelection = await this.showModelPicker(
      currentProvider,
      currentModel
    );

    if (modelSelection) {
      await configManager.updateAIConfiguration(
        modelSelection.provider,
        modelSelection.model
      );
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
