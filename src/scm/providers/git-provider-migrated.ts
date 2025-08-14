import * as vscode from "vscode";
import { BaseScmProvider } from "../base/base-scm-provider";
import { RecentCommitMessages } from "../scm-provider";
import { CommandExecutor } from "../utils/command-executor";
import {
  RepositoryFinder,
  GitRepositoryFindStrategy,
} from "../utils/repository-manager";
import { PathUtils } from "../utils/path-utils";
import { SCMUtils } from "../utils/scm-utils";
import {
  GIT_CONSTANTS,
  DIFF_TARGETS,
  FILE_STATUS,
} from "../constants/scm-constants";
import { formatMessage } from "../../utils/i18n";
import { DiffProcessor } from "../../utils/diff/diff-processor";
import { notify } from "../../utils/notification/notification-manager";
import { ConfigurationManager } from "../../config/configuration-manager";

/**
 * Git API接口定义
 */
interface GitAPI {
  repositories: GitRepository[];
  getAPI(version: number): GitAPI;
}

/**
 * Git仓库接口定义
 */
interface GitRepository {
  readonly rootUri: vscode.Uri;
  inputBox: { value: string };
  commit(
    message: string,
    options: { all: boolean; files?: string[] }
  ): Promise<void>;
  log(options?: {
    maxEntries?: number;
    author?: string;
  }): Promise<{ message: string }[]>;
  getConfig(key: string): Promise<string | undefined>;
  getGlobalConfig(key: string): Promise<string | undefined>;
}

export class GitProviderMigrated extends BaseScmProvider {
  readonly type = "git" as const;

  private readonly api: GitAPI;
  private readonly repositoryFinder: RepositoryFinder<GitRepository>;

  constructor(private readonly gitExtension: any, repositoryPath?: string) {
    super(repositoryPath);

    this.validateWorkspace();
    this.api = gitExtension.getAPI(1);
    this.repositoryFinder = new RepositoryFinder(
      new GitRepositoryFindStrategy()
    );
  }

