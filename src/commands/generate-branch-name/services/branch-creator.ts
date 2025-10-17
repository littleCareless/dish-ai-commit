import * as vscode from "vscode";
import { getGitApi, hasValidRepository, getFirstRepository } from "../../../utils/git/git-api";
import { RefQuickPickItem } from "../../../utils/git/types";
import { Logger } from "../../../utils/logger";
import { notify } from "../../../utils/notification/notification-manager";
import { getMessage, formatMessage } from "../../../utils/i18n";

/**
 * 分支创建服务
 * 负责使用 Git API 创建新分支，简化了原始的三重备选方案
 */
export class BranchCreator {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 从生成的分支名称创建新分支
   * 使用 Git API 方式，提供友好的错误提示
   * @param generatedBranchName - 要创建的分支名称
   * @returns {Promise<void>}
   */
  async createBranchFromGeneratedName(generatedBranchName: string): Promise<void> {
    this.logger.info(`Attempting to create branch: '${generatedBranchName}'`);

    const gitApi = await getGitApi();
    if (!gitApi) {
      this.logger.error("Cannot create branch: Git API not found.");
      notify.error("git.api.not.found");
      return;
    }

    if (!hasValidRepository(gitApi)) {
      this.logger.error("Cannot create branch: No Git repositories found.");
      notify.error("git.repo.not.found");
      return;
    }

    // 使用第一个可用的仓库
    const repository = getFirstRepository(gitApi);
    if (!repository) {
      this.logger.error("Cannot create branch: No valid repository found.");
      notify.error("git.repo.not.found");
      return;
    }

    this.logger.info(`Using repository: ${repository.rootUri.fsPath}`);

    try {
      await this.createBranchWithGitApi(repository, generatedBranchName);
    } catch (error: any) {
      this.logger.error(`Branch creation failed: ${error}`);
      await this.handleBranchCreationError(error, generatedBranchName);
    }
  }

  /**
   * 使用 Git API 创建分支
   * @param repository - Git 仓库实例
   * @param branchName - 分支名称
   */
  private async createBranchWithGitApi(
    repository: any,
    branchName: string
  ): Promise<void> {
    this.logger.info("Creating branch using Git API");

    // 获取所有引用
    const refs = await repository.getRefs({});
    if (refs.length === 0) {
      this.logger.error("Cannot create branch: No refs found in the repository.");
      notify.error("git.no.refs.found");
      return;
    }

    this.logger.info(`Found ${refs.length} refs. Showing QuickPick for source ref.`);

    // 显示源引用选择器
    const selectedRef = await this.showRefSelection(refs);
    if (!selectedRef) {
      this.logger.info("User cancelled branch creation at source ref selection.");
      notify.info("branch.creation.cancelled");
      return;
    }

    // 检查分支名称冲突
    await this.checkBranchNameConflicts(refs, branchName);

    // 创建分支
    this.logger.info(
      `Creating branch '${branchName}' from '${selectedRef.name}' (${selectedRef.commit})`
    );
    
    await repository.createBranch(branchName, true, selectedRef.commit);
    
    this.logger.info("Branch created successfully via Git API.");
    notify.info("branch.created.from", [branchName, selectedRef.name]);
  }

  /**
   * 显示引用选择 QuickPick
   * @param refs - Git 引用数组
   * @returns {Promise<any>} 选中的引用
   */
  private async showRefSelection(refs: any[]): Promise<any> {
    const quickPickItems: RefQuickPickItem[] = refs
      .filter((ref: any) => ref.name)
      .map((ref: any): RefQuickPickItem => ({
        label: ref.name || getMessage("git.unnamed.ref"),
        description: `${
          ref.type === 1
            ? getMessage("git.ref.type.branch")
            : ref.type === 2
            ? getMessage("git.ref.type.tag")
            : getMessage("git.ref.type.remote")
        }`,
        detail: ` $(git-commit) ${ref.commit?.slice(0, 7)}`,
        ref,
      }));

    const selectedItem = await vscode.window.showQuickPick<RefQuickPickItem>(
      quickPickItems,
      {
        placeHolder: getMessage("select.base.branch.placeholder"),
        ignoreFocusOut: true,
        title: getMessage("select.source.for.new.branch.title"),
      }
    );

    return selectedItem?.ref;
  }

  /**
   * 检查分支名称冲突
   * @param refs - Git 引用数组
   * @param branchName - 要检查的分支名称
   */
  private async checkBranchNameConflicts(refs: any[], branchName: string): Promise<void> {
    const conflictingRef = refs.find((ref) => {
      if (!ref.name) return false;
      
      // 检查分支名称是否与现有引用冲突
      return (
        ref.name.startsWith(`${branchName}/`) ||
        branchName.startsWith(`${ref.name}/`)
      );
    });

    if (conflictingRef) {
      const errorMessage = formatMessage("branch.name.conflicts", [
        branchName,
        conflictingRef.name,
      ]);
      this.logger.error(errorMessage);
      notify.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * 处理分支创建错误
   * @param error - 错误对象
   * @param branchName - 分支名称
   */
  private async handleBranchCreationError(error: any, branchName: string): Promise<void> {
    if (error.gitErrorCode === "CantLockRef") {
      notify.error("branch.name.conflicts.generic");
    } else {
      notify.error("branch.creation.failed");
      
      // 提供友好的错误信息和建议
      const action = await notify.info(
        "branch.creation.failed.help",
        [branchName],
        {
          buttons: [
            getMessage("copy.branch.name"),
            getMessage("try.again"),
          ],
        }
      );

      if (action === getMessage("copy.branch.name")) {
        await vscode.env.clipboard.writeText(branchName);
        notify.info("branch.name.copied");
      } else if (action === getMessage("try.again")) {
        // 递归调用重试
        await this.createBranchFromGeneratedName(branchName);
      }
    }
  }
}
