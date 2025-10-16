import * as childProcess from "child_process";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { Logger } from "../../../utils/logger";
import { getMessage, formatMessage } from "../../../utils/i18n";
import { notify } from "../../../utils/notification/notification-manager";
import { DiffProcessor } from "../../../utils/diff/diff-processor";
import { DiffSimplifier } from "../../../utils";
import { ImprovedPathUtils } from "../../utils/improved-path-utils";
import { ConfigurationManager } from "../../../config/configuration-manager";
import { SvnPathHelper } from "./svn-path-helper";

const exec = promisify(childProcess.exec);

/**
 * SVN差异帮助工具类
 * 提供SVN差异获取和处理相关功能
 */
export class SvnDiffHelper {
  private svnPath: string;
  private logger: Logger;
  private environmentConfig: { path: string[], locale: string };

  /**
   * 创建SVN差异帮助工具实例
   * @param svnPath SVN可执行文件路径
   * @param environmentConfig 环境配置
   */
  constructor(svnPath: string, environmentConfig: { path: string[], locale: string }) {
    this.svnPath = svnPath;
    this.environmentConfig = environmentConfig;
    this.logger = Logger.getInstance("Dish AI Commit Gen");
  }

  /**
   * 获取文件状态
   * @param file 文件路径
   * @param repositoryPath 仓库路径
   * @returns 文件状态描述
   */
  async getFileStatus(file: string, repositoryPath: string): Promise<string> {
    try {
      const { stdout: status } = await exec(
        `"${this.svnPath}" status "${file}"`,
        {
          ...ImprovedPathUtils.createExecOptions(repositoryPath),
          env: SvnPathHelper.getEnvironmentConfig(this.environmentConfig),
        }
      );

      if (!status) {
        return "Unknown";
      }

      const statusStr = status.toString();
      if (statusStr.startsWith("?")) {
        return "New File";
      }
      if (statusStr.startsWith("D")) {
        return "Deleted File";
      }
      return "Modified File";
    } catch (error) {
      this.logger.error(error as Error);
      return "Unknown";
    }
  }

  /**
   * 获取文件差异
   * @param repositoryPath 仓库路径
   * @param files 可选的文件路径数组
   * @returns 差异文本，如果没有差异则返回undefined
   */
  async getDiff(repositoryPath: string, files?: string[]): Promise<string | undefined> {
    try {
      let diffOutput = "";

      if (files && files.length > 0) {
        // 处理指定文件的差异
        for (const file of files) {
          const fileStatus = await this.getFileStatus(file, repositoryPath);
          const escapedFile = ImprovedPathUtils.escapeShellPath(file);

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
              // 使用 ImprovedPathUtils 创建临时空文件用于比较
              const tempEmptyFile = ImprovedPathUtils.createTempFilePath(
                "empty-file-for-diff"
              );
              fs.writeFileSync(tempEmptyFile, "");

              const result = await exec(
                `"${
                  this.svnPath
                }" diff --diff-cmd diff -x "-u" ${ImprovedPathUtils.escapeShellPath(
                  tempEmptyFile
                )} ${escapedFile}`,
                ImprovedPathUtils.createExecOptions(repositoryPath)
              );
              stdout = result.stdout.toString();

              // 清理临时文件
              try {
                fs.unlinkSync(tempEmptyFile);
              } catch (e) {
                // 忽略清理错误
              }
            } catch (error) {
              // 如果外部diff命令失败，尝试使用内置diff
              if (error instanceof Error && "stdout" in error) {
                stdout = (error as any).stdout.toString();
              } else {
                // 回退到读取整个文件内容
                const fileContent = fs.readFileSync(file, "utf8");
                stdout = `--- /dev/null\n+++ ${file}\n@@ -0,0 +1,${
                  fileContent?.split("\n").length
                } @@\n${fileContent
                  ?.split("\n")
                  .map((line) => `+${line}`)
                  .join("\n")}`;
              }
            }
          } else {
            // 处理已跟踪且修改的文件
            try {
              const result = await exec(
                `"${this.svnPath}" diff ${escapedFile}`,
                {
                  ...ImprovedPathUtils.createExecOptions(repositoryPath),
                  env: SvnPathHelper.getEnvironmentConfig(this.environmentConfig),
                }
              );
              stdout = result.stdout.toString();
            } catch (error) {
              if (error instanceof Error && "stdout" in error) {
                stdout = (error as any).stdout.toString();
              } else {
                throw error;
              }
            }
          }

          // 添加文件状态和差异信息
          if (stdout.toString()?.trim()) {
            diffOutput += `\n=== ${fileStatus}: ${file} ===\n${stdout.toString()}`;
          }
        }
      } else {
        // 获取所有未版本控制的文件差异
        diffOutput = await this.getAllChangesDiff(repositoryPath);
      }

