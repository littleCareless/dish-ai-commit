import * as vscode from "vscode";
import { ISCMProvider } from "./scm-provider";
import { promisify } from "util";
import * as childProcess from "child_process";
import { getMessage, formatMessage } from "../utils/i18n";
import { DiffProcessor } from "../utils/diff/diff-processor";
import { DiffSimplifier } from "../utils";

const exec = promisify(childProcess.exec);

/**
 * Git API接口定义
 */
interface GitAPI {
  /** Git仓库集合 */
  repositories: GitRepository[];

  /**
   * 获取指定版本的Git API
   * @param version - API版本号
   */
  getAPI(version: number): GitAPI;
}

/**
 * Git仓库接口定义
 */
interface GitRepository {
  /** 提交信息输入框 */
  inputBox: {
    value: string;
  };

  /**
   * 执行提交操作
   * @param message - 提交信息
   * @param options - 提交选项
   */
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

/**
 * Git源代码管理提供者实现
 * @implements {ISCMProvider}
 */
export class GitProvider implements ISCMProvider {
  /** SCM类型标识符 */
  type = "git" as const;

  /** 工作区根目录路径 */
  private workspaceRoot: string;

  /** Git API实例 */
  private readonly api: GitAPI;

  /**
   * 创建Git提供者实例
   * @param gitExtension - VS Code Git扩展实例
   * @param workspaceRoot - 工作区根目录路径，可选
   * @throws {Error} 当未找到工作区时抛出错误
   */
  constructor(private readonly gitExtension: any, workspaceRoot?: string) {
    this.api = gitExtension.getAPI(1);

    if (!workspaceRoot) {
      workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }

    if (!workspaceRoot) {
      throw new Error(getMessage("workspace.not.found"));
    }

    this.workspaceRoot = workspaceRoot;
  }

  /**
   * 初始化Provider
   */
  async init(): Promise<void> {
    try {
      const { stdout } = await exec("git --version");
      const version = stdout.trim();
      vscode.window.showInformationMessage(
        formatMessage("git.version.detected", [version])
      );
    } catch (error) {
      // 在初始化阶段，即使获取版本失败也不应阻塞，仅记录警告
      console.warn("Failed to get git version:", error);
    }
  }

  /**
   * 检查Git是否可用
   * @returns {Promise<boolean>} 如果Git可用返回true,否则返回false
   */
  async isAvailable(): Promise<boolean> {
    const api = this.gitExtension.getAPI(1);
    const repositories = api.repositories;
    return repositories.length > 0;
  }

  /**
   * 获取文件状态
   * @param {string} file - 文件路径
   * @returns {Promise<string>} 返回文件状态描述
   * @private
   */
  private async getFileStatus(file: string): Promise<string> {
    try {
      const { stdout: status } = await exec(
        `git status --porcelain "${file}"`,
        {
          cwd: this.workspaceRoot,
        }
      );

      if (!status) {
        return "Unknown";
      }

      if (status.startsWith("??")) {
        return "New File";
      }
      if (status.startsWith("A ")) {
        return "Added File"; // 已暂存的新文件
      }
      if (status.startsWith(" D") || status.startsWith("D ")) {
        return "Deleted File";
      }
      return "Modified File";
    } catch (error) {
      console.error(
        "Failed to get file status:",
        error instanceof Error ? error.message : error
      );
      return "Unknown";
    }
  }

  /**
   * 获取文件差异信息
   * @param {string[]} [files] - 可选的文件路径数组
   * @returns {Promise<string | undefined>} 返回差异文本
   * @throws {Error} 当执行diff命令失败时抛出错误
   */
  async getDiff(files?: string[]): Promise<string | undefined> {
    try {
      let rawDiff = "";

      // 检查仓库是否有初始提交
      let hasInitialCommit = true;
      try {
        await exec("git rev-parse HEAD", { cwd: this.workspaceRoot });
      } catch (error) {
        hasInitialCommit = false;
      }

      const diffCommand = `git diff --cached && git diff ${
        hasInitialCommit ? "HEAD" : ""
      } && git ls-files --others --exclude-standard | xargs -I {} git diff --no-index /dev/null {}`;

      try {
        const { stdout } = await exec(diffCommand, {
          cwd: this.workspaceRoot,
          maxBuffer: 1024 * 1024 * 20, // 20MB buffer
        });
        rawDiff = stdout;
      } catch (error) {
        // The command can fail if there are no changes, which is expected.
        if (error instanceof Error && "stdout" in error) {
          rawDiff = (error as any).stdout;
        } else {
          throw error;
        }
      }

      if (!rawDiff.trim()) {
        throw new Error(getMessage("diff.noChanges"));
      }

      // 获取配置
      const config = vscode.workspace.getConfiguration("dish-ai-commit");
      const enableSimplification = config.get<boolean>(
        "features.codeAnalysis.simplifyDiff"
      );

      if (enableSimplification) {
        const result = await vscode.window.showWarningMessage(
          getMessage("diff.simplification.warning"),
          getMessage("button.yes"),
          getMessage("button.no")
        );
        if (result === getMessage("button.yes")) {
          return DiffSimplifier.simplify(rawDiff);
        }
      }

      return DiffProcessor.process(rawDiff, "git");
    } catch (error) {
      if (error instanceof Error) {
        console.error("Git diff error:", error); // 添加调试日志
        vscode.window.showErrorMessage(
          formatMessage("git.diff.failed", [error.message])
        );
      }
      throw error;
    }
  }

