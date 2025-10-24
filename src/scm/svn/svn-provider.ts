import * as vscode from "vscode";
import * as childProcess from "child_process";
import { promisify } from "util";
import { ISvnProvider, SvnRepository, SvnAPI } from "./svn-provider-interface";
import { formatMessage, getMessage } from "../../utils/i18n";
import { notify } from "../../utils/notification/notification-manager";
import { Logger } from "../../utils/logger";
import { SvnPathHelper } from "./helpers/svn-path-helper";
import { SvnRepositoryManager } from "./svn-repository-manager";
import { SvnDiffHelper } from "./helpers/svn-diff-helper";
import { SvnLogHelper } from "./helpers/svn-log-helper";

const exec = promisify(childProcess.exec);

/**
 * SVN源代码管理提供者实现
 * @implements {ISvnProvider}
 */
export class SvnProvider implements ISvnProvider {
  /** 源代码管理类型标识符 */
  type = "svn" as const;

  /** SVN API实例 */
  private api: SvnAPI;

  /** SVN仓库管理器 */
  private repositoryManager: SvnRepositoryManager;

  /** SVN路径 */
  private svnPath: string = "svn";

  /** 配置对象 */
  private config: {
    environmentConfig: {
      path: string[];
      locale: string;
    };
  };

  /** 初始化标志 */
  private initialized: boolean = false;
  
  /** 日志记录器 */
  private logger: Logger;

  /** 差异帮助工具 */
  private diffHelper!: SvnDiffHelper;

  /** 日志帮助工具 */
  private logHelper!: SvnLogHelper;

  /**
   * 创建SVN提供者实例
   * @param svnExtension VS Code SVN扩展实例
   * @param repositoryPath 可选的仓库路径
   * @throws {Error} 当未找到工作区时抛出错误
   */
  constructor(private readonly svnExtension: any, repositoryPath?: string) {
    this.logger = Logger.getInstance("Dish AI Commit Gen");
    
    // 初始化API和仓库
    this.api = svnExtension.getAPI(1);
    const repositories = this.api.repositories;
    
    // 初始化仓库管理器
    this.repositoryManager = new SvnRepositoryManager(repositories, repositoryPath);

    if (!vscode.workspace.workspaceFolders?.length) {
      throw new Error(getMessage("workspace.not.found"));
    }

    // 加载配置
    this.config = this.loadConfig();
    
    // 构造函数现在只进行同步设置，异步初始化在init方法中完成
  }

  /**
   * 加载SVN配置
   * @returns 配置对象
   * @private
   */
  private loadConfig(): {
    environmentConfig: {
      path: string[];
      locale: string;
    };
  } {
    try {
      const config = vscode.workspace.getConfiguration("svn-commit-gen");
      const envConfig = {
        path:
          config.get<string[]>("environmentPath") ||
          ["/usr/local/bin", "/opt/homebrew/bin"],
        locale:
          config.get<string>("locale") ||
          "en_US.UTF-8",
      };

      if (!Array.isArray(envConfig.path) || !envConfig.locale) {
        throw new Error(getMessage("svn.invalid.env.config"));
      }

      return {
        environmentConfig: envConfig,
      };
    } catch (error) {
      this.logger.logError(error as Error, "加载SVN配置失败");
      throw new Error(formatMessage("svn.config.load.failed", [error]));
    }
  }

