import * as vscode from "vscode";
import { Logger } from "../../../utils/logger";
import { notify } from "../../../utils/notification/notification-manager";
import { getMessage } from "../../../utils/i18n";
import { BranchFormatter } from "./branch-formatter";
import { BranchCreator } from "./branch-creator";

/**
 * 分支名称建议服务
 * 负责生成分支名称变体、显示 QuickPick 界面，并处理用户选择
 */
export class BranchSuggester {
  private logger: Logger;
  private formatter: BranchFormatter;
  private creator: BranchCreator;

  constructor(logger: Logger) {
    this.logger = logger;
    this.formatter = new BranchFormatter(logger);
    this.creator = new BranchCreator(logger);
  }

  /**
   * 显示分支名称建议并提供创建分支的选项
   * @param branchName - AI生成的分支名称建议
   * @returns {Promise<void>}
   */
  async showBranchNameSuggestion(branchName: string): Promise<void> {
    this.logger.info("Showing branch name suggestion QuickPick...");
    
    // 格式化分支名称
    const formattedBranchName = this.formatter.formatBranchName(branchName);

    // 生成多个分支名称变体供用户选择
    const branchSuggestions = this.formatter.generateBranchVariants(formattedBranchName);

    // 显示 QuickPick
    const selectedBranch = await this.showBranchQuickPick(branchSuggestions);
    if (!selectedBranch) {
      this.logger.info("User cancelled branch name selection.");
      return;
    }

    // 处理用户选择
    await this.handleBranchSelection(selectedBranch);
  }

  /**
   * 显示分支名称 QuickPick 选择器
   * @param branchSuggestions - 分支名称建议数组
   * @returns {Promise<string | undefined>} 选中的分支名称
   */
  private async showBranchQuickPick(branchSuggestions: string[]): Promise<string | undefined> {
    const quickPick = vscode.window.createQuickPick();
    quickPick.title = getMessage("branch.name.suggestions");
    quickPick.placeholder = getMessage("select.or.edit.branch.name");

    // 设置分支名称选项
    quickPick.items = branchSuggestions.map((branch) => ({
      label: branch,
      description: branch.includes("/") ? branch?.split("/")[0] : "", // 显示分支类型（如果有）
    }));

    // 允许用户自定义输入
    quickPick.canSelectMany = false;
    quickPick.ignoreFocusOut = true;

    return new Promise<string | undefined>((resolve) => {
      // 处理用户确认选择
      quickPick.onDidAccept(() => {
        const selectedBranch = quickPick.selectedItems[0]?.label || quickPick.value;
        this.logger.info(`User selected or entered branch name: ${selectedBranch}`);
        quickPick.hide();
        resolve(selectedBranch);
      });

      // 处理用户取消
      quickPick.onDidHide(() => {
        this.logger.info("Branch name suggestion QuickPick was hidden/cancelled.");
        resolve(undefined);
      });

      quickPick.show();
    });
  }

  /**
   * 处理用户选择的分支名称
   * @param selectedBranch - 用户选择的分支名称
   */
  private async handleBranchSelection(selectedBranch: string): Promise<void> {
    this.logger.info(`User selected branch name: ${selectedBranch}`);

    // 显示操作选项
    const createBranch = getMessage("create.branch");
    const copyToClipboard = getMessage("copy.to.clipboard");

    const selection = await notify.info(
      "branch.name.selected",
      [selectedBranch],
      {
        buttons: [createBranch, copyToClipboard],
      }
    );

    if (selection === createBranch) {
      await this.handleCreateBranch(selectedBranch);
    } else if (selection === copyToClipboard) {
      await this.handleCopyToClipboard(selectedBranch);
    } else {
      this.logger.info("User dismissed the branch action notification.");
    }
  }

  /**
   * 处理创建分支操作
   * @param branchName - 分支名称
   */
  private async handleCreateBranch(branchName: string): Promise<void> {
    this.logger.info(`User chose to create branch: ${branchName}`);
    
    try {
      // 将分支名称复制到剪贴板
      await vscode.env.clipboard.writeText(branchName);
      
      // 创建分支
      await this.creator.createBranchFromGeneratedName(branchName);
    } catch (error) {
      this.logger.error(`Failed to create branch: ${error}`);
      notify.error("branch.creation.failed");
    }
  }

  /**
   * 处理复制到剪贴板操作
   * @param branchName - 分支名称
   */
  private async handleCopyToClipboard(branchName: string): Promise<void> {
    this.logger.info(`User chose to copy branch name: ${branchName}`);
    
    try {
      // 将分支名称复制到剪贴板
      await vscode.env.clipboard.writeText(branchName);
      this.logger.info(`Branch name '${branchName}' copied to clipboard.`);
      notify.info("branch.name.copied");
    } catch (error) {
      this.logger.error(`Failed to copy branch name to clipboard: ${error}`);
      notify.error("branch.name.copy.failed");
    }
  }
}
