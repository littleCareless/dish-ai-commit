import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { formatMessage, getMessage } from "../../utils/i18n";
import { SCMCommandExecutor } from "./command-executor";
import { SCMConfigManager } from "./config-manager";
import { ConfigurationManager } from "../../config/configuration-manager";



/**
 * SVN工具类
 * 提取SVN相关操作的共享逻辑
 */
export class SvnUtils {
  // 日志级别定义
  private static readonly LogLevel = {
    Info: 0,
    Warning: 1,
    Error: 2,
  };

  /**
   * 日志记录
   */
  static log(level: number, message: string, ...args: any[]) {
    switch (level) {
      case this.LogLevel.Info:
        // 可以根据环境配置是否输出info级别日志
        if (process.env.NODE_ENV !== "production") {
          console.log(message, ...args);
        }
        break;
      case this.LogLevel.Warning:
        console.warn(message, ...args);
        break;
      case this.LogLevel.Error:
        console.error(message, ...args);
        break;
    }
  }

  /**
   * 加载SVN配置
   */
  static loadConfig(): any {
    const DEFAULT_CONFIG = {
      environmentConfig: {
        path: ["/usr/local/bin", "/opt/homebrew/bin"],
        locale: "en_US.UTF-8",
      },
    };

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
      this.log(this.LogLevel.Error, "Failed to load SVN config:", error);
      throw new Error(formatMessage("svn.config.load.failed", [error]));
    }
  }

  /**
   * 获取环境配置
   */
  static getEnvironmentConfig(config: any) {
    // Deprecated: 委托给统一配置管理器
    return SCMConfigManager.getSvnEnvironmentConfig();
  }

  // duplicate helpers removed: path validation and executable discovery are centralized in SCMConfigManager

  /**
   * 获取SVN路径
   */
  static async getSvnPath(caller?: string): Promise<string> {
    return SCMConfigManager.getSvnPath(caller);
  }

  /**
   * 执行SVN命令
   */
  static async execCommand(
    command: string,
    workingDirectory?: string,
    envConfig?: any
  ): Promise<{ stdout: string; stderr: string }> {
    return SCMCommandExecutor.execute(command, workingDirectory || "", {
      env: envConfig || process.env,
    });
  }

  /**
   * 解析SVN日志
   */
  static parseSvnLog(log: string): string[] {
    const messages: string[] = [];
    const entries = log.split(
      /^------------------------------------------------------------------------$/m
    );

    for (const rawEntry of entries) {
      const entry = rawEntry.trim();
      if (!entry) {
        continue;
      }

      const lines = entry.split("\n");
      if (lines.length === 0 || !lines[0].match(/^r\d+\s+\|/)) {
        continue;
      }

      let messageStartIndex = 1;
      if (lines.length > 1 && lines[messageStartIndex].trim() === "") {
        messageStartIndex++;
      }

      if (messageStartIndex < lines.length) {
        const message = lines.slice(messageStartIndex).join("\n").trim();
        if (message) {
          messages.push(message.split("\n")[0]);
        }
      }
    }
    return messages;
  }

  /**
   * 获取提交日志
   */
  static async getCommitLog(
    svnPath: string,
    repositoryPath: string,
    baseRevisionInput?: string,
    headRevisionInput: string = "HEAD"
  ): Promise<string[]> {
    try {
      let commandArgs = "";
      // 从配置中读取 commitLogLimit，如果用户未配置，则使用默认值
      const limit =
        (ConfigurationManager.getInstance().getConfig(
          "FEATURES_PRSUMMARY_COMMITLOGLIMIT"
        ) as number) || 20;

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

      const command = `"${svnPath}" log ${commandArgs} "${repositoryPath}"`;
      this.log(this.LogLevel.Info, `Executing SVN log command: ${command}`);

      const { stdout } = await this.execCommand(command, repositoryPath);

      const stdoutStr = stdout.toString();
      if (!stdoutStr.trim()) {
        return [];
      }

      // 解析 SVN log 输出
      return this.parseSvnLog(stdoutStr);
    } catch (error) {
      this.log(this.LogLevel.Error, "SVN log failed:", error);
      return []; // 类似 git-provider，在错误时返回空数组
    }
  }

  /**
   * 获取最近的提交信息
   */
  static async getRecentCommitMessages(
    svnPath: string,
    repositoryPath: string
  ) {
    const repositoryCommitMessages: string[] = [];
    const userCommitMessages: string[] = [];

    try {
      // Last 5 commit messages (repository)
      const logCommand = `"${svnPath}" log -l 5 "${repositoryPath}"`;
      const { stdout: logOutput } = await this.execCommand(
        logCommand,
        repositoryPath
      );
      repositoryCommitMessages.push(...this.parseSvnLog(logOutput.toString()));

      // Last 5 commit messages (user)
      const { stdout: user } = await this.execCommand(
        `"${svnPath}" info --show-item last-changed-author "${repositoryPath}"`,
        repositoryPath
      );
      const author = user.toString().trim();

      if (author) {
        const userLogCommand = `"${svnPath}" log -l 5 -r HEAD:1 --search "${author}" "${repositoryPath}"`;
        const { stdout: userLogOutput } = await this.execCommand(
          userLogCommand,
          repositoryPath
        );
        userCommitMessages.push(...this.parseSvnLog(userLogOutput.toString()));
      }
    } catch (err) {
      console.error("Failed to get recent SVN commit messages:", err);
    }

    return { repository: repositoryCommitMessages, user: userCommitMessages };
  }

  // duplicate helper removed: use SCMClipboard directly where needed

  // duplicate helper removed: use SCMPathHandler.parseFileStatus with UnifiedDiffProcessor

  /**
   * 查找SVN根目录，通过向上递归查找包含.svn目录的最高层目录
   * @param startPath - 开始查找的路径
   * @returns SVN根目录路径，如果未找到则返回undefined
   */
  static async findSvnRoot(startPath: string): Promise<string | undefined> {
    let currentPath = startPath;

    while (currentPath !== path.parse(currentPath).root) {
      if (await this.isValidSvnDir(currentPath)) {
        const parentPath = path.dirname(currentPath);
        // 如果父目录也是SVN目录，继续向上查找
        if (await this.isValidSvnDir(parentPath)) {
          currentPath = parentPath;
          continue;
        }
        return currentPath;
      }
      currentPath = path.dirname(currentPath);
    }
    return undefined;
  }

  /**
   * 检查目录是否为有效的SVN目录
   * @param dirPath - 要检查的目录路径
   * @returns 如果是有效的SVN目录则返回true
   */
  private static async isValidSvnDir(dirPath: string): Promise<boolean> {
    try {
      const svnPath = path.join(dirPath, ".svn");
      const wcDbPath = path.join(svnPath, "wc.db");
      const entriesPath = path.join(svnPath, "entries");

      // 检查.svn目录是否存在
      const hasSvnDir = await fs.promises
        .stat(svnPath)
        .then((stat) => stat.isDirectory())
        .catch(() => false);
      if (!hasSvnDir) {
        return false;
      }

      // 检查是否存在wc.db或entries文件
      const hasWcDb = await fs.promises
        .stat(wcDbPath)
        .then((stat) => stat.isFile())
        .catch(() => false);
      const hasEntries = await fs.promises
        .stat(entriesPath)
        .then((stat) => stat.isFile())
        .catch(() => false);

      return hasWcDb || hasEntries;
    } catch {
      return false;
    }
  }

  /**
   * 获取SVN日志的简化版本
   * @param workspacePath - 工作区路径
   * @param limit - 日志条数限制
   * @param author - 作者过滤
   * @returns 日志内容
   */
  static async getSvnLog(
    workspacePath: string,
    limit: number = 10,
    author?: string
  ): Promise<string[]> {
    try {
      const svnPath = await this.getSvnPath();
      const authorParam = author ? ` --search="${author}"` : "";
      const command = `"${svnPath}" log -l ${limit}${authorParam} "${workspacePath}"`;

      const { stdout } = await this.execCommand(command, workspacePath);
      return this.parseSvnLog(stdout);
    } catch (error) {
      this.log(this.LogLevel.Error, "获取SVN日志失败:", error);
      return [];
    }
  }

  /**
   * 通过svn info命令获取最后修改的作者
   * @param workspacePath - 工作区路径
   * @returns 作者名称，如果获取失败则返回undefined
   */
  static async getSvnAuthorFromInfo(
    workspacePath: string
  ): Promise<string | undefined> {
    try {
      const svnPath = await this.getSvnPath();
      const { stdout } = await this.execCommand(
        `"${svnPath}" info`,
        workspacePath
      );
      const authorMatch = stdout.match(
        new RegExp(`${getMessage("svn.lastModifiedAuthor")} (.+)`)
      );
      return authorMatch?.[1]?.trim();
    } catch (error) {
      this.log(this.LogLevel.Error, "从info获取SVN作者失败:", error);
      return undefined;
    }
  }

  /**
   * 从SVN日志中获取作者信息
   * @param workspacePath - 工作区路径
   * @returns 作者名称，如果未找到则返回undefined
   */
  static async getSvnAuthorFromLog(
    workspacePath: string
  ): Promise<string | undefined> {
    try {
      const svnPath = await this.getSvnPath();
      const { stdout } = await this.execCommand(
        `"${svnPath}" log -l 1 --quiet`,
        workspacePath
      );

      // 解析日志获取作者信息
      const authorMatch = stdout.match(/r\d+ \| ([^|]+) \|/);
      return authorMatch?.[1]?.trim();
    } catch (error) {
      this.log(this.LogLevel.Error, "从日志获取SVN作者失败:", error);
      return undefined;
    }
  }
}
