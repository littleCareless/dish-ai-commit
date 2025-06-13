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
 * 过滤提交信息中的代码块标记
 * @param commitMessage - 原始提交信息
 * @returns 过滤后的提交信息
 */
function filterCodeBlockMarkers(commitMessage: string): string {
  // 移除Markdown代码块标记（三个反引号）
  return commitMessage.replace(/```/g, "");
}

/**
 * 提交信息生成命令类
 */
export class GenerateCommitCommand extends BaseCommand {
  /**
   * 以流式方式执行提交信息生成命令，并更新SCM输入框
   * @param resources - 源代码管理资源状态列表
   */
  async execute(resources: vscode.SourceControlResourceState[]): Promise<void> {
    if (!(await this.showConfirmAIProviderToS())) {
      return;
    }
    // 处理配置
    const configResult = await this.handleConfiguration();
    if (!configResult) {
      return;
    }
    const { provider, model } = configResult;

    try {
      // 获取选中的文件
      const selectedFiles = this.getSelectedFiles(resources);

      // 检测SCM提供程序
      const scmProvider = await this.detectSCMProvider(selectedFiles);
      if (!scmProvider) {
        return;
      }

      // 使用 ProgressHandler 包裹流式生成过程
      await ProgressHandler.withProgress(
        formatMessage("progress.generating.commit", [
          // 使用与非流式一致的标题
          scmProvider?.type.toLocaleUpperCase(),
        ]),
        async (progress, token) => {
          // 获取当前提交输入框内容
          const currentInput = await scmProvider.getCommitInput();

          // 获取配置信息以用于后续操作
          const config = ConfigurationManager.getInstance();
          const configuration = config.getConfiguration();

          // 获取选中文件的差异信息
          const diffContent = await scmProvider.getDiff(selectedFiles);

          // 检查是否有变更
          if (!diffContent) {
            notify.info("no.changes");
            throw new Error(getMessage("no.changes"));
          }

          // 获取和更新AI模型配置
          const {
            provider: newProvider, // provider 和 model 已在前面定义，这里用 newProvider, newModel
            model: newModel,
            aiProvider,
            selectedModel,
          } = await this.selectAndUpdateModelConfiguration(provider, model);

          // 确保selectedModel存在
          if (!selectedModel) {
            throw new Error(getMessage("no.model.selected"));
          }

          // 确保 aiProvider 支持流式生成
          if (!aiProvider.generateCommitStream) {
            notify.error("provider.does.not.support.streaming", [newProvider]);
            // 可以选择回退到非流式 execute 方法，或者直接返回
            // 为了明确，这里我们直接返回并通知用户
            // await this.execute(resources); // 示例：回退到非流式
            return;
          }

          // 准备AI请求参数
          const requestParams = {
            ...configuration.features.commitMessage,
            ...configuration.features.commitFormat,
            ...configuration.features.codeAnalysis,
            additionalContext: currentInput,
            diff: diffContent,
            model: selectedModel,
            scm: scmProvider.type ?? "git",
            changeFiles: selectedFiles,
            languages: configuration.base.language,
          };

          // progress 参数可以用来更新进度条内部消息，但这里可能不需要
          let accumulatedMessage = "";
          try {
            this.throwIfCancelled(token); // 在开始时检查取消
            if (token.isCancellationRequested) {
              console.log("用户取消了操作");
              return; // 这里主动退出
            }
            // 再次检查 aiProvider.generateCommitStream，尽管外部已经检查过
            // 这是为了确保在 ProgressHandler 的回调作用域内 TypeScript 也能正确推断类型
            if (!aiProvider.generateCommitStream) {
              // 这个情况理论上不应该发生，因为外部已经检查并返回了
              // 但为了类型安全和消除TS错误，我们再次检查
              const errorMessage = formatMessage(
                "provider.does.not.support.streaming",
                [newProvider]
              ); // 使用 formatMessage
              notify.error(errorMessage); // 使用已存在的 i18n key
              throw new Error(errorMessage);
            }
            this.throwIfCancelled(token); // 在调用 AI Provider 之前检查取消
            const stream = await aiProvider.generateCommitStream(requestParams);

            for await (const chunk of stream) {
              this.throwIfCancelled(token); // 在每次迭代开始时检查取消
              for (const char of chunk) {
                accumulatedMessage += char;
                let filteredMessage =
                  filterCodeBlockMarkers(accumulatedMessage);
                filteredMessage = filteredMessage.trimStart(); // 实时去除开头的空格

                // 这里的 startStreamingInput 就能逐字更新了
                await scmProvider.startStreamingInput(filteredMessage);

                // 如果需要控制打字机速度，这里可以加个延时
                await new Promise((resolve) => setTimeout(resolve, 30)); // 20ms 可调节
              }
            }
            // 流结束后，最后trim一次，确保末尾没有多余空格
            this.throwIfCancelled(token); // 在流结束后，最终处理之前检查取消
            const finalMessage = accumulatedMessage.trim();
            await scmProvider.startStreamingInput(finalMessage);

            // 流处理成功后的通知
            notify.info("commit.message.generated.stream", [
              scmProvider.type.toUpperCase(),
              newProvider,
              selectedModel?.id || "default",
            ]);
          } catch (error) {
            console.error("Error during commit message streaming:", error);
            // if (error instanceof Error) {
            //   notify.error("generate.commit.stream.failed", [error.message]);
            // }
            // 确保 ProgressHandler 知道任务失败
            throw error;
          }
        }
      );
    } catch (error) {
      // 处理整体执行错误
      console.log("Error in executeStream:", error);
      if (error instanceof Error) {
        notify.error("generate.commit.failed", [error.message]); // 可以用一个更特定的流式错误消息
      }
    }
  }
  throwIfCancelled(token: vscode.CancellationToken) {
    if (token.isCancellationRequested) {
      console.log(getMessage("user.cancelled.operation.log"));
      throw new Error(getMessage("user.cancelled.operation.error"));
    }
  }
}
