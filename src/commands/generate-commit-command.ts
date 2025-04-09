import * as vscode from "vscode";
import { BaseCommand } from "./base-command";
import { ConfigurationManager } from "../config/configuration-manager";
import { AIProviderFactory } from "../ai/ai-provider-factory";
import { SCMFactory } from "../scm/scm-provider";
import { type ConfigKey } from "../config/types";
import { ModelPickerService } from "../services/model-picker-service";
import { notify } from "../utils/notification";
import { getMessage, formatMessage } from "../utils/i18n";
import { ProgressHandler } from "../utils/notification/progress-handler";
import { validateAndGetModel } from "../utils/ai/model-validation";

/**
 * 提交信息生成命令类
 */
export class GenerateCommitCommand extends BaseCommand {
  /**
   * 执行提交信息生成命令
   * @param resources - 源代码管理资源状态列表
   */
  async execute(resources: vscode.SourceControlResourceState[]): Promise<void> {
    // 处理配置
    const configResult = await this.handleConfiguration();
    if (!configResult) {
      return;
    }
    const { provider, model } = configResult;

    try {
      // 检测SCM提供程序
      const scmProvider = await SCMFactory.detectSCM();
      if (!scmProvider) {
        notify.error("scm.not.detected");
        return;
      }

      // 获取当前提交输入框内容
      const currentInput = await scmProvider.getCommitInput();

      // 获取配置信息以用于后续操作
      const config = ConfigurationManager.getInstance();
      const configuration = config.getConfiguration();

      // 使用进度提示生成提交信息
      const response = await ProgressHandler.withProgress(
        formatMessage("progress.generating.commit", [
          scmProvider?.type.toLocaleUpperCase(),
        ]),
        async (progress) => {
          // 获取选中文件的差异信息
          const selectedFiles = this.getSelectedFiles(resources);
          const diffContent = await scmProvider.getDiff(selectedFiles);

          // 检查是否有变更
          if (!diffContent) {
            notify.info("no.changes");
            throw new Error(getMessage("no.changes"));
          }

          // 获取和更新AI模型配置
          const {
            provider: newProvider,
            model: newModel,
            aiProvider,
            selectedModel,
          } = await this.selectAndUpdateModelConfiguration(provider, model);
          // 生成提交信息
          const result = await aiProvider.generateResponse({
            ...configuration.base,
            ...configuration.features.commitFormat,
            ...configuration.features.codeAnalysis,
            additionalContext: currentInput,
            diff: diffContent,
            model: selectedModel,
            scm: scmProvider.type ?? "git",
          });

          return result;
        }
      );

      // 处理生成结果
      if (!response) {
        return notify.info("no.commit.message.generated");
      }

      // 尝试设置提交信息
      if (response?.content) {
        notify.info("commit.message.generated", [
          scmProvider.type.toUpperCase(),
          provider,
          model,
        ]);
        try {
          await scmProvider.setCommitInput(response.content);
        } catch (error) {
          console.log("error", error);
          // 写入失败,尝试复制到剪贴板
          if (error instanceof Error) {
            try {
              await vscode.env.clipboard.writeText(response.content);
              notify.error("commit.message.write.failed", [error.message]);
              notify.info("commit.message.copied", [error.message]);
            } catch (error) {
              // 尝试复制到剪贴板
              try {
                await vscode.env.clipboard.writeText(response.content);
                notify.info("commit.message.copied");
              } catch (error) {
                // 复制也失败了,显示消息内容
                if (error instanceof Error) {
                  notify.error("commit.message.copy.failed", [error.message]);
                  // 提示手动复制
                  vscode.window.showInformationMessage(
                    getMessage("commit.message.manual.copy"),
                    response.content
                  );
                }
              }
            }
          }
        }
      }
    } catch (error) {
      // 处理整体执行错误
      console.log("error", error);
      if (error instanceof Error) {
        notify.error("generate.commit.failed", [error.message]);
      }
    }
  }
}
