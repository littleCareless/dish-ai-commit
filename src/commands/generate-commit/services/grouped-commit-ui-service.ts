import { SemanticCommitGroup } from "@/commands/generate-commit/types";
import { applyCommitMessageToInput } from "@/commands/generate-commit/utils/commit-formatter";
import { ISCMProvider } from "@/scm/scm-provider";
import { Logger } from "@/utils/logger";
import { execFile } from "child_process";
import * as path from "path";
import { promisify } from "util";
import * as vscode from "vscode";

const execFileAsync = promisify(execFile);
const MAX_FILES_PER_GIT_COMMAND = 150;

interface GroupQuickPickItem extends vscode.QuickPickItem {
  group: SemanticCommitGroup;
}

export interface GroupedCommitApplyInput {
  groups: SemanticCommitGroup[];
  selectedFiles: string[];
  repositoryPath?: string;
  scmProvider: ISCMProvider;
  resolveCommitMessage?: (
    group: SemanticCommitGroup,
  ) => Promise<string | undefined>;
}

export interface GroupedCommitApplyResult {
  status: "applied" | "cancelled" | "failed";
  group?: SemanticCommitGroup;
  message?: string;
  error?: string;
}

export class GroupedCommitUiService {
  constructor(private readonly logger: Logger) {}

