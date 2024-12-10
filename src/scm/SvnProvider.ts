import * as vscode from "vscode";
import { ISCMProvider } from "./SCMProvider";
import { promisify } from "util";
import * as childProcess from "child_process";
import { DiffSimplifier } from "../utils/DiffSimplifier";
import { LocalizationManager } from "../utils/LocalizationManager";

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
      throw new Error(
        LocalizationManager.getInstance().getMessage("workspace.not.found")
      );
    }
    this.workspaceRoot = workspaceRoot;
  }

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
      console.error("SVN availability check failed:", error instanceof Error ? error.message : error);
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
        throw new Error(
          LocalizationManager.getInstance().getMessage("diff.noChanges")
        );
      }

      // 获取配置
      const config = vscode.workspace.getConfiguration("dish-ai-commit");
      const enableSimplification = config.get<boolean>(
        "enableDiffSimplification"
      );

      // 根据配置决定是否显示警告和简化diff
      if (enableSimplification) {
        vscode.window.showWarningMessage(
          LocalizationManager.getInstance().getMessage(
            "diff.simplification.warning"
          )
        );
        return DiffSimplifier.simplify(stdout);
      }

      // 如果未启用简化，直接返回原始diff
      return stdout;
    } catch (error) {
      console.error("SVN diff failed:", error instanceof Error ? error.message : error);
      if (error instanceof Error) {
        vscode.window.showErrorMessage(
          LocalizationManager.getInstance().format(
            "git.diff.failed",
            error.message
          )
        );
      }
      throw error;
    }
  }

  async commit(message: string, files?: string[]): Promise<void> {
    const repository = this.api?.repositories?.[0];
    if (!repository) {
      throw new Error(
        LocalizationManager.getInstance().getMessage("git.repository.not.found")
      );
    }

    try {
      if (!files?.length) {
        throw new Error(LocalizationManager.getInstance().getMessage("svn.no.files.selected"));
      }
      await repository.commitFiles(files, message);
    } catch (error) {
      console.error("SVN commit failed:", error instanceof Error ? error.message : error);
      throw new Error(
        LocalizationManager.getInstance().format("svn.commit.failed", error)
      );
    }
  }

  async setCommitInput(message: string): Promise<void> {
    const repository = this.api?.repositories?.[0];
    if (!repository) {
      throw new Error(
        LocalizationManager.getInstance().getMessage("git.repository.not.found")
      );
    }

    repository.inputBox.value = message;
  }
}
