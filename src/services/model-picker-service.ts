import * as vscode from "vscode";
import { AIProviderFactory } from "../ai/ai-provider-factory";
import { notify } from "../utils/notification";
import { getMessage } from "../utils/i18n";
import type { AIModel } from "../ai/types";

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
      // 获取所有AI提供商
      const providers = AIProviderFactory.getAllProviders();
      console.log("providers", providers);
      // 临时存储每个provider的模型列表
      const tempModelsMap = new Map<string, AIModel[]>();
      // 用于记录拉取模型失败的provider
      let errors: string[] = [];

      // 获取加载模型时的进度提示信息
      const progressMsg = getMessage("ai.model.loading");
      // 使用 VS Code 的进度通知
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: progressMsg,
          cancellable: false,
        },
        async () => {
          // 并行获取每个provider的模型
          await Promise.all(
            providers.map(async (provider) => {
              try {
                // 检查provider是否可用
                if (await provider.isAvailable()) {
                  // 获取模型列表
                  const models = await provider.getModels();
                  if (models && models.length > 0) {
                    // 记录到临时map中
                    tempModelsMap.set(provider.getName(), models);
                  }
                }
              } catch (err) {
                // 如果获取失败，打印日志并加入错误列表
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

      // 如果所有provider都失败了，提示错误
      if (tempModelsMap.size === 0) {
        if (errors.length > 0) {
          // 弹窗警告部分provider失败
          await notify.warn("model.list.partial.failed", [errors.join(", ")], {
            modal: true,
          });
        }
        // 弹窗错误所有provider都失败
        await notify.error("model.list.all.failed");
        return undefined;
      }

      // 如果部分provider失败，提示警告
      if (errors.length > 0) {
        await notify.warn("model.list.partial.failed", [errors.join(", ")], {
          modal: true,
        });
      }

      // 重新按照原始providers的顺序构建有序Map
      const modelsMap = new Map<string, AIModel[]>();
      for (const provider of providers) {
        const providerName = provider.getName();
        if (tempModelsMap.has(providerName)) {
          modelsMap.set(providerName, tempModelsMap.get(providerName)!);
        }
      }

      // 组装 QuickPickItem 列表，用于展示模型选择对话框
      const items: vscode.QuickPickItem[] = [];
      for (const [provider, models] of modelsMap) {
        // 先添加provider作为分隔符
        items.push({
          label: provider,
          kind: vscode.QuickPickItemKind.Separator,
        });
        // 添加provider下的每个模型
        models.forEach((model) => {
          items.push({
            label: model.id, // 主要展示ID
            description: provider, // 记录是哪个provider
            detail: model.name, // 详细信息
            picked: provider === currentProvider && model.id === currentModel, // 是否高亮选中
          });
        });
      }

      // 创建并配置 QuickPick 对话框
      const quickPick = vscode.window.createQuickPick();
      quickPick.items = items;
      quickPick.title = getMessage("ai.model.picker.title");
      quickPick.placeholder = getMessage("ai.model.picker.placeholder");
      quickPick.ignoreFocusOut = true;

      // 等待用户选择
      const result = await new Promise<vscode.QuickPickItem | undefined>(
        (resolve) => {
          quickPick.onDidAccept(() => resolve(quickPick.selectedItems[0]));
          quickPick.onDidHide(() => resolve(undefined));
          quickPick.show();
        }
      );

      quickPick.dispose();

      // 如果用户选择了模型，则返回 provider 和 model
      if (result && result.description) {
        return { provider: result.description, model: result.label };
      }
      return undefined;
    } catch (error) {
      // 捕获异常并弹窗提示错误
      console.error(getMessage("model.list.failed"), error);
      await notify.error("model.list.failed");
      return undefined;
    }
  }
}
