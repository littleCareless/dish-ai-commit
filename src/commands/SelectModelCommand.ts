import * as vscode from "vscode";
import { BaseCommand } from "./BaseCommand";
import { ConfigurationManager } from "../config/ConfigurationManager";
import { NotificationHandler } from "../utils/NotificationHandler";
import { AIProviderFactory } from "../ai/AIProviderFactory";
import { getProviderModelConfig } from "../config/types";
import { LocalizationManager } from "../utils/LocalizationManager";

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

  // 从原来的 CommandManager 移动过来的 showModelPicker 方法
  private async showModelPicker(currentProvider: string, currentModel: string) {
    try {
      const providers = AIProviderFactory.getAllProviders();
      const modelsMap = new Map<string, string[]>();

      await Promise.all(
        providers.map(async (provider) => {
          if (await provider.isAvailable()) {
            const models = await provider.getModels();
            modelsMap.set(
              provider.getName(),
              models.map((model) => model.name)
            );
          }
        })
      );

      const items: vscode.QuickPickItem[] = [];
      for (const [provider, models] of modelsMap) {
        items.push({
          label: provider,
          kind: vscode.QuickPickItemKind.Separator,
        });
        models.forEach((model) => {
          items.push({
            label: model,
            description: provider,
            picked: provider === currentProvider && model === currentModel,
          });
        });
      }

      const quickPick = vscode.window.createQuickPick();
      quickPick.items = items;
      quickPick.title =
        LocalizationManager.getInstance().getMessage("model.picker.title");
      quickPick.placeholder = LocalizationManager.getInstance().getMessage(
        "model.picker.placeholder"
      );
      quickPick.ignoreFocusOut = true;

      const result = await new Promise<vscode.QuickPickItem | undefined>(
        (resolve) => {
          quickPick.onDidAccept(() => resolve(quickPick.selectedItems[0]));
          quickPick.onDidHide(() => resolve(undefined));
          quickPick.show();
        }
      );

      quickPick.dispose();

      console.log('result:', result);

      if (result && result.description) {
        return { provider: result.description, model: result.label };
      }
      return undefined;
    } catch (error) {
      console.error("获取模型列表失败:", error);
      await NotificationHandler.error("model.list.failed");
      return undefined;
    }
  }
}
