import * as vscode from "vscode";
import { ISCMProvider } from "./scm-provider";
import { Logger } from "../utils/logger";
import { getMessage, formatMessage } from "../utils/i18n";
import { ISvnProvider } from "./svn/svn-provider-interface";
import { SvnProvider as SvnProviderImpl, SvnRepositoryManager, SvnProviderFactory } from "./svn";
import { notify } from "../utils/notification/notification-manager";

/**
 * SVN源代码管理提供者实现
 * @implements {ISCMProvider}
 */
export class SvnProvider implements ISCMProvider {
  /** SCM类型标识符 */
  type = "svn" as const;
  
  /** SVN 提供者实现 */
  private svnProvider: ISvnProvider | undefined;
  private repositoryManager: SvnRepositoryManager | undefined;
  private logger: Logger;
  private isInitialized = false;

  /**
   * 创建SVN提供者实例
   * @param svnExtension - VS Code SVN扩展实例
   * @param repositoryPath - 可选的仓库路径
   * @throws {Error} 当未找到工作区时抛出错误
   */
  constructor(private readonly svnExtension: any, private readonly repositoryPath?: string) {
    this.logger = Logger.getInstance("Dish AI Commit Gen");

    if (!vscode.workspace.workspaceFolders?.length) {
      throw new Error(getMessage("workspace.not.found"));
    }
  }

  /**
   * 确保Provider已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeProvider();
      this.isInitialized = true;
    }
  }

  /**
   * 强制重新初始化Provider
   */
  async reinitialize(): Promise<void> {
    this.isInitialized = false;
    await this.ensureInitialized();
  }

  /**
   * 初始化Provider
   */
  async init(): Promise<void> {
    await this.ensureInitialized();
  }

  /**
   * 执行实际的初始化逻辑
   */
  private async initializeProvider(): Promise<void> {
    try {
      // 优先尝试使用VS Code SVN扩展
      if (this.svnExtension) {
        try {
          // 使用原始的SVN提供者
          this.svnProvider = new SvnProviderImpl(this.svnExtension, this.repositoryPath);
          await this.svnProvider.init();
          this.logger.info("Successfully initialized VS Code SVN extension provider");
          return;
        } catch (extensionError) {
          this.logger.warn(`VS Code SVN extension unavailable, trying alternative providers: ${extensionError}`);
        }
      }
      
      // 扩展不可用时，使用工厂方法创建带有优雅降级的提供者
      const workspacePath = this.repositoryPath || 
        (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "");
      
      this.svnProvider = await SvnProviderFactory.createProvider(workspacePath);
      
      if (!this.svnProvider) {
        throw new Error(formatMessage("scm.repository.not.found", ["SVN"]));
      }
      
      this.logger.info("Successfully initialized fallback SVN provider");
    } catch (error) {
      this.logger.error(`Failed to initialize SVN provider: ${error}`);
      throw error;
    }
  }

  /**
   * 检查SVN是否可用
   * @returns {Promise<boolean>} 如果SVN可用返回true,否则返回false
   */
  async isAvailable(): Promise<boolean> {
    await this.ensureInitialized();
    return this.svnProvider?.isAvailable() || false;
  }

  /**
   * 获取文件差异信息
   * @param {string[]} [files] - 可选的文件路径数组
   * @returns {Promise<string | undefined>} 返回差异文本
   */
  async getDiff(files?: string[]): Promise<string | undefined> {
    try {
      await this.ensureInitialized();
      return this.svnProvider?.getDiff(files);
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
      await this.ensureInitialized();
      return this.svnProvider?.commit(message, files);
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
      if (this.repositoryPath && this.svnExtension) {
        try {
          const svnScmApi = this.svnExtension.exports;
          if (svnScmApi && typeof svnScmApi.getRepositories === "function") {
            const repositories = await svnScmApi.getRepositories();
            if (repositories && repositories.length > 0) {
              // 根据repositoryPath找到对应的repository对象
              const targetRepo = repositories.find(
                (repo: any) => repo.root === this.repositoryPath
              );
              
              if (targetRepo && targetRepo.inputBox) {
                targetRepo.inputBox.value = message;
                this.logger.info(`Successfully set commit message for SVN repository: ${this.repositoryPath}`);
                return;
              } else {
                throw new Error(`SVN repository not found: ${this.repositoryPath}`);
              }
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to set commit message via SVN extension API: ${error}`);
          // 继续尝试原有逻辑
        }
      }
      
      // 回退到原有逻辑
      await this.ensureInitialized();
      return this.svnProvider?.setCommitInput(message);
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
    await this.ensureInitialized();
    return this.svnProvider?.getCommitInput() || "";
  }

  /**
   * 开始流式设置提交输入框的内容
   * @param {string} message - 要设置的提交信息
   */
  async startStreamingInput(message: string): Promise<void> {
    await this.ensureInitialized();
    return this.svnProvider?.startStreamingInput(message);
  }

  /**
   * 获取提交日志
   * @param baseRevisionInput - 基础版本，对应于较旧的修订
   * @param headRevisionInput - 当前版本，默认为 HEAD
   * @returns 返回提交信息列表
   */
  async getCommitLog(
    baseRevisionInput?: string,
    headRevisionInput = "HEAD"
  ): Promise<string[]> {
    await this.ensureInitialized();
    return this.svnProvider?.getCommitLog(baseRevisionInput, headRevisionInput) || [];
  }

  /**
   * 获取最近的提交消息
   * @returns 仓库和用户的最近提交消息
   */
  async getRecentCommitMessages(): Promise<{ repository: string[]; user: string[] }> {
    await this.ensureInitialized();
    return this.svnProvider?.getRecentCommitMessages() || { repository: [], user: [] };
  }

  /**
   * 将提交信息复制到剪贴板
   * @param message 要复制的提交信息
   */
  async copyToClipboard(message: string): Promise<void> {
    await this.ensureInitialized();
    return this.svnProvider?.copyToClipboard(message);
  }
}