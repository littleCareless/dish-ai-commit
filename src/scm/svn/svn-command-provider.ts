import * as vscode from "vscode";
import * as childProcess from "child_process";
import { promisify } from "util";
import { Logger } from "../../utils/logger";
import { getMessage, formatMessage } from "../../utils/i18n";
import { notify } from "../../utils/notification/notification-manager";
import { ISvnProvider, SvnConfig } from "./svn-provider-interface";
import { SvnPathHelper } from "./helpers/svn-path-helper";
import { SvnDiffHelper } from "./helpers/svn-diff-helper";
import { SvnLogHelper } from "./helpers/svn-log-helper";

const exec = promisify(childProcess.exec);

// 默认配置
const DEFAULT_CONFIG: SvnConfig = {
  environmentConfig: {
    path: ["/usr/local/bin", "/opt/homebrew/bin"],
    locale: "en_US.UTF-8",
  },
};

/**
 * SVN命令提供者类
 * 提供基于命令行的SVN操作实现
 */
export class SvnCommandProvider implements ISvnProvider {
  /** 源代码管理类型标识符 */
  type = "svn" as const;

  /** SVN可执行文件路径 */
  private svnPath: string = "svn";

  /** 配置信息 */
  private config: SvnConfig;

  /** 初始化标志 */
  private initialized: boolean = false;

  /** 日志记录器 */
  private logger: Logger;

  /** 差异帮助工具 */
  private diffHelper: SvnDiffHelper;

  /** 日志帮助工具 */
  private logHelper: SvnLogHelper;

  /** 仓库路径 */
  private repositoryPath?: string;

  /**
   * 创建SVN命令提供者实例
   * @param repositoryPath 可选的仓库路径
   */
  constructor(repositoryPath?: string) {
    this.logger = Logger.getInstance("Dish AI Commit Gen");
    this.repositoryPath = repositoryPath;
    this.config = this.loadConfig();
    this.diffHelper = new SvnDiffHelper(
      this.svnPath,
      this.config.environmentConfig
    );
    this.logHelper = new SvnLogHelper(
      this.svnPath,
      this.config.environmentConfig
    );
  }

  /**
   * 加载SVN配置
   * @returns SVN配置对象
   */
  private loadConfig(): SvnConfig {
    try {
      const config = vscode.workspace.getConfiguration("svn-commit-gen");
      const envConfig = {
        path:
          config.get<string[]>("environmentPath") ||
          DEFAULT_CONFIG.environmentConfig.path,
        locale:
          config.get<string>("locale") ||
          DEFAULT_CONFIG.environmentConfig.locale,
      };

      if (!Array.isArray(envConfig.path) || !envConfig.locale) {
        throw new Error(getMessage("svn.invalid.env.config"));
      }

      return {
        svnPath: config.get<string>("svnPath"),
        environmentConfig: envConfig,
      };
    } catch (error) {
      this.logger.logError(error as Error, "加载SVN配置失败");
      throw new Error(formatMessage("svn.config.load.failed", [error]));
    }
  }

