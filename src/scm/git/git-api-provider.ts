import * as vscode from "vscode";
import { IGitProvider } from "./git-provider-interface";
import { GitRepositoryHelper } from "./helpers/git-repository-helper";
import { GitDiffHelper } from "./helpers/git-diff-helper";
import { GitLogHelper } from "./helpers/git-log-helper";
import { Logger } from "../../utils/logger";
import { formatMessage } from "../../utils/i18n";
import { notify } from "../../utils/notification/notification-manager";

/**
 * 基于 VS Code Git API 的 Git 提供者实现
 * 使用 VS Code 内置的 Git 扩展 API 完成所有操作
 */
export class GitApiProvider implements IGitProvider {
  private readonly repositoryHelper: GitRepositoryHelper;
  private readonly diffHelper: GitDiffHelper;
  private readonly logHelper: GitLogHelper;
  private logger: Logger;

  /**
   * 创建 Git API 提供者实例
   * @param gitExtension VS Code Git 扩展实例
   * @param repositoryPath 可选的仓库路径
   */
  constructor(private readonly gitExtension: any, repositoryPath?: string) {
    this.repositoryHelper = new GitRepositoryHelper(gitExtension, repositoryPath);
    this.diffHelper = new GitDiffHelper();
    this.logHelper = new GitLogHelper();
    this.logger = Logger.getInstance("Dish AI Commit Gen");
  }

  /**
   * 初始化 Git API 提供者
   */
  async init(): Promise<void> {
    // API 版本无需特别初始化
  }

  /**
   * 检查 Git API 是否可用
   * @returns 如果 Git API 可用返回 true，否则返回 false
   */
  async isAvailable(): Promise<boolean> {
    try {
      const api = this.gitExtension.getAPI(1);
      return api.repositories.length > 0;
    } catch (error) {
      this.logger.warn(`Git API is not available: ${error}`);
      return false;
    }
  }

  /**
   * 获取文件差异
   * @param files 可选的文件路径数组
   * @param target 差异目标: 
   *   - 'staged': 只获取暂存区的更改 
   *   - 'all': 获取所有更改
   *   - 'auto': 先检查暂存区，如果暂存区有文件则获取暂存区的更改，否则获取所有更改
   * @returns 差异文本
   */
  async getDiff(files?: string[], target?: "staged" | "all" | "auto"): Promise<string | undefined> {
    const repository = this.repositoryHelper.findRepository(files);
    return this.diffHelper.getDiff(repository, files, target);
  }

  /**
   * 提交更改
   * @param message 提交信息
   * @param files 可选的要提交的文件路径数组
   */
  async commit(message: string, files?: string[]): Promise<void> {
    const repository = this.repositoryHelper.findRepository(files);

    if (!repository) {
      throw new Error(formatMessage("scm.repository.not.found", ["Git"]));
    }

    await repository.commit(message, { all: !files, files });
  }

  /**
   * 设置提交输入框的内容
   * @param message 要设置的提交信息
   */
  async setCommitInput(message: string): Promise<void> {
    const repository = this.repositoryHelper.findRepository();

    if (repository?.inputBox) {
      repository.inputBox.value = message;
    } else {
      try {
        await vscode.env.clipboard.writeText(message);
        notify.info("commit.message.copied");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        notify.error("commit.message.copy.failed", [errorMessage]);
        // Fallback to showing the message in an information dialog
        notify.info("commit.message.manual.copy", [message]);
      }
    }
  }

  /**
   * 获取提交输入框的当前内容
   * @returns 当前的提交信息
   */
  async getCommitInput(): Promise<string> {
    const repository = this.repositoryHelper.findRepository();

    if (!repository) {
      throw new Error(formatMessage("scm.repository.not.found", ["Git"]));
    }

    return repository.inputBox.value;
  }

  /**
   * 开始流式设置提交输入框的内容
   * @param message 要设置的提交信息
   */
  async startStreamingInput(message: string): Promise<void> {
    await this.setCommitInput(message);
  }

  /**
   * 获取提交日志
   * @param baseBranch 基础分支，默认为 'origin/main'
   * @param headBranch 当前分支，默认为 'HEAD'
   * @returns 提交信息列表
   */
  async getCommitLog(baseBranch = "origin/main", headBranch = "HEAD"): Promise<string[]> {
    const repository = this.repositoryHelper.findRepository();
    if (!repository) {
      notify.warn(formatMessage("scm.repository.not.found", ["Git"]));
      return [];
    }
    
    return this.logHelper.getCommitLog(
      repository.rootUri.fsPath,
      baseBranch,
      headBranch
    );
  }

  /**
   * 获取所有本地和远程分支的列表
   * @returns 分支名称列表
   */
  async getBranches(): Promise<string[]> {
    const repository = this.repositoryHelper.findRepository();
    if (!repository) {
      notify.warn(formatMessage("scm.repository.not.found", ["Git"]));
      return [];
    }

    return this.logHelper.getBranches(repository.rootUri.fsPath);
  }

  /**
   * 获取最近的提交消息
   * @returns 仓库和用户的最近提交消息
   */
  async getRecentCommitMessages(): Promise<{ repository: string[]; user: string[] }> {
    const repository = this.repositoryHelper.findRepository();
    if (!repository) {
      return { repository: [], user: [] };
    }
    
    return this.logHelper.getRecentCommitMessages(repository);
  }

  /**
   * 将提交信息复制到剪贴板
   * @param message 要复制的提交信息
   */
  async copyToClipboard(message: string): Promise<void> {
    try {
      await vscode.env.clipboard.writeText(message);
      notify.info("commit.message.copied");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      notify.error("commit.message.copy.failed", [errorMessage]);
    }
  }

  /**
   * 获取暂存文件列表
   * @returns 暂存文件路径数组
   */
  async getStagedFiles(): Promise<string[]> {
    const repository = this.repositoryHelper.findRepository();
    if (!repository) {
      return [];
    }
    
    return this.diffHelper.getStagedFiles(repository.rootUri.fsPath);
  }

  /**
   * 获取所有变更文件列表
   * @returns 所有变更文件路径数组
   */
  async getAllChangedFiles(): Promise<string[]> {
    const repository = this.repositoryHelper.findRepository();
    if (!repository) {
      return [];
    }
    
    return this.diffHelper.getAllChangedFiles(repository.rootUri.fsPath);
  }
}