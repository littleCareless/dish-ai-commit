import * as vscode from "vscode";
import { ISCMProvider } from "./scm-provider";
import { Logger } from "../utils/logger";
import { getMessage, formatMessage } from "../utils/i18n";
import { IGitProvider } from "./git/git-provider-interface";
import { GitProviderFactory, GitProviderType } from "./git/git-provider-factory";
import { GitRepositoryManager } from "./git/git-repository-manager";
import { notify } from "../utils/notification/notification-manager";

/**
 * Git源代码管理提供者实现
 * @implements {ISCMProvider}
 */
export class GitProvider implements ISCMProvider {
  /** SCM类型标识符 */
  type = "git" as const;
  
  /** Git 提供者实例，可以是 API 或命令行实现 */
  private gitProvider: IGitProvider | undefined;
  private repositoryManager: GitRepositoryManager | undefined;
  private factory: GitProviderFactory;
  private logger: Logger;

  /**
   * 创建Git提供者实例
   * @param gitExtension - VS Code Git扩展实例
   * @param repositoryPath - 可选的仓库路径
   * @throws {Error} 当未找到工作区时抛出错误
   */
  constructor(private readonly gitExtension: any, private readonly repositoryPath?: string) {
    this.logger = Logger.getInstance("Dish AI Commit Gen");
    this.factory = GitProviderFactory.getInstance();

    if (!vscode.workspace.workspaceFolders?.length) {
      throw new Error(getMessage("workspace.not.found"));
    }
  }

  /**
   * 初始化Provider
   */
  async init(): Promise<void> {
    try {
      // 初始化仓库管理器
      await this.factory.initRepositoryManager(this.gitExtension);
      
      // 直接使用repositoryPath创建提供者实例（每次创建新的实例，不使用缓存）
      if (this.repositoryPath) {
        this.gitProvider = await this.factory.createProviderForRepository(
          this.repositoryPath,
          GitProviderType.API, 
          this.gitExtension
        );
      } else {
        // 回退到原有的当前仓库逻辑（兼容性处理）
        this.gitProvider = await this.factory.createProviderForCurrentRepository(
          GitProviderType.API, 
          this.gitExtension
        );
      }
      
      if (!this.gitProvider) {
        throw new Error(formatMessage("scm.repository.not.found", ["Git"]));
      }
      
      // 初始化所选的提供者
      await this.gitProvider.init();
    } catch (error) {
      this.logger.error(`Failed to initialize Git provider: ${error}`);
      throw error;
    }
  }

  /**
   * 检查Git是否可用
   * @returns {Promise<boolean>} 如果Git可用返回true,否则返回false
   */
  async isAvailable(): Promise<boolean> {
    // 每次都重新初始化提供者
    await this.init();
    
    return this.gitProvider?.isAvailable() || false;
  }

  /**
   * 获取文件差异信息
   * @param {string[]} [files] - 可选的文件路径数组
   * @param {string} [target] - 差异目标: 
   *   - 'staged': 只获取暂存区的更改 
   *   - 'all': 获取所有更改
   *   - 'auto': 先检查暂存区，如果暂存区有文件则获取暂存区的更改，否则获取所有更改
   * @returns {Promise<string | undefined>} 返回差异文本
   */
  async getDiff(
    files?: string[],
    target?: "staged" | "all" | "auto"
  ): Promise<string | undefined> {
    try {
      // 如果提供了文件路径，尝试获取特定文件所在的仓库的提供者
      if (files && files.length > 0) {
        const provider = await this.getProviderForFiles(files);
        if (provider) {
          return provider.getDiff(files, target);
        }
      }
      
      // 否则使用当前默认提供者（每次重新获取）
      await this.init();
      
      return this.gitProvider?.getDiff(files, target);
    } catch (error) {
      this.logger.error(`Failed to get diff: ${error}`);
      throw error;
    }
  }

  /**
   * 提交更改
   * @param {string} message - 提交信息
   * @param {string[]} [files] - 要提交的文件路径数组
   */
  async commit(message: string, files?: string[]): Promise<void> {
    try {
      // 如果提供了文件路径，尝试获取特定文件所在的仓库的提供者
      if (files && files.length > 0) {
        const provider = await this.getProviderForFiles(files);
        if (provider) {
          return provider.commit(message, files);
        }
      }
      
      // 否则使用当前默认提供者（每次重新获取）
      await this.init();
      
      return this.gitProvider?.commit(message, files);
    } catch (error) {
      this.logger.error(`Failed to commit: ${error}`);
      throw error;
    }
  }

  /**
   * 设置提交输入框的内容
   * @param {string} message - 要设置的提交信息
   */
  async setCommitInput(message: string): Promise<void> {
    try {
      // 如果提供了repositoryPath,直接定位到对应的仓库
      if (this.repositoryPath) {
        const gitApi = this.gitExtension.getAPI(1);
        if (gitApi && gitApi.repositories) {
          // 根据repositoryPath找到对应的repository对象
          const targetRepo = gitApi.repositories.find(
            (repo: any) => repo.rootUri?.fsPath === this.repositoryPath
          );
          
          if (targetRepo) {
            targetRepo.inputBox.value = message;
            this.logger.info(`Successfully set commit message for repository: ${this.repositoryPath}`);
            return;
          } else {
            throw new Error(`Repository not found: ${this.repositoryPath}`);
          }
        }
      }
      
      // 回退到原有逻辑
      await this.init();
      return this.gitProvider?.setCommitInput(message);
    } catch (error) {
      this.logger.error(`Failed to set commit input: ${error}`);
      throw error;
    }
  }

