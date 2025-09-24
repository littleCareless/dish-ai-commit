import { exec } from "child_process";
import { promisify } from "util";
import * as vscode from "vscode";
import { ISCMProvider } from "./scm-provider";
import { getMessage } from "../utils";
import { DiffProcessor } from "../utils/diff/diff-processor";
import { notify } from "../utils/notification/notification-manager";
import { ImprovedPathUtils } from "./utils/improved-path-utils";
import { Logger } from "../utils/logger";

const execAsync = promisify(exec);

export class CliSvnProvider implements ISCMProvider {
  type: "svn" = "svn";
  private workspaceRoot: string;
  private logger: Logger;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = ImprovedPathUtils.normalizePath(workspaceRoot);
    this.logger = Logger.getInstance("Dish AI Commit Gen");
  }

  async init(): Promise<void> {
    // No async initialization needed for this provider.
    return Promise.resolve();
  }

  async isAvailable(): Promise<boolean> {
    try {
      const options = ImprovedPathUtils.createExecOptions(this.workspaceRoot);
      await execAsync("svn --version", options);
      this.logger.info("SVN CLI is available.");
      return true;
    } catch (error) {
      this.logger.warn(`SVN CLI not available: ${error}`);
      return false;
    }
  }

  async getDiff(files?: string[]): Promise<string | undefined> {
    try {
      let filePaths = ".";
      if (files && files.length > 0) {
        // 使用 ImprovedPathUtils 处理和转义文件路径
        const escapedPaths = files.map((file) =>
          ImprovedPathUtils.escapeShellPath(
            ImprovedPathUtils.normalizePath(file)
          )
        );
        filePaths = escapedPaths.join(" ");
      }

      const options = ImprovedPathUtils.createExecOptions(this.workspaceRoot);
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
      this.logger.error(`Failed to get SVN diff: ${error}`);
      return undefined;
    }
  }

  async commit(message: string, files?: string[]): Promise<void> {
    let filePaths = ".";
    if (files && files.length > 0) {
      // 使用 ImprovedPathUtils 处理和转义文件路径
      const escapedPaths = files.map((file) =>
        ImprovedPathUtils.escapeShellPath(ImprovedPathUtils.normalizePath(file))
      );
      filePaths = escapedPaths.join(" ");
    }

    // 转义提交消息
    const escapedMessage = ImprovedPathUtils.escapeShellPath(message);
    const options = ImprovedPathUtils.createExecOptions(this.workspaceRoot);

    const commitCommand =
      filePaths === "."
        ? `svn commit -m ${escapedMessage} .`
        : `svn commit -m ${escapedMessage} ${filePaths}`;
    this.logger.info(`Executing SVN commit command: ${commitCommand}`);
    await execAsync(commitCommand, options);
    this.logger.info("SVN commit successful.");
  }

  async setCommitInput(
    message: string,
    repositoryPath?: string
  ): Promise<void> {
    await this.copyToClipboard(message);
  }

  async getCommitInput(): Promise<string> {
    return "";
  }

  async startStreamingInput(
    message: string,
    repositoryPath?: string
  ): Promise<void> {
    await this.copyToClipboard(message);
  }

  /**
   * 获取提交日志 (占位符实现)
   * @param baseBranch - 基础分支
   * @param headBranch - 当前分支
   * @returns 返回一个空数组
   */
  async getCommitLog(
    baseBranch?: string,
    headBranch?: string
  ): Promise<string[]> {
    this.logger.warn(
      "getCommitLog is not implemented for CliSvnProvider and will return an empty array."
    );
    return [];
  }

  async getRecentCommitMessages() {
    const repositoryCommitMessages: string[] = [];
    const userCommitMessages: string[] = [];

    try {
      const options = ImprovedPathUtils.createExecOptions(this.workspaceRoot);

      // Last 5 commit messages (repository)
      const { stdout: logOutput } = await execAsync("svn log -l 5", options);
      repositoryCommitMessages.push(...this.parseSvnLog(logOutput.toString()));

      // Last 5 commit messages (user)
      const { stdout: user } = await execAsync(
        "svn info --show-item last-changed-author",
        options
      );
      const author = user.toString()?.trim();

      if (author) {
        // 转义作者名称以防止命令注入
        const escapedAuthor = ImprovedPathUtils.escapeShellPath(author);
        const searchCommand = `svn log -l 5 --search ${escapedAuthor}`;
        const { stdout: userLogOutput } = await execAsync(
          searchCommand,
          options
        );
        userCommitMessages.push(...this.parseSvnLog(userLogOutput.toString()));
      }
    } catch (err) {
      this.logger.error(`Failed to get recent SVN commit messages: ${err}`);
    }

    return { repository: repositoryCommitMessages, user: userCommitMessages };
  }

  private parseSvnLog(log: string): string[] {
    const messages: string[] = [];
    const entries = log.split(
      /^------------------------------------------------------------------------$/m
    );

    for (const rawEntry of entries) {
      const entry = rawEntry?.trim();
      if (!entry) {
        continue;
      }

      const lines = entry.split("\n");
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
}
