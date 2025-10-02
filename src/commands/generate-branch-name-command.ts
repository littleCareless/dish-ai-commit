import * as vscode from "vscode";
import { BaseCommand } from "./base-command";
import { SCMDetectorService } from "../services/scm-detector-service";
import { getMessage, formatMessage } from "../utils/i18n";
import {
  notify,
  withProgress,
} from "../utils/notification/notification-manager";
import { validateAndGetModel } from "../utils/ai/model-validation";
import { API, GitExtension, Ref, Repository } from "../types/git";
import { Logger } from "../utils/logger";

interface RefQuickPickItem extends vscode.QuickPickItem {
  ref: Ref;
}

/**
 * 获取 VS Code 内置的 Git 扩展 API
 * @returns {Promise<API | undefined>}
 */
async function getGitApi(): Promise<API | undefined> {
  const logger = Logger.getInstance("Dish AI Commit Gen");
  try {
    logger.info("Getting Git API...");
    const extension =
      vscode.extensions.getExtension<GitExtension>("vscode.git");
    if (!extension) {
      logger.warn("Git extension not found.");
      notify.warn(getMessage("git.extension.not.found"));
      return undefined;
    }
    if (!extension.isActive) {
      logger.info("Git extension is not active, activating...");
      await extension.activate();
      logger.info("Git extension activated.");
    }
    const api = extension.exports.getAPI(1);
    if (api) {
      logger.info("Git API successfully retrieved.");
    } else {
      logger.warn("Failed to get Git API from extension exports.");
    }
    return api;
  } catch (error) {
    logger.error(`Failed to get Git API: ${error}`);
    notify.error(getMessage("git.api.failed.to.get"));
    return undefined;
  }
}

/**
 * 分支名称生成命令类
 * 负责执行分支名称生成流程，收集文件差异，调用AI进行分析，并提供分支名称建议
 * @extends {BaseCommand}
 */
