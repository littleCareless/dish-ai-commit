import * as vscode from "vscode";
import { ISCMProvider } from "./scm-provider";
import { promisify } from "util";
import * as childProcess from "child_process";
import { getMessage, formatMessage } from "../utils/i18n";
import { DiffProcessor } from "../utils/diff/diff-processor";
import { notify } from "../utils/notification/notification-manager";
import { ConfigurationManager } from "../config/configuration-manager";
import { ImprovedPathUtils } from "./utils/improved-path-utils";

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
  /** 仓库根目录的URI */
  readonly rootUri: vscode.Uri;

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

  /** Git API实例 */
  private readonly api: GitAPI;
  private readonly repositoryPath?: string;

  /**
   * 创建Git提供者实例
   * @param gitExtension - VS Code Git扩展实例
   * @param repositoryPath - 可选的仓库路径
   * @throws {Error} 当未找到工作区时抛出错误
   */
  constructor(private readonly gitExtension: any, repositoryPath?: string) {
    this.api = gitExtension.getAPI(1);
    this.repositoryPath = repositoryPath;

    if (!vscode.workspace.workspaceFolders?.length) {
      throw new Error(getMessage("workspace.not.found"));
    }
  }

  /**
   * 初始化Provider
   */
  async init(): Promise<void> {
    try {
      const { stdout } = await exec("git --version");
      const version = stdout?.trim();
      notify.info(formatMessage("scm.version.detected", ["Git", version]));
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
  private async getFileStatus(
    file: string,
    repositoryPath: string
  ): Promise<string> {
    try {
      const escapedFile = ImprovedPathUtils.escapeShellPath(file);
      const { stdout: status } = await exec(
        `git status --porcelain ${escapedFile}`,
        {
          ...ImprovedPathUtils.createExecOptions(repositoryPath),
          encoding: "utf8",
        }
      );

      if (!status) {
        return "Unknown";
      }

      const statusStr = status.toString();
      if (statusStr.startsWith("??")) {
        return "New File";
      }
      if (statusStr.startsWith("A ")) {
        return "Added File"; // 已暂存的新文件
      }
      if (statusStr.startsWith(" D") || statusStr.startsWith("D ")) {
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
      const repository = this.findRepository(files);
      if (!repository) {
        throw new Error(formatMessage("scm.repository.not.found", ["Git"]));
      }
      const currentWorkspaceRoot = repository.rootUri.fsPath;

      let diffOutput = "";

      // 检查仓库是否有初始提交
      let hasInitialCommit = true;
      try {
        await exec("git rev-parse HEAD", {
          ...ImprovedPathUtils.createExecOptions(currentWorkspaceRoot),
          encoding: "utf8",
        });
      } catch (error) {
        // 如果执行失败，说明没有初始提交
        hasInitialCommit = false;
      }

      if (files && files.length > 0) {
        // notify.info(formatMessage("diff.info.selected", [files.length]));
        // 处理指定文件的差异
        for (const file of files) {
          const fileStatus = await this.getFileStatus(
            file,
            currentWorkspaceRoot
          );
          const escapedFile = ImprovedPathUtils.escapeShellPath(file);

          // 根据文件状态选择合适的diff命令
          let stdout = "";
          if (fileStatus === "New File") {
            // 处理未跟踪的新文件
            try {
              const result = await exec(
                `git diff --no-index /dev/null ${escapedFile}`,
                {
                  ...ImprovedPathUtils.createExecOptions(currentWorkspaceRoot),
                  encoding: "utf8",
                }
              );
              stdout = result.stdout.toString();
            } catch (error) {
              // git diff --no-index 在有差异时会返回非零状态码，需要捕获异常
              if (error instanceof Error && "stdout" in error) {
                stdout = (error as any).stdout;
              }
            }
          } else if (fileStatus === "Added File") {
            // 处理已暂存的新文件
            const result = await exec(`git diff --cached -- ${escapedFile}`, {
              ...ImprovedPathUtils.createExecOptions(currentWorkspaceRoot),
              encoding: "utf8",
            });
            stdout = result.stdout.toString();
          } else {
            // 处理已跟踪且修改的文件
            try {
              // 尝试使用 HEAD 引用
              if (hasInitialCommit) {
                const result = await exec(`git diff HEAD -- ${escapedFile}`, {
                  cwd: currentWorkspaceRoot,
                  maxBuffer: 1024 * 1024 * 10,
                });
                stdout = result.stdout.toString();
              } else {
                // 如果没有初始提交，则使用不带HEAD的diff命令
                const result = await exec(`git diff -- ${escapedFile}`, {
                  cwd: currentWorkspaceRoot,
                  maxBuffer: 1024 * 1024 * 10,
                  encoding: "utf8",
                });
                stdout = result.stdout.toString();
              }
            } catch (error) {
              // 如果出现"bad revision 'HEAD'"错误，回退到不带HEAD的diff命令
              if (
                error instanceof Error &&
                error.message.includes("bad revision 'HEAD'")
              ) {
                const result = await exec(`git diff -- ${escapedFile}`, {
                  cwd: currentWorkspaceRoot,
                  maxBuffer: 1024 * 1024 * 10,
                  encoding: "utf8",
                });
                stdout = result.stdout.toString();
              } else {
                throw error;
              }
            }
          }

          // 添加文件状态和差异信息
          if (stdout?.trim()) {
            diffOutput += `\n=== ${fileStatus}: ${file} ===\n${stdout}`;
          }
        }
      } else {
        const diffTarget = ConfigurationManager.getInstance().getConfig(
          "FEATURES_CODEANALYSIS_DIFFTARGET"
        );

        if (diffTarget === "staged") {
          try {
            let stagedFilesOutput = "";
            try {
              const { stdout } = await exec("git diff --cached --name-only", {
                cwd: currentWorkspaceRoot,
              });
              stagedFilesOutput = stdout;
            } catch (e) {
              if (e instanceof Error && "stdout" in e) {
                stagedFilesOutput = (e as any).stdout;
              } else {
                throw e;
              }
            }
            const fileCount = stagedFilesOutput
              .split("\n")
              .filter(Boolean).length;
            if (fileCount > 0) {
              notify.info(formatMessage("diff.info.staged", [fileCount]));
            }
          } catch (error) {
            console.warn(
              "Failed to count staged files for notification:",
              error
            );
          }
          // 只获取暂存区的更改
          const { stdout: stagedChanges } = await exec("git diff --cached", {
            cwd: currentWorkspaceRoot,
            maxBuffer: 1024 * 1024 * 10,
          });
          diffOutput = stagedChanges;
        } else {
          // 获取所有更改的差异 - 需要组合多个命令的输出
          try {
            const getFileNames = async (command: string) => {
              let output = "";
              try {
                const result = await exec(command, {
                  cwd: currentWorkspaceRoot,
                });
                output = result.stdout;
              } catch (e) {
                if (e instanceof Error && "stdout" in e) {
                  output = (e as any).stdout;
                } else {
                  throw e;
                }
              }
              return output.split("\n").filter(Boolean);
            };

            const trackedFiles = hasInitialCommit
              ? await getFileNames("git diff HEAD --name-only")
              : await getFileNames("git diff --name-only");

            const stagedFiles = await getFileNames(
              "git diff --cached --name-only"
            );

            const { stdout: untrackedFilesOutput } = await exec(
              "git ls-files --others --exclude-standard",
              {
                cwd: currentWorkspaceRoot,
              }
            );
            const untrackedFiles = untrackedFilesOutput
              .split("\n")
              .filter(Boolean);

            const allFiles = new Set([
              ...trackedFiles,
              ...stagedFiles,
              ...untrackedFiles,
            ]);
            const fileCount = allFiles.size;

            if (fileCount > 0) {
              notify.info(formatMessage("diff.info.all", [fileCount]));
            }
          } catch (error) {
            console.warn(
              "Failed to count all changed files for notification:",
              error
            );
          }

          // 1. 获取已跟踪文件的更改
          let trackedChanges = "";
          try {
            if (hasInitialCommit) {
              // 如果有初始提交，使用HEAD引用
              const result = await exec("git diff HEAD", {
                cwd: currentWorkspaceRoot,
                maxBuffer: 1024 * 1024 * 10,
              });
              trackedChanges = result.stdout;
            } else {
              // 如果没有初始提交，使用不带HEAD的diff命令
              const result = await exec("git diff", {
                cwd: currentWorkspaceRoot,
                maxBuffer: 1024 * 1024 * 10,
              });
              trackedChanges = result.stdout;
            }
          } catch (error) {
            // 如果出现"bad revision 'HEAD'"错误，回退到不带HEAD的diff命令
            if (
              error instanceof Error &&
              error.message.includes("bad revision 'HEAD'")
            ) {
              const result = await exec("git diff", {
                cwd: currentWorkspaceRoot,
                maxBuffer: 1024 * 1024 * 10,
              });
              trackedChanges = result.stdout;
            } else {
              throw error;
            }
          }

          // 2. 获取已暂存的新文件更改
          const execResult = await exec("git diff --cached", {
            cwd: currentWorkspaceRoot,
            maxBuffer: 1024 * 1024 * 10,
          });
          const { stdout: stagedChanges } = execResult;

          // 3. 获取未跟踪的新文件列表
          const { stdout: untrackedFiles } = await exec(
            "git ls-files --others --exclude-standard",
            {
              cwd: currentWorkspaceRoot,
            }
          );

          // 整合所有差异
          diffOutput = trackedChanges;

          if (stagedChanges?.trim()) {
            diffOutput += stagedChanges;
          }

          // 为每个未跟踪文件获取差异
          if (untrackedFiles?.trim()) {
            const files = untrackedFiles
              .split("\n")
              .filter((file) => file?.trim());
            for (const file of files) {
              const escapedFile = ImprovedPathUtils.escapeShellPath(file);
              try {
                // 使用git diff --no-index捕获新文件内容
                const result = await exec(
                  `git diff --no-index /dev/null ${escapedFile}`,
                  {
                    cwd: currentWorkspaceRoot,
                    maxBuffer: 1024 * 1024 * 10,
                  }
                );
                diffOutput += `\n=== New File: ${file} ===\n${result.stdout}`;
              } catch (error) {
                // git diff --no-index 在有差异时会返回非零状态码，需要捕获异常
                if (error instanceof Error && "stdout" in error) {
                  diffOutput += `\n=== New File: ${file} ===\n${
                    (error as any).stdout
                  }`;
                }
              }
            }
          }
        }
      }

      if (!diffOutput?.trim()) {
        // throw new Error(getMessage("diff.noChanges"));
      }

      // Process the diff to get structured data, including original file content.
      return DiffProcessor.process(diffOutput, "git");
    } catch (error) {
      if (error instanceof Error) {
        console.error(formatMessage("scm.error.diff", ["Git", error])); // 添加调试日志
        notify.error(formatMessage("scm.error.diff", ["Git", error.message]));
      }
      throw error;
    }
  }

  /**
   * 根据文件路径或当前上下文找到最匹配的Git仓库。
   * @param filePaths - 可选的文件路径数组，用于精确定位仓库。
   * @returns {GitRepository | undefined} 匹配的Git仓库实例。
   * @private
   */
  private findRepository(filePaths?: string[]): GitRepository | undefined {
    const { repositories } = this.api;

    if (!repositories.length) {
      return undefined;
    }

    // 1. 如果在构造时提供了特定的仓库路径，优先使用它
    if (this.repositoryPath) {
      const specificRepo = repositories.find(
        (repo) =>
          ImprovedPathUtils.normalizePath(repo.rootUri.fsPath) ===
          ImprovedPathUtils.normalizePath(this.repositoryPath!)
      );
      // 如果提供了特定的仓库路径，我们只信任这个路径。
      // 如果找不到，则返回 undefined，让调用者处理错误，
      // 避免错误地回退到其他仓库。
      return specificRepo;
    }

    // --- Fallback Logic ---
    // 仅在未提供 repositoryPath 时执行以下逻辑

    // 如果只有一个仓库，直接返回
    if (repositories.length === 1) {
      return repositories[0];
    }

    const uris = filePaths?.map((path) => vscode.Uri.file(path));

    // 2. 根据提供的文件路径查找
    if (uris && uris.length > 0) {
      for (const uri of uris) {
        for (const repo of repositories) {
          if (
            ImprovedPathUtils.normalizePath(uri.fsPath).startsWith(
              ImprovedPathUtils.normalizePath(repo.rootUri.fsPath)
            )
          ) {
            return repo; // 找到第一个匹配的就返回
          }
        }
      }
    }

    // 3. 根据当前打开的活动编辑器查找
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor?.document.uri.scheme === "file") {
      const activeFileUri = activeEditor.document.uri;
      for (const repo of repositories) {
        if (
          ImprovedPathUtils.normalizePath(activeFileUri.fsPath).startsWith(
            ImprovedPathUtils.normalizePath(repo.rootUri.fsPath)
          )
        ) {
          return repo;
        }
      }
    }

    // 4. 如果上述都找不到，返回第一个仓库作为备选
    // 这种策略在多仓库工作区可能不准确，但提供了一个回退方案
    return repositories[0];
  }

  /**
   * 提交更改
   * @param {string} message - 提交信息
   * @param {string[]} [files] - 要提交的文件路径数组
   * @throws {Error} 当提交失败或未找到仓库时抛出错误
   */
  async commit(message: string, files?: string[]): Promise<void> {
    const repository = this.findRepository(files);

    if (!repository) {
      throw new Error(formatMessage("scm.repository.not.found", ["Git"]));
    }

    await repository.commit(message, { all: !files, files });
  }

  /**
   * 设置提交输入框的内容
   * @param {string} message - 要设置的提交信息
   * @throws {Error} 当未找到仓库时抛出错误
   */
  async setCommitInput(message: string): Promise<void> {
    const repository = this.findRepository();

    if (repository?.inputBox) {
      repository.inputBox.value = message;
    } else {
      try {
        await vscode.env.clipboard.writeText(message);
        notify.info("info.copied.to.clipboard", [getMessage("commit.message.label")]);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        notify.error("commit.message.copy.failed", [errorMessage]);
        // Fallback to showing the message in an information dialog
        notify.info("info.manual.copy", [getMessage("commit.message.label"), message]);
      }
    }
  }

  /**
   * 获取提交输入框的当前内容
   * @returns {Promise<string>} 返回当前的提交信息
   * @throws {Error} 当未找到仓库时抛出错误
   */
  async getCommitInput(): Promise<string> {
    const repository = this.findRepository();

    if (!repository) {
      throw new Error(formatMessage("scm.repository.not.found", ["Git"]));
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
    const repository = this.findRepository();

    if (repository?.inputBox) {
      repository.inputBox.value = message;
    } else {
      try {
        await vscode.env.clipboard.writeText(message);
        notify.info("info.copied.to.clipboard", [getMessage("commit.message.label")]);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        notify.error("commit.message.copy.failed", [errorMessage]);
        notify.info("info.manual.copy", [getMessage("commit.message.label"), message]);
      }
    }
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
    const repository = this.findRepository();
    if (!repository) {
      notify.warn(formatMessage("scm.repository.not.found", ["Git"]));
      return [];
    }
    const currentWorkspaceRoot = repository.rootUri.fsPath;

    try {
      // 确保基础分支存在
      try {
        await exec(`git show-ref --verify --quiet refs/remotes/${baseBranch}`, {
          cwd: currentWorkspaceRoot,
        });
      } catch (error) {
        // 如果远程分支不存在，尝试本地分支
        try {
          await exec(
            `git show-ref --verify --quiet refs/heads/${baseBranch.replace(
              "origin/",
              ""
            )}`,
            { cwd: currentWorkspaceRoot }
          );
          baseBranch = baseBranch.replace("origin/", ""); // 更新为本地分支名
        } catch (localError) {
          console.warn(
            formatMessage("branch.base.not.found", [baseBranch])
          );
          // 尝试使用默认的 main 或者 master
          const commonBranches = ["main", "master"];
          let foundCommonBranch = false;
          for (const branch of commonBranches) {
            try {
              await exec(
                `git show-ref --verify --quiet refs/remotes/origin/${branch}`,
                { cwd: currentWorkspaceRoot }
              );
              baseBranch = `origin/${branch}`;
              foundCommonBranch = true;
              break;
            } catch {
              try {
                await exec(
                  `git show-ref --verify --quiet refs/heads/${branch}`,
                  { cwd: currentWorkspaceRoot }
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
            notify.warn("branch.base.not.found.default", [baseBranch]);
            // 如果都找不到，可能需要用户手动指定，或者抛出错误
            // 这里我们暂时返回空数组，并在日志中记录
            console.error(
              formatMessage("branch.base.not.found.error", [baseBranch])
            );
            return [];
          }
        }
      }

      const command = `git log ${baseBranch}..${headBranch} --pretty=format:"%s" --no-merges`;
      const { stdout } = await exec(command, {
        cwd: currentWorkspaceRoot,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      if (!stdout?.trim()) {
        return [];
      }

      return stdout.split("\n").filter((line) => line?.trim() !== "");
    } catch (error) {
      if (error instanceof Error) {
        console.error("Git log error:", error);
        notify.error(formatMessage("scm.error.log.failed", ["Git", error.message]));
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
    const repository = this.findRepository();
    if (!repository) {
      notify.warn(formatMessage("scm.repository.not.found", ["Git"]));
      return [];
    }
    const currentWorkspaceRoot = repository.rootUri.fsPath;

    try {
      const command = `git branch -a --format="%(refname:short)"`;
      const { stdout } = await exec(command, {
        cwd: currentWorkspaceRoot,
        maxBuffer: 1024 * 1024 * 1, // 1MB buffer, should be enough for branch names
      });

      if (!stdout?.trim()) {
        return [];
      }

      // 清理分支名称，移除可能存在的 "remotes/" 前缀，并去重
      const branches = stdout
        .split("\n")
        .map((branch) => branch?.trim())
        .filter((branch) => branch && !branch.includes("->")) // 过滤掉 HEAD 指向等特殊行
        .map((branch) => branch.replace(/^remotes\//, "")) // 移除 remotes/ 前缀，方便用户选择
        .filter((branch, index, self) => self.indexOf(branch) === index); // 去重

      return branches.sort(); // 排序方便查找
    } catch (error) {
      if (error instanceof Error) {
        console.error("Git branch list error:", error);
        // 考虑添加一个新的 i18n key for this error
        notify.error(
          formatMessage("scm.error.branch.list.failed", ["Git", error.message])
        );
      }
      return [];
    }
  }

  async getRecentCommitMessages() {
    const repositoryCommitMessages: string[] = [];
    const userCommitMessages: string[] = [];
    const repository = this.findRepository();
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

      const userCommits = await repository.log({ maxEntries: 5, author });

      userCommitMessages.push(
        ...userCommits.map((commit) => commit.message.split("\n")[0])
      );
    } catch (err) {
      console.error("Failed to get recent commit messages:", err);
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
      notify.info("info.copied.to.clipboard", [getMessage("commit.message.label")]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      notify.error("commit.message.copy.failed", [errorMessage]);
    }
  }
}
