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
   * 执行提交信息生成命令
   * @param resources - 源代码管理资源状态列表
   */
  // async execute(resources: vscode.SourceControlResourceState[]): Promise<void> {
  //   // 处理配置
  //   const configResult = await this.handleConfiguration();
  //   if (!configResult) {
  //     return;
  //   }
  //   const { provider, model } = configResult;

  //   try {
  //     // 获取选中的文件
  //     const selectedFiles = this.getSelectedFiles(resources);

  //     // 检测SCM提供程序（修改：使用this.detectSCMProvider并传入selectedFiles）
  //     const scmProvider = await this.detectSCMProvider(selectedFiles);
  //     if (!scmProvider) {
  //       return;
  //     }

  //     // 获取当前提交输入框内容
  //     const currentInput = await scmProvider.getCommitInput();

  //     // 获取配置信息以用于后续操作
  //     const config = ConfigurationManager.getInstance();
  //     const configuration = config.getConfiguration();

  //     // 使用进度提示生成提交信息
  //     const response = await ProgressHandler.withProgress(
  //       formatMessage("progress.generating.commit", [
  //         scmProvider?.type.toLocaleUpperCase(),
  //       ]),
  //       async (progress) => {
  //         // 获取选中文件的差异信息
  //         const diffContent = await scmProvider.getDiff(selectedFiles);

  //         // 检查是否有变更
  //         if (!diffContent) {
  //           notify.info("no.changes");
  //           throw new Error(getMessage("no.changes"));
  //         }

  //         // 获取和更新AI模型配置
  //         const {
  //           provider: newProvider,
  //           model: newModel,
  //           aiProvider,
  //           selectedModel,
  //         } = await this.selectAndUpdateModelConfiguration(provider, model);

  //         // 确保selectedModel存在
  //         if (!selectedModel) {
  //           throw new Error(getMessage("no.model.selected"));
  //         }

  //         // 准备AI请求参数
  //         const requestParams = {
  //           ...configuration.features.commitMessage, // 使用非空断言，确保selectedModel不为undefined
  //           ...configuration.features.commitFormat,
  //           ...configuration.features.codeAnalysis,
  //           additionalContext: currentInput,
  //           diff: diffContent,
  //           model: selectedModel,
  //           scm: scmProvider.type ?? "git",
  //           changeFiles: selectedFiles,
  //           languages: configuration.base.language,
  //         };

  //         // 判断是否启用分层提交信息生成
  //         const enableLayeredCommit =
  //           configuration.features.commitFormat?.enableLayeredCommit || false;

  //         if (enableLayeredCommit && aiProvider.generateLayeredCommit) {
  //           // 使用分层提交信息生成
  //           const layeredCommit = await aiProvider.generateLayeredCommit(
  //             requestParams
  //           );

  //           // 将分层提交信息转换为结构化文本
  //           const formattedMessage = formatLayeredCommitMessage(layeredCommit);

  //           return {
  //             content: formattedMessage,
  //             // 由于分层生成没有使用传统的AI响应对象，这里不包含usage信息
  //           };
  //         } else {
  //           // 使用传统方式生成提交信息
  //           return await aiProvider.generateCommit(requestParams);
  //         }
  //       }
  //     );

  //     // 处理生成结果
  //     if (!response) {
  //       return notify.info("no.commit.message.generated");
  //     }

  //     // 尝试设置提交信息
  //     if (response?.content) {
  //       // 过滤掉代码块标记
  //       let filteredContent = filterCodeBlockMarkers(response.content);
  //       // 过滤掉开头结尾的空格
  //       filteredContent = filteredContent.trim();

  //       notify.info("commit.message.generated", [
  //         scmProvider.type.toUpperCase(),
  //         provider,
  //         model,
  //       ]);
  //       try {
  //         await scmProvider.setCommitInput(filteredContent);
  //       } catch (error) {
  //         console.log("error", error);
  //         // 写入失败,尝试复制到剪贴板
  //         if (error instanceof Error) {
  //           try {
  //             await vscode.env.clipboard.writeText(filteredContent);
  //             notify.error("commit.message.write.failed", [error.message]);
  //             notify.info("commit.message.copied", [error.message]);
  //           } catch (error) {
  //             // 尝试复制到剪贴板
  //             try {
  //               await vscode.env.clipboard.writeText(filteredContent);
  //               notify.info("commit.message.copied");
  //             } catch (error) {
  //               // 复制也失败了,显示消息内容
  //               if (error instanceof Error) {
  //                 notify.error("commit.message.copy.failed", [error.message]);
  //                 // 提示手动复制
  //                 vscode.window.showInformationMessage(
  //                   getMessage("commit.message.manual.copy"),
  //                   filteredContent
  //                 );
  //               }
  //             }
  //           }
  //         }
  //       }
  //     }
  //   } catch (error) {
  //     // 处理整体执行错误
  //     console.log("error", error);
  //     if (error instanceof Error) {
  //       notify.error("generate.commit.failed", [error.message]);
  //     }
  //   }
  // }

  /**
   * 以流式方式执行提交信息生成命令，并更新SCM输入框
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
      // 获取选中的文件
      const selectedFiles = this.getSelectedFiles(resources);

      // 检测SCM提供程序
      const scmProvider = await this.detectSCMProvider(selectedFiles);
      if (!scmProvider) {
        return;
      }

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

      // 使用 ProgressHandler 包裹流式生成过程
      await ProgressHandler.withProgress(
        formatMessage("progress.generating.commit", [ // 使用与非流式一致的标题
          scmProvider?.type.toLocaleUpperCase(),
        ]),
        async (progress) => { // progress 参数可以用来更新进度条内部消息，但这里可能不需要
          let accumulatedMessage = "";
          try {
            // 再次检查 aiProvider.generateCommitStream，尽管外部已经检查过
            // 这是为了确保在 ProgressHandler 的回调作用域内 TypeScript 也能正确推断类型
            if (!aiProvider.generateCommitStream) {
              // 这个情况理论上不应该发生，因为外部已经检查并返回了
              // 但为了类型安全和消除TS错误，我们再次检查
              const errorMessage = formatMessage("provider.does.not.support.streaming", [newProvider]); // 使用 formatMessage
              notify.error(errorMessage); // 使用已存在的 i18n key
              throw new Error(errorMessage);
            }
            const stream = await aiProvider.generateCommitStream(requestParams);
            // for await (const chunk of stream) {
            //   console.log("chunk", chunk);
            //   accumulatedMessage += chunk;
            //   let filteredMessage = filterCodeBlockMarkers(accumulatedMessage);
            //   filteredMessage = filteredMessage.trimStart(); // 实时去除开头的空格
            //   await scmProvider.startStreamingInput(filteredMessage);
            // }
            for await (const chunk of stream) {
              for (const char of chunk) {
                accumulatedMessage += char;
                let filteredMessage = filterCodeBlockMarkers(accumulatedMessage);
                filteredMessage = filteredMessage.trimStart(); // 实时去除开头的空格

                // 这里的 startStreamingInput 就能逐字更新了
                await scmProvider.startStreamingInput(filteredMessage);

                // 如果需要控制打字机速度，这里可以加个延时
                await new Promise((resolve) => setTimeout(resolve, 30)); // 20ms 可调节
              }
            }
            // 流结束后，最后trim一次，确保末尾没有多余空格
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
            if (error instanceof Error) {
              notify.error("generate.commit.stream.failed", [error.message]);
            }
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
}
