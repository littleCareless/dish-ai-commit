import { promisify } from "util";
import * as childProcess from "child_process";
import { Logger } from "../../../utils/logger";
import { DiffProcessor } from "../../../utils/diff/diff-processor";
import { ImprovedPathUtils } from "../../utils/improved-path-utils";
import { formatMessage } from "../../../utils/i18n";
import { notify } from "../../../utils/notification/notification-manager";
import { ConfigurationManager } from "../../../config/configuration-manager";
import { GitRepository } from "./git-repository-helper";

const exec = promisify(childProcess.exec);

/**
 * Git 差异辅助类
 * 处理所有与获取 Git 差异相关的操作
 */
export class GitDiffHelper {
  private logger: Logger;

  /**
   * 创建 Git 差异辅助类
   */
  constructor() {
    this.logger = Logger.getInstance("Dish AI Commit Gen");
  }

  /**
   * 获取文件状态
   * @param file - 文件路径
   * @param repositoryPath - 仓库路径
   * @returns 文件状态描述
   */
  public async getFileStatus(
    file: string,
    repositoryPath: string
  ): Promise<string> {
    try {
      // 首先检查完整的 git status 来识别 rename 操作
      const { stdout: fullStatus } = await exec(
        `git status --porcelain`,
        {
          ...ImprovedPathUtils.createExecOptions(repositoryPath),
          encoding: "utf8",
        }
      );

      if (fullStatus) {
        const fullStatusStr = fullStatus.toString();
        this.logger.info(`[DEBUG] Full git status: ${fullStatusStr}`);
        this.logger.info(`[DEBUG] Checking file: ${file}`);
        
        // 检查是否有包含当前文件的 rename 操作
        // Git rename 格式: R  old-file -> new-file
        const renameMatches = fullStatusStr.matchAll(/^R\s+(.+?)\s+->\s+(.+)$/gm);
        for (const match of renameMatches) {
          const oldFile = match[1].trim();
          const newFile = match[2].trim();
          
          this.logger.info(`[DEBUG] Found rename: ${oldFile} -> ${newFile}`);
          
          // 获取文件的相对路径进行比较
          const normalizedRepoPath = repositoryPath.replace(/\\/g, '/');
          const normalizedFilePath = file.replace(/\\/g, '/');
          const fileRelativePath = normalizedFilePath.replace(normalizedRepoPath + '/', '');
          
          if (fileRelativePath === newFile || fileRelativePath === oldFile) {
            this.logger.info(`[DEBUG] ✓ Detected as Renamed File`);
            return "Renamed File";
          }
        }
      }

      // 如果没有找到 rename，使用原来的逻辑
      const escapedFile = ImprovedPathUtils.escapeShellPath(file);
      const { stdout: status } = await exec(
        `git status --porcelain ${escapedFile}`,
        {
          ...ImprovedPathUtils.createExecOptions(repositoryPath),
          encoding: "utf8",
        }
      );

      if (!status) {
        return "Unknown";
      }

      const statusStr = status.toString().trim();
      
      if (statusStr.startsWith("??")) {
        return "New File";
      }
      if (statusStr.startsWith("A ")) {
        // 对于 Added File，需要再次检查是否实际上是 rename 操作
        // 因为 rename 文件在新文件这边显示为 Added
        const fullStatusCheck = await exec(`git status --porcelain`, {
          ...ImprovedPathUtils.createExecOptions(repositoryPath),
          encoding: "utf8",
        });
        
        if (fullStatusCheck.stdout) {
          const fullStatusStr = fullStatusCheck.stdout.toString();
          const renameMatches = fullStatusStr.matchAll(/^R\s+(.+?)\s+->\s+(.+)$/gm);
          for (const match of renameMatches) {
            const newFile = match[2].trim();
            if (file === newFile) {
              this.logger.info(`[DEBUG] ✓ File ${file} is actually a rename target`);
              return "Renamed File";
            }
          }
        }
        return "Added File"; // 已暂存的新文件
      }
      if (statusStr.startsWith(" D") || statusStr.startsWith("D ")) {
        return "Deleted File";
      }
      return "Modified File";
    } catch (error) {
      this.logger.logError(error as Error, "获取文件状态失败");
      return "Unknown";
    }
  }

