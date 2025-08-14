import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { BaseScmProvider } from "../base/base-scm-provider";
import { RecentCommitMessages } from "../scm-provider";
import { CommandExecutor } from "../utils/command-executor";
import {
  RepositoryFinder,
  SvnRepositoryFindStrategy,
} from "../utils/repository-manager";
import { PathUtils } from "../utils/path-utils";
import { SCMUtils } from "../utils/scm-utils";
import {
  SVN_CONSTANTS,
  DIFF_TARGETS,
  FILE_STATUS,
} from "../constants/scm-constants";
import { formatMessage, getMessage } from "../../utils/i18n";
import { DiffProcessor } from "../../utils/diff/diff-processor";
import { DiffSimplifier } from "../../utils";
import { notify } from "../../utils/notification/notification-manager";
import { ConfigurationManager } from "../../config/configuration-manager";

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
  inputBox: { value: string };
  commitFiles(files: string[], message: string): Promise<void>;
}

/**
 * SVN配置接口
 */
interface SvnConfig {
  svnPath?: string;
  environmentConfig: {
    path: string[];
    locale: string;
  };
}

export class SvnProviderMigrated extends BaseScmProvider {
  readonly type = "svn" as const;

  private readonly api: SvnAPI;
  private readonly repositoryFinder: RepositoryFinder<SvnRepository>;
  private readonly repositories: SvnRepository[];

  private svnPath: string = "svn";
  private config: SvnConfig;
  private initialized: boolean = false;

  constructor(private readonly svnExtension: any, repositoryPath?: string) {
    super(repositoryPath);

    this.validateWorkspace();
    this.api = svnExtension.getAPI(1);
    this.repositories = this.api.repositories;
    this.repositoryFinder = new RepositoryFinder(
      new SvnRepositoryFindStrategy()
    );

    this.config = this.loadConfig();
  }

