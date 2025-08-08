import * as fs from "fs";
import * as path from "path";
import { SCMPathHandler } from "./path-handler";
import { DiffProcessor } from "../../utils/diff/diff-processor";
import { DiffSimplifier } from "../../utils";
import { notify } from "../../utils/notification/notification-manager";
import { formatMessage, getMessage } from "../../utils/i18n";
import { SCMCommandExecutor } from "./command-executor";
import { SCMConfigManager } from "./config-manager";
import { SvnUtils } from "./svn-utils";
// removed unused child_process exec import; using SCMCommandExecutor instead

/**
 * 统一差异处理器
 * 处理不同SCM类型的差异获取逻辑，整合了所有差异处理功能
 */
export class UnifiedDiffProcessor {
  /**
   * 为未被版本控制的新文件构造统一 diff 文本
   * @param repositoryPath 仓库根路径
   * @param filePath 传入的文件路径（可能为绝对或相对路径）
   */
  private static buildUnifiedDiffForNewFile(
    repositoryPath: string,
    filePath: string
  ): string {
    const absoluteFilePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(repositoryPath, filePath);
    try {
      const fileContent = fs.readFileSync(absoluteFilePath, "utf8");
      const lines = fileContent.split("\n");
      const header = `--- /dev/null\n+++ ${filePath}\n@@ -0,0 +1,${lines.length} @@`;
      const body = lines.map((line) => `+${line}`).join("\n");
      return `${header}\n${body}`;
    } catch (readError) {
      console.error(`Failed to read file ${filePath}:`, readError);
      return "";
    }
  }
  /**
   * 获取差异
   * @param scmType SCM类型
   * @param repositoryPath 仓库路径
   * @param files 文件路径数组
   * @returns 差异文本
   */
  static async getDiff(
    scmType: "git" | "svn",
    repositoryPath: string,
    files?: string[]
  ): Promise<string | undefined> {
    try {
      let diffOutput = "";

      if (scmType === "git") {
        diffOutput = await this.getGitDiff(repositoryPath, files);
      } else {
        diffOutput = await this.getSvnDiff(repositoryPath, files);
      }

      if (!diffOutput.trim()) {
        throw new Error(getMessage("diff.noChanges"));
      }

      // 获取配置
      const enableSimplification =
        SCMConfigManager.isDiffSimplificationEnabled();

      // 根据配置决定是否显示警告和简化diff
      if (enableSimplification) {
        notify.warn("diff.simplification.warning");
        return DiffSimplifier.simplify(diffOutput);
      }

      // 处理diff以获取结构化数据，包括原始文件内容
      return DiffProcessor.process(diffOutput, scmType);
    } catch (error) {
      if (error instanceof Error) {
        console.error(
          formatMessage("scm.diff.error", [scmType.toUpperCase(), error])
        );
      }
      throw error;
    }
  }

  /**
   * 获取单个文件的状态
   * @param filePath 文件路径
   * @param repositoryPath 仓库路径
   * @param scmType SCM类型
   * @param scmCommand SCM命令路径
   * @param envConfig 环境配置
   * @returns 文件状态
   */
  static async getFileStatus(
    filePath: string,
    repositoryPath: string,
    scmType: "git" | "svn",
    scmCommand: string = scmType,
    envConfig?: NodeJS.ProcessEnv
  ): Promise<string> {
    try {
      const escapedFile = SCMPathHandler.escapeShellPath(filePath);
      if (scmType === "git") {
        const { stdout } = await SCMCommandExecutor.executeGit(
          `status -M --porcelain ${escapedFile}`,
          repositoryPath,
          { env: envConfig }
        );
        return SCMPathHandler.parseFileStatus(stdout.toString(), scmType);
      } else {
        const { stdout } = await SCMCommandExecutor.executeSvn(
          scmCommand,
          `status ${escapedFile}`,
          repositoryPath,
          { env: envConfig }
        );
        return SCMPathHandler.parseFileStatus(stdout.toString(), scmType);
      }
    } catch (error) {
      console.error("获取文件状态失败:", error);
      return "Unknown";
    }
  }