  /**
   * 获取文件差异信息
   * @param repository - Git 仓库对象
   * @param files - 可选的文件路径数组
   * @param target - 差异目标: 
   *   - 'staged': 只获取暂存区的更改 
   *   - 'all': 获取所有更改
   *   - 'auto': 先检查暂存区，如果暂存区有文件则获取暂存区的更改，否则获取所有更改
   * @returns 差异文本
   */
  public async getDiff(
    repository: GitRepository | undefined,
    files?: string[],
    target?: "staged" | "all" | "auto"
  ): Promise<string | undefined> {
    try {
      if (!repository) {
        throw new Error(formatMessage("scm.repository.not.found", ["Git"]));
      }
      const currentWorkspaceRoot = repository.rootUri.fsPath;

      let diffOutput = "";

      // 检查仓库是否有初始提交
      let hasInitialCommit = true;
      try {
        await exec("git rev-parse HEAD", {
          ...ImprovedPathUtils.createExecOptions(currentWorkspaceRoot),
          encoding: "utf8",
        });
      } catch (error) {
        // 如果执行失败，说明没有初始提交
        hasInitialCommit = false;
      }

      if (files && files.length > 0) {
        // 处理指定文件的差异
        for (const file of files) {
          const fileStatus = await this.getFileStatus(
            file,
            currentWorkspaceRoot
          );
          const escapedFile = ImprovedPathUtils.escapeShellPath(file);

          // 根据文件状态选择合适的diff命令
          let stdout = "";
          
          if (fileStatus === "Renamed File") {
            this.logger.info(`[DEBUG] Processing rename file: ${file}`);
            // ===== 新增：处理 rename 文件 =====
            // 对于 rename，不能指定文件名，需要从完整 diff 中提取
            const { stdout: fullDiff } = await exec(`git diff --cached`, {
              ...ImprovedPathUtils.createExecOptions(currentWorkspaceRoot),
              encoding: "utf8",
            });
            
            this.logger.info(`[DEBUG] Full diff length: ${fullDiff.toString().length}`);
            
            // 从完整 diff 中提取这个文件的 rename 信息
            stdout = this.extractRenameDiffForFile(fullDiff.toString(), file, currentWorkspaceRoot);
            
            this.logger.info(`[DEBUG] Extracted diff length: ${stdout.length}`);
            this.logger.info(`[DEBUG] Extracted diff content: ${stdout}`);
            
            // 如果提取成功，添加特殊标记
            if (stdout) {
              // 解析出原文件名和新文件名
              const renameInfo = this.parseRenameInfo(stdout, file);
              if (renameInfo) {
                this.logger.info(`[DEBUG] Parsed rename info: ${renameInfo.oldPath} -> ${renameInfo.newPath}`);
                diffOutput += `\n### RENAME OPERATION ###\n`;
                diffOutput += `# File renamed from: ${renameInfo.oldPath}\n`;
                diffOutput += `# File renamed to: ${renameInfo.newPath}\n`;
                diffOutput += `${stdout}`;
                diffOutput += `\n### END RENAME ###\n`;
                continue; // 跳过后续处理
              } else {
                this.logger.warn(`[DEBUG] Failed to parse rename info for file: ${file}`);
              }
            } else {
              this.logger.warn(`[DEBUG] Failed to extract rename diff for file: ${file}`);
            }
          } else if (fileStatus === "New File") {
            // 处理未跟踪的新文件
            try {
              const result = await exec(
                `git diff --no-index /dev/null ${escapedFile}`,
                {
                  ...ImprovedPathUtils.createExecOptions(currentWorkspaceRoot),
                  encoding: "utf8",
                }
              );
              stdout = result.stdout.toString();
            } catch (error) {
              // git diff --no-index 在有差异时会返回非零状态码，需要捕获异常
              if (error instanceof Error && "stdout" in error) {
                stdout = (error as any).stdout;
              }
            }
          } else if (fileStatus === "Added File") {
            // 处理已暂存的新文件
            const result = await exec(`git diff --cached -- ${escapedFile}`, {
              ...ImprovedPathUtils.createExecOptions(currentWorkspaceRoot),
              encoding: "utf8",
            });
            stdout = result.stdout.toString();
          } else {
            // 处理已跟踪且修改的文件
            try {
              // 尝试使用 HEAD 引用
              if (hasInitialCommit) {
                const result = await exec(`git diff HEAD -- ${escapedFile}`, {
                  cwd: currentWorkspaceRoot,
                  maxBuffer: 1024 * 1024 * 10,
                });
                stdout = result.stdout.toString();
              } else {
                // 如果没有初始提交，则使用不带HEAD的diff命令
                const result = await exec(`git diff -- ${escapedFile}`, {
                  cwd: currentWorkspaceRoot,
                  maxBuffer: 1024 * 1024 * 10,
                  encoding: "utf8",
                });
                stdout = result.stdout.toString();
              }
            } catch (error) {
              // 如果出现"bad revision 'HEAD'"错误，回退到不带HEAD的diff命令
              if (
                error instanceof Error &&
                error.message.includes("bad revision 'HEAD'")
              ) {
                const result = await exec(`git diff -- ${escapedFile}`, {
                  cwd: currentWorkspaceRoot,
                  maxBuffer: 1024 * 1024 * 10,
                  encoding: "utf8",
                });
                stdout = result.stdout.toString();
              } else {
                throw error;
              }
            }
          }

          // 添加文件状态和差异信息
          if (stdout?.trim()) {
            diffOutput += `\n=== ${fileStatus}: ${file} ===\n${stdout}`;
          }
        }
      } else {
        // 确定目标差异类型
        let diffTarget: "staged" | "all" =
          target === "staged" ? "staged" : 
          target === "all" ? "all" : 
          ConfigurationManager.getInstance().getConfig("FEATURES_CODEANALYSIS_DIFFTARGET") === "staged" ? "staged" : "all";

        // 如果使用 "auto" 模式，先检查暂存区是否有文件
        if (target === "auto") {
          const stagedFiles = await this.getStagedFiles(currentWorkspaceRoot);
          diffTarget = stagedFiles.length > 0 ? "staged" : "all";
        }

        if (diffTarget === "staged") {
          try {
            let stagedFilesOutput = "";
            try {
              const { stdout } = await exec("git diff --cached --name-only", {
                cwd: currentWorkspaceRoot,
              });
              stagedFilesOutput = stdout;
            } catch (e) {
              if (e instanceof Error && "stdout" in e) {
                stagedFilesOutput = (e as any).stdout;
              } else {
                throw e;
              }
            }
            const fileCount = stagedFilesOutput
              ?.split("\n")
              .filter(Boolean).length;
            if (fileCount > 0) {
              notify.info(formatMessage("diff.staged.info", [fileCount]));
            }
          } catch (error) {
            this.logger.warn(
              `Failed to count staged files for notification: ${error}`
            );
          }
          // 只获取暂存区的更改
          const { stdout: stagedChanges } = await exec("git diff --cached", {
            cwd: currentWorkspaceRoot,
            maxBuffer: 1024 * 1024 * 10,
          });
          diffOutput = stagedChanges;
        } else {
          // 获取所有更改的差异 - 需要组合多个命令的输出
          try {
            const getFileNames = async (command: string) => {
              let output = "";
              try {
                const result = await exec(command, {
                  cwd: currentWorkspaceRoot,
                });
                output = result.stdout;
              } catch (e) {
                if (e instanceof Error && "stdout" in e) {
                  output = (e as any).stdout;
                } else {
                  throw e;
                }
              }
              return output?.split("\n").filter(Boolean);
            };

            const trackedFiles = hasInitialCommit
              ? await getFileNames("git diff HEAD --name-only")
              : await getFileNames("git diff --name-only");

            const stagedFiles = await getFileNames(
              "git diff --cached --name-only"
            );

            const { stdout: untrackedFilesOutput } = await exec(
              "git ls-files --others --exclude-standard",
              {
                cwd: currentWorkspaceRoot,
              }
            );
            const untrackedFiles = untrackedFilesOutput
              ?.split("\n")
              .filter(Boolean);

            const allFiles = new Set([
              ...trackedFiles,
              ...stagedFiles,
              ...untrackedFiles,
            ]);
            const fileCount = allFiles.size;

            if (fileCount > 0) {
              notify.info(formatMessage("diff.all.info", [fileCount]));
            }
          } catch (error) {
            this.logger.warn(
              `Failed to count all changed files for notification: ${error}`
            );
          }

          // 1. 获取已跟踪文件的更改
          let trackedChanges = "";
          try {
            if (hasInitialCommit) {
              // 如果有初始提交，使用HEAD引用
              const result = await exec("git diff HEAD", {
                cwd: currentWorkspaceRoot,
                maxBuffer: 1024 * 1024 * 10,
              });
              trackedChanges = result.stdout;
            } else {
              // 如果没有初始提交，使用不带HEAD的diff命令
              const result = await exec("git diff", {
                cwd: currentWorkspaceRoot,
                maxBuffer: 1024 * 1024 * 10,
              });
              trackedChanges = result.stdout;
            }
          } catch (error) {
            // 如果出现"bad revision 'HEAD'"错误，回退到不带HEAD的diff命令
            if (
              error instanceof Error &&
              error.message.includes("bad revision 'HEAD'")
            ) {
              const result = await exec("git diff", {
                cwd: currentWorkspaceRoot,
                maxBuffer: 1024 * 1024 * 10,
              });
              trackedChanges = result.stdout;
            } else {
              throw error;
            }
          }

          // 2. 获取已暂存的新文件更改
          const execResult = await exec("git diff --cached", {
            cwd: currentWorkspaceRoot,
            maxBuffer: 1024 * 1024 * 10,
          });
          const { stdout: stagedChanges } = execResult;

          // 3. 获取未跟踪的新文件列表
          const { stdout: untrackedFiles } = await exec(
            "git ls-files --others --exclude-standard",
            {
              cwd: currentWorkspaceRoot,
            }
          );

          // 整合所有差异
          diffOutput = trackedChanges;

          if (stagedChanges?.trim()) {
            diffOutput += stagedChanges;
          }

          // 为每个未跟踪文件获取差异
          if (untrackedFiles?.trim()) {
            const files = untrackedFiles
              ?.split("\n")
              .filter((file) => file?.trim());
            for (const file of files) {
              const escapedFile = ImprovedPathUtils.escapeShellPath(file);
              try {
                // 使用git diff --no-index捕获新文件内容
                const result = await exec(
                  `git diff --no-index /dev/null ${escapedFile}`,
                  {
                    cwd: currentWorkspaceRoot,
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
      }

      if (!diffOutput?.trim()) {
        // return empty string instead of throwing error
        return "";
      }

      // Process the diff to get structured data, including original file content.
      return DiffProcessor.process(diffOutput, "git");
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get Git diff: ${error.message}`);
        notify.error(formatMessage("scm.diff.failed", ["Git", error.message]));
      }
      throw error;
    }
  }

  /**
   * 获取暂存文件列表
   * @param repositoryPath 仓库路径
   * @returns 暂存文件路径数组
   */
  public async getStagedFiles(repositoryPath: string): Promise<string[]> {
    try {
      const { stdout } = await exec("git diff --cached --name-only", {
        cwd: repositoryPath,
      });
      return stdout.split("\n").filter(Boolean);
    } catch (error) {
      this.logger.error(`Failed to get staged files: ${error}`);
      return [];
    }
  }

  /**
   * 获取所有变更文件列表
   * @param repositoryPath 仓库路径
   * @returns 所有变更文件路径数组
   */
  public async getAllChangedFiles(repositoryPath: string): Promise<string[]> {
    try {
      const getFileNames = async (command: string) => {
        try {
          const { stdout } = await exec(command, { cwd: repositoryPath });
          return stdout.split("\n").filter(Boolean);
        } catch (e) {
          if (e instanceof Error && "stdout" in e) {
            return (e as any).stdout.split("\n").filter(Boolean);
          }
          throw e;
        }
      };

      const unstagedFiles = await getFileNames("git diff --name-only");
      const stagedFiles = await getFileNames("git diff --cached --name-only");
      const untrackedFiles = await getFileNames(
        "git ls-files --others --exclude-standard"
      );

      return [
        ...new Set([...unstagedFiles, ...stagedFiles, ...untrackedFiles]),
      ];
    } catch (error) {
      this.logger.error(`Failed to get all changed files: ${error}`);
      return [];
    }
  }

  /**
   * 从完整的 diff 中提取特定文件的 rename diff
   * @param fullDiff 完整的 git diff 输出
   * @param targetFile 目标文件路径（新文件名或旧文件名）
   * @param repositoryPath 仓库路径，用于路径比较
   * @returns 提取的 rename diff，如果未找到返回空字符串
   */
  private extractRenameDiffForFile(
    fullDiff: string,
    targetFile: string,
    repositoryPath: string
  ): string {
    const lines = fullDiff.split('\n');
    let extractedLines: string[] = [];
    let inTargetDiff = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Git rename diff 开始标记: diff --git a/oldfile b/newfile
      if (line.startsWith('diff --git')) {
        // 提取 diff 行中的文件路径
        const match = line.match(/diff --git a\/(.+?) b\/(.+?)$/);
        if (match) {
          const oldFile = match[1];
          const newFile = match[2];
          
          // 获取目标文件的相对路径进行比较
          const normalizedRepoPath = repositoryPath.replace(/\\/g, '/');
          const normalizedFilePath = targetFile.replace(/\\/g, '/');
          const fileRelativePath = normalizedFilePath.replace(normalizedRepoPath + '/', '');
          
          // 检查目标文件是否匹配旧文件或新文件
          if (fileRelativePath === oldFile || fileRelativePath === newFile) {
            inTargetDiff = true;
            extractedLines = [line];
            // 继续处理这个diff块的其他行
            continue;
          }
        }
        
        // 如果开始了一个新的diff但不是目标文件，结束当前提取
        if (inTargetDiff) {
          break;
        }
      }
      
      if (inTargetDiff) {
        extractedLines.push(line);
      }
    }
    
    return extractedLines.join('\n');
  }

  /**
   * 从 rename diff 中解析出原文件名和新文件名
   * @param renameDiff rename 的 diff 内容
   * @param currentFile 当前文件路径
   * @returns {oldPath, newPath} 或 null
   */
  private parseRenameInfo(
    renameDiff: string,
    currentFile: string
  ): { oldPath: string; newPath: string } | null {
    // Git rename diff 格式示例：
    // diff --git a/old.txt b/new.txt
    // similarity index 100%
    // rename from old.txt
    // rename to new.txt
    
    const lines = renameDiff.split('\n');
    let oldPath = '';
    let newPath = '';
    
    for (const line of lines) {
      const renameFromMatch = line.match(/^rename from (.+)$/);
      if (renameFromMatch) {
        oldPath = renameFromMatch[1].trim();
      }
      
      const renameToMatch = line.match(/^rename to (.+)$/);
      if (renameToMatch) {
        newPath = renameToMatch[1].trim();
      }
      
      // 也可以从第一行的 diff --git 中提取
      const diffGitMatch = line.match(/^diff --git a\/(.+) b\/(.+)$/);
      if (diffGitMatch && !oldPath && !newPath) {
        oldPath = diffGitMatch[1];
        newPath = diffGitMatch[2];
      }
    }
    
    if (oldPath && newPath) {
      return { oldPath, newPath };
    }
    
    return null;
  }
}