  /**
   * 提交更改
   * @param {string} message - 提交信息
   * @param {string[]} [files] - 要提交的文件路径数组
   * @throws {Error} 当提交失败或未找到仓库时抛出错误
   */
  async commit(message: string, files?: string[]): Promise<void> {
    const api = this.gitExtension.getAPI(1);
    const repository = api.repositories[0];

    if (!repository) {
      throw new Error(getMessage("git.repository.not.found"));
    }

    await repository.commit(message, { all: files ? false : true, files });
  }

  /**
   * 设置提交输入框的内容
   * @param {string} message - 要设置的提交信息
   * @throws {Error} 当未找到仓库时抛出错误
   */
  async setCommitInput(message: string): Promise<void> {
    const api = this.gitExtension.getAPI(1);
    const repository = api.repositories[0];

    if (!repository) {
      throw new Error(getMessage("git.repository.not.found"));
    }

    repository.inputBox.value = message;
  }

  /**
   * 获取提交输入框的当前内容
   * @returns {Promise<string>} 返回当前的提交信息
   * @throws {Error} 当未找到仓库时抛出错误
   */
  async getCommitInput(): Promise<string> {
    const api = this.gitExtension.getAPI(1);
    const repository = api.repositories[0];

    if (!repository) {
      throw new Error(getMessage("git.repository.not.found"));
    }

    return repository.inputBox.value;
  }

