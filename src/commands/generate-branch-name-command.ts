import * as vscode from "vscode";
import { BaseCommand } from "./base-command";
import { SCMDetectorService } from "../services/scm-detector-service";
import { getMessage, formatMessage } from "../utils/i18n";
import {
  notify,
  withProgress,
} from "../utils/notification/notification-manager";
import { validateAndGetModel } from "../utils/ai/model-validation";

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
    if (!(await this.showConfirmAIProviderToS())) {
      return;
    }
    const configResult = await this.handleConfiguration();
    if (!configResult) {
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
            return; // User cancelled
          }

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
              notify.info("branch.description.cancelled");
              return;
            }
            aiInputContent = description;
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
              return;
            }
            const { scmProvider: detectedScmProvider } = result;
            if (detectedScmProvider.type !== "git") {
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
              await notify.warn(getMessage("no.changes.found"));
              return;
            }
          }

          if (!aiInputContent) {
            // This case should ideally not be reached if logic above is correct
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
            await notify.error(getMessage("branch.name.generation.failed"));
            return;
          }

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
      console.log("GenerateBranchNameCommand error", error);
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
      description: branch.includes("/") ? branch.split("/")[0] : "", // 显示分支类型（如果有）
    }));

    // 允许用户自定义输入
    quickPick.canSelectMany = false;
    quickPick.ignoreFocusOut = true;

    return new Promise<void>((resolve) => {
      // 处理用户确认选择
      quickPick.onDidAccept(async () => {
        const selectedBranch =
          quickPick.selectedItems[0]?.label || quickPick.value;
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
          try {
            if (scmProvider.type === "git" && scmProvider.getBranches) {
              const branches = await withProgress(
                getMessage("fetching.branches.list"),
                async () => {
                  return await scmProvider.getBranches();
                }
              );
              if (branches && branches.length > 0) {
                const selectedBaseBranch = await vscode.window.showQuickPick(
                  branches,
                  {
                    placeHolder: getMessage("select.base.branch.placeholder"),
                    ignoreFocusOut: true,
                  }
                );

                if (selectedBaseBranch) {
                  await vscode.commands.executeCommand(
                    "git.branchFrom",
                    selectedBranch,
                    selectedBaseBranch
                  );
                  notify.info("branch.created.from", [
                    selectedBranch,
                    selectedBaseBranch,
                  ]);
                } else {
                  // 用户取消选择基础分支
                  notify.info("branch.creation.cancelled");
                }
              } else {
                // 没有获取到分支列表，回退到原先的 checkout 逻辑
                await vscode.commands.executeCommand(
                  "git.checkout",
                  selectedBranch
                );
                notify.info("branch.created", [selectedBranch]);
              }
            } else {
              // 非Git或不支持getBranches，使用旧逻辑
              await vscode.commands.executeCommand(
                "git.checkout",
                selectedBranch
              );
              notify.info("branch.created", [selectedBranch]);
            }
          } catch (error) {
            console.error("Failed to create branch:", error);
            notify.error("branch.creation.failed");
          }
        } else if (selection === copyToClipboard) {
          try {
            // 将分支名称复制到剪贴板
            await vscode.env.clipboard.writeText(selectedBranch);
            notify.info("branch.name.copied");
          } catch (error) {
            console.error("Failed to copy branch name:", error);
            notify.error("branch.name.copy.failed");
          }
        }

        resolve();
      });

      // 处理用户取消
      quickPick.onDidHide(() => {
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

    return [...new Set(variants)]; // 去除可能的重复项
  }

  /**
   * 格式化分支名称，使其符合Git分支命名规范
   * @param {string} branchName - 原始分支名称
   * @returns {string} 格式化后的分支名称
   */
  private formatBranchName(branchName: string): string {
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

    return formatted;
  }
}
