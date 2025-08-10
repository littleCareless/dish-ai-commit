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
import { ImprovedPathUtils } from "./utils/improved-path-utils";

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
  rootUri: vscode.Uri;
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
  if (!ImprovedPathUtils.safeExists(svnPath)) {
    return false;
  }
  try {
    // The --version command is a reliable way to check if it's a valid SVN executable
    const escapedPath = ImprovedPathUtils.escapeShellPath(svnPath);
    await exec(`${escapedPath} --version`);
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
    const lines = stdout.toString().trim().split("\n");
    for (const line of lines) {
      const p = line.trim();
      if (p && (await isValidSvnPath(p))) {
        return ImprovedPathUtils.handleLongPath(p);
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
    const normalizedPath = ImprovedPathUtils.handleLongPath(p);
    if (await isValidSvnPath(normalizedPath)) {
      return normalizedPath;
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
  constructor(private readonly svnExtension: any, repositoryPath?: string) {
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
      const version = stdout.toString().split("\n")[0].trim();
      Logger.log(LogLevel.Info, "SVN version:", version);
      notify.info(formatMessage("scm.version.detected", ["SVN", version]));

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
      const path = stdout.toString().trim();
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
      PATH: `${process.env.PATH}${path.delimiter}${this.config.environmentConfig.path.join(
        path.delimiter
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
      const repoInfo = this._findRepositoryAndPath([file]);
      if (!repoInfo) {
        return "Unknown";
      }
      const { repository, repositoryPath } = repoInfo;

      const { stdout: status } = await exec(
        `"${this.svnPath}" status "${file}"`,
        {
          ...ImprovedPathUtils.createExecOptions(repositoryPath),
          env: this.getEnvironmentConfig(),
        }
      );

      if (!status) {
        return "Unknown";
      }

      const statusStr = status.toString();
      if (statusStr.startsWith("?")) {
        return "New File";
      }
      if (statusStr.startsWith("D")) {
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

      const repoInfo = this._findRepositoryAndPath(files);
      if (!repoInfo) {
        throw new Error(formatMessage("scm.repository.not.found", ["SVN"]));
      }
      const { repository, repositoryPath } = repoInfo;

      let diffOutput = "";

      if (files && files.length > 0) {
        notify.info(formatMessage("diff.files.selected", [files.length]));
        // 处理指定文件的差异
        for (const file of files) {
          const fileStatus = await this.getFileStatus(file);
          const escapedFile = ImprovedPathUtils.escapeShellPath(file);

          // 对于删除的文件不获取diff内容
          if (fileStatus === "Deleted File") {
            diffOutput += `\n=== ${fileStatus}: ${file} ===\n`;
            continue;
          }

          // 根据文件状态选择合适的diff命令
          let stdout = "";
          if (fileStatus === "New File") {
            // 处理未跟踪的新文件
            try {
              // 使用 ImprovedPathUtils 创建临时空文件用于比较
              const tempEmptyFile = ImprovedPathUtils.createTempFilePath("empty-file-for-diff");
              fs.writeFileSync(tempEmptyFile, "");

              const result = await exec(
                `"${this.svnPath}" diff --diff-cmd diff -x "-u" ${ImprovedPathUtils.escapeShellPath(tempEmptyFile)} ${escapedFile}`,
                ImprovedPathUtils.createExecOptions(repositoryPath)
              );
              stdout = result.stdout.toString();

              // 清理临时文件
              try {
                fs.unlinkSync(tempEmptyFile);
              } catch (e) {
                // 忽略清理错误
              }
            } catch (error) {
              // 如果外部diff命令失败，尝试使用内置diff
              if (error instanceof Error && "stdout" in error) {
                stdout = (error as any).stdout.toString();
              } else {
                // 回退到读取整个文件内容
                const fileContent = fs.readFileSync(file, "utf8");
                stdout = `--- /dev/null\n+++ ${file}\n@@ -0,0 +1,${
                  fileContent.split("\n").length
                } @@\n${fileContent
                  .split("\n")
                  .map((line) => `+${line}`)
                  .join("\n")}`;
              }
            }
          } else {
            // 处理已跟踪且修改的文件
            try {
              const result = await exec(
                `"${this.svnPath}" diff ${escapedFile}`,
                {
                  ...ImprovedPathUtils.createExecOptions(repositoryPath),
                  env: this.getEnvironmentConfig(),
                }
              );
              stdout = result.stdout.toString();
            } catch (error) {
              if (error instanceof Error && "stdout" in error) {
                stdout = (error as any).stdout.toString();
              } else {
                throw error;
              }
            }
          }

          // 添加文件状态和差异信息
          if (stdout.toString().trim()) {
            diffOutput += `\n=== ${fileStatus}: ${file} ===\n${stdout.toString()}`;
          }
        }
      } else {
        const diffTarget = ConfigurationManager.getInstance().getConfig(
          "FEATURES_CODEANALYSIS_DIFFTARGET"
        );

        if (diffTarget === "staged") {
          // SVN没有暂存区概念，但可以获取已添加到版本控制的文件的更改
          try {
            // 获取已添加到版本控制但未提交的文件列表
            const { stdout: changedFiles } = await exec(
              `"${this.svnPath}" status --xml`,
              {
                ...ImprovedPathUtils.createExecOptions(repositoryPath),
                env: this.getEnvironmentConfig(),
              }
            );

            // 解析XML输出以获取已添加的文件
            const changedFilesStr = changedFiles.toString();
            const addedFiles =
              changedFilesStr.match(
                /<entry[^>]*>\s*<wc-status[^>]*item="added"[^>]*>[\s\S]*?<\/entry>/g
              ) || [];
            const fileCount = addedFiles.length;

            if (fileCount > 0) {
              notify.info(formatMessage("diff.staged.info", [fileCount]));
            }

            // 获取已添加文件的差异
            for (const xmlEntry of addedFiles) {
              const pathMatch = xmlEntry.match(/path="([^"]+)"/);
              if (pathMatch && pathMatch[1]) {
                const filePath = pathMatch[1];
                const escapedFile = ImprovedPathUtils.escapeShellPath(filePath);

                try {
                  // 使用 ImprovedPathUtils 创建临时空文件用于比较
                  const tempEmptyFile = ImprovedPathUtils.createTempFilePath("empty-file-for-diff");
                  fs.writeFileSync(tempEmptyFile, "");

                  const result = await exec(
                    `"${this.svnPath}" diff --diff-cmd diff -x "-u" ${ImprovedPathUtils.escapeShellPath(tempEmptyFile)} ${escapedFile}`,
                    ImprovedPathUtils.createExecOptions(repositoryPath)
                  );
                  diffOutput += `\n=== Added File: ${filePath} ===\n${result.stdout.toString()}`;

                  // 清理临时文件
                  try {
                    fs.unlinkSync(tempEmptyFile);
                  } catch (e) {
                    // 忽略清理错误
                  }
                } catch (error) {
                  if (error instanceof Error && "stdout" in error) {
                    diffOutput += `\n=== Added File: ${filePath} ===\n${
                      (error as any).stdout.toString()
                    }`;
                  }
                }
              }
            }
          } catch (error) {
            console.warn(
              "Failed to count staged files for notification:",
              error
            );
          }
        } else {
          // 获取所有更改的差异
          try {
            // 获取文件列表函数
            const getFileNames = async (
              statusFilter: string
            ): Promise<string[]> => {
              let output = "";
              try {
                const result = await exec(
                  `"${this.svnPath}" status ${statusFilter} --xml`,
                  {
                    ...ImprovedPathUtils.createExecOptions(repositoryPath),
                    env: this.getEnvironmentConfig(),
                  }
                );
                output = result.stdout.toString();

                // 解析XML输出以获取文件路径
                const fileMatches = output.match(/path="([^"]+)"/g) || [];
                return fileMatches.map((match) =>
                  match.replace(/path="([^"]+)"/, "$1")
                );
              } catch (e) {
                if (e instanceof Error && "stdout" in e) {
                  output = (e as any).stdout.toString();
                  const fileMatches = output.match(/path="([^"]+)"/g) || [];
                  return fileMatches.map((match) =>
                    match.replace(/path="([^"]+)"/, "$1")
                  );
                } else {
                  throw e;
                }
              }
            };

            // 获取已修改的文件
            const modifiedFiles = await getFileNames("--no-ignore");

            // 通知用户文件数量
            const fileCount = modifiedFiles.length;
            if (fileCount > 0) {
              notify.info(formatMessage("diff.all.info", [fileCount]));
            }

            // 获取所有文件的差异
            const { stdout: allChanges } = await exec(
              `"${this.svnPath}" diff`,
              {
                ...ImprovedPathUtils.createExecOptions(repositoryPath),
                env: this.getEnvironmentConfig(),
              }
            );

            diffOutput = allChanges.toString();

            // 获取未版本控制的文件列表
            const { stdout: statusOutput } = await exec(
              `"${this.svnPath}" status`,
              {
                ...ImprovedPathUtils.createExecOptions(repositoryPath),
                env: this.getEnvironmentConfig(),
              }
            );

            // 解析未版本控制的文件
            const statusOutputStr = statusOutput.toString();
            const untrackedFiles = statusOutputStr
              .split("\n")
              .filter((line: string) => line.startsWith("?"))
              .map((line: string) => line.substring(1).trim());

            // 为每个未版本控制文件获取差异
            if (untrackedFiles.length > 0) {
              for (const file of untrackedFiles) {
                const escapedFile = ImprovedPathUtils.escapeShellPath(file);
                try {
                  // 使用 ImprovedPathUtils 创建临时空文件用于比较
                  const tempEmptyFile = ImprovedPathUtils.createTempFilePath("empty-file-for-diff");
                  fs.writeFileSync(tempEmptyFile, "");

                  const result = await exec(
                    `"${this.svnPath}" diff --diff-cmd diff -x "-u" ${ImprovedPathUtils.escapeShellPath(tempEmptyFile)} ${escapedFile}`,
                    ImprovedPathUtils.createExecOptions(repositoryPath)
                  );
                  diffOutput += `\n=== New File: ${file} ===\n${result.stdout.toString()}`;

                  // 清理临时文件
                  try {
                    fs.unlinkSync(tempEmptyFile);
                  } catch (e) {
                    // 忽略清理错误
                  }
                } catch (error) {
                  // 如果外部diff命令失败，尝试使用内置diff
                  if (error instanceof Error && "stdout" in error) {
                    diffOutput += `\n=== New File: ${file} ===\n${
                      (error as any).stdout.toString()
                    }`;
                  } else {
                    // 回退到读取整个文件内容
                    try {
                      const fileContent = fs.readFileSync(
                        path.join(repositoryPath, file),
                        "utf8"
                      );
                      const diffContent = `--- /dev/null\n+++ ${file}\n@@ -0,0 +1,${
                        fileContent.split("\n").length
                      } @@\n${fileContent
                        .split("\n")
                        .map((line) => `+${line}`)
                        .join("\n")}`;
                      diffOutput += `\n=== New File: ${file} ===\n${diffContent}`;
                    } catch (readError) {
                      console.error(`Failed to read file ${file}:`, readError);
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.warn(
              "Failed to count all changed files for notification:",
              error
            );
          }
        }
      }

      if (!diffOutput.trim()) {
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
        return DiffSimplifier.simplify(diffOutput);
      }

      // 处理diff以获取结构化数据，包括原始文件内容
      return DiffProcessor.process(diffOutput, "svn");
    } catch (error) {
      if (error instanceof Error) {
        console.error(formatMessage("scm.diff.error", ["SVN", error])); // 添加调试日志
        // notify.error(formatMessage("scm.diff.failed", ["SVN", error.message]));
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
      throw new Error(formatMessage("scm.repository.not.found", ["SVN"]));
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
      throw new Error(formatMessage("scm.commit.failed", ["SVN", error]));
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
      throw new Error(formatMessage("scm.repository.not.found", ["SVN"]));
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
    const repoInfo = this._findRepositoryAndPath();
    if (!repoInfo) {
      throw new Error(formatMessage("scm.repository.not.found", ["SVN"]));
    }
    const { repository, repositoryPath } = repoInfo;

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

      const command = `"${this.svnPath}" log ${commandArgs} "${repositoryPath}"`;
      Logger.log(LogLevel.Info, `Executing SVN log command: ${command}`);

      const { stdout } = await exec(command, {
        ...ImprovedPathUtils.createExecOptions(repositoryPath),
        env: this.getEnvironmentConfig(),
      });

      const stdoutStr = stdout.toString();
      if (!stdoutStr.trim()) {
        return [];
      }

      // 解析 SVN log 输出
      const rawLog = stdoutStr;
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
        notify.error(formatMessage("scm.log.failed", ["SVN", error.message]));
      }
      return []; // 类似 git-provider，在错误时返回空数组
    }
  }

  async getRecentCommitMessages() {
    const repositoryCommitMessages: string[] = [];
    const userCommitMessages: string[] = [];
    const repoInfo = this._findRepositoryAndPath();
    if (!repoInfo) {
      return { repository: [], user: [] };
    }
    const { repository, repositoryPath } = repoInfo;

    try {
      // Last 5 commit messages (repository)
      const logCommand = `"${this.svnPath}" log -l 5 "${repositoryPath}"`;
      const { stdout: logOutput } = await exec(logCommand, {
        ...ImprovedPathUtils.createExecOptions(repositoryPath),
        env: this.getEnvironmentConfig(),
      });
      repositoryCommitMessages.push(...this.parseSvnLog(logOutput.toString()));

      // Last 5 commit messages (user)
      const { stdout: user } = await exec(
        `"${this.svnPath}" info --show-item last-changed-author "${repositoryPath}"`,
        ImprovedPathUtils.createExecOptions(repositoryPath)
      );
      const author = user.toString().trim();

      if (author) {
        const userLogCommand = `"${this.svnPath}" log -l 5 -r HEAD:1 --search "${author}" "${repositoryPath}"`;
        const { stdout: userLogOutput } = await exec(userLogCommand, {
          ...ImprovedPathUtils.createExecOptions(repositoryPath),
          env: this.getEnvironmentConfig(),
        });
        userCommitMessages.push(...this.parseSvnLog(userLogOutput.toString()));
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
  private _getRepoFsPath(repo: SvnRepository): string | undefined {
    return (repo as any).root;
  }

  private _findRepositoryAndPath(
    files?: string[]
  ): { repository: SvnRepository; repositoryPath: string } | undefined {
    const repository = this.findRepository(files);
    if (!repository) {
      return undefined;
    }
    const repositoryPath = this._getRepoFsPath(repository);
    if (!repositoryPath) {
      return undefined;
    }
    return { repository, repositoryPath };
  }

  private findRepository(filePaths?: string[]): SvnRepository | undefined {
    const { repositories } = this;

    if (!repositories.length) {
      return undefined;
    }

    // 1. 如果在构造时提供了特定的仓库路径，优先使用它
    if (this.repositoryPath) {
      const specificRepo = repositories.find((repo) => {
        const repoFsPath = this._getRepoFsPath(repo);
        if (!repoFsPath) return false;
        const normalizedRepoPath = ImprovedPathUtils.normalizePath(repoFsPath);
        const normalizedTargetPath = ImprovedPathUtils.normalizePath(this.repositoryPath!);
        return normalizedRepoPath === normalizedTargetPath;
      });
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
          const repoPath = this._getRepoFsPath(repo);
          if (repoPath) {
            const normalizedRepoPath = ImprovedPathUtils.normalizePath(repoPath);
            const normalizedFilePath = ImprovedPathUtils.normalizePath(uri.fsPath);
            if (normalizedFilePath.startsWith(normalizedRepoPath)) {
              return repo; // 找到第一个匹配的就返回
            }
          }
        }
      }
    }

    // 3. 根据当前打开的活动编辑器查找
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor?.document.uri.scheme === "file") {
      const activeFileUri = activeEditor.document.uri;
      for (const repo of repositories) {
        const repoPath = this._getRepoFsPath(repo);
        if (repoPath) {
          const normalizedRepoPath = ImprovedPathUtils.normalizePath(repoPath);
          const normalizedFilePath = ImprovedPathUtils.normalizePath(activeFileUri.fsPath);
          if (normalizedFilePath.startsWith(normalizedRepoPath)) {
            return repo;
          }
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
  //     throw new Error(formatMessage("scm.repository.not.found", ["SVN"])); // 保持与现有代码一致
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
  //     throw new Error(formatMessage("scm.repository.not.found", ["SVN"])); // 保持与现有代码一致
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