  /**
   * 获取文件差异内容
   * @param filePath 文件路径
   * @param fileStatus 文件状态
   * @param repositoryPath 仓库路径
   * @param scmType SCM类型
   * @param scmCommand SCM命令路径
   * @param envConfig 环境配置
   * @returns 差异内容
   */
  static async getFileDiff(
    filePath: string,
    fileStatus: string,
    repositoryPath: string,
    scmType: "git" | "svn",
    scmCommand: string,
    envConfig?: NodeJS.ProcessEnv
  ): Promise<string> {
    const escapedFile = SCMPathHandler.escapeShellPath(filePath);

    // 对于删除的文件不获取diff内容
    if (fileStatus === "Deleted File") {
      return "";
    }

    try {
      let command: string;
      let stdout = "";

      if (scmType === "git") {
        if (fileStatus === "New File") {
          command = `git diff --no-index /dev/null ${escapedFile}`;
        } else if (fileStatus === "Added File") {
          command = `git diff --cached -- ${escapedFile}`;
        } else if (fileStatus === "Renamed File") {
          // 针对重命名文件，优先比较暂存区（索引 vs HEAD），若无输出再比较工作区 vs HEAD
          try {
            const cachedResult =
              await SCMCommandExecutor.executeWithSpecialErrorHandling(
                `git diff --cached -M -- ${escapedFile}`,
                repositoryPath,
                { env: envConfig }
              );
            const cachedStdout = cachedResult.stdout.toString();
            if (cachedStdout.trim()) {
              return cachedStdout;
            }
          } catch (e) {
            // 忽略 cached 分支错误，回退到 HEAD 比较
          }
          // 先尝试 HEAD 比较，失败再退回工作区比较
          try {
            const headResult =
              await SCMCommandExecutor.executeWithSpecialErrorHandling(
                `git diff -M HEAD -- ${escapedFile}`,
                repositoryPath,
                { env: envConfig }
              );
            const headStdout = headResult.stdout.toString();
            if (headStdout.trim()) {
              return headStdout;
            }
          } catch (e) {
            // 如果是 bad revision 'HEAD' 等情况，继续回退
          }
          command = `git diff -M -- ${escapedFile}`;
        } else {
          command = `git diff HEAD -- ${escapedFile}`;
        }
      } else {
        // svn
        if (fileStatus === "New File") {
          // 对未跟踪的新文件直接构造统一 diff，不再调用 svn 外部 diff
          return UnifiedDiffProcessor.buildUnifiedDiffForNewFile(
            repositoryPath,
            filePath
          );
        } else {
          command = `diff ${escapedFile}`;
        }
      }

      if (scmType === "git") {
        const result = await SCMCommandExecutor.executeWithSpecialErrorHandling(
          command,
          repositoryPath,
          { env: envConfig }
        );
        stdout = result.stdout.toString();
      } else {
        const result = await SCMCommandExecutor.executeSvn(
          scmCommand,
          command,
          repositoryPath,
          { env: envConfig }
        );
        stdout = result.stdout.toString();
      }

      return stdout || "";
    } catch (error) {
      console.error(`获取文件 ${filePath} 的差异失败:`, error);
      return "";
    }
  }

  /**
   * 处理多个文件的差异
   * @param files 文件路径数组
   * @param repositoryPath 仓库路径
   * @param scmType SCM类型
   * @param scmCommand SCM命令路径
   * @param envConfig 环境配置
   * @returns 合并后的差异输出
   */
  static async processFilesDiff(
    files: string[],
    repositoryPath: string,
    scmType: "git" | "svn",
    scmCommand: string,
    envConfig?: NodeJS.ProcessEnv
  ): Promise<string> {
    let diffOutput = "";

    notify.info(formatMessage("diff.files.selected", [files.length]));

    for (const file of files) {
      const fileStatus = await this.getFileStatus(
        file,
        repositoryPath,
        scmType,
        scmCommand,
        envConfig
      );

      const diffContent = await this.getFileDiff(
        file,
        fileStatus,
        repositoryPath,
        scmType,
        scmCommand,
        envConfig
      );

      if (diffContent.trim() || fileStatus === "Deleted File") {
        diffOutput += SCMPathHandler.formatDiffOutput(
          fileStatus,
          file,
          diffContent
        );
      }
    }

    return diffOutput;
  }

