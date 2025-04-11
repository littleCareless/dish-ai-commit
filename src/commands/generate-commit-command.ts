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
import { LayeredCommitMessage } from "../ai/types";

/**
 * 将分层提交信息格式化为结构化的提交信息文本
 * @param layeredCommit - 分层提交信息对象
 * @returns 格式化后的提交信息文本
 */
function formatLayeredCommitMessage(
  layeredCommit: LayeredCommitMessage
): string {
  // 构建提交信息文本
  let commitMessage = layeredCommit.summary.trim();

  // 如果有文件变更，添加详细信息部分
  if (layeredCommit.fileChanges.length > 0) {
    commitMessage += "\n\n### 变更详情\n";

    for (const fileChange of layeredCommit.fileChanges) {
      commitMessage += `\n* **${
        fileChange.filePath
      }**：${fileChange.description.trim()}`;
    }
  }

  return commitMessage;
}

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

          // 确保selectedModel存在
          if (!selectedModel) {
            throw new Error(getMessage("no.model.selected"));
          }

          // 准备AI请求参数
          const requestParams = {
            // ...configuration.base,, // 使用非空断言，确保selectedModel不为undefined
            ...configuration.features.commitFormat,
            ...configuration.features.codeAnalysis,
            additionalContext: currentInput,
            diff: diffContent,
            model: selectedModel,
            scm: scmProvider.type ?? "git",
            changeFiles: selectedFiles,
          };

          // 判断是否启用分层提交信息生成
          const enableLayeredCommit =
            configuration.features.commitFormat?.enableLayeredCommit || false;

          console.log("enableLayeredCommit", enableLayeredCommit);

          if (enableLayeredCommit && aiProvider.generateLayeredCommit) {
            // 使用分层提交信息生成
            const layeredCommit = await aiProvider.generateLayeredCommit(
              requestParams
            );

            // 将分层提交信息转换为结构化文本
            const formattedMessage = formatLayeredCommitMessage(layeredCommit);

            return {
              content: formattedMessage,
              // 由于分层生成没有使用传统的AI响应对象，这里不包含usage信息
            };
          } else {
            // 使用传统方式生成提交信息
            return await aiProvider.generateResponse(requestParams);
          }
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