export class GenerateBranchNameCommand extends BaseCommand {
  /**
   * 执行分支名称生成命令
   * @param {vscode.SourceControlResourceState[] | undefined} resources - 源代码管理资源状态列表，代表需要分析的文件
   * @returns {Promise<void>}
   */
  async execute(
    resources?: vscode.SourceControlResourceState[]
  ): Promise<void> {
    this.logger.info("Executing GenerateBranchNameCommand...");
    if ((await this.showConfirmAIProviderToS()) === false) {
      this.logger.warn("User did not confirm AI provider ToS.");
      return;
    }
    const configResult = await this.handleConfiguration();
    if (!configResult) {
      this.logger.warn("Configuration is not valid.");
      return;
    }

    const { config, configuration } = this.getExtConfig();
    let { provider, model } = configResult;

    try {
      await withProgress(
        getMessage("generating.branch.name"),
        async (progress) => {
          progress.report({
            increment: 5,
            message: getMessage("validating.model"),
          });
          const { aiProvider, selectedModel } = await validateAndGetModel(
            provider,
            model
          );
          this.logger.info(
            `Model validated. AI Provider: ${aiProvider.getId()}, Model: ${
              selectedModel?.id
            }`
          );

          let aiInputContent: string | undefined;
          // Default SCM context for description mode, real provider for SCM mode
          let scmProviderForContext: { type: string; [key: string]: any } = {
            type: "git",
          };
          let progressMessageKeyGettingContent = "processing.description"; // i18n key
          let progressMessageKeyAnalyzing = "analyzing.description"; // i18n key

          const generationMode = await vscode.window.showQuickPick(
            [
              {
                label: getMessage("branch.gen.mode.from.changes.label"),
                description: getMessage(
                  "branch.gen.mode.from.changes.description"
                ),
                detail: getMessage("branch.gen.mode.from.changes.detail"),
              },
              {
                label: getMessage("branch.gen.mode.from.description.label"),
                description: getMessage(
                  "branch.gen.mode.from.description.description"
                ),
                detail: getMessage("branch.gen.mode.from.description.detail"),
              },
            ],
            {
              placeHolder: getMessage("branch.gen.mode.select.placeholder"),
              ignoreFocusOut: true,
            }
          );

          if (!generationMode) {
            this.logger.info(
              "User cancelled branch name generation mode selection."
            );
            return; // User cancelled
          }
          this.logger.info(
            `User selected generation mode: ${generationMode.label}`
          );

          if (
            generationMode.label ===
            getMessage("branch.gen.mode.from.description.label")
          ) {
            const description = await vscode.window.showInputBox({
              prompt: getMessage("enter.branch.description.prompt"),
              placeHolder: getMessage("enter.branch.description.placeholder"),
              ignoreFocusOut: true,
            });

            if (!description) {
              this.logger.info("User cancelled entering branch description.");
              notify.info("branch.description.cancelled");
              return;
            }
            aiInputContent = description;
            this.logger.info(`User provided description: ${description}`);
            // SCM provider is not detected in this mode, but we need a type for the prompt
            scmProviderForContext = { type: "git" };
          } else {
            let selectedFiles = SCMDetectorService.getSelectedFiles(resources);

            // If no files are explicitly selected (e.g., command run from palette),
            // get all changes. `getDiff` handles `undefined` by getting all changes.
            if (!selectedFiles || selectedFiles.length === 0) {
              selectedFiles = undefined;
            }

            progressMessageKeyGettingContent = "getting.file.changes";
            progressMessageKeyAnalyzing = "analyzing.code.changes";

            progress.report({
              increment: 5,
              message: getMessage("detecting.scm.provider"),
            });
            const result = await this.detectSCMProvider(selectedFiles);
            if (!result) {
              // detectSCMProvider usually shows a notification if it fails
              this.logger.warn("SCM provider not detected.");
              return;
            }
            const { scmProvider: detectedScmProvider } = result;
            this.logger.info(
              `SCM provider detected: ${detectedScmProvider.type}`
            );
            if (detectedScmProvider.type !== "git") {
              this.logger.warn(
                "Branch name generation is only supported for Git."
              );
              await notify.warn("branch.name.git.only");
              return;
            }
            scmProviderForContext = detectedScmProvider; // Store the real SCM provider

            progress.report({
              increment: 10,
              message: getMessage(progressMessageKeyGettingContent),
            });
            aiInputContent = await detectedScmProvider.getDiff(selectedFiles);
            if (!aiInputContent) {
              this.logger.warn(
                "No diff content found for branch name generation."
              );
              await notify.warn(getMessage("no.changes.found"));
              return;
            }
            this.logger.info(
              `Diff content collected for branch name generation. Length: ${aiInputContent.length}`
            );
          }

          if (!aiInputContent) {
            // This case should ideally not be reached if logic above is correct
            this.logger.error("Internal error: No AI input content available.");
            await notify.error(getMessage("internal.error.no.ai.input")); // New i18n key
            return;
          }

          // Generate branch name
          progress.report({
            increment: 40,
            message: getMessage(progressMessageKeyAnalyzing),
          });

          const branchNameResult = await aiProvider?.generateBranchName?.({
            ...configuration.base,
            ...configuration.features.branchName,
            diff: aiInputContent, // This is either actual diff or user description
            model: selectedModel,
            scm: scmProviderForContext.type, // Use type from the determined SCM context
          });

          if (!branchNameResult?.content) {
            this.logger.error("AI failed to generate branch name.");
            await notify.error(getMessage("branch.name.generation.failed"));
            return;
          }
          this.logger.info(
            `AI generated branch name: ${branchNameResult.content}`
          );

          progress.report({
            increment: 25, // Adjusted increment
            message: getMessage("preparing.results"),
          });

          // Show branch name suggestion
          // The second argument to showBranchNameSuggestion is 'any'.
          // It's not strictly used for git commands as `vscode.commands.executeCommand("git.checkout", ...)` is used.
          // Passing scmProviderForContext which has at least a 'type' property.
          await this.showBranchNameSuggestion(
            branchNameResult.content,
            scmProviderForContext
          );
          progress.report({
            increment: 100,
          });
        }
      );
    } catch (error) {
      this.logger.error("GenerateBranchNameCommand error");
      await this.handleError(error, "branch.name.generation.failed");
    }
  }

