import { exec } from "child_process";
import { promisify } from "util";
import { ISCMProvider } from "./scm-provider";
import { getMessage } from "../utils";
import { DiffProcessor } from "../utils/diff/diff-processor";

const execAsync = promisify(exec);

export class CliSvnProvider implements ISCMProvider {
  type: "svn" = "svn";
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  async init(): Promise<void> {
    // No async initialization needed for this provider.
    return Promise.resolve();
  }

  async isAvailable(): Promise<boolean> {
    try {
      await execAsync("svn --version");
      return true;
    } catch {
      return false;
    }
  }

  async getDiff(files?: string[]): Promise<string | undefined> {
    try {
      const filePaths = files?.join(" ") || ".";
      const { stdout: rawDiff } = await execAsync(`svn diff ${filePaths}`, {
        cwd: this.workspaceRoot,
      });

      if (!rawDiff.trim()) {
        return undefined;
      }

      return DiffProcessor.process(rawDiff, "svn");
    } catch (error) {
      console.error("Failed to get SVN diff:", error);
      return undefined;
    }
  }

  async commit(message: string, files?: string[]): Promise<void> {
    const filePaths = files?.join(" ") || ".";
    await execAsync(`svn commit -m "${message}" ${filePaths}`, {
      cwd: this.workspaceRoot,
    });
  }

  // 由于是命令行方式,这两个方法可能用不到,但需要实现接口
  async setCommitInput(message: string): Promise<void> {
    throw new Error(getMessage("cli.commit.input.not.supported"));
  }

  async getCommitInput(): Promise<string> {
    return "";
  }

  async startStreamingInput(message: string): Promise<void> {
    // 对于命令行SVN，流式输入通常不直接支持，可以抛出错误或记录日志
    // 这里我们选择抛出错误，与setCommitInput行为保持一致
    throw new Error(getMessage("cli.commit.input.not.supported"));
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
    console.warn(
      "getCommitLog is not implemented for CliSvnProvider and will return an empty array."
    );
    return [];
  }

  async getRecentCommitMessages() {
    const repositoryCommitMessages: string[] = [];
    const userCommitMessages: string[] = [];

    try {
      // Last 5 commit messages (repository)
      const logCommand = `svn log -l 5`;
      const { stdout: logOutput } = await execAsync(logCommand, {
        cwd: this.workspaceRoot,
      });
      repositoryCommitMessages.push(...this.parseSvnLog(logOutput));

      // Last 5 commit messages (user)
      const { stdout: user } = await execAsync(
        `svn info --show-item last-changed-author`,
        { cwd: this.workspaceRoot }
      );
      const author = user.trim();

      if (author) {
        const userLogCommand = `svn log -l 5 --search "${author}"`;
        const { stdout: userLogOutput } = await execAsync(userLogCommand, {
          cwd: this.workspaceRoot,
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
}
