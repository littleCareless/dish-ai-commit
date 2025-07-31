import * as vscode from "vscode";
import { ISCMProvider } from "./scm-provider";
import { promisify } from "util";
import * as childProcess from "child_process";
import * as fs from "fs";
import * as path from "path";
import { getMessage, formatMessage } from "../utils/i18n";
import { DiffProcessor } from "../utils/diff/diff-processor";
import { DiffSimplifier } from "../utils";
import { notify } from "../utils/notification/notification-manager";
import { ConfigurationManager } from "../config/configuration-manager";

const exec = promisify(childProcess.exec);

/**
 * SVN API接口定义
 */
interface SvnAPI {
  repositories: SvnRepository[];
  getAPI(version: number): SvnAPI;
}

/**
 * SVN仓库接口定义
 */
export interface SvnRepository {
  readonly rootUri: vscode.Uri;
  inputBox: {
    value: string;
  };
  commitFiles(files: string[], message: string): Promise<void>;
}

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
const isValidSvnPath = async (svnPath: string): Promise<boolean> => {
  if (!fs.existsSync(svnPath)) {
    return false;
  }
  try {
    // The --version command is a reliable way to check if it's a valid SVN executable
    await exec(`"${svnPath}" --version`);
    return true;
  } catch (error) {
    Logger.log(
      LogLevel.Info,
      `Path validation failed for ${svnPath}:`,
      error instanceof Error ? error.message : error
    );
    return false;
  }
};

const findSvnExecutable = async (): Promise<string | null> => {
  // 1. Try system command first ('where' on Windows, 'which' on others)
  const command = process.platform === "win32" ? "where svn" : "which svn";
  try {
    const { stdout } = await exec(command);
    const lines = stdout.trim().split("\n");
    for (const line of lines) {
      const p = line.trim();
      if (p && (await isValidSvnPath(p))) {
        return p;
      }
    }
  } catch (error) {
    Logger.log(
      LogLevel.Info,
      `'${command}' command failed, checking common paths.`
    );
  }

  // 2. Check common installation paths for different OS
  const potentialPaths: string[] = [];
  if (process.platform === "win32") {
    const programFiles = process.env["ProgramFiles"] || "C:\\Program Files";
    const programFilesX86 =
      process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    potentialPaths.push(
      path.join(programFiles, "TortoiseSVN", "bin", "svn.exe"),
      path.join(programFilesX86, "TortoiseSVN", "bin", "svn.exe"),
      path.join(programFiles, "SlikSvn", "bin", "svn.exe"),
      path.join(programFiles, "VisualSVN Server", "bin", "svn.exe")
    );
  } else if (process.platform === "darwin") {
    // macOS paths (Intel and Apple Silicon)
    potentialPaths.push(
      "/usr/bin/svn",
      "/usr/local/bin/svn",
      "/opt/homebrew/bin/svn", // Homebrew on Apple Silicon
      "/opt/local/bin/svn" // MacPorts
    );
  } else {
    // Linux paths
    potentialPaths.push("/usr/bin/svn", "/usr/local/bin/svn");
  }

  for (const p of potentialPaths) {
    if (await isValidSvnPath(p)) {
      return p;
    }
  }

  return null;
};