  /**
   * 显示分支名称建议并提供创建分支的选项
   * @param {string} branchName - AI生成的分支名称建议
   * @param {any} scmProvider - SCM提供程序实例
   * @returns {Promise<void>}
   */
  private async showBranchNameSuggestion(
    branchName: string,
    scmProvider: any
  ): Promise<void> {
    this.logger.info("Showing branch name suggestion QuickPick...");
    // 处理生成的分支名称：去除空格、特殊字符等
    const formattedBranchName = this.formatBranchName(branchName);

    // 生成多个分支名称变体供用户选择
    const branchSuggestions = this.generateBranchVariants(formattedBranchName);

    // 使用QuickPick来显示多个分支名称建议
    const quickPick = vscode.window.createQuickPick();
    quickPick.title = getMessage("branch.name.suggestions");
    quickPick.placeholder = getMessage("select.or.edit.branch.name");

    // 设置分支名称选项
    quickPick.items = branchSuggestions.map((branch) => ({
      label: branch,
      description: branch.includes("/") ? branch?.split("/")[0] : "", // 显示分支类型（如果有）
    }));

    // 允许用户自定义输入
    quickPick.canSelectMany = false;
    quickPick.ignoreFocusOut = true;

    return new Promise<void>((resolve) => {
      // 处理用户确认选择
      quickPick.onDidAccept(async () => {
        const selectedBranch =
          quickPick.selectedItems[0]?.label || quickPick.value;
        this.logger.info(`User selected or entered branch name: ${selectedBranch}`);
        quickPick.hide();

        // 显示操作选项
        const createBranch = getMessage("create.branch");
        const copyToClipboard = getMessage("copy.to.clipboard");

        // selectedBranch,

        const selection = await notify.info(
          "branch.name.selected",
          [selectedBranch],
          {
            buttons: [createBranch, copyToClipboard],
          }
        );

        if (selection === createBranch) {
          this.logger.info(`User chose to create branch: ${selectedBranch}`);
          // 将分支名称复制到剪贴板
          await vscode.env.clipboard.writeText(selectedBranch);
          await createBranchFromGeneratedName(selectedBranch);
        } else if (selection === copyToClipboard) {
          this.logger.info(`User chose to copy branch name: ${selectedBranch}`);
          try {
            // 将分支名称复制到剪贴板
            await vscode.env.clipboard.writeText(selectedBranch);
            this.logger.info(
              `Branch name '${selectedBranch}' copied to clipboard.`
            );
            notify.info("branch.name.copied");
          } catch (error) {
            this.logger.error(
              `Failed to copy branch name to clipboard: ${error}`
            );
            notify.error("branch.name.copy.failed");
          }
        } else {
          this.logger.info("User dismissed the branch action notification.");
        }

        resolve();
      });

      // 处理用户取消
      quickPick.onDidHide(() => {
        this.logger.info("Branch name suggestion QuickPick was hidden/cancelled.");
        resolve();
      });

      quickPick.show();
    });
  }

  /**
   * 根据基础分支名生成多个变体供选择
   * @param {string} baseBranchName - 基础分支名称
   * @returns {string[]} 分支名变体数组
   */
  private generateBranchVariants(baseBranchName: string): string[] {
    this.logger.info(`Generating branch variants for base name: ${baseBranchName}`);
    const variants: string[] = [];

    // 检查是否已有类型前缀
    const hasTypePrefix = baseBranchName.includes("/");
    const baseNameOnly = hasTypePrefix
      ? baseBranchName.substring(baseBranchName.indexOf("/") + 1)
      : baseBranchName;

    // 添加原始分支名
    variants.push(baseBranchName);

    // 如果没有类型前缀，添加几个常用类型的变体
    if (!hasTypePrefix) {
      variants.push(`feature/${baseBranchName}`);
      variants.push(`fix/${baseBranchName}`);
      variants.push(`refactor/${baseBranchName}`);
    }

    // 添加在kebab-case和camelCase之间转换的变体
    if (baseBranchName.includes("-")) {
      // 转换为camelCase
      const camelCase = baseNameOnly.replace(/-([a-z])/g, (_, char) =>
        char.toUpperCase()
      );
      if (!hasTypePrefix) {
        variants.push(camelCase);
      } else {
        const prefix = baseBranchName.substring(
          0,
          baseBranchName.indexOf("/") + 1
        );
        variants.push(`${prefix}${camelCase}`);
      }
    }
    const finalVariants = [...new Set(variants)];
    this.logger.info(`Generated variants: ${finalVariants.join(", ")}`);
    return finalVariants; // 去除可能的重复项
  }

