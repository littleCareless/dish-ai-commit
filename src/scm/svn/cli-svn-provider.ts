import { exec } from "child_process";
import { promisify } from "util";
import * as vscode from "vscode";
import { ISvnProvider } from "./svn-provider-interface";
import { getMessage } from "../../utils";
import { DiffProcessor } from "../../utils/diff/diff-processor";
import { notify } from "../../utils/notification/notification-manager";
import { Logger } from "../../utils/logger";
import { SvnPathHelper } from "./helpers/svn-path-helper";

const execAsync = promisify(exec);

/**
 * 基于命令行的简单SVN提供者实现
 * 作为SVN扩展不可用时的优雅降级方案
 */
export class CliSvnProvider implements ISvnProvider {
  type: "svn" = "svn";
  private workspaceRoot: string;
  private logger: Logger;
  private initialized = false;

  /**
   * 创建一个CLI SVN提供者实例
   * @param workspaceRoot 工作区根路径
   */
  constructor(workspaceRoot: string) {
    this.workspaceRoot = SvnPathHelper.normalizePath(workspaceRoot);
    this.logger = Logger.getInstance("Dish AI Commit Gen");
  }

  /**
   * 初始化SVN提供者
   */
  async init(): Promise<void> {
    try {
      // 验证工作区路径是否是SVN仓库
      const options = SvnPathHelper.createExecOptions(this.workspaceRoot);
      await execAsync("svn info", options);
      this.initialized = true;
      this.logger.info(`CLI SVN provider initialized at ${this.workspaceRoot}`);
    } catch (error) {
      this.logger.warn(`SVN repository not found at ${this.workspaceRoot}: ${error}`);
      throw new Error(`无法初始化SVN提供者: ${error}`);
    }
  }

  /**
   * 检查SVN是否可用
   * @returns 如果SVN可用返回true，否则返回false
   */
  async isAvailable(): Promise<boolean> {
    try {
      const options = SvnPathHelper.createExecOptions(this.workspaceRoot);
      await execAsync("svn --version", options);
      this.logger.info("SVN CLI is available.");
      return true;
    } catch (error) {
      this.logger.warn(`SVN CLI not available: ${error}`);
      return false;
    }
  }

  /**
   * 获取文件差异
   * @param files 可选的文件路径数组
   * @returns 差异文本
   */
  async getDiff(files?: string[]): Promise<string | undefined> {
    try {
      let filePaths = ".";
      if (files && files.length > 0) {
        // 处理和转义文件路径
        const escapedPaths = files.map((file) =>
          SvnPathHelper.escapeShellPath(
            SvnPathHelper.normalizePath(file)
          )
        );
        filePaths = escapedPaths.join(" ");
      }

      const options = SvnPathHelper.createExecOptions(this.workspaceRoot);
      const command =
        filePaths === "." ? "svn diff ." : `svn diff ${filePaths}`;
      this.logger.info(`Executing SVN diff command: ${command}`);
      const { stdout: rawDiff } = await execAsync(command, options);

      if (!rawDiff.toString()?.trim()) {
        this.logger.info("No SVN diff found.");
        return undefined;
      }

      return DiffProcessor.process(rawDiff.toString(), "svn");
    } catch (error) {
      this.logger.logError(error as Error, "获取SVN差异失败");
      return undefined;
    }
  }

  /**
   * 提交更改
   * @param message 提交信息
   * @param files 可选的要提交的文件路径数组
   */
  async commit(message: string, files?: string[]): Promise<void> {
    let filePaths = ".";
    if (files && files.length > 0) {
      // 处理和转义文件路径
      const escapedPaths = files.map((file) =>
        SvnPathHelper.escapeShellPath(SvnPathHelper.normalizePath(file))
      );
      filePaths = escapedPaths.join(" ");
    }

    // 转义提交消息
    const escapedMessage = SvnPathHelper.escapeShellPath(message);
    const options = SvnPathHelper.createExecOptions(this.workspaceRoot);

    try {
      const commitCommand =
        filePaths === "."
          ? `svn commit -m ${escapedMessage} .`
          : `svn commit -m ${escapedMessage} ${filePaths}`;
      this.logger.info(`Executing SVN commit command: ${commitCommand}`);
      await execAsync(commitCommand, options);
      this.logger.info("SVN commit successful.");
      notify.info("scm.commit.succeeded", ["SVN"]);
    } catch (error) {
      this.logger.error(`SVN commit failed: ${error}`);
      throw new Error(`SVN commit failed: ${error}`);
    }
  }

  /**
   * 设置提交输入框的内容
   * @param message 要设置的提交信息
   */
  async setCommitInput(message: string): Promise<void> {
    await this.copyToClipboard(message);
  }

  /**
   * 获取提交输入框的当前内容
   * @returns 空字符串，CLI模式下无法获取
   */
  async getCommitInput(): Promise<string> {
    return "";
  }

  /**
   * 开始流式设置提交输入框的内容
   * @param message 要设置的提交信息
   */
  async startStreamingInput(message: string): Promise<void> {
    await this.copyToClipboard(message);
  }

  /**
   * 获取提交日志
   * @param baseRevision 基础修订版本
   * @param headRevision 当前修订版本
   * @returns 提交信息列表
   */
  async getCommitLog(
    baseRevision?: string,
    headRevision?: string
  ): Promise<string[]> {
    this.logger.warn(
      "getCommitLog is not fully implemented for CliSvnProvider and will return only basic results."
    );
    
    try {
      const options = SvnPathHelper.createExecOptions(this.workspaceRoot);
      const command = headRevision 
        ? `svn log -r ${baseRevision || "BASE"}:${headRevision}` 
        : "svn log -l 5";
        
      const { stdout } = await execAsync(command, options);
      return this.parseSvnLog(stdout.toString());
    } catch (error) {
      this.logger.error(`Failed to get SVN commit log: ${error}`);
      return [];
    }
  }

  /**
   * 获取最近的提交消息
   * @returns 仓库和用户的最近提交消息
   */
  async getRecentCommitMessages(): Promise<{ repository: string[]; user: string[] }> {
    const repositoryCommitMessages: string[] = [];
    const userCommitMessages: string[] = [];

    try {
      const options = SvnPathHelper.createExecOptions(this.workspaceRoot);

      // 获取仓库最近5条提交信息
      const { stdout: logOutput } = await execAsync("svn log -l 5", options);
      repositoryCommitMessages.push(...this.parseSvnLog(logOutput.toString()));

      // 获取当前用户最近5条提交信息
      const { stdout: user } = await execAsync(
        "svn info --show-item last-changed-author",
        options
      );
      const author = user.toString()?.trim();

      if (author) {
        // 转义作者名称以防止命令注入
        const escapedAuthor = SvnPathHelper.escapeShellPath(author);
        const searchCommand = `svn log -l 5 --search ${escapedAuthor}`;
        const { stdout: userLogOutput } = await execAsync(
          searchCommand,
          options
        );
        userCommitMessages.push(...this.parseSvnLog(userLogOutput.toString()));
      }
    } catch (err) {
      this.logger.logError(err as Error, "获取SVN日志失败");
    }

    return { repository: repositoryCommitMessages, user: userCommitMessages };
  }

  /**
   * 解析SVN日志
   * @param log SVN日志文本
   * @returns 提交消息数组
   */
  private parseSvnLog(log: string): string[] {
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
          messages.push(message?.split("\n")[0]);
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
}