  async init(): Promise<void> {
    try {
      this.svnPath = await this.getSvnPath();

      // 验证SVN可执行
      const version = await CommandExecutor.getCommandVersion(this.svnPath);
      if (version) {
        this.logInfo(`SVN version detected: ${version}`);
        notify.info(formatMessage("scm.version.detected", ["SVN", version]));
      }

      this.initialized = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logError("Failed to initialize SVN:", message);
      throw new Error(formatMessage("svn.initialization.failed", [message]));
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.svnExtension?.getAPI) {
        return false;
      }

      const api = this.svnExtension.getAPI(1);
      const repositories = api.repositories;
      if (repositories.length > 0) {
        return true;
      }
      return false;
    } catch (error) {
      this.logError("SVN availability check failed:", error);
      return false;
    }
  }

  async getDiff(files?: string[]): Promise<string | undefined> {
    try {
      if (!this.initialized) {
        throw new Error(getMessage("svn.not.initialized"));
      }

      const repoInfo = this.findRepositoryAndPath(files);
      if (!repoInfo) {
        throw new Error(formatMessage("scm.repository.not.found", ["SVN"]));
      }

      const { repository, repositoryPath } = repoInfo;
      const executor = CommandExecutor.createForDirectory(
        repositoryPath,
        this.getEnvironmentConfig()
      );

      let diffOutput = "";

      if (files && files.length > 0) {
        diffOutput = await this.getFilesDiff(files, executor, repositoryPath);
      } else {
        diffOutput = await this.getAllDiff(executor, repositoryPath);
      }

      if (!diffOutput.trim()) {
        throw new Error(getMessage("diff.noChanges"));
      }

      // 根据配置决定是否简化diff
      const enableSimplification = ConfigurationManager.getInstance().getConfig(
        "FEATURES_CODEANALYSIS_SIMPLIFYDIFF"
      );

      if (enableSimplification) {
        notify.warn("diff.simplification.warning");
        return DiffSimplifier.simplify(diffOutput);
      }

      return DiffProcessor.process(diffOutput, this.type);
    } catch (error) {
      this.logError("Failed to get SVN diff:", error);
      throw error;
    }
  }

  async commit(message: string, files?: string[]): Promise<void> {
    if (!SCMUtils.isValidCommitMessage(message)) {
      throw new Error("Invalid commit message");
    }

    const repository = this.findRepository(files);
    if (!repository) {
      throw new Error(formatMessage("scm.repository.not.found", ["SVN"]));
    }

    try {
      if (!files?.length) {
        throw new Error(getMessage("svn.no.files.selected"));
      }

      await repository.commitFiles(files, message);
      this.logInfo("SVN commit completed successfully");
    } catch (error) {
      this.logError("SVN commit failed:", error);
      throw new Error(formatMessage("scm.commit.failed", ["SVN", error]));
    }
  }

  async getCommitLog(
    baseRevisionInput?: string,
    headRevisionInput: string = "HEAD"
  ): Promise<string[]> {
    if (!this.initialized) {
      throw new Error(getMessage("svn.not.initialized"));
    }

    const repoInfo = this.findRepositoryAndPath();
    if (!repoInfo) {
      throw new Error(formatMessage("scm.repository.not.found", ["SVN"]));
    }

    const { repository, repositoryPath } = repoInfo;
    const executor = CommandExecutor.createForDirectory(
      repositoryPath,
      this.getEnvironmentConfig()
    );

    try {
      let commandArgs = "";
      const limit =
        vscode.workspace
          .getConfiguration("svn-commit-gen")
          .get<number>("commitLogLimit") || 20;

      if (baseRevisionInput) {
        commandArgs = `-r ${headRevisionInput}:${baseRevisionInput}`;
      } else {
        if (headRevisionInput === "HEAD") {
          commandArgs = `-l ${limit}`;
        } else {
          commandArgs = `-r ${headRevisionInput}:1 -l ${limit}`;
        }
      }

      const command = `"${this.svnPath}" log ${commandArgs} "${repositoryPath}"`;
      this.logInfo(`Executing SVN log command: ${command}`);

      const stdout = await executor.executeForOutput(command);
      if (!stdout.trim()) {
        return [];
      }

      return this.parseSvnLogOutput(stdout);
    } catch (error) {
      this.logError("SVN log failed:", error);
      if (error instanceof Error) {
        notify.error(formatMessage("scm.log.failed", ["SVN", error.message]));
      }
      return [];
    }
  }

  async getRecentCommitMessages(): Promise<RecentCommitMessages> {
    const repoInfo = this.findRepositoryAndPath();
    if (!repoInfo) {
      return { repository: [], user: [] };
    }

    const { repository, repositoryPath } = repoInfo;
    const executor = CommandExecutor.createForDirectory(
      repositoryPath,
      this.getEnvironmentConfig()
    );

    try {
      // 获取仓库最近5条提交
      const logCommand = `"${this.svnPath}" log -l 5 "${repositoryPath}"`;
      const logOutput = await executor.executeForOutput(logCommand);
      const repositoryCommitMessages = SCMUtils.parseSvnLog(logOutput);

      // 获取用户最近5条提交
      const userInfoCommand = `"${this.svnPath}" info --show-item last-changed-author "${repositoryPath}"`;
      const userOutput = await executor.executeForOutput(userInfoCommand);
      const author = userOutput.trim();

      const userCommitMessages: string[] = [];
      if (author) {
        const userLogCommand = `"${this.svnPath}" log -l 5 -r HEAD:1 --search "${author}" "${repositoryPath}"`;
        const userLogOutput = await executor.executeForOutput(userLogCommand);
        userCommitMessages.push(...SCMUtils.parseSvnLog(userLogOutput));
      }

      return {
        repository: repositoryCommitMessages,
        user: userCommitMessages,
      };
    } catch (error) {
      this.logError("Failed to get recent SVN commit messages:", error);
      return { repository: [], user: [] };
    }
  }

  protected async trySetInputBox(message: string): Promise<boolean> {
    const repository = this.findRepository();
    if (repository?.inputBox) {
      repository.inputBox.value = message;
      return true;
    }
    return false;
  }

  /**
   * 加载SVN配置
   */
  private loadConfig(): SvnConfig {
    try {
      const config = vscode.workspace.getConfiguration("svn-commit-gen");
      const envConfig = {
        path: (config.get<string[]>("environmentPath") || [
          ...SVN_CONSTANTS.COMMON_PATHS.MACOS,
        ]) as string[],
        locale: config.get<string>("locale") || SVN_CONSTANTS.DEFAULT_LOCALE,
      };

      if (!Array.isArray(envConfig.path) || !envConfig.locale) {
        throw new Error(getMessage("svn.invalid.env.config"));
      }

      return {
        svnPath: config.get<string>("svnPath"),
        environmentConfig: envConfig,
      };
    } catch (error) {
      this.logError("Failed to load SVN config:", error);
      throw new Error(formatMessage("svn.config.load.failed", [error]));
    }
  }

  /**
   * 获取SVN路径
   */
  private async getSvnPath(): Promise<string> {
    // 1. 检查SVN插件配置
    const svnConfig = vscode.workspace.getConfiguration("svn");
    const svnPluginPath = svnConfig.get<string>("path");
    if (svnPluginPath && (await this.isValidSvnPath(svnPluginPath))) {
      this.logInfo("Using SVN path from SVN plugin config:", svnPluginPath);
      return svnPluginPath;
    }

    // 2. 检查自定义配置
    if (
      this.config.svnPath &&
      (await this.isValidSvnPath(this.config.svnPath))
    ) {
      this.logInfo("Using SVN path from custom config:", this.config.svnPath);
      return this.config.svnPath;
    }

    // 3. 自动检测
    const detectedPath = await this.findSvnExecutable();
    if (detectedPath) {
      this.logInfo("Auto-detected SVN path:", detectedPath);
      return detectedPath;
    }

    throw new Error("Unable to locate SVN executable");
  }

  /**
   * 查找SVN可执行文件
   */
  private async findSvnExecutable(): Promise<string | null> {
    // 尝试系统命令
    const command = process.platform === "win32" ? "where svn" : "which svn";
    try {
      const result = await CommandExecutor.executeForOutput(command);
      const lines = result.trim().split("\n");
      for (const line of lines) {
        const p = line.trim();
        if (p && (await this.isValidSvnPath(p))) {
          return PathUtils.handleLongPath(p);
        }
      }
    } catch (error) {
      this.logInfo("System command failed, checking common paths");
    }

    // 检查常见路径
    const potentialPaths = this.getCommonSvnPaths();
    for (const p of potentialPaths) {
      const normalizedPath = PathUtils.handleLongPath(p);
      if (await this.isValidSvnPath(normalizedPath)) {
        return normalizedPath;
      }
    }

    return null;
  }

  /**
   * 获取常见的SVN路径
   */
  private getCommonSvnPaths(): string[] {
    if (process.platform === "win32") {
      return [...SVN_CONSTANTS.COMMON_PATHS.WINDOWS];
    } else if (process.platform === "darwin") {
      return [...SVN_CONSTANTS.COMMON_PATHS.MACOS];
    } else {
      return [...SVN_CONSTANTS.COMMON_PATHS.LINUX];
    }
  }

  /**
   * 验证SVN路径是否有效
   */
  private async isValidSvnPath(svnPath: string): Promise<boolean> {
    if (!PathUtils.safeExists(svnPath)) {
      return false;
    }

    try {
      const escapedPath = PathUtils.escapeShellPath(svnPath);
      await CommandExecutor.executeForOutput(`${escapedPath} --version`);
      return true;
    } catch (error) {
      this.logInfo(`Path validation failed for ${svnPath}:`, error);
      return false;
    }
  }

  /**
   * 获取环境配置
   */
  private getEnvironmentConfig() {
    if (!this.config?.environmentConfig) {
      throw new Error(getMessage("svn.invalid.env.config"));
    }

    return {
      ...process.env,
      PATH: `${process.env.PATH}${
        path.delimiter
      }${this.config.environmentConfig.path.join(path.delimiter)}`,
      LC_ALL: this.config.environmentConfig.locale,
    };
  }

  /**
   * 获取指定文件的差异
   */
  private async getFilesDiff(
    files: string[],
    executor: any,
    repositoryPath: string
  ): Promise<string> {
    const validFiles = SCMUtils.validateFilePaths(files);
    SCMUtils.notifyFileCount(validFiles.length, "selected");

    let diffOutput = "";

    for (const file of validFiles) {
      const fileStatus = await this.getFileStatus(file, executor);
      const escapedFile = PathUtils.escapeShellPath(file);

      if (fileStatus === FILE_STATUS.DELETED) {
        diffOutput += `\n=== ${fileStatus}: ${file} ===\n`;
        continue;
      }

      let stdout = "";
      try {
        if (fileStatus === FILE_STATUS.NEW) {
          stdout = await this.getNewFileDiff(escapedFile, executor);
        } else {
          stdout = await executor.executeForOutput(
            `"${this.svnPath}" diff ${escapedFile}`
          );
        }

        if (stdout.trim()) {
          diffOutput += `\n=== ${fileStatus}: ${file} ===\n${stdout}`;
        }
      } catch (error) {
        this.logWarn(`Failed to get diff for file ${file}:`, error);
      }
    }

    return diffOutput;
  }

  /**
   * 获取所有文件的差异
   */
  private async getAllDiff(
    executor: any,
    repositoryPath: string
  ): Promise<string> {
    const diffTarget = ConfigurationManager.getInstance().getConfig(
      "FEATURES_CODEANALYSIS_DIFFTARGET"
    );

    if (diffTarget === DIFF_TARGETS.STAGED) {
      return this.getStagedDiff(executor, repositoryPath);
    } else {
      return this.getAllChangesDiff(executor, repositoryPath);
    }
  }

  /**
   * 获取暂存区差异（SVN没有真正的暂存区，这里获取已添加的文件）
   */
  private async getStagedDiff(
    executor: any,
    repositoryPath: string
  ): Promise<string> {
    try {
      const changedFiles = await executor.executeForOutput(
        `"${this.svnPath}" status --xml`
      );
      const changedFilesStr = changedFiles.toString();
      const addedFiles =
        changedFilesStr.match(
          /<entry[^>]*>\s*<wc-status[^>]*item="added"[^>]*>[\s\S]*?<\/entry>/g
        ) || [];

      SCMUtils.notifyFileCount(addedFiles.length, "staged");

      let diffOutput = "";
      for (const xmlEntry of addedFiles) {
        const pathMatch = xmlEntry.match(/path="([^"]+)"/);
        if (pathMatch && pathMatch[1]) {
          const filePath = pathMatch[1];
          const escapedFile = PathUtils.escapeShellPath(filePath);

          try {
            const fileDiff = await this.getNewFileDiff(escapedFile, executor);
            diffOutput += `\n=== Added File: ${filePath} ===\n${fileDiff}`;
          } catch (error) {
            this.logWarn(
              `Failed to get diff for added file ${filePath}:`,
              error
            );
          }
        }
      }

      return diffOutput;
    } catch (error) {
      this.logWarn("Failed to get staged diff:", error);
      return "";
    }
  }

  /**
   * 获取所有更改的差异
   */
  private async getAllChangesDiff(
    executor: any,
    repositoryPath: string
  ): Promise<string> {
    try {
      // 获取所有文件的差异
      const allChanges = await executor.executeForOutput(
        `"${this.svnPath}" diff`
      );
      let diffOutput = allChanges.toString();

      // 获取未版本控制的文件
      const statusOutput = await executor.executeForOutput(
        `"${this.svnPath}" status`
      );
      const statusOutputStr = statusOutput.toString();
      const untrackedFiles = statusOutputStr
        .split("\n")
        .filter((line: string) => line.startsWith("?"))
        .map((line: string) => line.substring(1).trim());

      SCMUtils.notifyFileCount(untrackedFiles.length, "all");

      // 为每个未版本控制文件获取差异
      for (const file of untrackedFiles) {
        const escapedFile = PathUtils.escapeShellPath(file);
        try {
          const fileDiff = await this.getNewFileDiff(escapedFile, executor);
          diffOutput += `\n=== New File: ${file} ===\n${fileDiff}`;
        } catch (error) {
          this.logWarn(`Failed to get diff for untracked file ${file}:`, error);
        }
      }

      return diffOutput;
    } catch (error) {
      this.logWarn("Failed to get all changes diff:", error);
      return "";
    }
  }

  /**
   * 获取文件状态
   */
  private async getFileStatus(file: string, executor: any): Promise<string> {
    try {
      const status = await executor.executeForOutput(
        `"${this.svnPath}" status "${file}"`
      );
      if (!status) return FILE_STATUS.UNKNOWN;

      const statusStr = status.toString();
      if (statusStr.startsWith("?")) return FILE_STATUS.NEW;
      if (statusStr.startsWith("D")) return FILE_STATUS.DELETED;
      return FILE_STATUS.MODIFIED;
    } catch (error) {
      this.logError("Failed to get file status:", error);
      return FILE_STATUS.UNKNOWN;
    }
  }

  /**
   * 获取新文件的差异
   */
  private async getNewFileDiff(
    escapedFile: string,
    executor: any
  ): Promise<string> {
    try {
      const tempEmptyFile = PathUtils.createTempFilePath("empty-file-for-diff");
      fs.writeFileSync(tempEmptyFile, "");

      const result = await executor.executeForOutput(
        `"${
          this.svnPath
        }" diff --diff-cmd diff -x "-u" ${PathUtils.escapeShellPath(
          tempEmptyFile
        )} ${escapedFile}`
      );

      // 清理临时文件
      try {
        fs.unlinkSync(tempEmptyFile);
      } catch (e) {
        // 忽略清理错误
      }

      return result;
    } catch (error) {
      if (error instanceof Error && "stdout" in error) {
        return (error as any).stdout;
      }

      // 回退到读取整个文件内容
      try {
        const fileContent = fs.readFileSync(
          escapedFile.replace(/^"|"$/g, ""),
          "utf8"
        );
        const diffContent = `--- /dev/null\n+++ ${escapedFile}\n@@ -0,0 +1,${
          fileContent.split("\n").length
        } @@\n${fileContent
          .split("\n")
          .map((line) => `+${line}`)
          .join("\n")}`;
        return diffContent;
      } catch (readError) {
        this.logError(`Failed to read file ${escapedFile}:`, readError);
        return "";
      }
    }
  }

  /**
   * 解析SVN日志输出
   */
  private parseSvnLogOutput(logOutput: string): string[] {
    const commitMessages: string[] = [];
    const entries = logOutput.split(
      /^------------------------------------------------------------------------$/m
    );

    for (const rawEntry of entries) {
      const entry = rawEntry.trim();
      if (!entry) continue;

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
          commitMessages.push(message);
        }
      }
    }

    return commitMessages;
  }

  /**
   * 查找SVN仓库
   */
  private findRepository(filePaths?: string[]): SvnRepository | undefined {
    return this.repositoryFinder.findRepository(
      this.repositories,
      filePaths,
      this.repositoryPath
    );
  }

  /**
   * 查找仓库和路径
   */
  private findRepositoryAndPath(
    files?: string[]
  ): { repository: SvnRepository; repositoryPath: string } | undefined {
    const repository = this.findRepository(files);
    if (!repository) {
      return undefined;
    }

    const repositoryPath = this.getRepoFsPath(repository);
    if (!repositoryPath) {
      return undefined;
    }

    return { repository, repositoryPath };
  }

  /**
   * 获取仓库文件系统路径
   */
  private getRepoFsPath(repo: SvnRepository): string | undefined {
    return (repo as any).root;
  }
}
