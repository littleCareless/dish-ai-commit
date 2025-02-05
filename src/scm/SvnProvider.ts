import * as vscode from "vscode";
import { ISCMProvider } from "./SCMProvider";
import { promisify } from "util";
import * as childProcess from "child_process";
import { DiffSimplifier } from "../utils/diff/DiffSimplifier";
import { getMessage, formatMessage } from "../utils/i18n";

const exec = promisify(childProcess.exec);

/**
 * SVN源代码管理提供者实现
 * @implements {ISCMProvider}
 */
export class SvnProvider implements ISCMProvider {
  /** 源代码管理类型标识符 */
  type = "svn" as const;

  /** SVN API实例 */
  private api: any;

  /** 工作区根目录路径 */
  private workspaceRoot: string;

  /** SVN仓库集合 */
  private repositories: any;

  /**
   * 创建SVN提供者实例
   * @param svnExtension - VS Code SVN扩展实例
   * @throws {Error} 当未找到工作区时抛出错误
   */
  constructor(private readonly svnExtension: any) {
    this.api = svnExtension;
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      throw new Error(getMessage("workspace.not.found"));
    }
    this.workspaceRoot = workspaceRoot;
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

      const api = this.svnExtension.getAPI();
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
      const { stdout: status } = await exec(`svn status "${file}"`, {
        cwd: this.workspaceRoot,
      });

      if (!status) {
        return "Unknown";
      }

      if (status.startsWith("?")) {
        return "New File";
      }
      if (status.startsWith("D")) {
        return "Deleted File";
      }
      return "Modified File";
    } catch (error) {
      console.error(
        "Failed to get file status:",
        error instanceof Error ? error.message : error
      );
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
      let diffOutput = "";

      if (files && files.length > 0) {
        for (const file of files) {
          console.log("file", file);
          const fileStatus = await this.getFileStatus(file);
          const escapedFile = file.replace(/"/g, '\\"');

          // 对于删除的文件不获取diff内容
          if (fileStatus === "Deleted File") {
            diffOutput += `\n=== ${fileStatus}: ${file} ===\n`;
            continue;
          }

          const { stdout } = await exec(`svn diff "${escapedFile}"`, {
            cwd: this.workspaceRoot,
            maxBuffer: 1024 * 1024 * 10,
          });

          if (stdout.trim()) {
            diffOutput += `\n=== ${fileStatus}: ${file} ===\n${stdout}`;
          }
        }
      } else {
        const { stdout } = await exec("svn diff", {
          cwd: this.workspaceRoot,
          maxBuffer: 1024 * 1024 * 10,
        });
        diffOutput = stdout;
      }

      if (!diffOutput.trim()) {
        throw new Error(getMessage("diff.noChanges"));
      }

      // 获取配置
      const config = vscode.workspace.getConfiguration("dish-ai-commit");
      const enableSimplification = config.get<boolean>(
        "enableDiffSimplification"
      );

      // 根据配置决定是否显示警告和简化diff
      if (enableSimplification) {
        vscode.window.showWarningMessage(
          getMessage("diff.simplification.warning")
        );
        return DiffSimplifier.simplify(diffOutput);
      }

      // 如果未启用简化，直接返回原始diff
      return diffOutput;
    } catch (error) {
      console.error(
        "SVN diff failed:",
        error instanceof Error ? error.message : error
      );
      if (error instanceof Error) {
        vscode.window.showErrorMessage(
          formatMessage("git.diff.failed", [error.message])
        );
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
    const repository = this.api?.repositories?.[0];
    if (!repository) {
      throw new Error(getMessage("git.repository.not.found"));
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
      throw new Error(formatMessage("svn.commit.failed", [error]));
    }
  }

  /**
   * 设置提交输入框的内容
   * @param {string} message - 要设置的提交信息
   * @throws {Error} 当未找到仓库时抛出错误
   */
  async setCommitInput(message: string): Promise<void> {
    const repository = this.api?.repositories?.[0];
    if (!repository) {
      throw new Error(getMessage("git.repository.not.found"));
    }

    repository.inputBox.value = message;
  }

  /**
   * 获取提交输入框的当前内容
   * @returns {Promise<string>} 返回当前的提交信息
   * @throws {Error} 当未找到仓库时抛出错误
   */
  async getCommitInput(): Promise<string> {
    const repository = this.api?.repositories?.[0];
    if (!repository) {
      throw new Error(getMessage("git.repository.not.found"));
    }

    return repository.inputBox.value;
  }
}