  /**
   * 获取Git差异
   * @private
   */
  private static async getGitDiff(
    repositoryPath: string,
    files?: string[]
  ): Promise<string> {
    // 指定文件：使用逐文件状态与差异逻辑，正确处理新文件/删除文件/已暂存文件
    if (files && files.length > 0) {
      notify.info(formatMessage("diff.files.selected", [files.length]));
      return this.processFilesDiff(files, repositoryPath, "git", "git");
    }

    // 未指定文件：根据配置处理 staged 或 all
    const diffTarget = SCMConfigManager.getDiffTarget();

    if (diffTarget === "staged") {
      // 只获取暂存区更改
      try {
        // 统计暂存区文件数量
        let stagedFilesOutput = "";
        try {
          const { stdout } = await SCMCommandExecutor.execute(
            "git diff --cached --name-only",
            repositoryPath,
            SCMCommandExecutor.createExecOptions(repositoryPath)
          );
          stagedFilesOutput = stdout.toString();
        } catch (e) {
          if (e instanceof Error && (e as any).stdout) {
            stagedFilesOutput = (e as any).stdout.toString();
          } else {
            throw e;
          }
        }
        const fileCount = stagedFilesOutput.split("\n").filter(Boolean).length;
        if (fileCount > 0) {
          notify.info(formatMessage("diff.staged.info", [fileCount]));
        }
      } catch (error) {
        console.warn("Failed to count staged files for notification:", error);
      }

      const { stdout } = await SCMCommandExecutor.execute(
        "git diff --cached",
        repositoryPath,
        SCMCommandExecutor.createExecOptions(repositoryPath)
      );
      return stdout.toString();
    }

    // 获取所有更改：包含已跟踪(工作区)更改、暂存区更改以及未跟踪文件
    // 检查是否存在初始提交（HEAD）
    let hasInitialCommit = true;
    try {
      await SCMCommandExecutor.executeGit(
        "rev-parse HEAD",
        repositoryPath,
        SCMCommandExecutor.createExecOptions(repositoryPath)
      );
    } catch {
      hasInitialCommit = false;
    }

    // 统计文件数量（跟踪、暂存、未跟踪）
    try {
      const getFileNames = async (command: string): Promise<string[]> => {
        let output = "";
        try {
          const result = await SCMCommandExecutor.execute(
            command,
            repositoryPath,
            SCMCommandExecutor.createExecOptions(repositoryPath)
          );
          output = result.stdout.toString();
        } catch (e) {
          if (e instanceof Error && (e as any).stdout) {
            output = (e as any).stdout.toString();
          } else {
            throw e;
          }
        }
        return output.split("\n").filter(Boolean);
      };

      const trackedFiles = hasInitialCommit
        ? await getFileNames("git diff HEAD --name-only")
        : await getFileNames("git diff --name-only");

      const stagedFiles = await getFileNames("git diff --cached --name-only");

      const { stdout: untrackedFilesOutput } = await SCMCommandExecutor.execute(
        "git ls-files --others --exclude-standard",
        repositoryPath,
        SCMCommandExecutor.createExecOptions(repositoryPath)
      );
      const untrackedFiles = untrackedFilesOutput
        .toString()
        .split("\n")
        .filter(Boolean);

      const fileCount = new Set<string>([
        ...trackedFiles,
        ...stagedFiles,
        ...untrackedFiles,
      ]).size;
      if (fileCount > 0) {
        notify.info(formatMessage("diff.all.info", [fileCount]));
      }
    } catch (error) {
      console.warn(
        "Failed to count all changed files for notification:",
        error
      );
    }

    let diffOutput = "";

    // 已跟踪文件变更（工作区 vs HEAD；若无初始提交则工作区 vs 索引）
    try {
      const { stdout } = await SCMCommandExecutor.execute(
        hasInitialCommit ? "git diff HEAD" : "git diff",
        repositoryPath,
        SCMCommandExecutor.createExecOptions(repositoryPath)
      );
      diffOutput += stdout.toString();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("bad revision 'HEAD'")
      ) {
        const { stdout } = await SCMCommandExecutor.execute(
          "git diff",
          repositoryPath,
          SCMCommandExecutor.createExecOptions(repositoryPath)
        );
        diffOutput += stdout.toString();
      } else {
        throw error;
      }
    }