  /**
   * 格式化分支名称，使其符合Git分支命名规范
   * @param {string} branchName - 原始分支名称
   * @returns {string} 格式化后的分支名称
   */
  private formatBranchName(branchName: string): string {
    this.logger.info(`Formatting branch name: '${branchName}'`);
    // 去除多余的空格
    let formatted = branchName?.trim();

    // 如果有冒号或类似的前缀格式，保留它
    if (
      !formatted.includes("/") &&
      (formatted.includes(":") || formatted.includes("-"))
    ) {
      // 尝试提取类型前缀 (例如 "feature: xxx" 或 "feat: xxx")
      const match = formatted.match(/^(\w+)[:|-]/);
      if (match) {
        const prefix = match[1].toLowerCase();
        formatted = formatted.replace(/^(\w+)[:|-]\s*/, "");

        // 根据常见的git流类型添加/分隔符
        if (
          [
            "feature",
            "feat",
            "fix",
            "bugfix",
            "hotfix",
            "release",
            "chore",
            "docs",
            "style",
            "refactor",
            "perf",
            "test",
            "build",
            "ci",
          ].includes(prefix)
        ) {
          formatted = `${prefix}/${formatted}`;
        }
      }
    }

    // 转换为小写并替换空格为连字符
    formatted = formatted.toLowerCase().replace(/\s+/g, "-");

    // 删除不允许在Git分支名称中使用的特殊字符
    formatted = formatted.replace(/[~^:?*[\]\\]/g, "");

    // 确保没有连续的连字符
    formatted = formatted.replace(/--+/g, "-");

    // 去除开头和结尾的连字符
    formatted = formatted.replace(/^-+|-+$/g, "");
    this.logger.info(`Formatted branch name is: '${formatted}'`);
    return formatted;
  }
}

/**
 * Creates a new branch from a generated name, following a prioritized hierarchy of approaches.
 *
 * @param {string} generatedBranchName - The desired name for the new branch.
 * @returns {Promise<void>}
 */