  /**
   * 获取提交输入框的当前内容
   * @returns {Promise<string>} 返回当前的提交信息
   */
  async getCommitInput(): Promise<string> {
    // 每次重新初始化提供者
    await this.init();
    
    return this.gitProvider?.getCommitInput() || "";
  }

  /**
   * 开始流式设置提交输入框的内容
   * @param {string} message - 要设置的提交信息
   */
  async startStreamingInput(message: string): Promise<void> {
    // 每次重新初始化提供者
    await this.init();
    
    return this.gitProvider?.startStreamingInput(message);
  }

  /**
   * 获取提交日志
   * @param baseBranch - 基础分支，默认为 origin/main
   * @param headBranch - 当前分支，默认为 HEAD
   * @returns 返回提交信息列表
   */
  async getCommitLog(
    baseBranch = "origin/main",
    headBranch = "HEAD"
  ): Promise<string[]> {
    // 每次重新初始化提供者
    await this.init();
    
    return this.gitProvider?.getCommitLog(baseBranch, headBranch) || [];
  }

  /**
   * 获取所有本地和远程分支的列表
   * @returns 返回分支名称列表
   */
  async getBranches(): Promise<string[]> {
    // 每次重新初始化提供者
    await this.init();
    
    return this.gitProvider?.getBranches() || [];
  }

  /**
   * 获取最近的提交消息
   * @returns 仓库和用户的最近提交消息
   */
  async getRecentCommitMessages(): Promise<{ repository: string[]; user: string[] }> {
    // 每次重新初始化提供者
    await this.init();
    
    return this.gitProvider?.getRecentCommitMessages() || { repository: [], user: [] };
  }

  /**
   * 将提交信息复制到剪贴板
   * @param message 要复制的提交信息
   */
  async copyToClipboard(message: string): Promise<void> {
    // 每次重新初始化提供者
    await this.init();
    
    return this.gitProvider?.copyToClipboard(message);
  }

  /**
   * 获取暂存文件列表
   * @returns {Promise<string[]>} 暂存文件路径数组
   */
  async getStagedFiles(): Promise<string[]> {
    // 每次重新初始化提供者
    await this.init();
    
    return this.gitProvider?.getStagedFiles() || [];
  }

  /**
   * 获取所有变更文件列表
   * @returns {Promise<string[]>} 所有变更文件路径数组
   */
  async getAllChangedFiles(): Promise<string[]> {
    // 每次重新初始化提供者
    await this.init();
    
    return this.gitProvider?.getAllChangedFiles() || [];
  }

  /**
   * 切换到指定仓库
   * @param repositoryPath 仓库路径
   * @returns 是否成功切换
   */
  async switchToRepository(repositoryPath: string): Promise<boolean> {
    try {
      const provider = await this.factory.createProviderForRepository(
        repositoryPath,
        GitProviderType.API,
        this.gitExtension
      );
      
      if (provider) {
        this.gitProvider = provider;
        notify.info(formatMessage("scm.repository.switched", [repositoryPath]));
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Failed to switch repository: ${error}`);
      notify.error(formatMessage("scm.repository.switch.failed", [repositoryPath, `${error}`]));
      return false;
    }
  }

  /**
   * 让用户选择仓库并切换
   * @returns 是否成功切换
   */
  async selectAndSwitchRepository(): Promise<boolean> {
    try {
      const provider = await this.factory.createProviderForSelectedRepository(
        GitProviderType.API,
        this.gitExtension
      );
      
      if (provider) {
        this.gitProvider = provider;
        notify.info(formatMessage("scm.repository.selected"));
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Failed to select repository: ${error}`);
      notify.error(formatMessage("scm.repository.select.failed", [`${error}`]));
      return false;
    }
  }

  /**
   * 根据文件路径获取合适的 Git 提供者
   * @param files 文件路径数组
   * @returns Git 提供者实例
   * @private
   */
  private async getProviderForFiles(files: string[]): Promise<IGitProvider | undefined> {
    if (!files.length) {
      // 重新获取当前提供者
      await this.init();
      return this.gitProvider;
    }

    try {
      // 每次重新创建文件对应的提供者实例
      return await this.factory.createProviderForFile(
        files[0],
        GitProviderType.API,
        this.gitExtension
      );
    } catch (error) {
      this.logger.debug(`Could not get provider for file ${files[0]}: ${error}`);
      // 重新获取当前提供者
      await this.init();
      return this.gitProvider;
    }
  }

  /**
   * 获取所有可用的仓库
   * @returns 所有仓库信息的数组
   */
  async getAllRepositories() {
    await this.factory.initRepositoryManager(this.gitExtension);
    const repositoryManager = GitRepositoryManager.getInstance(this.gitExtension);
    // 每次都重新发现仓库
    return repositoryManager.getAllRepositories();
  }
}