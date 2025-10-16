import * as childProcess from "child_process";
import { promisify } from "util";
import { Logger } from "../../../utils/logger";
import { formatMessage } from "../../../utils/i18n";
import { notify } from "../../../utils/notification/notification-manager";
import { ImprovedPathUtils } from "../../utils/improved-path-utils";
import { SvnPathHelper } from "./svn-path-helper";

const exec = promisify(childProcess.exec);

/**
 * SVN日志帮助工具类
 * 提供SVN日志获取和处理相关功能
 */
export class SvnLogHelper {
  private svnPath: string;
  private logger: Logger;
  private environmentConfig: { path: string[], locale: string };

  /**
   * 创建SVN日志帮助工具实例
   * @param svnPath SVN可执行文件路径
   * @param environmentConfig 环境配置
   */
  constructor(svnPath: string, environmentConfig: { path: string[], locale: string }) {
    this.svnPath = svnPath;
    this.environmentConfig = environmentConfig;
    this.logger = Logger.getInstance("Dish AI Commit Gen");
  }

  /**
   * 获取提交日志
   * @param repositoryPath 仓库路径
   * @param baseRevisionInput 基础修订版本，可选
   * @param headRevisionInput 当前修订版本，默认为 'HEAD'
   * @returns 提交信息列表
   */
  async getCommitLog(
    repositoryPath: string,
    baseRevisionInput?: string,
    headRevisionInput: string = "HEAD"
  ): Promise<string[]> {
    try {
      let commandArgs = "";
      // 从配置中读取 commitLogLimit，如果用户未配置，则使用默认值
      const limit = 20;

      if (baseRevisionInput) {
        // 指定了范围: baseRevisionInput (较旧) 到 headRevisionInput (较新)
        // 我们希望结果是最新提交优先, 所以使用 -r NEWER_REV:OLDER_REV
        commandArgs = `-r ${headRevisionInput}:${baseRevisionInput}`;
      } else {
        // 未指定 baseRevisionInput, 获取最近的日志
        if (headRevisionInput === "HEAD") {
          commandArgs = `-l ${limit}`; // 获取 HEAD 的最近 'limit' 条日志
        } else {
          // 获取以 headRevisionInput 为终点的最近 'limit' 条日志
          // svn log -r REV:1 -l N 会给出从 REV 向旧追溯的 N 条日志
          commandArgs = `-r ${headRevisionInput}:1 -l ${limit}`;
        }
      }

      const command = `"${this.svnPath}" log ${commandArgs} "${repositoryPath}"`;
      this.logger.info(`Executing SVN log command: ${command}`);

      const { stdout } = await exec(command, {
        ...ImprovedPathUtils.createExecOptions(repositoryPath),
        env: SvnPathHelper.getEnvironmentConfig(this.environmentConfig),
      });

      const stdoutStr = stdout.toString();
      if (!stdoutStr?.trim()) {
        return [];
      }

      // 解析 SVN log 输出
      const rawLog = stdoutStr;
      return this.parseSvnLog(rawLog);
    } catch (error) {
      this.logger.error(error as Error);
      if (error instanceof Error) {
        notify.error(formatMessage("scm.log.failed", ["SVN", error.message]));
      }
      return []; // 类似 git-provider，在错误时返回空数组
    }
  }

  /**
   * 获取最近的提交消息
   * @param repositoryPath 仓库路径
   * @returns 仓库和用户的最近提交消息
   */
  async getRecentCommitMessages(repositoryPath: string): Promise<{ repository: string[]; user: string[] }> {
    const repositoryCommitMessages: string[] = [];
    const userCommitMessages: string[] = [];

    try {
      // Last 5 commit messages (repository)
      const logCommand = `"${this.svnPath}" log -l 5 "${repositoryPath}"`;
      const { stdout: logOutput } = await exec(logCommand, {
        ...ImprovedPathUtils.createExecOptions(repositoryPath),
        env: SvnPathHelper.getEnvironmentConfig(this.environmentConfig),
      });
      repositoryCommitMessages.push(...this.parseSvnLog(logOutput.toString()));

      // Last 5 commit messages (user)
      const { stdout: user } = await exec(
        `"${this.svnPath}" info --show-item last-changed-author "${repositoryPath}"`,
        ImprovedPathUtils.createExecOptions(repositoryPath)
      );
      const author = user.toString()?.trim();

      if (author) {
        const userLogCommand = `"${this.svnPath}" log -l 5 -r HEAD:1 --search "${author}" "${repositoryPath}"`;
        const { stdout: userLogOutput } = await exec(userLogCommand, {
          ...ImprovedPathUtils.createExecOptions(repositoryPath),
          env: SvnPathHelper.getEnvironmentConfig(this.environmentConfig),
        });
        userCommitMessages.push(...this.parseSvnLog(userLogOutput.toString()));
      }
    } catch (err) {
      this.logger.error(`Failed to get recent SVN commit messages: ${err instanceof Error ? err.message : String(err)}`);
    }

    return { repository: repositoryCommitMessages, user: userCommitMessages };
  }

  /**
   * 解析SVN日志输出
   * @param log SVN日志文本
   * @returns 解析后的提交消息数组
   */
  parseSvnLog(log: string): string[] {
    const messages: string[] = [];
    const entries = log?.split(
      /^------------------------------------------------------------------------$/m
    );

    for (const rawEntry of entries) {
      const entry = rawEntry?.trim();
      if (!entry) {
        continue;
      }

      const lines = entry?.split("\n");
      if (lines.length === 0 || !lines[0].match(/^r\d+\s+\|/)) {
        continue;
      }

      let messageStartIndex = 1;
      if (lines.length > 1 && lines[messageStartIndex]?.trim() === "") {
        messageStartIndex++;
      }

      if (messageStartIndex < lines.length) {
        const message = lines.slice(messageStartIndex).join("\n")?.trim();
        if (message) {
          messages.push(message);
        }
      }
    }
    return messages;
  }

  /**
   * 解析SVN日志输出（仅第一行）
   * @param log SVN日志文本
   * @returns 解析后的提交消息数组（每条消息只取第一行）
   */
  parseSvnLogFirstLine(log: string): string[] {
    const fullMessages = this.parseSvnLog(log);
    return fullMessages.map(message => message?.split("\n")[0] || "").filter(Boolean);
  }
}
