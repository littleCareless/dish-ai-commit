import * as vscode from "vscode";
import { IGitProvider } from "./git-provider-interface";
import { GitApiProvider } from "./git-api-provider";
import { GitCommandProvider } from "./git-command-provider";
import { GitRepositoryManager, GitRepositoryInfo } from "./git-repository-manager";
import { Logger } from "../../utils/logger";
import { notify } from "../../utils/notification/notification-manager";
import { formatMessage } from "../../utils/i18n";

/**
 * Git 提供者类型
 */
export enum GitProviderType {
  API = "api",
  COMMAND = "command"
}

/**
 * Git 提供者工厂类
 * 负责创建合适的 Git 提供者实例，并处理降级逻辑
 */
export class GitProviderFactory {
  private static instance: GitProviderFactory;
  private logger: Logger;
  private repositoryManager: GitRepositoryManager | undefined;

  /**
   * 私有构造函数，实现单例模式
   */
  private constructor() {
    this.logger = Logger.getInstance("Dish AI Commit Gen");
  }

  /**
   * 获取工厂实例
   */
  public static getInstance(): GitProviderFactory {
    if (!GitProviderFactory.instance) {
      GitProviderFactory.instance = new GitProviderFactory();
    }
    return GitProviderFactory.instance;
  }

  /**
   * 初始化仓库管理器
   * @param gitExtension VS Code Git 扩展实例
   */
  public async initRepositoryManager(gitExtension: any): Promise<void> {
    this.repositoryManager = GitRepositoryManager.getInstance(gitExtension);
  }

  /**
   * 为特定仓库创建提供者实例
   * @param repositoryPath 仓库路径
   * @param preferredType 首选的提供者类型
   * @param gitExtension VS Code Git 扩展实例，如果选择 API 类型需要提供此参数
   * @returns 特定仓库的 Git 提供者实例
   */
  public async createProviderForRepository(
    repositoryPath: string,
    preferredType: GitProviderType = GitProviderType.API,
    gitExtension?: any
  ): Promise<IGitProvider> {
    // 每次都创建新的提供者实例，不使用缓存
    return this.createProvider(preferredType, gitExtension, repositoryPath);
  }

  /**
   * 根据文件路径创建提供者实例
   * @param filePath 文件路径
   * @param preferredType 首选的提供者类型
   * @param gitExtension VS Code Git 扩展实例，如果选择 API 类型需要提供此参数
   * @returns 包含该文件的仓库的 Git 提供者实例
   */
  public async createProviderForFile(
    filePath: string,
    preferredType: GitProviderType = GitProviderType.API,
    gitExtension?: any
  ): Promise<IGitProvider | undefined> {
    // 确保仓库管理器已初始化
    if (!this.repositoryManager && gitExtension) {
      await this.initRepositoryManager(gitExtension);
    }

    if (!this.repositoryManager) {
      throw new Error("Repository manager not initialized");
    }

    // 查找文件所在的仓库
    const repoInfo = await this.repositoryManager.getRepositoryForFile(filePath);
    if (!repoInfo) {
      return undefined;
    }

    return this.createProviderForRepository(repoInfo.rootPath, preferredType, gitExtension);
  }

  /**
   * 获取当前活动仓库的提供者实例
   * @param preferredType 首选的提供者类型
   * @param gitExtension VS Code Git 扩展实例，如果选择 API 类型需要提供此参数
   * @returns 当前活动仓库的 Git 提供者实例
   */
  public async createProviderForCurrentRepository(
    preferredType: GitProviderType = GitProviderType.API,
    gitExtension?: any
  ): Promise<IGitProvider | undefined> {
    // 确保仓库管理器已初始化
    if (!this.repositoryManager && gitExtension) {
      await this.initRepositoryManager(gitExtension);
    }

    if (!this.repositoryManager) {
      throw new Error("Repository manager not initialized");
    }

    // 获取当前活动仓库
    const repoInfo = await this.repositoryManager.getCurrentRepository();
    if (!repoInfo) {
      // 如果没有当前活动仓库，但只有一个仓库，就使用它
      const allRepos = await this.repositoryManager.getAllRepositories();
      if (allRepos.length === 1) {
        return this.createProviderForRepository(allRepos[0].rootPath, preferredType, gitExtension);
      }
      
      return undefined;
    }

    return this.createProviderForRepository(repoInfo.rootPath, preferredType, gitExtension);
  }

  /**
   * 让用户选择仓库并创建对应的提供者实例
   * @param preferredType 首选的提供者类型
   * @param gitExtension VS Code Git 扩展实例，如果选择 API 类型需要提供此参数
   * @returns 用户选择的仓库的 Git 提供者实例
   */
  public async createProviderForSelectedRepository(
    preferredType: GitProviderType = GitProviderType.API,
    gitExtension?: any
  ): Promise<IGitProvider | undefined> {
    // 确保仓库管理器已初始化
    if (!this.repositoryManager && gitExtension) {
      await this.initRepositoryManager(gitExtension);
    }

    if (!this.repositoryManager) {
      throw new Error("Repository manager not initialized");
    }

    // 让用户选择仓库
    const repoInfo = await this.repositoryManager.selectRepository();
    if (!repoInfo) {
      return undefined;
    }

    return this.createProviderForRepository(repoInfo.rootPath, preferredType, gitExtension);
  }

  /**
   * 创建 Git 提供者实例
   * @param preferredType 首选的提供者类型
   * @param gitExtension VS Code Git 扩展实例，如果选择 API 类型需要提供此参数
   * @param repositoryPath 可选的仓库路径
   * @returns Git 提供者实例
   */
  public async createProvider(
    preferredType: GitProviderType = GitProviderType.API,
    gitExtension?: any,
    repositoryPath?: string
  ): Promise<IGitProvider> {
    // 首先尝试创建首选类型的提供者
    if (preferredType === GitProviderType.API) {
      // 确保提供了 Git 扩展实例
      if (!gitExtension) {
        this.logger.warn("Git extension not provided, falling back to command provider");
        return this.createCommandProvider(repositoryPath);
      }

      try {
        const apiProvider = new GitApiProvider(gitExtension, repositoryPath);
        await apiProvider.init();
        
        // 检查 API 提供者是否可用
        if (await apiProvider.isAvailable()) {
          this.logger.info("Successfully created Git API provider");
          return apiProvider;
        }
        
        // 如果 API 提供者不可用，则降级到命令行提供者
        this.logger.warn("Git API provider not available, falling back to command provider");
        return this.createCommandProvider(repositoryPath);
      } catch (error) {
        this.logger.error(`Failed to create Git API provider: ${error}`);
        return this.createCommandProvider(repositoryPath);
      }
    } else {
      // 直接创建命令行提供者
      return this.createCommandProvider(repositoryPath);
    }
  }

  /**
   * 创建命令行 Git 提供者
   * @param repositoryPath 可选的仓库路径
   * @returns 命令行 Git 提供者实例
   */
  private async createCommandProvider(repositoryPath?: string): Promise<IGitProvider> {
    try {
      const commandProvider = new GitCommandProvider(repositoryPath);
      await commandProvider.init();
      
      // 检查命令行提供者是否可用
      if (await commandProvider.isAvailable()) {
        this.logger.info("Successfully created Git command provider");
        return commandProvider;
      }
      
      // 如果命令行提供者也不可用，抛出错误
      throw new Error("Git command provider not available");
    } catch (error) {
      this.logger.error(`Failed to create Git command provider: ${error}`);
      notify.error(formatMessage("scm.provider.unavailable", ["Git"]));
      throw error;
    }
  }
}