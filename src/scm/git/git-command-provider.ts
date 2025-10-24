import * as vscode from "vscode";
import { promisify } from "util";
import * as childProcess from "child_process";
import { IGitProvider } from "./git-provider-interface";
import { Logger } from "../../utils/logger";
import { formatMessage } from "../../utils/i18n";
import { notify } from "../../utils/notification/notification-manager";
import { GitDiffHelper } from "./helpers/git-diff-helper";
import { GitLogHelper } from "./helpers/git-log-helper";

const exec = promisify(childProcess.exec);

/**
 * 基于命令行的 Git 提供者实现
 * 当 VS Code Git API 不可用时作为备选方案
 */
export class GitCommandProvider implements IGitProvider {
  private readonly diffHelper: GitDiffHelper;
  private readonly logHelper: GitLogHelper;
  private logger: Logger;
  private repositoryPath?: string;

  /**
   * 创建命令行 Git 提供者实例
   * @param repositoryPath 可选的仓库路径，如果未提供将尝试自动检测
   */
  constructor(repositoryPath?: string) {
    this.diffHelper = new GitDiffHelper();
    this.logHelper = new GitLogHelper();
    this.logger = Logger.getInstance("Dish AI Commit Gen");
    this.repositoryPath = repositoryPath;
  }

  /**
   * 初始化 Git 命令行提供者
   */
  async init(): Promise<void> {
    try {
      const { stdout } = await exec("git --version");
      const version = stdout?.trim();
      this.logger.info(`Git version: ${version}`);
      notify.info(formatMessage("scm.version.detected", ["Git", version]));

      // 如果没有提供仓库路径，尝试获取
      if (!this.repositoryPath) {
        await this.detectRepositoryPath();
      }
    } catch (error) {
      this.logger.warn(`Failed to initialize Git command provider: ${error}`);
    }
  }

  /**
   * 检查 Git 命令行是否可用
   * @returns 如果 Git 可用返回 true，否则返回 false
   */
  async isAvailable(): Promise<boolean> {
    try {
      await exec("git --version");
      
      // 检查是否在 Git 仓库中
      if (this.repositoryPath) {
        // 使用提供的路径
        await exec("git rev-parse --is-inside-work-tree", { 
          cwd: this.repositoryPath 
        });
      } else {
        // 自动检测仓库路径
        await this.detectRepositoryPath();
      }
      
      return true;
    } catch (error) {
      this.logger.warn(`Git command line is not available: ${error}`);
      return false;
    }
  }

  /**
   * 检测当前仓库路径
   */
  private async detectRepositoryPath(): Promise<void> {
    try {
      // 首先尝试使用当前工作区文件夹
      if (vscode.workspace.workspaceFolders?.length) {
        const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        try {
          await exec("git rev-parse --is-inside-work-tree", { 
            cwd: workspacePath 
          });
          this.repositoryPath = workspacePath;
          return;
        } catch (error) {
          // 工作区文件夹不是 Git 仓库，继续尝试
        }
      }

      // 尝试使用当前活动文件的目录
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && activeEditor.document.uri.scheme === 'file') {
        const filePath = activeEditor.document.uri.fsPath;
        const fileDir = filePath.substring(0, filePath.lastIndexOf('/'));
        
        try {
          // 尝试找到包含此文件的 Git 仓库根目录
          const { stdout } = await exec("git rev-parse --show-toplevel", { 
            cwd: fileDir 
          });
          this.repositoryPath = stdout.trim();
          return;
        } catch (error) {
          // 当前文件不在 Git 仓库中
        }
      }

      throw new Error("No Git repository found");
    } catch (error) {
      this.logger.warn(`Failed to detect repository path: ${error}`);
      throw error;
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
    if (!this.repositoryPath) {
      await this.detectRepositoryPath();
    }
    
    if (!this.repositoryPath) {
      throw new Error(formatMessage("scm.repository.not.found", ["Git"]));
    }

    // 创建一个模拟的仓库对象，只包含 rootUri
    const mockRepo = {
      rootUri: vscode.Uri.file(this.repositoryPath),
      inputBox: { value: "" },
      // 这些方法实际不会被调用，因为 diffHelper 只使用 rootUri.fsPath
      commit: async () => {},
      log: async () => [],
      getConfig: async () => undefined,
      getGlobalConfig: async () => undefined
    };

    return this.diffHelper.getDiff(mockRepo, files, target);
  }

