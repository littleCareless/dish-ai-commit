import * as vscode from "vscode";
import { ISCMProvider } from "./SCMProvider";
import { promisify } from "util";
import * as childProcess from "child_process";
import { DiffSimplifier } from "../utils/diff/DiffSimplifier";
import { getMessage, formatMessage } from "../utils/i18n";

const exec = promisify(childProcess.exec);

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
        // 可以根据环境配置是否输出info级别日志
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

// 默认配置
const DEFAULT_CONFIG: SvnConfig = {
  environmentConfig: {
    path: ["/usr/local/bin", "/opt/homebrew/bin"],
    locale: "en_US.UTF-8",
  },
};

// 添加 SVN 路径检测
const getSvnPath = async (): Promise<string> => {
  try {
    // 1. 优先检查SVN插件配置
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
    const customConfig = vscode.workspace.getConfiguration("svn-commit-gen");
    const customPath = customConfig.get<string>("svnPath");
    if (customPath) {
      Logger.log(
        LogLevel.Info,
        "Using SVN path from custom config:",
        customPath
      );
      return customPath;
    }

    // 3. 自动检测
    const { stdout } = await exec("which svn");
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
    throw new Error("Unable to locate SVN executable");
  }
};

/**
 * SVN源代码管理提供者实现
 * @implements {ISCMProvider}
 */
export class SvnProvider implements ISCMProvider {
  /** 源代码管理类型标识符 */
  type = "svn" as const;

  /** SVN API实例 */
  private api: any;

  /** 工作区根目录路径 */
  private workspaceRoot: string;

  /** SVN仓库集合 */
  private repositories: any;

  /** 存储 SVN 路径 */
  private svnPath: string = "svn";

  private config: SvnConfig;
  private initialized: boolean = false;

  /**
   * 创建SVN提供者实例
   * @param svnExtension - VS Code SVN扩展实例
   * @throws {Error} 当未找到工作区时抛出错误
   */
  constructor(private readonly svnExtension: any) {
    this.api = svnExtension;
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      throw new Error(getMessage("workspace.not.found"));
    }
    this.workspaceRoot = workspaceRoot;

    // 初始化时设置 SVN 路径
    getSvnPath().then((path) => {
      this.svnPath = path;
    });

    // 加载配置
    this.config = this.loadConfig();

