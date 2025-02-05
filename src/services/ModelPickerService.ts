import * as vscode from "vscode";
import { AIProviderFactory } from "../ai/AIProviderFactory";
import { notify } from "../utils/notification";
import { getMessage } from "../utils/i18n";

/**
 * Service class for handling AI model selection via VS Code's quick pick interface
 */
export class ModelPickerService {
  /**
   * Shows a quick pick dialog for selecting AI provider and model
   * @param currentProvider - Currently selected AI provider
   * @param currentModel - Currently selected model name
   * @returns Promise resolving to selected provider and model, or undefined if cancelled
   * @throws {Error} When model list loading fails
   */
  static async showModelPicker(
    currentProvider: string,
    currentModel: string
  ): Promise<{ provider: string; model: string } | undefined> {
    try {
      const providers = AIProviderFactory.getAllProviders();
      const modelsMap = new Map<string, string[]>();
      let errors: string[] = [];

      console.log("providers", providers);

      const progressMsg = getMessage("ai.model.loading");
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: progressMsg,
          cancellable: false,
        },
        async () => {
          await Promise.all(
            providers.map(async (provider) => {
              try {
                if (await provider.isAvailable()) {
                  const models = await provider.getModels();
                  if (models && models.length > 0) {
                    modelsMap.set(
                      provider.getName(),
                      models.map((model) => model.name)
                    );
                  }
                }
              } catch (err) {
                const providerName = provider.getName();
                console.error(
                  `Failed to fetch models from ${providerName}:`,
                  err
                );
                errors.push(providerName);
              }
            })
          );
        }
      );

      console.log("1111");

      // 如果所有provider都失败了,显示错误
      if (modelsMap.size === 0) {
        if (errors.length > 0) {
          await notify.warn("model.list.partial.failed", [errors.join(", ")], {
            modal: true,
          });
        }
        await notify.error("model.list.all.failed");
        return undefined;
      }

      // 如果部分provider失败,显示警告
      if (errors.length > 0) {
        await notify.warn("model.list.partial.failed", [errors.join(", ")], {
          modal: true,
        });
      }

      // Prepare items for quick pick dialog
      const items: vscode.QuickPickItem[] = [];
      for (const [provider, models] of modelsMap) {
        // Add provider as separator
        items.push({
          label: provider,
          kind: vscode.QuickPickItemKind.Separator,
        });
        // Add models under provider
        models.forEach((model) => {
          items.push({
            label: model,
            description: provider,
            picked: provider === currentProvider && model === currentModel,
          });
        });
      }

      // Create and configure quick pick dialog
      const quickPick = vscode.window.createQuickPick();
      quickPick.items = items;
      quickPick.title = getMessage("ai.model.picker.title");
      quickPick.placeholder = getMessage("ai.model.picker.placeholder");
      quickPick.ignoreFocusOut = true;

      // Wait for user selection
      const result = await new Promise<vscode.QuickPickItem | undefined>(
        (resolve) => {
          quickPick.onDidAccept(() => resolve(quickPick.selectedItems[0]));
          quickPick.onDidHide(() => resolve(undefined));
          quickPick.show();
        }
      );

      quickPick.dispose();

      // Return selected provider and model if available
      if (result && result.description) {
        return { provider: result.description, model: result.label };
      }
      return undefined;
    } catch (error) {
      console.error(getMessage("model.list.failed"), error);
      await notify.error("model.list.failed");
      return undefined;
    }
  }
}
