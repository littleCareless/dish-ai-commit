import * as vscode from "vscode";
import { BaseCommand } from "./base-command";
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
    // 处理配置
    const configResult = await this.handleConfiguration();
    if (!configResult) {
      return;
    }

    try {
      // 检查是否有选中的文件
      const selectedFiles = this.getSelectedFiles(resources);
      if (!selectedFiles || selectedFiles.length === 0) {
        await notify.warn("no.changes.selected");
        return;
      }

      // 检测SCM提供程序
      const scmProvider = await this.detectSCMProvider();
      if (!scmProvider) {
        return;
      }

      // 检查是否为Git提供程序
      if (scmProvider.type !== "git") {
        await notify.warn("branch.name.git.only");
        return;
      }

      // 获取配置信息
      const { config, configuration } = this.getExtConfig();
      let { provider, model } = configResult;

      const { aiProvider, selectedModel } = await validateAndGetModel(
        provider,
        model
      );

      await withProgress(
        getMessage("generating.branch.name"),
        async (progress) => {
          // 获取所有选中文件的差异
          progress.report({
            increment: 10,
            message: getMessage("getting.file.changes"),
          });

          const diffContent = await scmProvider.getDiff(selectedFiles);
          if (!diffContent) {
            await notify.warn(getMessage("no.changes.found"));
            return;
          }

          // 生成分支名称
          progress.report({
            increment: 40,
            message: getMessage("analyzing.code.changes"),
          });

          const branchNameResult = await aiProvider?.generateBranchName?.({
            ...configuration.base,
            ...configuration.features.branchNameGeneration,
            diff: diffContent,
            model: selectedModel,
            scm: scmProvider.type ?? "git",
          });

          if (!branchNameResult?.content) {
            console.log("Branch name generation failed", branchNameResult);
            await notify.error(getMessage("branch.name.generation.failed"));
            return;
          }

          progress.report({
            increment: 40,
            message: getMessage("preparing.results"),
          });

          // 显示分支名称建议并提供创建分支的选项
          await this.showBranchNameSuggestion(
            branchNameResult.content,
            scmProvider
          );
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
    console.log("formattedBranchName", formattedBranchName);

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

        const selection = await vscode.window.showInformationMessage(
          formatMessage("branch.name.selected", [selectedBranch]),
          createBranch,
          copyToClipboard
        );

        if (selection === createBranch) {
          try {
            await vscode.env.clipboard.writeText(selectedBranch);
            // 执行创建分支操作
            await vscode.commands.executeCommand(
              "git.checkout",
              selectedBranch
            );
            notify.info("branch.created", [selectedBranch]);
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
    let formatted = branchName.trim();

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