    // 暂存区变更（索引 vs HEAD）
    try {
      const { stdout } = await SCMCommandExecutor.execute(
        "git diff --cached",
        repositoryPath,
        SCMCommandExecutor.createExecOptions(repositoryPath)
      );
      const staged = stdout.toString();
      if (staged.trim()) {
        diffOutput += staged;
      }
    } catch (e) {
      // 忽略暂存区差异错误
    }

    // 未跟踪的新文件（用 /dev/null 比较）
    try {
      const { stdout: untrackedFilesOutput } = await SCMCommandExecutor.execute(
        "git ls-files --others --exclude-standard",
        repositoryPath,
        SCMCommandExecutor.createExecOptions(repositoryPath)
      );
      const untrackedFiles = untrackedFilesOutput
        .toString()
        .split("\n")
        .filter(Boolean);

      for (const file of untrackedFiles) {
        const escapedFile = SCMPathHandler.escapeShellPath(file);
        try {
          const result =
            await SCMCommandExecutor.executeWithSpecialErrorHandling(
              `git diff --no-index /dev/null ${escapedFile}`,
              repositoryPath,
              SCMCommandExecutor.createExecOptions(repositoryPath)
            );
          const newFileDiff = result.stdout.toString();
          if (newFileDiff.trim()) {
            diffOutput += `\n=== New File: ${file} ===\n${newFileDiff}`;
          }
        } catch (e) {
          // 忽略单个未跟踪文件的差异获取错误
        }
      }
    } catch (e) {
      // 忽略获取未跟踪文件列表错误
    }

