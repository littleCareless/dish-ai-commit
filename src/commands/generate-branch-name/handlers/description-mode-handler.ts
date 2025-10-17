import * as vscode from "vscode";
import { Logger } from "../../../utils/logger";
import { notify } from "../../../utils/notification/notification-manager";
import { getMessage } from "../../../utils/i18n";

/**
 * 描述模式处理器
 * 负责处理"从描述生成分支名称"的场景
 */
export class DescriptionModeHandler {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 处理描述模式的分支名称生成
   * @param aiProvider - AI 提供程序
   * @param model - 选中的模型
   * @param configuration - 配置对象
   * @returns {Promise<string | undefined>} 生成的分支名称
   */
  async handle(
    aiProvider: any,
    model: any,
    configuration: any
  ): Promise<string | undefined> {
    this.logger.info("Handling description mode for branch name generation");

    // 提示用户输入描述
    const description = await this.getBranchDescription();
    if (!description) {
      this.logger.info("User cancelled entering branch description.");
      return undefined;
    }

    this.logger.info(`User provided description: ${description}`);

    try {
      // 调用 AI 生成分支名称
      const branchNameResult = await aiProvider?.generateBranchName?.({
        ...configuration.base,
        ...configuration.features.branchName,
        diff: description, // 使用用户描述作为输入
        model: model,
        scm: "git", // 描述模式默认使用 git
      });

      if (!branchNameResult?.content) {
        this.logger.error("AI failed to generate branch name from description.");
        await notify.error(getMessage("branch.name.generation.failed"));
        return undefined;
      }

      this.logger.info(`AI generated branch name from description: ${branchNameResult.content}`);
      return branchNameResult.content;
    } catch (error) {
      this.logger.error(`Failed to generate branch name from description: ${error}`);
      await notify.error(getMessage("branch.name.generation.failed"));
      return undefined;
    }
  }

  /**
   * 获取用户输入的分支描述
   * @returns {Promise<string | undefined>} 用户输入的描述
   */
  private async getBranchDescription(): Promise<string | undefined> {
    const description = await vscode.window.showInputBox({
      prompt: getMessage("enter.branch.description.prompt"),
      placeHolder: getMessage("enter.branch.description.placeholder"),
      ignoreFocusOut: true,
    });

    if (!description) {
      await notify.info("branch.description.cancelled");
      return undefined;
    }

    return description;
  }
}
