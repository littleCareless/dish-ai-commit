import * as vscode from "vscode";
import { UnifiedSCMProvider } from "./base/unified-scm-provider";
import { formatMessage } from "../utils/i18n";
import { notify } from "../utils/notification/notification-manager";
import { SCMErrorHandler } from "./utils/error-handler";
import { SCMCommandExecutor } from "./utils/command-executor";
import { SCMConfigManager } from "./utils/config-manager";

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

/**
 * Git源代码管理提供者实现（统一重构版本）
 * 使用统一基类消除重复代码
 */
export class GitProvider extends UnifiedSCMProvider<GitRepository> {
  /** SCM类型标识符 */
  readonly type = "git" as const;

  /** SCM类型标识符 - 用于基类 */
  get scmTypeName(): string {
    return "Git";
  }

  /** Git API实例 */
  private readonly api: any;

  /**
   * 创建Git提供者实例
   * @param gitExtension - VS Code Git扩展实例
   * @param repositoryPath - 可选的仓库路径
   */
  constructor(private readonly gitExtension: any, repositoryPath?: string) {
    super(repositoryPath);
    this.api = gitExtension.getAPI(1);
  }

  /**
   * 获取所有Git仓库
   */
  getRepositories(): GitRepository[] {
    return this.api.repositories;
  }

  /**
   * 获取仓库的文件系统路径
   */
  getRepoFsPath(repo: GitRepository): string {
    return repo.rootUri.fsPath;
  }

  /**
   * 获取仓库的输入框
   */
  getInputBox(repo: GitRepository): { value: string } {
    return repo.inputBox;
  }

  /**
   * 执行提交操作
   */
  async executeCommit(
    repo: GitRepository,
    message: string,
    files?: string[]
  ): Promise<void> {
    await repo.commit(message, { all: !files, files });
  }

  /**
   * 初始化Provider
   */
  async init(): Promise<void> {
    try {
      const gitPath = await SCMConfigManager.getGitPath();
      const { stdout } = await SCMCommandExecutor.execute(
        "git --version",
        this.repositoryPath || ""
      );
      const version = stdout.toString().trim();
      notify.info(formatMessage("scm.version.detected", ["Git", version]));
    } catch (error) {
      console.warn("Failed to get git version:", error);
    }
  }

  /**
   * 检查Git是否可用
   */
  async isAvailable(): Promise<boolean> {
    const repositories = this.getRepositories();
    return repositories.length > 0;
  }

  /**
   * 获取提交日志
   */
  async getCommitLog(
    baseBranch = "origin/main",
    headBranch = "HEAD"
  ): Promise<string[]> {
    const repository = this.findRepository();
    const validatedRepo = this.validateRepository(repository);
    const currentWorkspaceRoot = this.getRepoFsPath(validatedRepo);

    try {
      const validBaseBranch = await this.findValidBaseBranch(
        currentWorkspaceRoot,
        baseBranch
      );

      if (!validBaseBranch) {
        console.warn(`未找到有效的基础分支: ${baseBranch}`);
        return [];
      }

      const command = `git log ${validBaseBranch}..${headBranch} --pretty=format:"%s" --no-merges`;
      const { stdout } = await SCMCommandExecutor.execute(
        command,
        currentWorkspaceRoot
      );

      if (!stdout.toString().trim()) {
        return [];
      }

      return stdout
        .toString()
        .split("\n")
        .filter((line: string) => line.trim() !== "");
    } catch (error) {
      return SCMErrorHandler.handleLogError(this.scmTypeName, error);
    }
  }

  /**
   * 获取最近的提交信息
   */
  async getRecentCommitMessages() {
    const repositoryCommitMessages: string[] = [];
    const userCommitMessages: string[] = [];
    const repository = this.findRepository();

    if (!repository) {
      return { repository: [], user: [] };
    }

    try {
      // 最近5条提交信息（仓库）
      const commits = await repository.log({ maxEntries: 5 });
      repositoryCommitMessages.push(
        ...commits.map((commit) => commit.message.split("\n")[0])
      );

      // 最近5条提交信息（用户）
      const author =
        (await repository.getConfig("user.name")) ||
        (await repository.getGlobalConfig("user.name"));

      const userCommits = await repository.log({ maxEntries: 5, author });
      userCommitMessages.push(
        ...userCommits.map((commit) => commit.message.split("\n")[0])
      );
    } catch (err) {
      console.error("获取最近提交信息失败:", err);
    }

    return { repository: repositoryCommitMessages, user: userCommitMessages };
  }

  /**
   * 查找有效的基础分支
   * @private
   */
  private async findValidBaseBranch(
    workspaceRoot: string,
    baseBranch: string
  ): Promise<string | null> {
    // 检查远程分支
    try {
      await SCMCommandExecutor.execute(
        `git show-ref --verify --quiet refs/remotes/${baseBranch}`,
        workspaceRoot
      );
      return baseBranch;
    } catch {
      // 检查本地分支
      const localBranch = baseBranch.replace("origin/", "");
      try {
        await SCMCommandExecutor.execute(
          `git show-ref --verify --quiet refs/heads/${localBranch}`,
          workspaceRoot
        );
        return localBranch;
      } catch {
        // 尝试常见分支
        const commonBranches = ["main", "master"];
        for (const branch of commonBranches) {
          try {
            await SCMCommandExecutor.execute(
              `git show-ref --verify --quiet refs/remotes/origin/${branch}`,
              workspaceRoot
            );
            return `origin/${branch}`;
          } catch {
            try {
              await SCMCommandExecutor.execute(
                `git show-ref --verify --quiet refs/heads/${branch}`,
                workspaceRoot
              );
              return branch;
            } catch {
              // 继续尝试下一个
            }
          }
        }
      }
    }
    return null;
  }

  /**
   * 获取所有分支的列表
   * @returns 分支名称数组
   */
  async getBranches(): Promise<string[]> {
    try {
      const repository = this.findRepository();
      if (!repository) {
        return [];
      }

      const workspaceRoot = this.getRepoFsPath(repository);
      const { stdout } = await SCMCommandExecutor.execute(
        'git branch -a --format="%(refname:short)"',
        workspaceRoot
      );

      const stdoutStr = stdout.toString();
      if (!stdoutStr.trim()) {
        return [];
      }

      // 解析分支输出，过滤掉HEAD指向等特殊行，并去重排序
      const branches = stdoutStr
        .split("\n")
        .map((branch: string) => branch.trim())
        .filter((branch: string) => branch && !branch.includes("HEAD ->"))
        .filter(
          (branch: string, index: number, arr: string[]) =>
            arr.indexOf(branch) === index
        ) // 去重
        .sort(); // 排序

      return branches;
    } catch (error) {
      console.error("获取Git分支失败:", error);
      return [];
    }
  }

  /**
   * 验证仓库
   * @private
   */
  private validateRepository(
    repository: GitRepository | undefined
  ): GitRepository {
    return SCMErrorHandler.validateRepository(
      repository,
      this.scmTypeName,
      "验证仓库"
    );
  }
}