  async init(): Promise<void> {
    try {
      const version = await CommandExecutor.getCommandVersion(
        GIT_CONSTANTS.COMMAND_PREFIX,
        GIT_CONSTANTS.VERSION_FLAG
      );

      if (version) {
        this.logInfo(`Git version detected: ${version}`);
        notify.info(formatMessage("scm.version.detected", ["Git", version]));
      }
    } catch (error) {
      this.logWarn(
        "Failed to get git version:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const repositories = this.api.repositories;
      return repositories.length > 0;
    } catch (error) {
      this.logError("Git availability check failed:", error);
      return false;
    }
  }

  async getDiff(files?: string[]): Promise<string | undefined> {
    try {
      const repository = this.findRepository(files);
      if (!repository) {
        throw new Error(formatMessage("scm.repository.not.found", ["Git"]));
      }

      const workspaceRoot = repository.rootUri.fsPath;
      const executor = CommandExecutor.createForDirectory(workspaceRoot);

      let diffOutput = "";
      const hasInitialCommit = await this.checkInitialCommit(executor);

      if (files && files.length > 0) {
        diffOutput = await this.getFilesDiff(files, hasInitialCommit, executor);
      } else {
        diffOutput = await this.getAllDiff(hasInitialCommit, executor);
      }

      if (!diffOutput.trim()) {
        throw new Error("No changes detected");
      }

      return DiffProcessor.process(diffOutput, this.type);
    } catch (error) {
      this.logError("Failed to get diff:", error);
      if (error instanceof Error) {
        notify.error(formatMessage("scm.diff.failed", ["Git", error.message]));
      }
      throw error;
    }
  }

  async commit(message: string, files?: string[]): Promise<void> {
    if (!SCMUtils.isValidCommitMessage(message)) {
      throw new Error("Invalid commit message");
    }

    const repository = this.findRepository(files);
    if (!repository) {
      throw new Error(formatMessage("scm.repository.not.found", ["Git"]));
    }

    try {
      await repository.commit(message, { all: !files, files });
      this.logInfo("Git commit completed successfully");
    } catch (error) {
      this.logError("Git commit failed:", error);
      throw error;
    }
  }

  async getCommitLog(
    baseBranch = "origin/main",
    headBranch = "HEAD"
  ): Promise<string[]> {
    const repository = this.findRepository();
    if (!repository) {
      this.logWarn("No Git repository found for commit log");
      return [];
    }

    const workspaceRoot = repository.rootUri.fsPath;
    const executor = CommandExecutor.createForDirectory(workspaceRoot);

    try {
      const validBaseBranch = await this.findValidBaseBranch(
        baseBranch,
        executor
      );
      if (!validBaseBranch) {
        this.logWarn(`Base branch ${baseBranch} not found`);
        return [];
      }

      const command = `git log ${validBaseBranch}..${headBranch} --pretty=format:"%s" --no-merges`;
      const stdout = await executor.executeForOutput(command);

      if (!stdout.trim()) {
        return [];
      }

      return stdout.split("\n").filter((line) => line.trim() !== "");
    } catch (error) {
      this.logError(
        "Git log failed:",
        error instanceof Error ? error.message : String(error)
      );
      if (error instanceof Error) {
        notify.error(formatMessage("scm.log.failed", ["Git", error.message]));
      }
      return [];
    }
  }

  async getBranches(): Promise<string[]> {
    const repository = this.findRepository();
    if (!repository) {
      this.logWarn("No Git repository found for branch list");
      return [];
    }

    const workspaceRoot = repository.rootUri.fsPath;
    const executor = CommandExecutor.createForDirectory(workspaceRoot);

    try {
      const command = `git branch -a --format="%(refname:short)"`;
      const stdout = await executor.executeForOutput(command);

      if (!stdout.trim()) {
        return [];
      }

      return stdout
        .split("\n")
        .map((branch) => branch.trim())
        .filter((branch) => branch && !branch.includes("->"))
        .map((branch) => branch.replace(/^remotes\//, ""))
        .filter((branch, index, self) => self.indexOf(branch) === index)
        .sort();
    } catch (error) {
      this.logError(
        "Git branch list failed:",
        error instanceof Error ? error.message : String(error)
      );
      if (error instanceof Error) {
        notify.error(
          formatMessage("scm.branch.list.failed", ["Git", error.message])
        );
      }
      return [];
    }
  }

  async getRecentCommitMessages(): Promise<RecentCommitMessages> {
    const repository = this.findRepository();
    if (!repository) {
      return { repository: [], user: [] };
    }

    try {
      // 仓库最近提交
      const commits = await repository.log({ maxEntries: 5 });
      const repositoryCommitMessages = commits.map(
        (commit) => commit.message.split("\n")[0]
      );

      // 用户最近提交
      const author =
        (await repository.getConfig("user.name")) ||
        (await repository.getGlobalConfig("user.name"));

      const userCommitMessages: string[] = [];
      if (author) {
        const userCommits = await repository.log({ maxEntries: 5, author });
        userCommitMessages.push(
          ...userCommits.map((commit) => commit.message.split("\n")[0])
        );
      }

      return {
        repository: repositoryCommitMessages,
        user: userCommitMessages,
      };
    } catch (error) {
      this.logError("Failed to get recent commit messages:", error);
      return { repository: [], user: [] };
    }
  }

  protected async trySetInputBox(message: string): Promise<boolean> {
    const repository = this.findRepository();
    if (repository?.inputBox) {
      repository.inputBox.value = message;
      return true;
    }
    return false;
  }

  /**
   * 查找Git仓库
   */
  private findRepository(filePaths?: string[]): GitRepository | undefined {
    return this.repositoryFinder.findRepository(
      this.api.repositories,
      filePaths,
      this.repositoryPath
    );
  }

  /**
   * 检查是否有初始提交
   */
  private async checkInitialCommit(executor: any): Promise<boolean> {
    try {
      await executor.executeForOutput("git rev-parse HEAD");
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取指定文件的差异
   */
  private async getFilesDiff(
    files: string[],
    hasInitialCommit: boolean,
    executor: any
  ): Promise<string> {
    const validFiles = SCMUtils.validateFilePaths(files);
    SCMUtils.notifyFileCount(validFiles.length, "selected");

    let diffOutput = "";

    for (const file of validFiles) {
      const fileStatus = await this.getFileStatus(file, executor);
      const escapedFile = PathUtils.escapeShellPath(file);

      let stdout = "";
      try {
        if (fileStatus === FILE_STATUS.NEW) {
          stdout = await this.getNewFileDiff(escapedFile, executor);
        } else if (fileStatus === FILE_STATUS.ADDED) {
          stdout = await executor.executeForOutput(
            `git diff --cached -- ${escapedFile}`
          );
        } else {
          stdout = await this.getTrackedFileDiff(
            escapedFile,
            hasInitialCommit,
            executor
          );
        }

        if (stdout.trim()) {
          diffOutput += `\n=== ${fileStatus}: ${file} ===\n${stdout}`;
        }
      } catch (error) {
        this.logWarn(`Failed to get diff for file ${file}:`, error);
      }
    }

    return diffOutput;
  }

  /**
   * 获取所有文件的差异
   */
  private async getAllDiff(
    hasInitialCommit: boolean,
    executor: any
  ): Promise<string> {
    const diffTarget = ConfigurationManager.getInstance().getConfig(
      "FEATURES_CODEANALYSIS_DIFFTARGET"
    );

    if (diffTarget === DIFF_TARGETS.STAGED) {
      return this.getStagedDiff(executor);
    } else {
      return this.getAllChangesDiff(hasInitialCommit, executor);
    }
  }

  /**
   * 获取暂存区差异
   */
  private async getStagedDiff(executor: any): Promise<string> {
    try {
      const stagedFiles = await executor.executeForOutput(
        "git diff --cached --name-only"
      );
      const fileCount = stagedFiles.split("\n").filter(Boolean).length;
      SCMUtils.notifyFileCount(fileCount, "staged");

      return executor.executeForOutput("git diff --cached");
    } catch (error) {
      this.logWarn("Failed to get staged diff:", error);
      return "";
    }
  }

  /**
   * 获取所有更改的差异
   */
  private async getAllChangesDiff(
    hasInitialCommit: boolean,
    executor: any
  ): Promise<string> {
    try {
      // 计算文件数量并通知
      const [trackedFiles, stagedFiles, untrackedFiles] = await Promise.all([
        this.getFileList(
          hasInitialCommit
            ? "git diff HEAD --name-only"
            : "git diff --name-only",
          executor
        ),
        this.getFileList("git diff --cached --name-only", executor),
        this.getFileList("git ls-files --others --exclude-standard", executor),
      ]);

      const allFiles = new Set([
        ...trackedFiles,
        ...stagedFiles,
        ...untrackedFiles,
      ]);
      SCMUtils.notifyFileCount(allFiles.size, "all");

      // 获取各种类型的差异
      const [trackedChanges, stagedChanges, untrackedDiff] = await Promise.all([
        this.getTrackedChanges(hasInitialCommit, executor),
        executor.executeForOutput("git diff --cached"),
        this.getUntrackedFilesDiff(untrackedFiles, executor),
      ]);

      return [trackedChanges, stagedChanges, untrackedDiff]
        .filter((diff) => diff.trim())
        .join("\n");
    } catch (error) {
      this.logWarn("Failed to get all changes diff:", error);
      return "";
    }
  }

  /**
   * 获取文件状态
   */
  private async getFileStatus(file: string, executor: any): Promise<string> {
    try {
      const escapedFile = PathUtils.escapeShellPath(file);
      const status = await executor.executeForOutput(
        `git status --porcelain ${escapedFile}`
      );

      if (!status) return FILE_STATUS.UNKNOWN;

      if (status.startsWith("??")) return FILE_STATUS.NEW;
      if (status.startsWith("A ")) return FILE_STATUS.ADDED;
      if (status.startsWith(" D") || status.startsWith("D "))
        return FILE_STATUS.DELETED;
      return FILE_STATUS.MODIFIED;
    } catch (error) {
      this.logError("Failed to get file status:", error);
      return FILE_STATUS.UNKNOWN;
    }
  }

  /**
   * 获取新文件的差异
   */
  private async getNewFileDiff(
    escapedFile: string,
    executor: any
  ): Promise<string> {
    try {
      return await executor.executeForOutput(
        `git diff --no-index /dev/null ${escapedFile}`
      );
    } catch (error) {
      // git diff --no-index 在有差异时会返回非零状态码
      const result = error as any;
      return result.stdout || "";
    }
  }

  /**
   * 获取已跟踪文件的差异
   */
  private async getTrackedFileDiff(
    escapedFile: string,
    hasInitialCommit: boolean,
    executor: any
  ): Promise<string> {
    try {
      const command = hasInitialCommit
        ? `git diff HEAD -- ${escapedFile}`
        : `git diff -- ${escapedFile}`;
      return await executor.executeForOutput(command);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("bad revision 'HEAD'")
      ) {
        return executor.executeForOutput(`git diff -- ${escapedFile}`);
      }
      throw error;
    }
  }

  /**
   * 获取文件列表
   */
  private async getFileList(command: string, executor: any): Promise<string[]> {
    try {
      const output = await executor.executeForOutput(command);
      return output.split("\n").filter(Boolean);
    } catch (error) {
      const result = error as any;
      const output = result.stdout || "";
      return output.split("\n").filter(Boolean);
    }
  }

  /**
   * 获取已跟踪文件的更改
   */
  private async getTrackedChanges(
    hasInitialCommit: boolean,
    executor: any
  ): Promise<string> {
    try {
      const command = hasInitialCommit ? "git diff HEAD" : "git diff";
      return await executor.executeForOutput(command);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("bad revision 'HEAD'")
      ) {
        return executor.executeForOutput("git diff");
      }
      return "";
    }
  }

  /**
   * 获取未跟踪文件的差异
   */
  private async getUntrackedFilesDiff(
    untrackedFiles: string[],
    executor: any
  ): Promise<string> {
    let diffOutput = "";

    for (const file of untrackedFiles) {
      const escapedFile = PathUtils.escapeShellPath(file);
      try {
        const fileDiff = await this.getNewFileDiff(escapedFile, executor);
        if (fileDiff.trim()) {
          diffOutput += `\n=== New File: ${file} ===\n${fileDiff}`;
        }
      } catch (error) {
        this.logWarn(`Failed to get diff for untracked file ${file}:`, error);
      }
    }

    return diffOutput;
  }

  /**
   * 查找有效的基础分支
   */
  private async findValidBaseBranch(
    baseBranch: string,
    executor: any
  ): Promise<string | null> {
    // 检查远程分支
    try {
      await executor.executeForOutput(
        `git show-ref --verify --quiet refs/remotes/${baseBranch}`
      );
      return baseBranch;
    } catch {
      // 检查本地分支
      try {
        const localBranch = baseBranch.replace("origin/", "");
        await executor.executeForOutput(
          `git show-ref --verify --quiet refs/heads/${localBranch}`
        );
        return localBranch;
      } catch {
        // 尝试常见分支
        for (const branch of GIT_CONSTANTS.COMMON_BRANCHES) {
          try {
            await executor.executeForOutput(
              `git show-ref --verify --quiet refs/remotes/origin/${branch}`
            );
            return `origin/${branch}`;
          } catch {
            try {
              await executor.executeForOutput(
                `git show-ref --verify --quiet refs/heads/${branch}`
              );
              return branch;
            } catch {
              continue;
            }
          }
        }
      }
    }
    return null;
  }
}
