import { BaseScmProvider } from "../base/base-scm-provider";
import { RecentCommitMessages } from "../scm-provider";
import { CommandExecutor } from "../utils/command-executor";
import { PathUtils } from "../utils/path-utils";
import { SCMUtils } from "../utils/scm-utils";
import { SVN_CONSTANTS, SCM_TIMEOUTS } from "../constants/scm-constants";
import { DiffProcessor } from "../../utils/diff/diff-processor";

export class CliSvnProviderRefactored extends BaseScmProvider {
  readonly type = "svn" as const;

  private readonly commandExecutor: any;

  constructor(workspaceRoot: string) {
    super();

    this.validateWorkspace();

    // 创建绑定到工作目录的命令执行器
    this.commandExecutor = CommandExecutor.createForDirectory(
      PathUtils.normalizePath(workspaceRoot)
    );
  }

  async init(): Promise<void> {
    // 检查SVN可用性并获取版本信息
    try {
      const version = await CommandExecutor.getCommandVersion(
        SVN_CONSTANTS.COMMAND_PREFIX,
        SVN_CONSTANTS.VERSION_FLAG
      );

      if (version) {
        this.logInfo(`SVN version detected: ${version}`);
      }
    } catch (error) {
      this.logWarn("SVN not available or version check failed:", error);
      throw new Error("SVN is not available in the system PATH");
    }
  }

  async isAvailable(): Promise<boolean> {
    return CommandExecutor.isCommandAvailable(SVN_CONSTANTS.COMMAND_PREFIX);
  }

  async getDiff(files?: string[]): Promise<string | undefined> {
    try {
      const validFiles = SCMUtils.validateFilePaths(files);
      let command: string;

      if (validFiles.length > 0) {
        // 处理指定文件的差异
        SCMUtils.notifyFileCount(validFiles.length, "selected");
        const escapedPaths = this.escapeShellPaths(validFiles);
        command = `svn diff ${escapedPaths.join(" ")}`;
      } else {
        // 获取所有文件的差异
        command = "svn diff .";
      }

      const rawDiff = await this.commandExecutor.executeForOutput(command, {
        timeout: SCM_TIMEOUTS.LONG_COMMAND,
      });

      if (!rawDiff.trim()) {
        return undefined;
      }

      return DiffProcessor.process(rawDiff, this.type);
    } catch (error) {
      this.logError("Failed to get SVN diff:", error);
      return undefined;
    }
  }

  async commit(message: string, files?: string[]): Promise<void> {
    if (!SCMUtils.isValidCommitMessage(message)) {
      throw new Error("Invalid commit message");
    }

    try {
      const validFiles = SCMUtils.validateFilePaths(files);
      let command: string;

      if (validFiles.length > 0) {
        const escapedPaths = this.escapeShellPaths(validFiles);
        const escapedMessage = PathUtils.escapeShellPath(message);
        command = `svn commit -m ${escapedMessage} ${escapedPaths.join(" ")}`;
      } else {
        const escapedMessage = PathUtils.escapeShellPath(message);
        command = `svn commit -m ${escapedMessage} .`;
      }

      await this.commandExecutor.executeForOutput(command, {
        timeout: SCM_TIMEOUTS.NETWORK_COMMAND,
      });

      this.logInfo("SVN commit completed successfully");
    } catch (error) {
      this.logError("SVN commit failed:", error);
      throw new Error(
        `SVN commit failed: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  async getCommitLog(
    baseBranch?: string,
    headBranch?: string
  ): Promise<string[]> {
    this.logWarn("getCommitLog is not implemented for CliSvnProvider");
    return [];
  }

  async getRecentCommitMessages(): Promise<RecentCommitMessages> {
    try {
      // 获取仓库最近5条提交
      const repositoryCommits = await this.getRecentCommitsFromLog(5);

      // 获取当前用户的最近5条提交
      const userCommits = await this.getUserRecentCommits(5);

      return {
        repository: repositoryCommits,
        user: userCommits,
      };
    } catch (error) {
      this.logError("Failed to get recent commit messages:", error);
      return { repository: [], user: [] };
    }
  }

  protected async trySetInputBox(message: string): Promise<boolean> {
    // CLI SVN Provider 没有输入框，直接返回false使用剪贴板
    return false;
  }

  /**
   * 获取最近的提交记录
   */
  private async getRecentCommitsFromLog(limit: number): Promise<string[]> {
    try {
      const logOutput = await this.commandExecutor.executeForOutput(
        `svn log -l ${limit}`,
        { timeout: SCM_TIMEOUTS.DEFAULT_COMMAND }
      );

      return SCMUtils.parseSvnLog(logOutput);
    } catch (error) {
      this.logWarn("Failed to get repository commit log:", error);
      return [];
    }
  }

  /**
   * 获取当前用户的最近提交
   */
  private async getUserRecentCommits(limit: number): Promise<string[]> {
    try {
      // 先获取当前用户信息
      const authorOutput = await this.commandExecutor.executeForOutput(
        "svn info --show-item last-changed-author",
        { timeout: SCM_TIMEOUTS.QUICK_COMMAND }
      );

      const author = authorOutput.trim();
      if (!author) {
        return [];
      }

      // 获取该用户的提交记录
      const escapedAuthor = SCMUtils.sanitizeForShell(author);
      const userLogOutput = await this.commandExecutor.executeForOutput(
        `svn log -l ${limit} --search ${PathUtils.escapeShellPath(
          escapedAuthor
        )}`,
        { timeout: SCM_TIMEOUTS.DEFAULT_COMMAND }
      );

      return SCMUtils.parseSvnLog(userLogOutput);
    } catch (error) {
      this.logWarn("Failed to get user commit log:", error);
      return [];
    }
  }
}