const getSvnPath = async (caller?: string): Promise<string> => {
  Logger.log(
    LogLevel.Info,
    `[SVN-PATH] getSvnPath called ${caller ? `from ${caller}` : ""}`
  );
  // 1. 优先检查SVN插件配置
  const svnConfig = vscode.workspace.getConfiguration("svn");
  const svnPluginPath = svnConfig.get<string>("path");
  if (svnPluginPath && (await isValidSvnPath(svnPluginPath))) {
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
  if (customPath && (await isValidSvnPath(customPath))) {
    Logger.log(LogLevel.Info, "Using SVN path from custom config:", customPath);
    return customPath;
  }

  // 3. 自动检测
  const detectedPath = await findSvnExecutable();
  if (detectedPath) {
    Logger.log(LogLevel.Info, "Auto-detected SVN path:", detectedPath);
    return detectedPath;
  }

  // 4. 如果未找到，则抛出错误
  Logger.log(
    LogLevel.Error,
    "SVN executable not found in system PATH or common locations."
  );
  throw new Error(
    "Unable to locate SVN executable. Please ensure SVN is installed and in your system's PATH, or set the path in the extension settings."
  );
};

/**
 * SVN源代码管理提供者实现
 * @implements {ISCMProvider}
 */
export class SvnProvider implements ISCMProvider {
  /** 源代码管理类型标识符 */
  type = "svn" as const;

  /** SVN API实例 */
  private api: SvnAPI;

  /** SVN仓库集合 */
  private repositories: SvnRepository[];

  /** 可选的仓库路径 */
  private readonly repositoryPath?: string;

  /** 存储 SVN 路径 */
  private svnPath: string = "svn";

  private config: SvnConfig;
  private initialized: boolean = false;

  /**
   * 创建SVN提供者实例
   * @param svnExtension - VS Code SVN扩展实例
   * @throws {Error} 当未找到工作区时抛出错误
   */
  constructor(
    private readonly svnExtension: any,
    repositoryPath?: string
  ) {
    this.api = svnExtension.getAPI(1);
    this.repositories = this.api.repositories;
    this.repositoryPath = repositoryPath;

    if (!vscode.workspace.workspaceFolders?.length) {
      throw new Error(getMessage("workspace.not.found"));
    }

    this.config = this.loadConfig();

    // 构造函数现在只进行同步设置
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

  public async init(): Promise<void> {
    try {
      const svnPath = await getSvnPath("initialize");
      this.svnPath = svnPath;

      // 验证SVN可执行
      const { stdout } = await exec(`"${this.svnPath}" --version`);
      const version = stdout.split("\n")[0].trim();
      Logger.log(LogLevel.Info, "SVN version:", version);
      notify.info("svn.version.detected", [version]);

      this.initialized = true;
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

      const api = this.svnExtension.getAPI(1);
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
      const repository = this.findRepository([file]);
      if (!repository) {
        return "Unknown"; // Or throw an error
      }
      const repositoryPath = repository.rootUri.fsPath;

      const { stdout: status } = await exec(
        `"${this.svnPath}" status "${file}"`,
        {
          cwd: repositoryPath,
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

      const repository = this.findRepository(files);
      if (!repository) {
        throw new Error(getMessage("svn.repository.not.found"));
      }
      const currentWorkspaceRoot = repository.rootUri.fsPath;

      const filePaths = files?.map((f) => `"${f}"`).join(" ") || "";
      const command = `"${this.svnPath}" diff ${filePaths}`;

      const { stdout: rawDiff } = await exec(command, {
        cwd: currentWorkspaceRoot,
        maxBuffer: 1024 * 1024 * 10,
        env: this.getEnvironmentConfig(),
      });

      if (!rawDiff.trim()) {
        throw new Error(getMessage("diff.noChanges"));
      }

      // 获取配置
      const configManager = ConfigurationManager.getInstance();
      const enableSimplification = configManager.getConfig(
        "FEATURES_CODEANALYSIS_SIMPLIFYDIFF"
      );

      // 根据配置决定是否显示警告和简化diff
      if (enableSimplification) {
        notify.warn("diff.simplification.warning");
        return DiffSimplifier.simplify(rawDiff);
      }

      // 如果未启用简化，直接返回原始diff
      return DiffProcessor.process(rawDiff, "svn");
    } catch (error) {
      Logger.log(LogLevel.Error, "SVN diff failed:", error);
      if (error instanceof Error) {
        notify.error("git.diff.failed", [error.message]);
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
    const repository = this.findRepository(files);
    if (!repository) {
      throw new Error(getMessage("svn.repository.not.found"));
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
    const repository = this.findRepository();
    if (repository?.inputBox) {
      repository.inputBox.value = message;
    } else {
      try {
        await vscode.env.clipboard.writeText(message);
        notify.info("commit.message.copied");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        notify.error("commit.message.copy.failed", [errorMessage]);
        notify.info("commit.message.manual.copy", [message]);
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
      throw new Error(getMessage("svn.repository.not.found"));
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
    const repository = this.findRepository();
    if (repository?.inputBox) {
      repository.inputBox.value = message;
    } else {
      try {
        await vscode.env.clipboard.writeText(message);
        notify.info("commit.message.copied");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        notify.error("commit.message.copy.failed", [errorMessage]);
        notify.info("commit.message.manual.copy", [message]);
      }
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
    const repository = this.findRepository();
    if (!repository) {
      throw new Error(getMessage("svn.repository.not.found"));
    }
    const currentWorkspaceRoot = repository.rootUri.fsPath;

    try {
      let commandArgs = "";
      // TODO: 从配置中读取 commitLogLimit，如果用户未配置，则使用默认值
      const limit =
        vscode.workspace
          .getConfiguration("svn-commit-gen")
          .get<number>("commitLogLimit") || 20;

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

      const command = `"${this.svnPath}" log ${commandArgs} "${currentWorkspaceRoot}"`;
      Logger.log(LogLevel.Info, `Executing SVN log command: ${command}`);

      const { stdout } = await exec(command, {
        cwd: currentWorkspaceRoot,
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
      const entries = rawLog.split(
        /^------------------------------------------------------------------------$/m
      );

      for (const rawEntry of entries) {
        const entry = rawEntry.trim();
        if (!entry) {
          continue;
        }

        const lines = entry.split("\n");
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
          const message = lines.slice(messageStartIndex).join("\n").trim();
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
        notify.error("svn.log.failed", [error.message]);
      }
      return []; // 类似 git-provider，在错误时返回空数组
    }
  }

  async getRecentCommitMessages() {
    const repositoryCommitMessages: string[] = [];
    const userCommitMessages: string[] = [];
    const repository = this.findRepository();
    if (!repository) {
      return { repository: [], user: [] };
    }
    const currentWorkspaceRoot = repository.rootUri.fsPath;

    try {
      // Last 5 commit messages (repository)
      const logCommand = `"${this.svnPath}" log -l 5 "${currentWorkspaceRoot}"`;
      const { stdout: logOutput } = await exec(logCommand, {
        cwd: currentWorkspaceRoot,
        env: this.getEnvironmentConfig(),
      });
      repositoryCommitMessages.push(...this.parseSvnLog(logOutput));

      // Last 5 commit messages (user)
      const { stdout: user } = await exec(
        `"${this.svnPath}" info --show-item last-changed-author "${currentWorkspaceRoot}"`
      );
      const author = user.trim();

      if (author) {
        const userLogCommand = `"${this.svnPath}" log -l 5 -r HEAD:1 --search "${author}" "${currentWorkspaceRoot}"`;
        const { stdout: userLogOutput } = await exec(userLogCommand, {
          cwd: currentWorkspaceRoot,
          env: this.getEnvironmentConfig(),
        });
        userCommitMessages.push(...this.parseSvnLog(userLogOutput));
      }
    } catch (err) {
      console.error("Failed to get recent SVN commit messages:", err);
    }

    return { repository: repositoryCommitMessages, user: userCommitMessages };
  }

  private parseSvnLog(log: string): string[] {
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
   * 将提交信息复制到剪贴板
   * @param message 要复制的提交信息
   */
  async copyToClipboard(message: string): Promise<void> {
    try {
      await vscode.env.clipboard.writeText(message);
      notify.info("commit.message.copied");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      notify.error("commit.message.copy.failed", [errorMessage]);
    }
  }

  /**
   * 根据文件路径或当前上下文找到最匹配的SVN仓库。
   * @param filePaths - 可选的文件路径数组，用于精确定位仓库。
   * @returns {SvnRepository | undefined} 匹配的SVN仓库实例。
   * @private
   */
  private findRepository(filePaths?: string[]): SvnRepository | undefined {
    const { repositories } = this;

    if (!repositories.length) {
      return undefined;
    }

    // 1. 如果在构造时提供了特定的仓库路径，优先使用它
    if (this.repositoryPath) {
      const specificRepo = repositories.find(
        (repo) => repo.rootUri.fsPath === this.repositoryPath
      );
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
          if (uri.fsPath.startsWith(repo.rootUri.fsPath)) {
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
        if (activeFileUri.fsPath.startsWith(repo.rootUri.fsPath)) {
          return repo;
        }
      }
    }

    // 4. 如果上述都找不到，返回第一个仓库作为备选
    return repositories[0];
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