      if (!diffOutput?.trim()) {
        // No changes detected
        return undefined;
      }

      // 获取配置
      const configManager = ConfigurationManager.getInstance();
      const enableSimplification = configManager.getConfig(
        "FEATURES_CODEANALYSIS_SIMPLIFYDIFF"
      );

      // 根据配置决定是否简化diff
      if (enableSimplification) {
        notify.warn("diff.simplification.warning");
        return DiffSimplifier.simplify(diffOutput);
      }

      // 处理diff以获取结构化数据，包括原始文件内容
      return DiffProcessor.process(diffOutput, "svn");
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(formatMessage("scm.diff.error", ["SVN", error]));
      }
      throw error;
    }
  }

  /**
   * 获取所有更改的差异
   * @param repositoryPath 仓库路径
   * @returns 所有更改的差异文本
   * @private
   */
  private async getAllChangesDiff(repositoryPath: string): Promise<string> {
    const diffTarget = ConfigurationManager.getInstance().getConfig(
      "FEATURES_CODEANALYSIS_DIFFTARGET"
    ) || "all";
    let diffOutput = "";

    if (diffTarget === "staged") {
      // SVN没有暂存区概念，但可以获取已添加到版本控制的文件的更改
      try {
        // 获取已添加到版本控制但未提交的文件列表
        const { stdout: changedFiles } = await exec(
          `"${this.svnPath}" status --xml`,
          {
            ...ImprovedPathUtils.createExecOptions(repositoryPath),
            env: SvnPathHelper.getEnvironmentConfig(this.environmentConfig),
          }
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

        // 获取已添加文件的差异
        for (const xmlEntry of addedFiles) {
          const pathMatch = xmlEntry.match(/path="([^"]+)"/);
          if (pathMatch && pathMatch[1]) {
            const filePath = pathMatch[1];
            const escapedFile = ImprovedPathUtils.escapeShellPath(filePath);

            try {
              // 使用 ImprovedPathUtils 创建临时空文件用于比较
              const tempEmptyFile = ImprovedPathUtils.createTempFilePath(
                "empty-file-for-diff"
              );
              fs.writeFileSync(tempEmptyFile, "");

              const result = await exec(
                `"${
                  this.svnPath
                }" diff --diff-cmd diff -x "-u" ${ImprovedPathUtils.escapeShellPath(
                  tempEmptyFile
                )} ${escapedFile}`,
                ImprovedPathUtils.createExecOptions(repositoryPath)
              );
              diffOutput += `\n=== Added File: ${filePath} ===\n${result.stdout.toString()}`;

              // 清理临时文件
              try {
                fs.unlinkSync(tempEmptyFile);
              } catch (e) {
                // 忽略清理错误
              }
            } catch (error) {
              if (error instanceof Error && "stdout" in error) {
                diffOutput += `\n=== Added File: ${filePath} ===\n${(
                  error as any
                ).stdout.toString()}`;
              }
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to count staged files for notification: ${error}`);
      }
    } else {
      // 获取所有更改的差异
      try {
        // 获取文件列表函数
        const getFileNames = async (statusFilter: string): Promise<string[]> => {
          let output = "";
          try {
            const result = await exec(
              `"${this.svnPath}" status ${statusFilter} --xml`,
              {
                ...ImprovedPathUtils.createExecOptions(repositoryPath),
                env: SvnPathHelper.getEnvironmentConfig(this.environmentConfig),
              }
            );
            output = result.stdout.toString();

            // 解析XML输出以获取文件路径
            const fileMatches = output.match(/path="([^"]+)"/g) || [];
            return fileMatches.map((match) => match.replace(/path="([^"]+)"/, "$1"));
          } catch (e) {
            if (e instanceof Error && "stdout" in e) {
              output = (e as any).stdout.toString();
              const fileMatches = output.match(/path="([^"]+)"/g) || [];
              return fileMatches.map((match) => match.replace(/path="([^"]+)"/, "$1"));
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
        const { stdout: allChanges } = await exec(`"${this.svnPath}" diff`, {
          ...ImprovedPathUtils.createExecOptions(repositoryPath),
          env: SvnPathHelper.getEnvironmentConfig(this.environmentConfig),
        });

        diffOutput = allChanges.toString();

        // 获取未版本控制的文件列表
        const { stdout: statusOutput } = await exec(`"${this.svnPath}" status`, {
          ...ImprovedPathUtils.createExecOptions(repositoryPath),
          env: SvnPathHelper.getEnvironmentConfig(this.environmentConfig),
        });

        // 解析未版本控制的文件
        const statusOutputStr = statusOutput.toString();
        const untrackedFiles = statusOutputStr
          ?.split("\n")
          .filter((line: string) => line.startsWith("?"))
          .map((line: string) => line.substring(1)?.trim());

        // 为每个未版本控制文件获取差异
        if (untrackedFiles?.length > 0) {
          for (const file of untrackedFiles) {
            const escapedFile = ImprovedPathUtils.escapeShellPath(file);
            // 生成并添加差异信息
            await this.addUntrackedFileDiff(escapedFile, file, repositoryPath, diffOutput);
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to count all changed files for notification: ${error}`);
      }
    }

    return diffOutput;
  }

  /**
   * 为未跟踪文件添加差异信息
   * @param escapedFile 转义后的文件路径
   * @param file 原始文件路径
   * @param repositoryPath 仓库路径
   * @param diffOutput 要追加差异的字符串
   * @private
   */
  private async addUntrackedFileDiff(escapedFile: string, file: string, repositoryPath: string, diffOutput: string): Promise<string> {
    try {
      // 使用 ImprovedPathUtils 创建临时空文件用于比较
      const tempEmptyFile = ImprovedPathUtils.createTempFilePath("empty-file-for-diff");
      fs.writeFileSync(tempEmptyFile, "");

      const result = await exec(
        `"${this.svnPath}" diff --diff-cmd diff -x "-u" ${ImprovedPathUtils.escapeShellPath(
          tempEmptyFile
        )} ${escapedFile}`,
        ImprovedPathUtils.createExecOptions(repositoryPath)
      );
      diffOutput += `\n=== New File: ${file} ===\n${result.stdout.toString()}`;

      // 清理临时文件
      try {
        fs.unlinkSync(tempEmptyFile);
      } catch (e) {
        // 忽略清理错误
      }
    } catch (error) {
      // 如果外部diff命令失败，尝试使用内置diff
      if (error instanceof Error && "stdout" in error) {
        diffOutput += `\n=== New File: ${file} ===\n${(error as any).stdout.toString()}`;
      } else {
        // 回退到读取整个文件内容
        try {
          const fileContent = fs.readFileSync(
            path.join(repositoryPath, file),
            "utf8"
          );
          const diffContent = `--- /dev/null\n+++ ${file}\n@@ -0,0 +1,${
            fileContent?.split("\n").length
          } @@\n${fileContent?.split("\n").map((line) => `+${line}`).join("\n")}`;
          diffOutput += `\n=== New File: ${file} ===\n${diffContent}`;
        } catch (readError) {
          this.logger.error(`Failed to read file ${file}: ${readError}`);
        }
      }
    }
    return diffOutput;
  }
}
