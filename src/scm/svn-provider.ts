import * as vscode from "vscode";
import { ISCMProvider } from "./scm-provider";
import { promisify } from "util";
import * as childProcess from "child_process";
import { DiffSimplifier } from "../utils/diff/diff-simplifier";
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

  /**
   * 开始流式设置提交输入框的内容。
   * 根据ISCMProvider接口，此方法接收完整消息并设置。
   * @param {string} message - 要设置的提交信息
   * @throws {Error} 当未找到仓库或inputBox时抛出错误
   */
  async startStreamingInput(message: string): Promise<void> {
    const repository = this.api?.repositories?.[0];
    if (!repository) {
      throw new Error(getMessage("git.repository.not.found")); // 保持与现有代码一致，理想情况下应为 SVN 特定消息
    }
    if (repository.inputBox) {
      repository.inputBox.value = message;
      // 如果需要，可以确保输入框是启用的，但SVN插件的inputBox.enabled行为可能不一致
      // if (typeof repository.inputBox.enabled === 'boolean') {
      //   repository.inputBox.enabled = true;
      // }
    } else {
      Logger.log(LogLevel.Error, "SVN repository.inputBox is undefined. Cannot set streaming input.");
      throw new Error("SVN inputBox is not available to set streaming input.");
    }
  }

  /**
   * 获取提交日志 (占位符实现)
   * @param baseBranch - 基础分支 (SVN中通常不直接使用此概念进行日志比较)
   * @param headBranch - 当前分支 (SVN中通常不直接使用此概念进行日志比较)
   * @returns 返回一个空数组，因为SVN的日志获取逻辑与Git不同，此处仅为满足接口要求
   */
  async getCommitLog(
    baseRevisionInput?: string, // 对应 GitProvider 中的 baseBranch，代表较旧的修订
    headRevisionInput: string = "HEAD" // 对应 GitProvider 中的 headBranch，代表较新的修订，默认为 HEAD
  ): Promise<string[]> {
    if (!this.initialized) {
      throw new Error(getMessage("svn.not.initialized"));
    }

    try {
      let commandArgs = "";
      // TODO: 从配置中读取 commitLogLimit，如果用户未配置，则使用默认值
      const limit = vscode.workspace.getConfiguration("svn-commit-gen").get<number>("commitLogLimit") || 20;

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

      const command = `"${this.svnPath}" log ${commandArgs} "${this.workspaceRoot}"`;
      Logger.log(LogLevel.Info, `Executing SVN log command: ${command}`);

      const { stdout } = await exec(command, {
        cwd: this.workspaceRoot,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        env: this.getEnvironmentConfig(),
      });

      if (!stdout.trim()) {
        return [];
      }

      // 解析 SVN log 输出
      const rawLog = stdout;
      const commitMessages: string[] = [];
      // SVN 日志条目由 "------------------------------------------------------------------------" 分隔
      // 使用正则表达式确保正确分割，并处理多行情况
      const entries = rawLog.split(/^------------------------------------------------------------------------$/m);

      for (const rawEntry of entries) {
        const entry = rawEntry.trim();
        if (!entry) {
          continue;
        }

        const lines = entry.split('\n');
        // 第一行应该是修订版本头信息 (例如: r123 | author | date | N lines)
        if (lines.length === 0 || !lines[0].match(/^r\d+\s+\|/)) {
          continue; // 不是有效的日志条目头
        }

        // 确定实际提交信息的起始行
        let messageStartIndex = 1; // 假设信息在头信息之后的第一行
        if (lines.length > 1 && lines[messageStartIndex].trim() === "") {
          messageStartIndex++; // 如果头信息后是空行，则跳过空行
        }

        if (messageStartIndex < lines.length) {
          const message = lines.slice(messageStartIndex).join('\n').trim();
          if (message) {
            commitMessages.push(message);
          }
        }
      }
      // `svn log -r NEWER:OLDER` 或 `svn log -l LIMIT` 通常已经是最新优先，无需反转
      return commitMessages;

    } catch (error) {
      Logger.log(LogLevel.Error, "SVN log failed:", error);
      if (error instanceof Error) {
        // 确保 i18n 文件中有 "svn.log.failed" 键
        vscode.window.showErrorMessage(
          formatMessage("svn.log.failed", [error.message])
        );
      }
      return []; // 类似 git-provider，在错误时返回空数组
    }
  }

  // /**
  //  * 向提交输入框追加内容 (流式) - 在当前单方法流式模型下未使用
  //  * @param {string} chunk - 要追加的文本块
  //  * @throws {Error} 当未找到仓库或inputBox时抛出错误
  //  */
  // async appendStreamingInput(chunk: string): Promise<void> {
  //   const repository = this.api?.repositories?.[0];
  //   if (!repository) {
  //     throw new Error(getMessage("git.repository.not.found")); // 保持与现有代码一致
  //   }
  //   if (repository.inputBox) {
  //     repository.inputBox.value += chunk;
  //   } else {
  //     Logger.log(LogLevel.Error, "SVN repository.inputBox is undefined. Cannot append streaming input.");
  //     throw new Error("SVN inputBox is not available to append streaming input.");
  //   }
  // }
  //
  // /**
  //  * 完成流式设置提交输入框的内容 - 在当前单方法流式模型下未使用
  //  * 会启用输入框
  //  * @throws {Error} 当未找到仓库或inputBox时抛出错误
  //  */
  // async finishStreamingInput(): Promise<void> {
  //   const repository = this.api?.repositories?.[0];
  //   if (!repository) {
  //     throw new Error(getMessage("git.repository.not.found")); // 保持与现有代码一致
  //   }
  //   if (repository.inputBox && typeof repository.inputBox.enabled === 'boolean') {
  //     repository.inputBox.enabled = true;
  //   } else {
  //     // 如果 inputBox 或 enabled 属性不存在，记录警告
  //     Logger.log(LogLevel.Warning, "SVN repository.inputBox.enabled is not available or not a boolean. Cannot ensure input box is enabled.");
  //     if (!repository.inputBox) {
  //        Logger.log(LogLevel.Error, "SVN repository.inputBox is undefined. Cannot finish streaming input.");
  //        throw new Error("SVN inputBox is not available to finish streaming input.");
  //     }
  //   }
  // }
}
