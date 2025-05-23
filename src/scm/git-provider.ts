import * as vscode from "vscode";
import { ISCMProvider } from "./scm-provider";
import { promisify } from "util";
import * as childProcess from "child_process";
import { DiffSimplifier } from "../utils/diff/diff-simplifier";
import { getMessage, formatMessage } from "../utils/i18n";

const exec = promisify(childProcess.exec);

/**
 * Git API接口定义
 */
interface GitAPI {
  /** Git仓库集合 */
  repositories: GitRepository[];

  /**
   * 获取指定版本的Git API
   * @param version - API版本号
   */
  getAPI(version: number): GitAPI;
}

/**
 * Git仓库接口定义
 */
interface GitRepository {
  /** 提交信息输入框 */
  inputBox: {
    value: string;
  };

  /**
   * 执行提交操作
   * @param message - 提交信息
   * @param options - 提交选项
   */
  commit(
    message: string,
    options: { all: boolean; files?: string[] }
  ): Promise<void>;
}

/**
 * Git源代码管理提供者实现
 * @implements {ISCMProvider}
 */
export class GitProvider implements ISCMProvider {
  /** SCM类型标识符 */
  type = "git" as const;

  /** 工作区根目录路径 */
  private workspaceRoot: string;

  /** Git API实例 */
  private readonly api: GitAPI;

  /**
   * 创建Git提供者实例
   * @param gitExtension - VS Code Git扩展实例
   * @throws {Error} 当未找到工作区时抛出错误
   */
  constructor(private readonly gitExtension: any) {
    this.api = gitExtension.getAPI(1);
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      throw new Error(getMessage("workspace.not.found"));
    }
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * 检查Git是否可用
   * @returns {Promise<boolean>} 如果Git可用返回true,否则返回false
   */
  async isAvailable(): Promise<boolean> {
    const api = this.gitExtension.getAPI(1);
    const repositories = api.repositories;
    return repositories.length > 0;
  }