  /**
   * 初始化SVN命令提供者
   */
  async init(): Promise<void> {
    try {
      const svnPath = await SvnPathHelper.getSvnPath("initialize");
      this.svnPath = svnPath;

      // 更新帮助工具中的SVN路径
      this.diffHelper = new SvnDiffHelper(
        this.svnPath,
        this.config.environmentConfig
      );
      this.logHelper = new SvnLogHelper(
        this.svnPath,
        this.config.environmentConfig
      );

      // 验证SVN可执行
      const { stdout } = await exec(`"${this.svnPath}" --version`);
      const version = stdout.toString()?.split("\n")[0]?.trim();
      this.logger.info(`SVN version: ${version}`);
      notify.info(formatMessage("scm.version.detected", ["SVN", version]));

      // 如果没有提供仓库路径，尝试检测
      if (!this.repositoryPath) {
        await this.detectRepositoryPath();
      }

      this.initialized = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to initialize SVN: ${message}`);
      throw new Error(formatMessage("svn.initialization.failed", [message]));
    }
  }

  /**
   * 检测仓库路径
   */
  private async detectRepositoryPath(): Promise<void> {
    try {
      // 首先尝试使用当前工作区文件夹
      if (vscode.workspace.workspaceFolders?.length) {
        const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        try {
          // 检查工作区是否是SVN仓库
          await exec(`"${this.svnPath}" info`, { cwd: workspacePath });
          this.repositoryPath = workspacePath;
          return;
        } catch (error) {
          // 工作区文件夹不是SVN仓库，继续尝试
        }
      }

      // 尝试使用当前活动文件的目录
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && activeEditor.document.uri.scheme === "file") {
        const filePath = activeEditor.document.uri.fsPath;
        const fileDir = filePath.substring(0, filePath.lastIndexOf("/"));

        try {
          // 检查文件所在目录是否在SVN仓库中
          await exec(`"${this.svnPath}" info`, { cwd: fileDir });
          this.repositoryPath = fileDir;
          return;
        } catch (error) {
          // 当前文件不在SVN仓库中
        }
      }

      throw new Error("No SVN repository found");
    } catch (error) {
      this.logger.warn(`Failed to detect repository path: ${error}`);
      throw error;
    }
  }

  /**
   * 检查SVN是否可用
   * @returns 如果SVN可用返回true，否则返回false
   */
  async isAvailable(): Promise<boolean> {
    try {
      await exec("svn --version");

      // 检查是否有有效的仓库
      if (this.repositoryPath) {
        // 使用提供的路径
        await exec(`"${this.svnPath}" info`, { cwd: this.repositoryPath });
      } else {
        // 自动检测仓库路径
        await this.detectRepositoryPath();
      }

      return true;
    } catch (error) {
      this.logger.warn(`SVN command line is not available: ${error}`);
      return false;
    }
  }

  /**
   * 获取文件差异
   * @param files 可选的文件路径数组
   * @returns 差异文本
   */
  async getDiff(files?: string[]): Promise<string | undefined> {
    if (!this.initialized) {
      throw new Error(getMessage("svn.not.initialized"));
    }

    if (!this.repositoryPath) {
      await this.detectRepositoryPath();
    }

    if (!this.repositoryPath) {
      throw new Error(formatMessage("scm.repository.not.found", ["SVN"]));
    }

    return this.diffHelper.getDiff(this.repositoryPath, files);
  }

  /**
   * 提交更改
   * @param message 提交信息
   * @param files 要提交的文件路径数组
   */
  async commit(message: string, files?: string[]): Promise<void> {
    if (!this.initialized) {
      throw new Error(getMessage("svn.not.initialized"));
    }

    if (!this.repositoryPath) {
      await this.detectRepositoryPath();
    }

    if (!this.repositoryPath) {
      throw new Error(formatMessage("scm.repository.not.found", ["SVN"]));
    }

    try {
      if (!files?.length) {
        throw new Error(getMessage("svn.no.files.selected"));
      }

      // 构建提交命令
      const safeFiles = files
        .map((file) => `"${file.replace(/"/g, '\\"')}"`)
        .join(" ");
      const safeMessage = message.replace(/"/g, '\\"');

      const addCommand = `"${this.svnPath}" add ${safeFiles} --force`;
      const commitCommand = `"${this.svnPath}" commit ${safeFiles} -m "${safeMessage}"`;

      // 先添加文件，忽略错误（文件可能已添加）
      try {
        await exec(addCommand, { cwd: this.repositoryPath });
      } catch (error) {
        // 忽略添加错误，继续尝试提交
      }

      // 提交文件
      await exec(commitCommand, { cwd: this.repositoryPath });
      notify.info(formatMessage("scm.commit.succeeded", ["SVN"]));
    } catch (error) {
      this.logger.error(`SVN commit failed: ${error}`);
      throw new Error(formatMessage("scm.commit.failed", ["SVN", error]));
    }
  }

  /**
   * 设置提交输入框的内容
   * 注意：命令行模式下复制到剪贴板
   * @param message 要设置的提交信息
   */
  async setCommitInput(message: string): Promise<void> {
    await this.copyToClipboard(message);
  }

  /**
   * 获取提交输入框的当前内容
   * 注意：命令行模式下无法获取
   * @returns 空字符串
   */
  async getCommitInput(): Promise<string> {
    return ""; // 命令行模式下无法获取输入框内容
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

    if (!this.repositoryPath) {
      await this.detectRepositoryPath();
    }

    if (!this.repositoryPath) {
      notify.warn(formatMessage("scm.repository.not.found", ["SVN"]));
      return [];
    }

    return this.logHelper.getCommitLog(
      this.repositoryPath,
      baseRevisionInput,
      headRevisionInput
    );
  }

  /**
   * 获取最近的提交消息
   * @returns 仓库和用户的最近提交消息
   */
  async getRecentCommitMessages(): Promise<{
    repository: string[];
    user: string[];
  }> {
    if (!this.initialized) {
      throw new Error(getMessage("svn.not.initialized"));
    }

    if (!this.repositoryPath) {
      await this.detectRepositoryPath();
    }

    if (!this.repositoryPath) {
      return { repository: [], user: [] };
    }

    return this.logHelper.getRecentCommitMessages(this.repositoryPath);
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
