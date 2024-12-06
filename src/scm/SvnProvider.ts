import * as vscode from "vscode";
import { ISCMProvider } from "./SCMProvider";
import { promisify } from "util";
import * as childProcess from "child_process";

const exec = promisify(childProcess.exec);

export class SvnProvider implements ISCMProvider {
  type = "svn" as const;
  private api: any;
  private workspaceRoot: string;
  private repositories: any;

  constructor(private readonly svnExtension: any) {
    this.api = svnExtension;
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      throw new Error("No workspace folder found");
    }
    this.workspaceRoot = workspaceRoot;
  }

  async isAvailable(): Promise<boolean> {
    try {
      console.log("typeof", this.svnExtension, this.svnExtension.name);
      if (
        !this.svnExtension ||
        typeof this.svnExtension.getAPI !== "function"
      ) {
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
      console.error("Failed to check SVN availability:", error);
      return false;
    }
  }

  async getDiff(files?: string[]): Promise<string | undefined> {
    try {
      let command: string;
      if (files && files.length > 0) {
        // 对特定文件执行 diff
        const filesPaths = files.map((file) => `"${file}"`).join(" ");
        if (filesPaths.length === 0) {
          command = "svn diff";
        } else {
          command = `svn diff ${filesPaths}`;
        }
      } else {
        // 对所有暂存文件执行 diff
        command = "svn diff";
      }

      const { stdout, stderr } = await exec(command, {
        cwd: this.workspaceRoot,
      });

      if (stderr) {
        throw new Error(stderr);
      }

      if (!stdout.trim()) {
        throw new Error("No changes found");
      }

      return stdout;
    } catch (error) {
      if (error instanceof Error) {
        vscode.window.showErrorMessage(`SVN diff failed: ${error.message}`);
      }
      throw error;
    }
  }

  async commit(message: string, files?: string[]): Promise<void> {
    const repository = this.api?.repositories?.[0];
    if (!repository) {
      throw new Error("No SVN repository found");
    }

    try {
      await repository.commitFiles(files || [], message);
    } catch (error) {
      console.error("Failed to commit to SVN:", error);
      throw new Error(`SVN commit failed: ${error}`);
    }
  }

  async setCommitInput(message: string): Promise<void> {
    const repository = this.api?.repositories?.[0];
    if (!repository) {
      throw new Error("No SVN repository found");
    }

    repository.inputBox.value = message;
  }
}