  /**
   * 获取文件状态
   * @param {string} file - 文件路径
   * @returns {Promise<string>} 返回文件状态描述
   * @private
   */
  private async getFileStatus(file: string): Promise<string> {
    try {
      const { stdout: status } = await exec(
        `git status --porcelain "${file}"`,
        {
          cwd: this.workspaceRoot,
        }
      );

      if (!status) {
        return "Unknown";
      }

      if (status.startsWith("??")) {
        return "New File";
      }
      if (status.startsWith("A ")) {
        return "Added File"; // 已暂存的新文件
      }
      if (status.startsWith(" D") || status.startsWith("D ")) {
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
   * @param {string[]} [files] - 可选的文件路径数组
   * @returns {Promise<string | undefined>} 返回差异文本
   * @throws {Error} 当执行diff命令失败时抛出错误
   */
  async getDiff(files?: string[]): Promise<string | undefined> {
    try {
      let diffOutput = "";

      if (files && files.length > 0) {
        // 处理指定文件的差异
        for (const file of files) {
          const fileStatus = await this.getFileStatus(file);
          const escapedFile = file.replace(/"/g, '\\"');

          // 对于删除的文件不获取diff内容
          if (fileStatus === "Deleted File") {
            diffOutput += `\n=== ${fileStatus}: ${file} ===\n`;
            continue;
          }

          // 根据文件状态选择合适的diff命令
          let stdout = "";
          if (fileStatus === "New File") {
            // 处理未跟踪的新文件
            try {
              const result = await exec(
                `git diff --no-index /dev/null "${escapedFile}"`,
                {
                  cwd: this.workspaceRoot,
                  maxBuffer: 1024 * 1024 * 10,
                }
              );
              stdout = result.stdout;
            } catch (error) {
              // git diff --no-index 在有差异时会返回非零状态码，需要捕获异常
              if (error instanceof Error && "stdout" in error) {
                stdout = (error as any).stdout;
              }
            }
          } else if (fileStatus === "Added File") {
            // 处理已暂存的新文件
            const result = await exec(`git diff --cached -- "${escapedFile}"`, {
              cwd: this.workspaceRoot,
              maxBuffer: 1024 * 1024 * 10,
            });
            stdout = result.stdout;
          } else {
            // 处理已跟踪且修改的文件
            const result = await exec(`git diff HEAD -- "${escapedFile}"`, {
              cwd: this.workspaceRoot,
              maxBuffer: 1024 * 1024 * 10,
            });
            stdout = result.stdout;
          }

          // 添加文件状态和差异信息
          if (stdout.trim()) {
            diffOutput += `\n=== ${fileStatus}: ${file} ===\n${stdout}`;
          }
        }
      } else {
        // 获取所有更改的差异 - 需要组合多个命令的输出
        // 1. 获取已跟踪文件的更改
        const { stdout: trackedChanges } = await exec("git diff HEAD", {
          cwd: this.workspaceRoot,
          maxBuffer: 1024 * 1024 * 10,
        });

        // 2. 获取已暂存的新文件更改
        const { stdout: stagedChanges } = await exec("git diff --cached", {
          cwd: this.workspaceRoot,
          maxBuffer: 1024 * 1024 * 10,
        });

        // 3. 获取未跟踪的新文件列表
        const { stdout: untrackedFiles } = await exec(
          "git ls-files --others --exclude-standard",
          {
            cwd: this.workspaceRoot,
          }
        );

        // 整合所有差异
        diffOutput = trackedChanges;

        if (stagedChanges.trim()) {
          diffOutput += stagedChanges;
        }

        // 为每个未跟踪文件获取差异
        if (untrackedFiles.trim()) {
          const files = untrackedFiles
            .split("\n")
            .filter((file) => file.trim());
          for (const file of files) {
            const escapedFile = file.replace(/"/g, '\\"');
            try {
              // 使用git diff --no-index捕获新文件内容
              const result = await exec(
                `git diff --no-index /dev/null "${escapedFile}"`,
                {
                  cwd: this.workspaceRoot,
                  maxBuffer: 1024 * 1024 * 10,
                }
              );
              diffOutput += `\n=== New File: ${file} ===\n${result.stdout}`;
            } catch (error) {
              // git diff --no-index 在有差异时会返回非零状态码，需要捕获异常
              if (error instanceof Error && "stdout" in error) {
                diffOutput += `\n=== New File: ${file} ===\n${
                  (error as any).stdout
                }`;
              }
            }
          }
        }
      }

      if (!diffOutput.trim()) {
        throw new Error(getMessage("diff.noChanges"));
      }

      // 获取配置
      const config = vscode.workspace.getConfiguration("dish-ai-commit");
      const enableSimplification = config.get<boolean>(
        "features.codeAnalysis.simplifyDiff"
      );

      // 根据配置决定是否显示警告和简化diff
      if (enableSimplification) {
        const result = await vscode.window.showWarningMessage(
          getMessage("diff.simplification.warning"),
          getMessage("button.yes"),
          getMessage("button.no")
        );
        if (result === getMessage("button.yes")) {
          return DiffSimplifier.simplify(diffOutput);
        }
      }

      // 如果未启用简化，直接返回原始diff
      return diffOutput;
    } catch (error) {
      if (error instanceof Error) {
        console.error("Git diff error:", error); // 添加调试日志
        vscode.window.showErrorMessage(
          formatMessage("git.diff.failed", [error.message])
        );
      }
      throw new Error(getMessage("git.diff.failed"));
    }
  }

  /**
   * 提交更改
   * @param {string} message - 提交信息
   * @param {string[]} [files] - 要提交的文件路径数组
   * @throws {Error} 当提交失败或未找到仓库时抛出错误
   */
  async commit(message: string, files?: string[]): Promise<void> {
    const api = this.gitExtension.getAPI(1);
    const repository = api.repositories[0];

    if (!repository) {
      throw new Error(getMessage("git.repository.not.found"));
    }

    await repository.commit(message, { all: files ? false : true, files });
  }

  /**
   * 设置提交输入框的内容
   * @param {string} message - 要设置的提交信息
   * @throws {Error} 当未找到仓库时抛出错误
   */
  async setCommitInput(message: string): Promise<void> {
    const api = this.gitExtension.getAPI(1);
    const repository = api.repositories[0];

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
    const api = this.gitExtension.getAPI(1);
    const repository = api.repositories[0];

    if (!repository) {
      throw new Error(getMessage("git.repository.not.found"));
    }

    return repository.inputBox.value;
  }
}
