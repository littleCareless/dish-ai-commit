import { promisify } from "util";
import * as childProcess from "child_process";
import { Logger } from "../../../utils/logger";
import { formatMessage } from "../../../utils/i18n";
import { notify } from "../../../utils/notification/notification-manager";
import { GitRepository } from "./git-repository-helper";

const exec = promisify(childProcess.exec);

/**
 * Git 日志辅助类
 * 处理所有与 Git 日志和提交历史相关的操作
 */
export class GitLogHelper {
  private logger: Logger;

  /**
   * 创建 Git 日志辅助类
   */
  constructor() {
    this.logger = Logger.getInstance("Dish AI Commit Gen");
  }

  /**
   * 获取提交日志
   * @param repositoryPath 仓库路径
   * @param baseBranch 基础分支，默认为 origin/main
   * @param headBranch 当前分支，默认为 HEAD
   * @returns 返回提交信息列表
   */
  public async getCommitLog(
    repositoryPath: string,
    baseBranch = "origin/main",
    headBranch = "HEAD"
  ): Promise<string[]> {
    try {
      // 确保基础分支存在
      try {
        await exec(`git show-ref --verify --quiet refs/remotes/${baseBranch}`, {
          cwd: repositoryPath,
        });
      } catch (error) {
        // 如果远程分支不存在，尝试本地分支
        try {
          await exec(
            `git show-ref --verify --quiet refs/heads/${baseBranch.replace(
              "origin/",
              ""
            )}`,
            { cwd: repositoryPath }
          );
          baseBranch = baseBranch.replace("origin/", ""); // 更新为本地分支名
        } catch (localError) {
          this.logger.warn(
            `Base branch ${baseBranch} not found, trying defaults.`
          );
          // 尝试使用默认的 main 或者 master
          const commonBranches = ["main", "master"];
          let foundCommonBranch = false;
          for (const branch of commonBranches) {
            try {
              await exec(
                `git show-ref --verify --quiet refs/remotes/origin/${branch}`,
                { cwd: repositoryPath }
              );
              baseBranch = `origin/${branch}`;
              foundCommonBranch = true;
              break;
            } catch {
              try {
                await exec(
                  `git show-ref --verify --quiet refs/heads/${branch}`,
                  { cwd: repositoryPath }
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
            notify.warn("git.base.branch.not.found.default", [baseBranch]);
            // 如果都找不到，可能需要用户手动指定，或者抛出错误
            // 这里我们暂时返回空数组，并在日志中记录
            this.logger.error(
              `Base branch ${baseBranch} not found, and default branches (main, master) also not found.`
            );
            return [];
          }
        }
      }

      const command = `git log ${baseBranch}..${headBranch} --pretty=format:"%s" --no-merges`;
      const { stdout } = await exec(command, {
        cwd: repositoryPath,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      if (!stdout?.trim()) {
        return [];
      }

      return stdout?.split("\n").filter((line) => line?.trim() !== "");
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Git log error: ${error.message}`);
        notify.error(formatMessage("scm.log.failed", ["Git", error.message]));
      }
      // 对于获取日志失败的情况，返回空数组而不是抛出错误，让调用者处理
      return [];
    }
  }

  /**
   * 获取所有本地和远程分支的列表
   * @param repositoryPath 仓库路径
   * @returns 返回分支名称列表
   */
  public async getBranches(repositoryPath: string): Promise<string[]> {
    try {
      const command = `git branch -a --format="%(refname:short)"`;
      const { stdout } = await exec(command, {
        cwd: repositoryPath,
        maxBuffer: 1024 * 1024 * 1, // 1MB buffer, should be enough for branch names
      });

      if (!stdout?.trim()) {
        return [];
      }

      // 清理分支名称，移除可能存在的 "remotes/" 前缀，并去重
      const branches = stdout
        ?.split("\n")
        .map((branch) => branch?.trim())
        .filter((branch) => branch && !branch.includes("->")) // 过滤掉 HEAD 指向等特殊行
        .map((branch) => branch.replace(/^remotes\//, "")) // 移除 remotes/ 前缀，方便用户选择
        .filter((branch, index, self) => self.indexOf(branch) === index); // 去重

      return branches.sort(); // 排序方便查找
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Git branch list error: ${error.message}`);
        notify.error(
          formatMessage("scm.branch.list.failed", ["Git", error.message])
        );
      }
      return [];
    }
  }

  /**
   * 获取最近的提交消息
   * @param repository Git 仓库对象
   * @returns 仓库和用户的最近提交消息
   */
  public async getRecentCommitMessages(repository: GitRepository): Promise<{
    repository: string[];
    user: string[];
  }> {
    const repositoryCommitMessages: string[] = [];
    const userCommitMessages: string[] = [];

    try {
      // Last 5 commit messages (repository)
      const commits = await repository.log({ maxEntries: 5 });
      repositoryCommitMessages.push(
        ...commits.map((commit) => commit.message?.split("\n")[0])
      );

      // Last 5 commit messages (user)
      const author =
        (await repository.getConfig("user.name")) ||
        (await repository.getGlobalConfig("user.name"));

      const userCommits = await repository.log({ maxEntries: 5, author });

      userCommitMessages.push(
        ...userCommits.map((commit) => commit.message?.split("\n")[0])
      );
    } catch (err) {
      this.logger.error(err as Error);
    }

    return { repository: repositoryCommitMessages, user: userCommitMessages };
  }
}
