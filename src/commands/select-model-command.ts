import * as vscode from "vscode";
import { BaseCommand } from "./base-command";
import { ConfigurationManager } from "../config/configuration-manager";
import { notify } from "../utils/notification/notification-manager";

/**
 * 模型选择命令类
 */
export class SelectModelCommand extends BaseCommand {
  /**
   * 创建命令实例
   * @param context - VSCode扩展上下文
   */
  constructor(context: vscode.ExtensionContext) {
    super(context);
  }

  /**
   * 执行模型选择命令
   * 允许用户选择新的AI提供商和模型,并更新配置
   */
  async execute(): Promise<void> {
    this.logger.info("Executing SelectModelCommand...");
    const configManager = ConfigurationManager.getInstance();

    // 获取当前配置的AI提供商和模型
    const currentProvider = configManager.getConfig("BASE_PROVIDER");
    const currentModel = configManager.getConfig("BASE_MODEL");
    this.logger.info(
      `Current model configuration: Provider=${currentProvider}, Model=${currentModel}`
    );

    // 显示模型选择器并获取用户选择
    const modelSelection = await this.showModelPicker(
      currentProvider,
      currentModel
    );

    // 如果用户做出选择,则更新配置
    if (modelSelection) {
      this.logger.info(
        `User selected new model: Provider=${modelSelection.provider}, Model=${modelSelection.model}`
      );
      await configManager.updateAIConfiguration(
        modelSelection.provider,
        modelSelection.model
      );
      this.logger.info("AI configuration updated successfully.");
      notify.info("model.update.success", [
        modelSelection.provider,
        modelSelection.model,
      ]);
    } else {
      this.logger.info("User cancelled model selection.");
    }
  }
}
