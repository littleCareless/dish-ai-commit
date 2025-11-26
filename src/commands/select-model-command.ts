import { BaseCommand } from "@/commands/base-command";
import * as vscode from "vscode";

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
   * 由于模型配置现在通过设置页面管理,此命令将引导用户打开设置页面
   */
  async execute(): Promise<void> {
    this.logger.info("Executing SelectModelCommand...");

    // 模型选择现在通过设置页面完成
    const openSettings = "打开设置页面";
    const cancel = "取消";

    const choice = await vscode.window.showInformationMessage(
      "模型配置已迁移至设置页面。请通过设置页面管理您的AI配置和模型选择。",
      openSettings,
      cancel
    );

    if (choice === openSettings) {
      // 打开设置webview
      await vscode.commands.executeCommand("dish-ai-commit.openSettings");
      this.logger.info("Opened settings page for model configuration.");
    } else {
      this.logger.info("User cancelled opening settings page.");
    }
  }
}
