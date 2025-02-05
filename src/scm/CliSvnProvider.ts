import { exec } from "child_process";
import { promisify } from "util";
import { ISCMProvider } from "./SCMProvider";
import { getMessage } from "../utils";

const execAsync = promisify(exec);

export class CliSvnProvider implements ISCMProvider {
  type: "svn" = "svn";
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
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
      const { stdout } = await execAsync(`svn diff ${filePaths}`, {
        cwd: this.workspaceRoot,
      });
      return stdout;
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
}