  /**
   * 提交更改
   * @param message 提交信息
   * @param files 可选的要提交的文件路径数组
   */
  async commit(message: string, files?: string[]): Promise<void> {
    if (!this.repositoryPath) {
      await this.detectRepositoryPath();
    }
    
    if (!this.repositoryPath) {
      throw new Error(formatMessage("scm.repository.not.found", ["Git"]));
    }

    try {
      // 创建安全的提交信息，避免命令注入
      const safeMessage = message.replace(/"/g, '\\"');
      
      let command: string;
      if (files && files.length > 0) {
        // 将文件路径转义并引用，以避免命令注入和路径问题
        const safeFiles = files
          .map(file => `"${file.replace(/"/g, '\\"')}"`)
          .join(' ');
        
        // 仅提交指定文件
        command = `git add ${safeFiles} && git commit -m "${safeMessage}"`;
      } else {
        // 提交所有更改
        command = `git commit -a -m "${safeMessage}"`;
      }
      
      await exec(command, { cwd: this.repositoryPath });
      notify.info(formatMessage("scm.commit.succeeded", ["Git"]));
    } catch (error) {
      this.logger.error(`Git commit failed: ${error}`);
      notify.error(formatMessage("scm.commit.failed", ["Git", error instanceof Error ? error.message : String(error)]));
      throw error;
    }
  }

  /**
   * 设置提交输入框的内容
   * 注意：由于命令行模式下无法直接设置输入框，所以会复制到剪贴板
   * @param message 要设置的提交信息
   */
  async setCommitInput(message: string): Promise<void> {
    try {
      await vscode.env.clipboard.writeText(message);
      notify.info("commit.message.copied");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      notify.error("commit.message.copy.failed", [errorMessage]);
      notify.info("commit.message.manual.copy", [message]);
    }
  }

  /**
   * 获取提交输入框的当前内容
   * 注意：命令行模式下无法获取输入框内容，返回空字符串
   * @returns 空字符串
   */
  async getCommitInput(): Promise<string> {
    return ""; // 无法通过命令行获取当前的提交信息输入框内容
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
    if (!this.repositoryPath) {
      await this.detectRepositoryPath();
    }
    
    if (!this.repositoryPath) {
      notify.warn(formatMessage("scm.repository.not.found", ["Git"]));
      return [];
    }
    
    return this.logHelper.getCommitLog(
      this.repositoryPath,
      baseBranch,
      headBranch
    );
  }

  /**
   * 获取所有本地和远程分支的列表
   * @returns 分支名称列表
   */
  async getBranches(): Promise<string[]> {
    if (!this.repositoryPath) {
      await this.detectRepositoryPath();
    }
    
    if (!this.repositoryPath) {
      notify.warn(formatMessage("scm.repository.not.found", ["Git"]));
      return [];
    }
    
    return this.logHelper.getBranches(this.repositoryPath);
  }

  /**
   * 获取最近的提交消息
   * 注意：命令行模式下无法直接使用 API 获取最近提交，使用命令行实现
   * @returns 仓库和用户的最近提交消息
   */
  async getRecentCommitMessages(): Promise<{ repository: string[]; user: string[] }> {
    const repositoryCommitMessages: string[] = [];
    const userCommitMessages: string[] = [];
    
    if (!this.repositoryPath) {
      await this.detectRepositoryPath();
    }
    
    if (!this.repositoryPath) {
      return { repository: [], user: [] };
    }
    
    try {
      // 获取仓库最近的提交信息
      const { stdout: recentCommits } = await exec(
        'git log -n 5 --pretty=format:"%s"',
        { cwd: this.repositoryPath }
      );
      
      if (recentCommits) {
        repositoryCommitMessages.push(...recentCommits.split('\n').filter(Boolean));
      }
      
      // 获取当前用户
      const { stdout: userName } = await exec(
        'git config user.name',
        { cwd: this.repositoryPath }
      );
      
      if (userName) {
        // 获取当前用户的提交信息
        const { stdout: userCommits } = await exec(
          `git log -n 5 --author="${userName.trim()}" --pretty=format:"%s"`,
          { cwd: this.repositoryPath }
        );
        
        if (userCommits) {
          userCommitMessages.push(...userCommits.split('\n').filter(Boolean));
        }
      }
    } catch (error) {
      this.logger.error(`Failed to get recent commit messages: ${error}`);
    }
    
    return { repository: repositoryCommitMessages, user: userCommitMessages };
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
    if (!this.repositoryPath) {
      await this.detectRepositoryPath();
    }
    
    if (!this.repositoryPath) {
      return [];
    }
    
    return this.diffHelper.getStagedFiles(this.repositoryPath);
  }

  /**
   * 获取所有变更文件列表
   * @returns 所有变更文件路径数组
   */
  async getAllChangedFiles(): Promise<string[]> {
    if (!this.repositoryPath) {
      await this.detectRepositoryPath();
    }
    
    if (!this.repositoryPath) {
      return [];
    }
    
    return this.diffHelper.getAllChangedFiles(this.repositoryPath);
  }
}