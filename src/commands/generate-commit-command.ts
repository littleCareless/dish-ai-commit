import * as vscode from "vscode";
import { BaseCommand } from "./base-command";
import { ConfigurationManager } from "../config/configuration-manager";
import { AIProviderFactory } from "../ai/ai-provider-factory";
import { AbstractAIProvider } from "../ai/providers/abstract-ai-provider";
import { ISCMProvider, SCMFactory } from "../scm/scm-provider";
import { type ConfigKey } from "../config/types";
import { ModelPickerService } from "../services/model-picker-service";
import { notify } from "../utils/notification";
import { getMessage, formatMessage } from "../utils/i18n";
import { ProgressHandler } from "../utils/notification/progress-handler";
import { validateAndGetModel } from "../utils/ai/model-validation";
import { LayeredCommitMessage, AIProvider } from "../ai/types";
import * as path from "path"; // 导入 path 模块
import { addSimilarCodeContext } from "../ai/utils/embedding-helper";
import { stateManager } from "../utils/state/state-manager";

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
    const configResult = await this.handleConfiguration();
    if (!configResult) {
      return;
    }
    const { provider, model } = configResult;

    try {
      const selectedFiles = this.getSelectedFiles(resources);
      if (!selectedFiles) {
        // 如果没有选择文件，可以通知用户或直接返回
        notify.info("no.files.selected");
        return;
      }
      const scmProvider = await this.detectSCMProvider(selectedFiles);
      if (!scmProvider) {
        return;
      }

      await ProgressHandler.withProgress(
        formatMessage("progress.generating.commit", [
          scmProvider.type.toLocaleUpperCase(),
        ]),
        (progress, token) =>
          this.performStreamingGeneration(
            progress,
            token,
            provider,
            model,
            scmProvider,
            selectedFiles
          )
      );
    } catch (error) {
      console.log("Error in executeStream:", error);
      if (error instanceof Error) {
        notify.error("generate.commit.failed", [error.message]);
      }
    }
  }

  private async performStreamingGeneration(
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken,
    provider: string,
    model: string,
    scmProvider: ISCMProvider,
    selectedFiles: string[]
  ) {
    const currentInput = await scmProvider.getCommitInput();
    const config = ConfigurationManager.getInstance();
    const configuration = config.getConfiguration();

    progress.report({ message: getMessage("progress.getting.diff") });
    const diffContent = await scmProvider.getDiff(selectedFiles);

    if (!diffContent) {
      notify.info("no.changes");
      throw new Error(getMessage("no.changes"));
    }

    progress.report({
      message: getMessage("progress.updating.model.config"),
    });
    const {
      provider: newProvider,
      model: newModel,
      aiProvider,
      selectedModel,
    } = await this.selectAndUpdateModelConfiguration(provider, model);

    if (!selectedModel) {
      throw new Error(getMessage("no.model.selected"));
    }

    if (!aiProvider.generateCommitStream) {
      notify.error("provider.does.not.support.streaming", [newProvider]);
      return;
    }

    progress.report({ message: getMessage("progress.preparing.request") });
    const requestParams = {
      ...configuration.features.commitMessage,
      ...configuration.features.commitFormat,
      ...configuration.features.codeAnalysis,
      additionalContext: currentInput, // Start with current SCM input
      diff: diffContent,
      model: selectedModel,
      scm: scmProvider.type ?? "git",
      changeFiles: selectedFiles,
      languages: configuration.base.language,
    };

    await addSimilarCodeContext(requestParams);

    try {
      this.throwIfCancelled(token);
      if (token.isCancellationRequested) {
        console.log("用户取消了操作");
        return;
      }
      if (!aiProvider.generateCommitStream) {
        const errorMessage = formatMessage(
          "provider.does.not.support.streaming",
          [newProvider]
        );
        notify.error(errorMessage);
        throw new Error(errorMessage);
      }

      const useFunctionCalling =
        stateManager.getWorkspace<boolean>(
          "experimental.commitWithFunctionCalling.enabled"
        ) ?? false;

      if (useFunctionCalling) {
        notify.info("info.using.function.calling");
        if (!aiProvider.generateCommitWithFunctionCalling) {
          throw new Error(
            `Provider ${newProvider} does not support function calling.`
          );
        }
        await this.performFunctionCallingGeneration(
          aiProvider,
          requestParams,
          scmProvider,
          token,
          progress
        );
      } else {
        await this.streamAndApplyMessage(
          aiProvider as AbstractAIProvider,
          requestParams,
          scmProvider,
          token,
          progress
        );
      }

      notify.info("commit.message.generated.stream", [
        scmProvider.type.toUpperCase(),
        newProvider,
        selectedModel?.id || "default",
      ]);
    } catch (error) {
      console.error("Error during commit message streaming:", error);
      throw error;
    }
  }

  private async streamAndApplyMessage(
    aiProvider: AbstractAIProvider,
    requestParams: any,
    scmProvider: ISCMProvider,
    token: vscode.CancellationToken,
    progress: vscode.Progress<{ message?: string; increment?: number }>
  ) {
    this.throwIfCancelled(token);
    progress.report({
      message: getMessage("progress.calling.ai.stream"),
    });
    const stream = await aiProvider.generateCommitStream(requestParams);

    let accumulatedMessage = "";
    for await (const chunk of stream) {
      this.throwIfCancelled(token);
      for (const char of chunk) {
        accumulatedMessage += char;
        let filteredMessage = filterCodeBlockMarkers(accumulatedMessage);
        filteredMessage = filteredMessage.trimStart();
        await scmProvider.startStreamingInput(filteredMessage);
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
    }
    this.throwIfCancelled(token);
    const finalMessage = accumulatedMessage.trim();
    await scmProvider.startStreamingInput(finalMessage);
  }

  private async performFunctionCallingGeneration(
    aiProvider: AIProvider,
    requestParams: any,
    scmProvider: ISCMProvider,
    token: vscode.CancellationToken,
    progress: vscode.Progress<{ message?: string; increment?: number }>
  ) {
    this.throwIfCancelled(token);
    progress.report({
      message: getMessage("progress.calling.ai.function"),
    });

    if (!aiProvider.generateCommitWithFunctionCalling) {
      throw new Error(
        `Provider ${aiProvider.getId()} does not support function calling.`
      );
    }

    const aiResponse = await aiProvider.generateCommitWithFunctionCalling(
      requestParams
    );

    this.throwIfCancelled(token);

    const finalMessage = aiResponse.content;
    await scmProvider.startStreamingInput(finalMessage);
  }

  throwIfCancelled(token: vscode.CancellationToken) {
    if (token.isCancellationRequested) {
      console.log(getMessage("user.cancelled.operation.log"));
      throw new Error(getMessage("user.cancelled.operation.error"));
    }
  }
}
