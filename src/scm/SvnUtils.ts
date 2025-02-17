import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { getMessage, formatMessage } from "../utils/i18n";

const execAsync = promisify(exec);

// 添加日志工具类
const enum LogLevel {
  Info,
  Warning,
  Error,
}

class Logger {
  static log(level: LogLevel, message: string, ...args: any[]) {
    switch (level) {
      case LogLevel.Info:
        if (process.env.NODE_ENV !== "production") {
          console.log(message, ...args);
        }
        break;
      case LogLevel.Warning:
        console.warn(message, ...args);
        break;
      case LogLevel.Error:
        console.error(message, ...args);
        break;
    }
  }
}

interface SvnConfig {
  svnPath?: string;
  environmentConfig: {
    path: string[];
    locale: string;
  };
}

const DEFAULT_CONFIG: SvnConfig = {
  environmentConfig: {
    path: ["/usr/local/bin", "/opt/homebrew/bin"],
    locale: "en_US.UTF-8",
  },
};

/**
 * SVN工具类，提供SVN相关操作的实用方法
 * 包含获取作者信息、查找SVN根目录等功能
 */
export class SvnUtils {
  private static config: SvnConfig;
  private static svnPath: string = "svn";
  private static initialized: boolean = false;

  /**
   * 初始化SVN工具类,加载配置
   */
  private static async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // 加载配置
      this.config = await this.loadConfig();

      // 设置SVN路径
      this.svnPath = await this.getSvnPath();

      // 验证SVN是否可执行
      const { stdout } = await execAsync(`"${this.svnPath}" --version`);
      Logger.log(LogLevel.Info, "SVN version:", stdout.split("\n")[0]);