async function createBranchFromGeneratedName(
  generatedBranchName: string
): Promise<void> {
  const logger = Logger.getInstance("Dish AI Commit Gen");
  logger.info(
    `Attempting to create branch: '${generatedBranchName}'`
  );

  const gitApi = await getGitApi();
  if (!gitApi) {
    logger.error("Cannot create branch: Git API not found.");
    notify.error("git.api.not.found");
    return;
  }

  if (gitApi.repositories.length === 0) {
    logger.error("Cannot create branch: No Git repositories found.");
    notify.error("git.repo.not.found");
    return;
  }

  // For simplicity, we'll use the first repository.
  // In a multi-repo workspace, you might need to let the user choose.
  const repository = gitApi.repositories[0];
  logger.info(`Using repository: ${repository.rootUri.fsPath}`);

  // =================================================================================
  // 1. Primary Approach: Programmatically invoke `git.branchFrom` with a pre-filled name.
  // Rationale: This provides the best UX by using the native VS Code UI.
  // The user can see the pre-filled name, edit it, and select the source ref
  // from a familiar QuickPick menu that includes all branches and tags.
  // Note: As of VS Code 1.90, there's no documented way to pre-fill the name
  // for the `git.branchFrom` command's input box directly. We attempt a common
  // pattern, but expect it may not work, leading to the fallback.
  // The command itself will handle the rest of the flow (picking source, creating).
  // =================================================================================
  // try {
  //   logger.info("Trying primary approach: executeCommand('git.branchFrom')");
  //   // We execute `git.branchFrom` and pass the generated name as the first argument.
  //   // This is an attempt to pre-populate the input field. If the command doesn't
  //   // support this, it might ignore it or throw an error.
  //   await vscode.commands.executeCommand("git.branchFrom", generatedBranchName);
  //   // If the command executes without error, we assume it has taken control.
  //   // The user will complete the process in the VS Code UI.
  //   // We can't be certain it worked as intended (pre-filling), but we've handed off control.
  //   logger.info("Handed off control to 'git.branchFrom' command.");
  //   notify.info("branch.creation.initiated", [generatedBranchName]);
  //   return; // Hand-off complete.
  // } catch (error) {
  //   logger.warn(
  //     "Primary approach (`git.branchFrom` with pre-filled name) failed. Falling back.",
  //     error
  //   );
  //   // Fall through to the secondary approach if the primary one fails.
  // }

  // =================================================================================
  // 2. Secondary (Fallback) Approach: Use the core VS Code Git API.
  // Rationale: If the native command can't be pre-filled, this is the next best
  // thing. It gives us full programmatic control. We manually fetch all
  // references, show a QuickPick for the user to select a source, and then
  // create and check out the branch.
  // =================================================================================
  logger.info("Trying secondary approach: Git API");
  try {
    const refs = await repository.getRefs({});
    if (refs.length === 0) {
      logger.error("Cannot create branch: No refs found in the repository.");
      notify.error("git.no.refs.found");
      return;
    }
    logger.info(`Found ${refs.length} refs. Showing QuickPick for source ref.`);

    // Filter and map refs for the QuickPick menu
    const quickPickItems: RefQuickPickItem[] = refs
      .filter((ref: Ref) => ref.name) // Ensure ref has a name
      .map(
        (ref: Ref): RefQuickPickItem => ({
          label: ref.name || getMessage("git.unnamed.ref"),
          description: `${
            ref.type === 1
              ? getMessage("git.ref.type.branch")
              : ref.type === 2
              ? getMessage("git.ref.type.tag")
              : getMessage("git.ref.type.remote")
          }`,
          detail: ` $(git-commit) ${ref.commit?.slice(0, 7)}`,
          ref,
        })
      );

    const selectedItem = await vscode.window.showQuickPick<RefQuickPickItem>(
      quickPickItems,
      {
        placeHolder: getMessage("select.base.branch.placeholder"),
        ignoreFocusOut: true,
        title: getMessage("select.source.for.new.branch.title"),
      }
    );

    if (!selectedItem) {
      logger.info("User cancelled branch creation at source ref selection.");
      notify.info("branch.creation.cancelled");
      return; // User cancelled
    }

    const sourceRef = selectedItem.ref;
    logger.info(`User selected source ref: ${sourceRef.name}`);

    // Check for existing refs that could conflict
    const conflictingRef = refs.find((ref) => {
      if (!ref.name) {
        return false;
      }
      // Check if the generated name is a parent path of an existing ref,
      // or if an existing ref is a parent path of the generated name.
      return (
        ref.name.startsWith(`${generatedBranchName}/`) ||
        generatedBranchName.startsWith(`${ref.name}/`)
      );
    });

    if (conflictingRef) {
      const errorMessage = formatMessage("branch.name.conflicts", [
        generatedBranchName,
        conflictingRef.name,
      ]);
      logger.error(errorMessage);
      notify.error(errorMessage);
      return;
    }
    //
    //
    logger.info(
      `Creating branch '${generatedBranchName}' from '${sourceRef.name}' (${sourceRef.commit})`
    );
    await repository.createBranch(generatedBranchName, true, sourceRef.commit);
    logger.info("Branch created successfully via Git API.");
    notify.info("branch.created.from", [generatedBranchName, sourceRef.name]);
    return;
  } catch (error: any) {
    logger.error(`Secondary approach (Git API) failed: ${error}`);
    if (error.gitErrorCode === "CantLockRef") {
      notify.error("branch.name.conflicts.generic");
    } else {
      notify.error("branch.creation.failed");
    }
    // Fall through to the tertiary approach if the API method fails.
  }

  // =================================================================================
  // 3. Tertiary (Last Resort) Approach: Execute a raw Git command.
  // Rationale: This is the least ideal method as it bypasses the VS Code API
  // and its safety checks. It's a fallback in case the API is unavailable or
  // fails for an unexpected reason. It requires Node.js's `child_process`.
  // =================================================================================
  logger.info("Trying tertiary approach: raw git command (child_process)");
  try {
    const { exec } = await import("child_process");
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceRoot) {
      logger.error("Cannot execute raw command: workspace not found.");
      notify.error("workspace.not.found");
      return;
    }

    // We still need to ask the user for a source ref
    const refs = await repository.getRefs({});
    const refNames = refs
      .map((ref: Ref) => ref.name)
      .filter(Boolean) as string[];
    const selectedSourceRef = await vscode.window.showQuickPick(refNames, {
      placeHolder: getMessage("select.source.ref.for.checkout.command"),
    });

    if (!selectedSourceRef) {
      logger.info("User cancelled branch creation at raw command source ref selection.");
      notify.info("branch.creation.cancelled");
      return;
    }
    logger.info(`User selected source ref for raw command: ${selectedSourceRef}`);

    const command = `git checkout -b "${generatedBranchName}" "${selectedSourceRef}"`;
    logger.info(`Executing raw command: ${command}`);

    await new Promise<void>((resolve, reject) => {
      exec(command, { cwd: workspaceRoot }, (err, stdout, stderr) => {
        if (err) {
          logger.error(`Raw git command failed: ${stderr}`);
          reject(new Error(stderr));
          return;
        }
        logger.info(`Raw git command stdout: ${stdout}`);
        resolve();
      });
    });

    logger.info("Branch created successfully via raw command.");
    notify.info("branch.created.from", [
      generatedBranchName,
      selectedSourceRef,
    ]);
  } catch (error) {
    logger.error(`Tertiary approach (child_process) failed: ${error}`);
    notify.error("branch.creation.failed.raw", [(error as Error).message]);
  }
}
