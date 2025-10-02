import * as vscode from "vscode";
import { ISCMProvider } from "./scm-provider";
import { Logger } from "../utils/logger";
import { getMessage } from "../utils/i18n";
import { IGitProvider } from "./git/git-provider-interface";
import { GitProviderFactory, GitProviderType } from "./git/git-provider-factory";

/**
 * Git源代码管理提供者实现
 * @implements {ISCMProvider}
 */
export class GitProvider implements ISCMProvider {
  /** SCM类型标识符 */
  type = "git" as const;

  /** Git 提供者实例，可以是 API 或命令行实现 */
  private gitProvider: IGitProvider | undefined;
  private logger: Logger;

  /**
   * 创建Git提供者实例
   * @param gitExtension - VS Code Git扩展实例
   * @param repositoryPath - 可选的仓库路径
   * @throws {Error} 当未找到工作区时抛出错误
   */
  constructor(private readonly gitExtension: any, repositoryPath?: string) {
    this.logger = Logger.getInstance("Dish AI Commit Gen");

    if (!vscode.workspace.workspaceFolders?.length) {
      throw new Error(getMessage("workspace.not.found"));
    }
  }

  /**
   * 初始化Provider
   */
  async init(): Promise<void> {
    try {
      const factory = GitProviderFactory.getInstance();
      
      // 尝试创建首选的 API 提供者，如果失败则降级到命令行提供者
      this.gitProvider = await factory.createProvider(
        GitProviderType.API, 
        this.gitExtension
      );
      
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
    if (!this.gitProvider) {
      await this.init();
    }
    
    return this.gitProvider?.isAvailable() || false;
  }

  /**
   * 获取文件差异信息
   * @param {string[]} [files] - 可选的文件路径数组
   * @param {string} [target] - 差异目标: 'staged' 表示暂存区，'all' 表示所有变更
   * @returns {Promise<string | undefined>} 返回差异文本
   */
  async getDiff(
    files?: string[],
    target?: "staged" | "all"
  ): Promise<string | undefined> {
    if (!this.gitProvider) {
      await this.init();
    }
    
    return this.gitProvider?.getDiff(files, target);
  }

  /**
   * 提交更改
   * @param {string} message - 提交信息
   * @param {string[]} [files] - 要提交的文件路径数组
   */
  async commit(message: string, files?: string[]): Promise<void> {
    if (!this.gitProvider) {
      await this.init();
    }
    
    return this.gitProvider?.commit(message, files);
  }

  /**
   * 设置提交输入框的内容
   * @param {string} message - 要设置的提交信息
   */
  async setCommitInput(message: string): Promise<void> {
    if (!this.gitProvider) {
      await this.init();
    }
    
    return this.gitProvider?.setCommitInput(message);
  }

  /**
   * 获取提交输入框的当前内容
   * @returns {Promise<string>} 返回当前的提交信息
   */
  async getCommitInput(): Promise<string> {
    if (!this.gitProvider) {
      await this.init();
    }
    
    return this.gitProvider?.getCommitInput() || "";
  }

  /**
   * 开始流式设置提交输入框的内容
   * @param {string} message - 要设置的提交信息
   */
  async startStreamingInput(message: string): Promise<void> {
    if (!this.gitProvider) {
      await this.init();
    }
    
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
    if (!this.gitProvider) {
      await this.init();
    }
    
    return this.gitProvider?.getCommitLog(baseBranch, headBranch) || [];
  }

  /**
   * 获取所有本地和远程分支的列表
   * @returns 返回分支名称列表
   */
  async getBranches(): Promise<string[]> {
    if (!this.gitProvider) {
      await this.init();
    }
    
    return this.gitProvider?.getBranches() || [];
  }

  /**
   * 获取最近的提交消息
   * @returns 仓库和用户的最近提交消息
   */
  async getRecentCommitMessages(): Promise<{ repository: string[]; user: string[] }> {
    if (!this.gitProvider) {
      await this.init();
    }
    
    return this.gitProvider?.getRecentCommitMessages() || { repository: [], user: [] };
  }

  /**
   * 将提交信息复制到剪贴板
   * @param message 要复制的提交信息
   */
  async copyToClipboard(message: string): Promise<void> {
    if (!this.gitProvider) {
      await this.init();
    }
    
    return this.gitProvider?.copyToClipboard(message);
  }

  /**
   * 获取暂存文件列表
   * @returns {Promise<string[]>} 暂存文件路径数组
   */
  async getStagedFiles(): Promise<string[]> {
    if (!this.gitProvider) {
      await this.init();
    }
    
    return this.gitProvider?.getStagedFiles() || [];
  }

  /**
   * 获取所有变更文件列表
   * @returns {Promise<string[]>} 所有变更文件路径数组
   */
  async getAllChangedFiles(): Promise<string[]> {
    if (!this.gitProvider) {
      await this.init();
    }
    
    return this.gitProvider?.getAllChangedFiles() || [];
  }
}