    return diffOutput;
  }

  /**
   * 获取SVN差异
   * @private
   */
  private static async getSvnDiff(
    repositoryPath: string,
    files?: string[]
  ): Promise<string> {
    try {
      // 获取SVN路径
      const svnPath = await SvnUtils.getSvnPath();
      const envConfig = SCMConfigManager.getSvnEnvironmentConfig();

      let diffOutput = "";

      if (files && files.length > 0) {
        notify.info(formatMessage("diff.files.selected", [files.length]));
        // 处理指定文件的差异
        for (const file of files) {
          const fileStatus = await this.getFileStatus(
            file,
            repositoryPath,
            "svn",
            svnPath,
            envConfig
          );
          const escapedFile = SCMPathHandler.escapeShellPath(file);

          // 对于删除的文件不获取diff内容
          if (fileStatus === "Deleted File") {
            diffOutput += `\n=== ${fileStatus}: ${file} ===\n`;
            continue;
          }

          // 根据文件状态选择合适的diff命令
          let stdout = "";
          if (fileStatus === "New File") {
            // 处理未跟踪的新文件：直接构造统一 diff
            stdout = UnifiedDiffProcessor.buildUnifiedDiffForNewFile(
              repositoryPath,
              file
            );
          } else {
            // 处理已跟踪且修改的文件
            const result = await SCMCommandExecutor.executeSvn(
              svnPath,
              `diff ${escapedFile}`,
              repositoryPath,
              { env: envConfig }
            );
            stdout = result.stdout.toString();
          }

          // 添加文件状态和差异信息
          if (stdout.toString().trim()) {
            diffOutput += `\n=== ${fileStatus}: ${file} ===\n${stdout.toString()}`;
          }
        }
      } else {
        const diffTarget = SCMConfigManager.getDiffTarget();

        if (diffTarget === "staged") {
          // SVN没有暂存区概念，但可以获取已添加到版本控制的文件的更改
          try {
            // 获取已添加到版本控制但未提交的文件列表
            const { stdout: changedFiles } =
              await SCMCommandExecutor.executeSvn(
                svnPath,
                `status --xml`,
                repositoryPath,
                { env: envConfig }
              );

            // 解析XML输出以获取已添加的文件
            const changedFilesStr = changedFiles.toString();
            const addedFiles =
              changedFilesStr.match(
                /<entry[^>]*>\s*<wc-status[^>]*item="added"[^>]*>[\s\S]*?<\/entry>/g
              ) || [];
            const fileCount = addedFiles.length;

            if (fileCount > 0) {
              notify.info(formatMessage("diff.staged.info", [fileCount]));
            }

            // 获取已添加文件的差异（已 svn add 的文件使用 svn 自身的 diff）
            for (const xmlEntry of addedFiles) {
              const pathMatch = xmlEntry.match(/path="([^"]+)"/);
              if (pathMatch && pathMatch[1]) {
                const filePath = pathMatch[1];
                const escapedFile = SCMPathHandler.escapeShellPath(filePath);
                const result = await SCMCommandExecutor.executeSvn(
                  svnPath,
                  `diff ${escapedFile}`,
                  repositoryPath,
                  { env: envConfig }
                );
                diffOutput += `\n=== Added File: ${filePath} ===\n${result.stdout.toString()}`;
              }
            }
          } catch (error) {
            console.warn(
              "Failed to count staged files for notification:",
              error
            );
          }
        } else {
          // 获取所有更改的差异
          try {
            // 获取文件列表函数
            const getFileNames = async (
              statusFilter: string
            ): Promise<string[]> => {
              let output = "";
              try {
                const result = await SCMCommandExecutor.execute(
                  `"${svnPath}" status ${statusFilter} --xml`,
                  repositoryPath,
                  {
                    ...SCMCommandExecutor.createExecOptions(repositoryPath),
                    env: envConfig,
                  }
                );
                output = result.stdout.toString();

                // 解析XML输出以获取文件路径（仅匹配 <entry ... path="...">，避免匹配 <target path="...">）
                const entryMatches =
                  output.match(/<entry\s+[^>]*path="([^"]+)"/g) || [];
                return entryMatches
                  .map((match) => {
                    const m = match.match(/<entry\s+[^>]*path="([^"]+)"/);
                    return m ? m[1] : "";
                  })
                  .filter(Boolean);
              } catch (e) {
                if (e instanceof Error && "stdout" in e) {
                  output = (e as any).stdout.toString();
                  const entryMatches =
                    output.match(/<entry\s+[^>]*path="([^"]+)"/g) || [];
                  return entryMatches
                    .map((match) => {
                      const m = match.match(/<entry\s+[^>]*path="([^"]+)"/);
                      return m ? m[1] : "";
                    })
                    .filter(Boolean);
                } else {
                  throw e;
                }
              }
            };

            // 获取已修改的文件
            const modifiedFiles = await getFileNames("--no-ignore");

            // 通知用户文件数量
            const fileCount = modifiedFiles.length;
            if (fileCount > 0) {
              notify.info(formatMessage("diff.all.info", [fileCount]));
            }

            // 获取所有文件的差异
            const { stdout: allChanges } = await SCMCommandExecutor.executeSvn(
              svnPath,
              `diff`,
              repositoryPath,
              { env: envConfig }
            );

            diffOutput = allChanges.toString();

            // 获取未版本控制的文件列表
            const { stdout: statusOutput } =
              await SCMCommandExecutor.executeSvn(
                svnPath,
                `status`,
                repositoryPath,
                { env: envConfig }
              );

            // 解析未版本控制的文件
            const statusOutputStr = statusOutput.toString();
            const untrackedFiles = statusOutputStr
              .split("\n")
              .filter((line: string) => line.startsWith("?"))
              .map((line: string) => line.substring(1).trim());

            // 为每个未版本控制文件获取差异（直接构造统一 diff）
            if (untrackedFiles.length > 0) {
              for (const file of untrackedFiles) {
                const diffContent =
                  UnifiedDiffProcessor.buildUnifiedDiffForNewFile(
                    repositoryPath,
                    file
                  );
                if (diffContent.trim()) {
                  diffOutput += `\n=== New File: ${file} ===\n${diffContent}`;
                }
              }
            }
          } catch (error) {
            console.warn(
              "Failed to count all changed files for notification:",
              error
            );
          }
        }
      }

      return diffOutput;
    } catch (error) {
      console.error("Failed to get SVN diff:", error);
      throw error;
    }
  }
}