    // 同步初始化
    this.initialize();
  }

  private loadConfig(): SvnConfig {
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

  private async initialize() {
    try {
      const svnPath = await getSvnPath();
      this.svnPath = svnPath;
      this.initialized = true;

      // 验证SVN可执行
      const { stdout } = await exec(`"${this.svnPath}" --version`);
      Logger.log(LogLevel.Info, "SVN version:", stdout.split("\n")[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      Logger.log(LogLevel.Error, "Failed to initialize SVN:", message);
      throw new Error(formatMessage("svn.initialization.failed", [message]));
    }
  }

  private async detectSvnPath(): Promise<string | null> {
    try {
      const { stdout } = await exec("which svn");
      const path = stdout.trim();
      Logger.log(LogLevel.Info, "Detected SVN path:", path);
      return path;
    } catch (error) {
      Logger.log(
        LogLevel.Warning,
        formatMessage("svn.path.detection.failed", [error])
      );
      return null;
    }
  }

  private getEnvironmentConfig() {
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
   * 检查SVN是否可用
   * @returns {Promise<boolean>} 如果SVN可用返回true,否则返回false
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (!this.svnExtension?.getAPI) {
        return false;
      }

      const api = this.svnExtension.getAPI();
      const repositories = api.repositories;
      if (repositories.length > 0) {
        this.api = api;
        this.repositories = repositories;
        return true;
      }
      return false;
    } catch (error) {
      console.error(
        "SVN availability check failed:",
        error instanceof Error ? error.message : error
      );
      return false;
    }
  }

  /**
   * 获取文件状态
   * @param {string} file - 文件路径
   * @returns {Promise<string>} 返回文件状态描述
   * @private
   */
  private async getFileStatus(file: string): Promise<string> {
    try {
      if (!this.initialized) {
        throw new Error(getMessage("svn.not.initialized"));
      }

      const { stdout: status } = await exec(
        `"${this.svnPath}" status "${file}"`,
        {
          cwd: this.workspaceRoot,
          env: this.getEnvironmentConfig(),
        }
      );

      if (!status) {
        return "Unknown";
      }

      if (status.startsWith("?")) {
        return "New File";
      }
      if (status.startsWith("D")) {
        return "Deleted File";
      }
      return "Modified File";
    } catch (error) {
      Logger.log(LogLevel.Error, "Failed to get file status:", error);
      return "Unknown";
    }
  }

  /**
   * 获取文件差异信息
   * @param {string[]} [files] - 可选的文件路径数组,如果不提供则获取所有更改的差异
   * @returns {Promise<string | undefined>} 返回差异文本,如果没有差异则返回undefined
   * @throws {Error} 当执行diff命令失败时抛出错误
   */
  async getDiff(files?: string[]): Promise<string | undefined> {
    try {
      if (!this.initialized) {
        throw new Error(getMessage("svn.not.initialized"));
      }

      let diffOutput = "";

      if (files && files.length > 0) {
        for (const file of files) {
          Logger.log(LogLevel.Info, "Processing file:", file);
          const fileStatus = await this.getFileStatus(file);
          const escapedFile = file.replace(/"/g, '\\"');

          // 对于删除的文件不获取diff内容
          if (fileStatus === "Deleted File") {
            diffOutput += `\n=== ${fileStatus}: ${file} ===\n`;
            continue;
          }
          console.log("escapedFile", escapedFile);
          const { stdout } = await exec(
            `"${this.svnPath}" diff "${escapedFile}"`,
            {
              cwd: this.workspaceRoot,
              maxBuffer: 1024 * 1024 * 10,
              env: this.getEnvironmentConfig(),
            }
          );

          if (stdout.trim()) {
            diffOutput += `\n=== ${fileStatus}: ${file} ===\n${stdout}`;
          }
        }
      } else {
        const { stdout } = await exec(`"${this.svnPath}" diff`, {
          cwd: this.workspaceRoot,
          maxBuffer: 1024 * 1024 * 10,
          env: this.getEnvironmentConfig(),
        });
        diffOutput = stdout;
      }

      if (!diffOutput.trim()) {
        throw new Error(getMessage("diff.noChanges"));
      }

      // 获取配置
      const config = vscode.workspace.getConfiguration("dish-ai-commit");
      const enableSimplification = config.get<boolean>(
        "features.codeAnalysis.simplifyDiff"
      );

      // 根据配置决定是否显示警告和简化diff
      if (enableSimplification) {
        vscode.window.showWarningMessage(
          getMessage("diff.simplification.warning")
        );
        return DiffSimplifier.simplify(diffOutput);
      }

      // 如果未启用简化，直接返回原始diff
      return diffOutput;
    } catch (error) {
      Logger.log(LogLevel.Error, "SVN diff failed:", error);
      if (error instanceof Error) {
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
   * @throws {Error} 当提交失败或未选择文件时抛出错误
   */
  async commit(message: string, files?: string[]): Promise<void> {
    const repository = this.api?.repositories?.[0];
    if (!repository) {
      throw new Error(getMessage("git.repository.not.found"));
    }

    try {
      if (!files?.length) {
        throw new Error(getMessage("svn.no.files.selected"));
      }
      await repository.commitFiles(files, message);
    } catch (error) {
      console.error(
        "SVN commit failed:",
        error instanceof Error ? error.message : error
      );
      throw new Error(formatMessage("svn.commit.failed", [error]));
    }
  }

  /**
   * 设置提交输入框的内容
   * @param {string} message - 要设置的提交信息
   * @throws {Error} 当未找到仓库时抛出错误
   */
  async setCommitInput(message: string): Promise<void> {
    const repository = this.api?.repositories?.[0];
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
    const repository = this.api?.repositories?.[0];
    if (!repository) {
      throw new Error(getMessage("git.repository.not.found"));
    }

    return repository.inputBox.value;
  }
}
