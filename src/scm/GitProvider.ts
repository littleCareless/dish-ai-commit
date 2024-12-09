import * as vscode from "vscode";
import { ISCMProvider } from "./SCMProvider";
import { promisify } from "util";
import * as childProcess from "child_process";
import { DiffSimplifier } from "../utils/DiffSimplifier";
import { LocalizationManager } from "../utils/LocalizationManager";

const exec = promisify(childProcess.exec);

export class GitProvider implements ISCMProvider {
  type = "git" as const;
  private workspaceRoot: string;

  constructor(private readonly gitExtension: any) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      throw new Error(
        LocalizationManager.getInstance().getMessage("workspace.not.found")
      );
    }
    this.workspaceRoot = workspaceRoot;
  }

  async isAvailable(): Promise<boolean> {
    const api = this.gitExtension.getAPI(1);
    const repositories = api.repositories;
    return repositories.length > 0;
  }

  private async getFileStatus(file: string): Promise<string> {
    try {
      // 检查文件是否是新文件
      const { stdout: lsFiles } = await exec(`git ls-files "${file}"`, {
        cwd: this.workspaceRoot,
      });

      if (!lsFiles) {
        const { stdout: status } = await exec(
          `git status --porcelain "${file}"`,
          {
            cwd: this.workspaceRoot,
          }
        );
        if (status.startsWith("??")) {
          return "New File";
        }
      }

      // 检查文件是否被删除
      const { stdout: status } = await exec(
        `git status --porcelain "${file}"`,
        {
          cwd: this.workspaceRoot,
        }
      );
      if (status.startsWith(" D") || status.startsWith("D ")) {
        return "Deleted File";
      }

      return "Modified File";
    } catch (error) {
      console.error(`Error getting file status: ${error}`);
      return "Unknown";
    }
  }

  async getDiff(files?: string[]): Promise<string | undefined> {
    try {
      let diffOutput = "";

      if (files && files.length > 0) {
        // 处理多个文件的情况
        for (const file of files) {
          const fileStatus = await this.getFileStatus(file);
          const escapedFile = file.replace(/"/g, '\\"');

          const { stdout } = await exec(`git diff HEAD -- "${escapedFile}"`, {
            cwd: this.workspaceRoot,
            maxBuffer: 1024 * 1024 * 10,
          });

          if (stdout.trim()) {
            diffOutput += `\n=== ${fileStatus}: ${file} ===\n${stdout}`;
          }
        }
      } else {
        // 处理所有改动文件的情况
        const { stdout } = await exec("git diff HEAD", {
          cwd: this.workspaceRoot,
          maxBuffer: 1024 * 1024 * 10,
        });
        diffOutput = stdout;
      }

      if (!diffOutput.trim()) {
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
        const result = await vscode.window.showWarningMessage(
          LocalizationManager.getInstance().getMessage(
            "diff.simplification.warning"
          ),
          LocalizationManager.getInstance().getMessage("button.yes"),
          LocalizationManager.getInstance().getMessage("button.no")
        );
        if (
          result === LocalizationManager.getInstance().getMessage("button.yes")
        ) {
          return DiffSimplifier.simplify(diffOutput);
        }
      }

      // 如果未启用简化，直接返回原始diff
      return diffOutput;
    } catch (error) {
      if (error instanceof Error) {
        console.error("Git diff error:", error); // 添加调试日志
        vscode.window.showErrorMessage(
          LocalizationManager.getInstance().format(
            "git.diff.failed",
            error.message
          )
        );
      }
      throw new Error(
        LocalizationManager.getInstance().getMessage("diff.failed")
      );
    }
  }

  async commit(message: string, files?: string[]): Promise<void> {
    const api = this.gitExtension.getAPI(1);
    const repository = api.repositories[0];

    if (!repository) {
      throw new Error(
        LocalizationManager.getInstance().getMessage("git.repository.not.found")
      );
    }

    await repository.commit(message, { all: files ? false : true, files });
  }

  async setCommitInput(message: string): Promise<void> {
    const api = this.gitExtension.getAPI(1);
    const repository = api.repositories[0];

    if (!repository) {
      throw new Error(
        LocalizationManager.getInstance().getMessage("git.repository.not.found")
      );
    }

    repository.inputBox.value = message;
  }
}
