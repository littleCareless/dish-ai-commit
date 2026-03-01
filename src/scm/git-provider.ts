import * as vscode from "vscode";
import { ISCMProvider } from "@/scm/scm-provider";
import { Logger } from "@/utils/logger";
import { getMessage, formatMessage } from "@/utils/i18n";
import { IGitProvider } from "@/scm/git/git-provider-interface";
import { GitProviderFactory, GitProviderType } from "@/scm/git/git-provider-factory";
import { GitRepositoryManager } from "@/scm/git/git-repository-manager";
import { ImprovedPathUtils } from "@/scm/utils/improved-path-utils";
import { notify } from "@/utils/notification/notification-manager";

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
  private providerCache = new Map<string, IGitProvider>();
  private initPromise: Promise<void> | undefined;
  private defaultRepositoryPath?: string;

  /**
   * 创建Git提供者实例
   * @param gitExtension - VS Code Git扩展实例
   * @param repositoryPath - 可选的仓库路径
   * @throws {Error} 当未找到工作区时抛出错误
   */
  constructor(private readonly gitExtension: any, private readonly repositoryPath?: string) {
    this.logger = Logger.getInstance("Dish AI Commit Gen");
    this.factory = GitProviderFactory.getInstance();
    this.defaultRepositoryPath = repositoryPath
      ? ImprovedPathUtils.normalizePath(repositoryPath)
      : undefined;
    this.repositoryManager = undefined;

    if (!vscode.workspace.workspaceFolders?.length) {
      throw new Error(getMessage("workspace.not.found"));
    }
  }

  /**
   * 初始化Provider
   */
  async init(forceReload = false): Promise<void> {
    await this.ensureDefaultProvider(forceReload);
  }

  /**
   * 检查Git是否可用
   * @returns {Promise<boolean>} 如果Git可用返回true,否则返回false
   */
  async isAvailable(): Promise<boolean> {
    // 每次都重新初始化提供者
    await this.ensureDefaultProvider();
    
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
      await this.ensureDefaultProvider();
      
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
      await this.ensureDefaultProvider();
      
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
      await this.ensureDefaultProvider();
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
    await this.ensureDefaultProvider();
    
    return this.gitProvider?.getCommitInput() || "";
  }

  /**
   * 开始流式设置提交输入框的内容
   * @param {string} message - 要设置的提交信息
   */
  async startStreamingInput(message: string): Promise<void> {
    // Reuse repository-targeted set logic to avoid drifting to the wrong
    // repository/provider in multi-repository streaming scenarios.
    return this.setCommitInput(message);
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
    await this.ensureDefaultProvider();
    
    return this.gitProvider?.getCommitLog(baseBranch, headBranch) || [];
  }

  /**
   * 获取所有本地和远程分支的列表
   * @returns 返回分支名称列表
   */
  async getBranches(): Promise<string[]> {
    // 每次重新初始化提供者
    await this.ensureDefaultProvider();
    
    return this.gitProvider?.getBranches() || [];
  }

  /**
   * 获取最近的提交消息
   * @returns 仓库和用户的最近提交消息
   */
  async getRecentCommitMessages(): Promise<{ repository: string[]; user: string[] }> {
    // 每次重新初始化提供者
    await this.ensureDefaultProvider();
    
    return this.gitProvider?.getRecentCommitMessages() || { repository: [], user: [] };
  }

  /**
   * 将提交信息复制到剪贴板
   * @param message 要复制的提交信息
   */
  async copyToClipboard(message: string): Promise<void> {
    // 每次重新初始化提供者
    await this.ensureDefaultProvider();
    
    return this.gitProvider?.copyToClipboard(message);
  }

  /**
   * 获取暂存文件列表
   * @returns {Promise<string[]>} 暂存文件路径数组
   */
  async getStagedFiles(): Promise<string[]> {
    // 每次重新初始化提供者
    await this.ensureDefaultProvider();
    
    return this.gitProvider?.getStagedFiles() || [];
  }

  /**
   * 获取所有变更文件列表
   * @returns {Promise<string[]>} 所有变更文件路径数组
   */
  async getAllChangedFiles(): Promise<string[]> {
    // 每次重新初始化提供者
    await this.ensureDefaultProvider();
    
    return this.gitProvider?.getAllChangedFiles() || [];
  }

  /**
   * 切换到指定仓库
   * @param repositoryPath 仓库路径
   * @returns 是否成功切换
   */
  async switchToRepository(repositoryPath: string): Promise<boolean> {
    try {
      const provider = await this.getOrCreateProvider(repositoryPath, true);
      
      if (provider) {
        this.gitProvider = provider;
        this.defaultRepositoryPath =
          ImprovedPathUtils.normalizePath(repositoryPath);
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
      const repositoryManager = await this.ensureRepositoryManager();
      const repoInfo = await repositoryManager.selectRepository();
      if (!repoInfo) {
        return false;
      }
      const provider = await this.getOrCreateProvider(repoInfo.rootPath);
      
      if (provider) {
        this.gitProvider = provider;
        this.defaultRepositoryPath = ImprovedPathUtils.normalizePath(
          repoInfo.rootPath,
        );
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
      await this.ensureDefaultProvider();
      return this.gitProvider;
    }

    try {
      const repositoryManager = await this.ensureRepositoryManager();
      const repoInfo = await repositoryManager.getRepositoryForFile(files[0]);
      if (repoInfo) {
        return this.getOrCreateProvider(repoInfo.rootPath);
      }
      this.logger.debug(
        `Repository not found for file ${files[0]} when resolving provider`,
      );
    } catch (error) {
      this.logger.debug(`Could not get provider for file ${files[0]}: ${error}`);
    }

    // 重新获取当前提供者
    await this.ensureDefaultProvider();
    return this.gitProvider;
  }

  /**
   * 获取所有可用的仓库
   * @returns 所有仓库信息的数组
   */
  async getAllRepositories() {
    const repositoryManager = await this.ensureRepositoryManager();
    // 每次都重新发现仓库
    return repositoryManager.getAllRepositories();
  }

  private async ensureDefaultProvider(forceReload = false): Promise<void> {
    if (this.initPromise && !forceReload) {
      await this.initPromise;
      return;
    }

    this.initPromise = (async () => {
      if (!forceReload && this.gitProvider) {
        return;
      }

      const repositoryManager = await this.ensureRepositoryManager();

      if (!this.defaultRepositoryPath) {
        const repoInfo = await repositoryManager.getCurrentRepository();
        if (!repoInfo) {
          throw new Error(formatMessage("scm.repository.not.found", ["Git"]));
        }
        this.defaultRepositoryPath = ImprovedPathUtils.normalizePath(
          repoInfo.rootPath,
        );
      }

      this.gitProvider = await this.getOrCreateProvider(
        this.defaultRepositoryPath,
        forceReload,
      );
    })();

    try {
      await this.initPromise;
    } finally {
      this.initPromise = undefined;
    }
  }

  private async ensureRepositoryManager(): Promise<GitRepositoryManager> {
    if (!this.repositoryManager) {
      await this.factory.initRepositoryManager(this.gitExtension);
      this.repositoryManager = GitRepositoryManager.getInstance(
        this.gitExtension,
      );
    }
    return this.repositoryManager;
  }

  private async getOrCreateProvider(
    repositoryPath: string,
    forceReload = false,
  ): Promise<IGitProvider> {
    const cacheKey = ImprovedPathUtils.normalizePath(repositoryPath);
    if (forceReload) {
      this.providerCache.delete(cacheKey);
    } else {
      const cached = this.providerCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const provider = await this.factory.createProviderForRepository(
      repositoryPath,
      GitProviderType.API,
      this.gitExtension,
    );

    if (!provider) {
      throw new Error(formatMessage("scm.repository.not.found", ["Git"]));
    }

    await provider.init();
    this.providerCache.set(cacheKey, provider);
    return provider;
  }
}