  /**
   * 开始流式设置提交输入框的内容。
   * 根据ISCMProvider接口，此方法接收完整消息并设置。
   * @param {string} message - 要设置的提交信息
   * @throws {Error} 当未找到仓库时抛出错误
   */
  async startStreamingInput(message: string): Promise<void> {
    const api = this.gitExtension.getAPI(1);
    const repository = api.repositories[0];

    if (!repository) {
      throw new Error(getMessage("git.repository.not.found"));
    }

    repository.inputBox.value = message;
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
    try {
      // 确保基础分支存在
      try {
        await exec(`git show-ref --verify --quiet refs/remotes/${baseBranch}`, {
          cwd: this.workspaceRoot,
        });
      } catch (error) {
        // 如果远程分支不存在，尝试本地分支
        try {
          await exec(
            `git show-ref --verify --quiet refs/heads/${baseBranch.replace(
              "origin/",
              ""
            )}`,
            { cwd: this.workspaceRoot }
          );
          baseBranch = baseBranch.replace("origin/", ""); // 更新为本地分支名
        } catch (localError) {
          console.warn(
            formatMessage("git.base.branch.not.found", [baseBranch])
          );
          // 尝试使用默认的 main 或者 master
          const commonBranches = ["main", "master"];
          let foundCommonBranch = false;
          for (const branch of commonBranches) {
            try {
              await exec(
                `git show-ref --verify --quiet refs/remotes/origin/${branch}`,
                { cwd: this.workspaceRoot }
              );
              baseBranch = `origin/${branch}`;
              foundCommonBranch = true;
              break;
            } catch {
              try {
                await exec(
                  `git show-ref --verify --quiet refs/heads/${branch}`,
                  { cwd: this.workspaceRoot }
                );
                baseBranch = branch;
                foundCommonBranch = true;
                break;
              } catch {
                // 继续尝试下一个
              }
            }
          }
          if (!foundCommonBranch) {
            vscode.window.showWarningMessage(
              formatMessage("git.base.branch.not.found.default", [baseBranch])
            );
            // 如果都找不到，可能需要用户手动指定，或者抛出错误
            // 这里我们暂时返回空数组，并在日志中记录
            console.error(
              formatMessage("git.base.branch.not.found.error", [baseBranch])
            );
            return [];
          }
        }
      }

      const command = `git log ${baseBranch}..${headBranch} --pretty=format:"%s" --no-merges`;
      const { stdout } = await exec(command, {
        cwd: this.workspaceRoot,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      if (!stdout.trim()) {
        return [];
      }

      return stdout.split("\n").filter((line) => line.trim() !== "");
    } catch (error) {
      if (error instanceof Error) {
        console.error("Git log error:", error);
        vscode.window.showErrorMessage(
          formatMessage("git.log.failed", [error.message])
        );
      }
      // 对于获取日志失败的情况，返回空数组而不是抛出错误，让调用者处理
      return [];
    }
  }

  /**
   * 获取所有本地和远程分支的列表
   * @returns 返回分支名称列表
   */
  async getBranches(): Promise<string[]> {
    try {
      const command = `git branch -a --format="%(refname:short)"`;
      const { stdout } = await exec(command, {
        cwd: this.workspaceRoot,
        maxBuffer: 1024 * 1024 * 1, // 1MB buffer, should be enough for branch names
      });

      if (!stdout.trim()) {
        return [];
      }

      // 清理分支名称，移除可能存在的 "remotes/" 前缀，并去重
      const branches = stdout
        .split("\n")
        .map((branch) => branch.trim())
        .filter((branch) => branch && !branch.includes("->")) // 过滤掉 HEAD 指向等特殊行
        .map((branch) => branch.replace(/^remotes\//, "")) // 移除 remotes/ 前缀，方便用户选择
        .filter((branch, index, self) => self.indexOf(branch) === index); // 去重

      return branches.sort(); // 排序方便查找
    } catch (error) {
      if (error instanceof Error) {
        console.error("Git branch list error:", error);
        // 考虑添加一个新的 i18n key for this error
        vscode.window.showErrorMessage(
          formatMessage("git.branch.list.failed", [error.message]) // 假设有这个key
        );
      }
      return [];
    }
  }

  async getRecentCommitMessages() {
    const repositoryCommitMessages: string[] = [];
    const userCommitMessages: string[] = [];
    const repository = this.api.repositories[0];

    if (!repository) {
      return { repository: [], user: [] };
    }

    try {
      // Last 5 commit messages (repository)
      const commits = await repository.log({ maxEntries: 5 });
      repositoryCommitMessages.push(
        ...commits.map((commit) => commit.message.split("\n")[0])
      );

      // Last 5 commit messages (user)
      const author =
        (await repository.getConfig("user.name")) ||
        (await repository.getGlobalConfig("user.name"));

      console.log(
        "author",
        author,
        "1",
        await repository.getConfig("user.name"),
        "2",
        await repository.getGlobalConfig("user.name")
      );

      const userCommits = await repository.log({ maxEntries: 5, author });
      
      userCommitMessages.push(
        ...userCommits.map((commit) => commit.message.split("\n")[0])
      );
    } catch (err) {
      console.error("Failed to get recent commit messages:", err);
    }

    return { repository: repositoryCommitMessages, user: userCommitMessages };
  }

  // /**
  //  * 向提交输入框追加内容 (流式) - 在当前单方法流式模型下未使用
  //  * @param {string} chunk - 要追加的文本块
  //  * @throws {Error} 当未找到仓库时抛出错误
  //  */
  // async appendStreamingInput(chunk: string): Promise<void> {
  //   const api = this.gitExtension.getAPI(1);
  //   const repository = api.repositories[0];

  //   if (!repository) {
  //     throw new Error(getMessage("git.repository.not.found"));
  //   }
  //   repository.inputBox.value += chunk;
  // }
  //
  // /**
  //  * 完成流式设置提交输入框的内容。 - 在当前单方法流式模型下未使用
  //  * 对于Git，由于inputBox API的限制，此方法可能不执行显式操作（如重新启用输入框）。
  //  * @throws {Error} 当未找到仓库时抛出错误
  //  */
  // async finishStreamingInput(): Promise<void> {
  //   const api = this.gitExtension.getAPI(1);
  //   const repository = api.repositories[0];
  //
  //   if (!repository) {
  //     throw new Error(getMessage("git.repository.not.found"));
  //   }
  //   // Git的inputBox标准接口没有enabled属性。
  //   // 如果未来API支持enabled，可以在这里添加:
  //   // if (typeof repository.inputBox.enabled === 'boolean') {
  //   //   repository.inputBox.enabled = true;
  //   // }
  //   // 目前此方法主要用于保持接口一致性。
  // }
}