  /**
   * 初始化SVN提供者
   */
  public async init(): Promise<void> {
    try {
      // 获取SVN可执行文件路径
      const svnPath = await SvnPathHelper.getSvnPath("initialize");
      this.svnPath = svnPath;

      // 初始化帮助工具
      this.diffHelper = new SvnDiffHelper(this.svnPath, this.config.environmentConfig);
      this.logHelper = new SvnLogHelper(this.svnPath, this.config.environmentConfig);

      // 验证SVN可执行
      const { stdout } = await exec(`"${this.svnPath}" --version`);
      const version = stdout?.toString()?.split("\n")[0]?.trim();
      
      this.logger.info(`SVN version: ${version}`);
      notify.info(formatMessage("scm.version.detected", ["SVN", version]));

      this.initialized = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to initialize SVN: ${message}`);
      throw new Error(formatMessage("svn.initialization.failed", [message]));
    }
  }

  /**
   * 检查SVN是否可用
   * @returns 如果SVN可用返回true，否则返回false
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (!this.svnExtension?.getAPI) {
        return false;
      }

      const api = this.svnExtension.getAPI(1);
      const repositories = api.repositories;
      if (repositories.length > 0) {
        this.api = api;
        this.repositoryManager.updateRepositories(repositories);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(
        `SVN availability check failed: ${error instanceof Error ? error.message : error}`
      );
      return false;
    }
  }

  /**
   * 获取文件差异
   * @param files 可选的文件路径数组
   * @returns 差异文本，如果没有差异则返回undefined
   */
  async getDiff(files?: string[]): Promise<string | undefined> {
    try {
      if (!this.initialized) {
        throw new Error(getMessage("svn.not.initialized"));
      }

      const repoInfo = this.repositoryManager.findRepositoryAndPath(files);
      if (!repoInfo) {
        throw new Error(formatMessage("scm.repository.not.found", ["SVN"]));
      }
      const { repositoryPath } = repoInfo;

      // 使用差异帮助工具获取差异
      return this.diffHelper.getDiff(repositoryPath, files);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(formatMessage("scm.diff.error", ["SVN", error]));
      }
      throw error;
    }
  }

  /**
   * 提交更改
   * @param message 提交信息
   * @param files 要提交的文件路径数组
   * @throws {Error} 当提交失败或未选择文件时抛出错误
   */
  async commit(message: string, files?: string[]): Promise<void> {
    const repository = this.repositoryManager.findRepository(files);
    if (!repository) {
      throw new Error(formatMessage("scm.repository.not.found", ["SVN"]));
    }

    try {
      if (!files?.length) {
        throw new Error(getMessage("svn.no.files.selected"));
      }
      await repository.commitFiles(files, message);
    } catch (error) {
      this.logger.error(
        `SVN commit failed: ${error instanceof Error ? error.message : error}`
      );
      throw new Error(formatMessage("scm.commit.failed", ["SVN", error]));
    }
  }

  /**
   * 设置提交输入框的内容
   * @param message 要设置的提交信息
   */
  async setCommitInput(message: string): Promise<void> {
    const repository = this.repositoryManager.findRepository();
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
        notify.info("commit.message.manual.copy", [message]);
      }
    }
  }

  /**
   * 获取提交输入框的当前内容
   * @returns 当前的提交信息
   */
  async getCommitInput(): Promise<string> {
    const repository = this.repositoryManager.findRepository();
    if (!repository) {
      throw new Error(formatMessage("scm.repository.not.found", ["SVN"]));
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
   * @param baseRevisionInput 基础修订版本，可选
   * @param headRevisionInput 当前修订版本，默认为 'HEAD'
   * @returns 提交信息列表
   */
  async getCommitLog(
    baseRevisionInput?: string,
    headRevisionInput: string = "HEAD"
  ): Promise<string[]> {
    if (!this.initialized) {
      throw new Error(getMessage("svn.not.initialized"));
    }
    
    const repoInfo = this.repositoryManager.findRepositoryAndPath();
    if (!repoInfo) {
      throw new Error(formatMessage("scm.repository.not.found", ["SVN"]));
    }
    
    const { repositoryPath } = repoInfo;
    return this.logHelper.getCommitLog(repositoryPath, baseRevisionInput, headRevisionInput);
  }

  /**
   * 获取最近的提交消息
   * @returns 仓库和用户的最近提交消息
   */
  async getRecentCommitMessages(): Promise<{ repository: string[]; user: string[] }> {
    const repoInfo = this.repositoryManager.findRepositoryAndPath();
    if (!repoInfo) {
      return { repository: [], user: [] };
    }
    
    const { repositoryPath } = repoInfo;
    return this.logHelper.getRecentCommitMessages(repositoryPath);
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
}
