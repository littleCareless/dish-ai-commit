import * as vscode from "vscode";
import { ISCMProvider } from "./SCMProvider";
import { promisify } from "util";
import * as childProcess from "child_process";

const exec = promisify(childProcess.exec);

export class GitProvider implements ISCMProvider {
  type = "git" as const;
  private workspaceRoot: string;

  constructor(private readonly gitExtension: any) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      throw new Error("No workspace folder found");
    }
    this.workspaceRoot = workspaceRoot;
  }

  async isAvailable(): Promise<boolean> {
    const api = this.gitExtension.getAPI(1);
    const repositories = api.repositories;
    return repositories.length > 0;
  }

  async getDiff(files?: string[]): Promise<string | undefined> {
    try {
      let command: string;
      if (files && files.length > 0) {
        // 对特定文件执行 diff
        const filesPaths = files.map((file) => `"${file}"`).join(" ");
        command = `git diff HEAD ${filesPaths}`;
      } else {
        // 对所有暂存文件执行 diff
        command = "git diff HEAD";
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
        vscode.window.showErrorMessage(`Git diff failed: ${error.message}`);
      }
      throw error;
    }
  }

  async commit(message: string, files?: string[]): Promise<void> {
    const api = this.gitExtension.getAPI(1);
    const repository = api.repositories[0];

    if (!repository) {
      throw new Error("No Git repository found");
    }

    await repository.commit(message, { all: files ? false : true, files });
  }

  async setCommitInput(message: string): Promise<void> {
    const api = this.gitExtension.getAPI(1);
    const repository = api.repositories[0];

    if (!repository) {
      throw new Error("No Git repository found");
    }

    repository.inputBox.value = message;
  }
}
