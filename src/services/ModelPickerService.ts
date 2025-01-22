import * as vscode from "vscode";
import { AIProviderFactory } from "../ai/AIProviderFactory";
import { NotificationHandler } from "../utils/NotificationHandler";
import { LocalizationManager } from "../utils/LocalizationManager";

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
    const locManager = LocalizationManager.getInstance();
    try {
      // Get all available AI providers
      const providers = AIProviderFactory.getAllProviders();
      /** Map to store provider name to available models mapping */
      const modelsMap = new Map<string, string[]>();

      console.log("providers", providers);

      // Show progress notification while loading models
      const progressMsg = locManager.getMessage("ai.model.loading");
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: progressMsg,
          cancellable: false,
        },
        async () => {
          // Load models from each available provider
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
      quickPick.title = locManager.getMessage("ai.model.picker.title");
      quickPick.placeholder = locManager.getMessage(
        "ai.model.picker.placeholder"
      );
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
      console.error(locManager.getMessage("model.list.failed"), error);
      NotificationHandler.error("model.list.failed");
      return undefined;
    }
  }
}
