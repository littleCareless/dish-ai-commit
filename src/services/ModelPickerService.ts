import * as vscode from "vscode";
import { AIProviderFactory } from "../ai/AIProviderFactory";
import { NotificationHandler } from "../utils/NotificationHandler";
import { LocalizationManager } from "../utils/LocalizationManager";

export class ModelPickerService {
  static async showModelPicker(
    currentProvider: string,
    currentModel: string
  ): Promise<{ provider: string; model: string } | undefined> {
    const locManager = LocalizationManager.getInstance();
    try {
      const providers = AIProviderFactory.getAllProviders();
      const modelsMap = new Map<string, string[]>();

      console.log("providers", providers);

      const progressMsg = locManager.getMessage("ai.model.loading");
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: progressMsg,
          cancellable: false,
        },
        async () => {
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
        }
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
      quickPick.title = locManager.getMessage("ai.model.picker.title");
      quickPick.placeholder = locManager.getMessage(
        "ai.model.picker.placeholder"
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