      this.initialized = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      Logger.log(LogLevel.Error, "Failed to initialize SVN:", message);
      throw new Error(formatMessage("svn.initialization.failed", [message]));
    }
  }

  /**
   * 加载SVN配置
   */
  private static async loadConfig(): Promise<SvnConfig> {
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
      Logger.log(LogLevel.Error, "Failed to load SVN config:", error);
      throw new Error(formatMessage("svn.config.load.failed", [error]));
    }
  }

  /**
   * 获取SVN可执行文件路径
   */
  private static async getSvnPath(): Promise<string> {
    try {
      // 1. 检查SVN插件配置
      const svnConfig = vscode.workspace.getConfiguration("svn");
      const svnPluginPath = svnConfig.get<string>("path");
      if (svnPluginPath) {
        Logger.log(
          LogLevel.Info,
          "Using SVN path from SVN plugin config:",
          svnPluginPath
        );
        return svnPluginPath;
      }

      // 2. 检查自定义配置
      if (this.config.svnPath) {
        Logger.log(
          LogLevel.Info,
          "Using SVN path from custom config:",
          this.config.svnPath
        );
        return this.config.svnPath;
      }

      // 3. 自动检测
      const { stdout } = await execAsync("which svn");
      const detectedPath = stdout.trim();
      if (detectedPath) {
        Logger.log(LogLevel.Info, "Detected SVN path:", detectedPath);
        return detectedPath;
      }

      // 4. 使用默认路径
      const defaultPath = "/opt/homebrew/bin/svn";
      Logger.log(LogLevel.Warning, "Using default SVN path:", defaultPath);
      return defaultPath;
    } catch (error) {
      Logger.log(LogLevel.Error, "Failed to determine SVN path:", error);
      throw new Error(getMessage("svn.path.not.found"));
    }
  }

  /**
   * 获取环境配置
   */
  private static getEnvironmentConfig() {
    if (!this.config?.environmentConfig) {
      throw new Error(getMessage("svn.invalid.env.config"));
    }
    return {
      ...process.env,
      PATH: `${process.env.PATH}:${this.config.environmentConfig.path.join(
        ":"
      )}`,
      LC_ALL: this.config.environmentConfig.locale,
    };
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
      await this.initialize();
      const { stdout } = await execAsync(`"${this.svnPath}" info`, {
        cwd: workspacePath,
        env: this.getEnvironmentConfig(),
      });
      const authorMatch = stdout.match(
        new RegExp(`${getMessage("svn.lastModifiedAuthor")} (.+)`)
      );
      return authorMatch?.[1]?.trim();
    } catch (error) {
      Logger.log(LogLevel.Error, "Failed to get SVN author from info:", error);
      return undefined;
    }
  }

  /**
   * 通过svn auth命令获取认证信息中的用户名
   * @param workspacePath - 工作区路径
   * @returns 用户名，如果获取失败则返回undefined
   */
  static async getSvnAuthorFromAuth(
    workspacePath: string
  ): Promise<string | undefined> {
    try {
      await this.initialize();
      const { stdout: authOutput } = await execAsync(`"${this.svnPath}" auth`, {
        cwd: workspacePath,
        env: this.getEnvironmentConfig(),
      });
      const { stdout: urlOutput } = await execAsync(`"${this.svnPath}" info`, {
        cwd: workspacePath,
        env: this.getEnvironmentConfig(),
      });
      console.log("authOutput", authOutput);
      console.log("urlOutput", urlOutput);
      const parsedAuthor = this.parseAuthOutput(authOutput, urlOutput);
      console.log("Parsed Author:", parsedAuthor);

      return parsedAuthor;
    } catch (error) {
      Logger.log(LogLevel.Error, "Failed to get SVN author from auth:", error);
      return undefined;
    }
  }

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
   * 解析svn auth和svn info的输出，获取匹配的用户名
   * @param authOutput - svn auth命令的输出
   * @param urlOutput - svn info命令的输出
   * @returns 匹配的用户名，如果未找到则返回undefined
   */
  private static parseAuthOutput(
    authOutput: string,
    urlOutput: string
  ): string | undefined {
    const credentials = this.parseCredentials(authOutput);
    // 从svn info输出中提取URL
    const urlMatch = urlOutput.match(/URL: (.+)/);

    if (urlMatch) {
      const repoUrl = urlMatch[1].trim();
      const matchingCred = this.findMatchingCredential(credentials, repoUrl);
      if (matchingCred) {
        return matchingCred;
      }
    }

    // 如果没有匹配的认证信息，返回第一个用户名
    return credentials[0]?.username ?? undefined;
  }

  private static parseCredentials(authOutput: string) {
    return authOutput
      .split(/\n{2,}/) // 根据两个或更多换行符分割块
      .filter((block) => block.trim())
      .map((block) => {
        const lines = block.split("\n");
        let username = null;
        let realm = null;

        for (const line of lines) {
          const usernameMatch = line.match(/Username: (.+)/);
          const realmMatch = line.match(/Authentication realm: <([^>]+)>/);

          if (usernameMatch) {
            username = usernameMatch[1].trim();
          }
          if (realmMatch) {
            realm = realmMatch[1].trim();
          }
        }

        return { username, realm };
      })
      .filter((cred) => cred.username && cred.realm);
  }

  private static findMatchingCredential(
    credentials: any[],
    repoUrl: string
  ): string | undefined {
    try {
      const repoHost = this.extractHostWithoutPort(repoUrl);
      Logger.log(LogLevel.Info, "Repository URL:", repoUrl);
      Logger.log(LogLevel.Info, "Repository host:", repoHost);

      for (const cred of credentials) {
        const credHost = this.extractHostWithoutPort(cred.realm);
        Logger.log(LogLevel.Info, "Checking credential:", {
          realm: cred.realm,
          host: credHost,
          username: cred.username,
        });

        // 检查主机名是否匹配
        if (credHost && credHost === repoHost) {
          Logger.log(
            LogLevel.Info,
            "Found matching credential:",
            cred.username
          );
          return cred.username;
        }
      }

      // 如果没有找到匹配的凭证，返回第一个可用的用户名
      if (credentials.length > 0) {
        Logger.log(
          LogLevel.Warning,
          "No matching credential found, using first available:",
          credentials[0].username
        );
        return credentials[0].username;
      }

      Logger.log(LogLevel.Warning, "No credentials found");
      return undefined;
    } catch (e) {
      Logger.log(LogLevel.Error, "Error in findMatchingCredential:", e);
      return credentials[0]?.username;
    }
  }

  private static extractHostWithoutPort(url: string): string {
    if (!url) {
      return "";
    }

    Logger.log(LogLevel.Info, "Extracting host from URL:", url);

    try {
      // 移除协议部分
      let hostPart = url.replace(/^(svn|http|https):\/\//, "");

      // 获取第一个斜杠或冒号之前的部分
      hostPart = hostPart.split(/[/:]/)[0];

      if (hostPart) {
        Logger.log(LogLevel.Info, "Extracted host:", hostPart);
        return hostPart;
      }
    } catch (e) {
      Logger.log(LogLevel.Error, "Error extracting host:", e);
    }

    return "";
  }

  /**
   * 执行SVN命令前验证认证状态
   * @param workspacePath - 工作区路径
   * @throws 如果认证失败则抛出错误
   */
  private static async validateAuth(workspacePath: string): Promise<void> {
    try {
      await this.initialize();
      await execAsync(`"${this.svnPath}" info`, {
        cwd: workspacePath,
        env: this.getEnvironmentConfig(),
      });
    } catch (error) {
      // 如果出现认证错误，提示用户
      if (
        error instanceof Error &&
        (error.message.includes("E170001") || error.message.includes("E170013"))
      ) {
        // 尝试触发SVN认证
        try {
          await this.triggerAuth(workspacePath);
        } catch (authError) {
          throw new Error(getMessage("svn.auth.required"));
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * 触发SVN认证流程
   * @param workspacePath - 工作区路径
   */
  private static async triggerAuth(workspacePath: string): Promise<void> {
    // 显示认证提示
    const choice = await vscode.window.showErrorMessage(
      getMessage("svn.auth.required"),
      getMessage("svn.auth.button")
    );

    if (choice === getMessage("svn.auth.button")) {
      // 执行svn命令触发认证对话框
      await execAsync(`"${this.svnPath}" info`, {
        cwd: workspacePath,
        env: this.getEnvironmentConfig(),
      });
    } else {
      throw new Error(getMessage("svn.auth.cancelled"));
    }
  }

  /**
   * 执行SVN命令的通用方法
   * @param command - SVN命令
   * @param workspacePath - 工作区路径
   * @param retryCount - 重试次数
   * @returns 命令输出
   */
  private static async executeSvnCommand(
    command: string,
    workspacePath: string,
    retryCount: number = 1
  ): Promise<string> {
    try {
      await this.validateAuth(workspacePath);
      const { stdout } = await execAsync(command, {
        cwd: workspacePath,
        env: this.getEnvironmentConfig(),
      });
      return stdout;
    } catch (error) {
      if (retryCount > 0 && error instanceof Error) {
        // 如果是认证错误且还有重试次数，则重试
        if (
          error.message.includes("E170001") ||
          error.message.includes("E170013")
        ) {
          await this.validateAuth(workspacePath);
          return this.executeSvnCommand(command, workspacePath, retryCount - 1);
        }
      }
      throw error;
    }
  }

  /**
   * 获取SVN日志
   * @param workspacePath - 工作区路径
   * @param dateRange - 日期范围
   * @param author - 作者
   * @returns XML格式的日志内容
   */
  public static async getSvnLog(
    workspacePath: string,
    dateRange: { start: string; end: string },
    author?: string
  ): Promise<string> {
    const searchParam = author ? ` --search="${author}"` : "";
    const command = `"${this.svnPath}" log -r "{${dateRange.start}}:{${dateRange.end}}"${searchParam} --xml`;

    return this.executeSvnCommand(command, workspacePath, 2);
  }
}
