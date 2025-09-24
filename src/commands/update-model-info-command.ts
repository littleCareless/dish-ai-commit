/**
 * 更新模型信息命令
 * 提供手动更新模型规格信息的VS Code命令
 */

import * as vscode from "vscode";
import { BaseCommand } from "./base-command";
import {
  ModelUpdateService,
  checkModelUpdates,
} from "../ai/model-registry/model-update-service";
import { notify } from "../utils/notification/notification-manager";
import { getMessage, formatMessage } from "../utils/i18n";
import { ProgressHandler } from "../utils/notification/progress-handler";

/**
 * 更新模型信息命令类
 */
/**
 * 更新模型信息命令类
 *
 * @extends {BaseCommand}
 */
export class UpdateModelInfoCommand extends BaseCommand {
  /**
   * 执行模型信息更新命令
   */
  async execute(): Promise<void> {
    this.logger.info("Executing UpdateModelInfoCommand...");
    try {
      // 首先检查是否需要更新
      this.logger.info("Checking for model updates...");
      const updateCheck = await checkModelUpdates();

      if (!updateCheck.needsUpdate) {
        this.logger.info("Model info is up to date.");
        const forceUpdate = await vscode.window.showInformationMessage(
          "模型信息都是最新的，是否仍要强制更新？",
          { modal: false },
          "强制更新",
          "取消"
        );

        if (forceUpdate !== "强制更新") {
          this.logger.info("User cancelled forced update.");
          return;
        }
        this.logger.info("User chose to force update.");
      } else {
        // 显示需要更新的信息
        const updateMessage = [
          "检测到以下模型信息需要更新：",
          ...updateCheck.recommendations,
        ].join("\n");

        this.logger.info(
          `Model updates available: ${updateCheck.recommendations.join(", ")}`
        );
        const proceed = await vscode.window.showWarningMessage(
          updateMessage,
          { modal: true },
          "立即更新",
          "取消"
        );

        if (proceed !== "立即更新") {
          this.logger.info("User cancelled model update.");
          return;
        }
      }

      // 显示更新选项
      const updateOptions = [
        "更新所有模型",
        "更新 OpenAI 模型",
        "更新 Anthropic 模型",
        "更新 GitHub 模型",
        "查看模型统计信息",
      ];

      const selectedOption = await vscode.window.showQuickPick(updateOptions, {
        placeHolder: "选择要执行的操作",
        canPickMany: false,
      });

      if (!selectedOption) {
        this.logger.info("User cancelled model update option selection.");
        return;
      }
      this.logger.info(`User selected option: ${selectedOption}`);

      const service = ModelUpdateService.getInstance();

      switch (selectedOption) {
        case "更新所有模型":
          await this.updateAllModels(service);
          break;
        case "更新 OpenAI 模型":
          await this.updateProviderModels(service, "openai");
          break;
        case "更新 Anthropic 模型":
          await this.updateProviderModels(service, "anthropic");
          break;
        case "更新 GitHub 模型":
          await this.updateProviderModels(service, "github");
          break;
        case "查看模型统计信息":
          await this.showModelStats(service);
          break;
      }
    } catch (error) {
      this.logger.error(`Error updating model info: ${error}`);
      notify.error("model.update.command.failed", [
        error instanceof Error ? error.message : String(error),
      ]);
    }
  }

  /**
   * 更新所有模型信息
   */
  private async updateAllModels(service: ModelUpdateService): Promise<void> {
    await ProgressHandler.withProgress(
      "正在更新所有模型信息...",
      async (progress, token) => {
        progress.report({ message: "开始更新模型信息" });
        this.logger.info("Updating all models...");

        const result = await service.updateAllModels();
        this.logger.info(
          `Update all models result: ${result.updatedModels.length} updated, ${result.failedModels.length} failed.`
        );

        if (result.success) {
          progress.report({
            message: `成功更新 ${result.updatedModels.length} 个模型`,
          });
        } else {
          progress.report({
            message: `更新完成，成功: ${result.updatedModels.length}，失败: ${result.failedModels.length}`,
          });
        }

        // 显示详细结果
        if (result.errors.length > 0) {
          await this.showUpdateErrors(result.errors);
        }
      }
    );
  }

  /**
   * 更新特定提供商的模型信息
   */
  private async updateProviderModels(
    service: ModelUpdateService,
    providerId: string
  ): Promise<void> {
    await ProgressHandler.withProgress(
      `正在更新 ${providerId.toUpperCase()} 模型信息...`,
      async (progress, token) => {
        progress.report({ message: `开始更新 ${providerId} 模型信息` });
        this.logger.info(`Updating models for provider: ${providerId}...`);

        const result = await service.updateProviderModels(providerId);
        this.logger.info(
          `Update models for ${providerId} result: ${result.updatedModels.length} updated, ${result.failedModels.length} failed.`
        );

        if (result.success) {
          progress.report({
            message: `成功更新 ${result.updatedModels.length} 个 ${providerId} 模型`,
          });
        } else {
          progress.report({
            message: `更新完成，成功: ${result.updatedModels.length}，失败: ${result.failedModels.length}`,
          });
        }

        // 显示详细结果
        if (result.errors.length > 0) {
          await this.showUpdateErrors(result.errors);
        }
      }
    );
  }

  /**
   * 显示模型统计信息
   */
  private async showModelStats(service: ModelUpdateService): Promise<void> {
    this.logger.info("Showing model stats...");
    const stats = service.getModelStats();
    this.logger.info(`Model stats: ${JSON.stringify(stats)}`);

    const statsMessage = [
      "=== 模型信息统计 ===",
      `总模型数量: ${stats.totalModels}`,
      `已缓存模型: ${stats.cachedModels}`,
      `过期缓存: ${stats.expiredCache}`,
      "",
      "=== 按提供商分布 ===",
      ...Object.entries(stats.providerBreakdown).map(
        ([provider, count]) => `${provider}: ${count} 个模型`
      ),
    ].join("\n");

    await vscode.window.showInformationMessage(statsMessage, { modal: true });
  }

  /**
   * 显示更新错误信息
   */
  private async showUpdateErrors(errors: string[]): Promise<void> {
    const errorMessage = [
      "以下模型更新失败：",
      "",
      ...errors.slice(0, 10), // 只显示前10个错误
      ...(errors.length > 10 ? [`... 还有 ${errors.length - 10} 个错误`] : []),
    ].join("\n");

    const action = await vscode.window.showErrorMessage(
      "部分模型更新失败",
      { modal: false },
      "查看详情",
      "忽略"
    );

    if (action === "查看详情") {
      const document = await vscode.workspace.openTextDocument({
        content: errorMessage,
        language: "plaintext",
      });
      await vscode.window.showTextDocument(document);
    }
  }
}