  async pickAndApplyGroup(
    input: GroupedCommitApplyInput,
  ): Promise<GroupedCommitApplyResult> {
    const pickedGroup = await this.pickGroup(input.groups, input.repositoryPath);
    if (!pickedGroup) {
      return { status: "cancelled" };
    }

    if (input.scmProvider.type === "git") {
      if (!input.repositoryPath) {
        return {
          status: "failed",
          error: "Repository path is required for grouped staging.",
        };
      }

      try {
        await this.applyGitGroup(
          input.repositoryPath,
          pickedGroup.files,
          input.selectedFiles,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to apply grouped git staging: ${message}`);
        return {
          status: "failed",
          group: pickedGroup,
          error: message,
        };
      }
    }

    let resolvedCommitMessage: string | undefined;
    try {
      resolvedCommitMessage = input.resolveCommitMessage
        ? await input.resolveCommitMessage(pickedGroup)
        : pickedGroup.commitMessage;
    } catch (error) {
      return {
        status: "failed",
        group: pickedGroup,
        error:
          error instanceof Error
            ? error.message
            : "Failed to resolve grouped commit message.",
      };
    }

    const applyResult = await applyCommitMessageToInput(
      input.scmProvider,
      resolvedCommitMessage,
    );
    if (!applyResult.applied) {
      return {
        status: "failed",
        group: pickedGroup,
        error: "Grouped commit message is empty after normalization.",
      };
    }

    return {
      status: "applied",
      group: pickedGroup,
      message: applyResult.message,
    };
  }

  private async pickGroup(
    groups: SemanticCommitGroup[],
    repositoryPath?: string,
  ): Promise<SemanticCommitGroup | undefined> {
    const items: GroupQuickPickItem[] = groups.map((group, index) => {
      const preview = group.files
        .slice(0, 4)
        .map((file) => this.toRelativePath(file, repositoryPath))
        .join(", ");
      const previewSuffix = group.files.length > 4 ? " ..." : "";

      return {
        label: `${index + 1}. ${group.title} (${group.files.length})`,
        description: group.commitMessage,
        detail: `${group.reason} | ${preview}${previewSuffix}`,
        group,
      };
    });

    const picked = await vscode.window.showQuickPick(items, {
      title: "选择分组并一键应用",
      placeHolder: "应用后会暂存该分组文件，移除本次选择中的其他文件，并填入提交信息",
      matchOnDescription: true,
      matchOnDetail: true,
      ignoreFocusOut: true,
    });

    return picked?.group;
  }

  private async applyGitGroup(
    repositoryPath: string,
    groupFiles: string[],
    selectedFiles: string[],
  ): Promise<void> {
    const selectedRelativeFiles = this.toUniqueRelativePaths(
      selectedFiles,
      repositoryPath,
    );
    const groupRelativeFiles = this.toUniqueRelativePaths(groupFiles, repositoryPath);

    if (groupRelativeFiles.length === 0) {
      throw new Error("No files resolved for selected semantic group.");
    }

    await this.runGitFileCommand(repositoryPath, ["add", "--"], groupRelativeFiles);

    if (selectedRelativeFiles.length === 0) {
      return;
    }

    const stagedSelectedFiles = await this.getStagedFilesWithinSelection(
      repositoryPath,
      selectedRelativeFiles,
    );
    const groupSet = new Set(groupRelativeFiles.map((file) => this.normalizePath(file)));
    const filesToUnstage = stagedSelectedFiles.filter(
      (file) => !groupSet.has(this.normalizePath(file)),
    );

    if (filesToUnstage.length === 0) {
      return;
    }

    try {
      await this.runGitFileCommand(
        repositoryPath,
        ["reset", "-q", "HEAD", "--"],
        filesToUnstage,
      );
    } catch (error) {
      this.logger.warn("git reset failed during grouped staging, fallback to git restore --staged", {
        operation: "GroupedCommitUiService.applyGitGroup",
        data: {
          error: error instanceof Error ? error.message : String(error),
          fileCount: filesToUnstage.length,
        },
      });
      await this.runGitFileCommand(
        repositoryPath,
        ["restore", "--staged", "--"],
        filesToUnstage,
      );
    }
  }

  private async getStagedFilesWithinSelection(
    repositoryPath: string,
    selectedRelativeFiles: string[],
  ): Promise<string[]> {
    const stagedFiles = new Set<string>();

    for (const chunk of this.chunkFiles(selectedRelativeFiles)) {
      const output = await this.runGitCommand(repositoryPath, [
        "diff",
        "--cached",
        "--name-only",
        "--",
        ...chunk,
      ]);
      output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((file) => stagedFiles.add(this.normalizePath(file)));
    }

    return Array.from(stagedFiles);
  }

  private async runGitFileCommand(
    repositoryPath: string,
    prefixArgs: string[],
    files: string[],
  ): Promise<void> {
    for (const chunk of this.chunkFiles(files)) {
      await this.runGitCommand(repositoryPath, [...prefixArgs, ...chunk]);
    }
  }

  private async runGitCommand(
    repositoryPath: string,
    args: string[],
  ): Promise<string> {
    const { stdout } = await execFileAsync("git", args, {
      cwd: repositoryPath,
      maxBuffer: 1024 * 1024 * 10,
    });
    return stdout ?? "";
  }

  private chunkFiles(files: string[]): string[][] {
    if (files.length === 0) {
      return [];
    }

    const chunks: string[][] = [];
    for (let index = 0; index < files.length; index += MAX_FILES_PER_GIT_COMMAND) {
      chunks.push(files.slice(index, index + MAX_FILES_PER_GIT_COMMAND));
    }
    return chunks;
  }

  private toUniqueRelativePaths(
    files: string[],
    repositoryPath: string,
  ): string[] {
    return Array.from(
      new Set(
        files
          .map((file) => this.toRelativePath(file, repositoryPath))
          .map((file) => this.normalizePath(file))
          .filter(Boolean),
      ),
    );
  }

  private toRelativePath(filePath: string, repositoryPath?: string): string {
    if (repositoryPath && path.isAbsolute(filePath)) {
      const relativePath = path.relative(repositoryPath, filePath);
      if (
        relativePath &&
        !relativePath.startsWith("..") &&
        !path.isAbsolute(relativePath)
      ) {
        return relativePath;
      }
    }
    return filePath;
  }

  private normalizePath(filePath: string): string {
    return (filePath || "")
      .replace(/\\/g, "/")
      .replace(/^\.\//, "")
      .trim();
  }
}
