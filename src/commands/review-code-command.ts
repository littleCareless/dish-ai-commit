import * as vscode from "vscode";
import { BaseCommand } from "./base-command";
import { SCMDetectorService } from "../services/scm-detector-service";
import { getMessage, formatMessage } from "../utils/i18n";
import {
  notify,
  withProgress,
} from "../utils/notification/notification-manager";
import * as path from "path";
import { validateAndGetModel } from "../utils/ai/model-validation";
import { addSimilarCodeContext } from "../ai/utils/embedding-helper";

/**
 * 代码审查命令类
 * 负责执行代码审查流程,收集文件差异,调用AI进行分析,并展示审查结果
 * @extends {BaseCommand}
 */
export class ReviewCodeCommand extends BaseCommand {
  /**
   * 执行代码审查命令
   * @param {vscode.SourceControlResourceState[] | undefined} resources - 源代码管理资源状态列表,代表需要审查的文件
   * @returns {Promise<void>}
   */
  async execute(resources?: vscode.SourceControlResourceState[]) {
    if (!(await this.showConfirmAIProviderToS())) {
      return;
    }
    // 处理配置
    const configResult = await this.handleConfiguration();
    if (!configResult) {
      return;
    }

    try {
      await withProgress(getMessage("reviewing.code"), async (progress) => {
        progress.report({
          increment: 5,
          message: getMessage("checking.selected.files"),
        });
        // 检查是否有选中的文件
        const selectedFiles = SCMDetectorService.getSelectedFiles(resources);
        if (!selectedFiles || selectedFiles.length === 0) {
          await notify.warn("no.changes.selected");
          return;
        }

        progress.report({
          increment: 5,
          message: getMessage("detecting.scm.provider"),
        });
        // 检测SCM提供程序
        const result = await this.detectSCMProvider(selectedFiles);
        if (!result) {
          return;
        }
        const { scmProvider } = result;

        const currentInput = await scmProvider.getCommitInput();

        // 获取配置信息
        const { config, configuration } = this.getExtConfig();
        let { provider, model } = configResult;

        progress.report({
          increment: 5,
          message: getMessage("validating.model"),
        });
        const { aiProvider, selectedModel } = await validateAndGetModel(
          provider,
          model
        );

        // 获取所有选中文件的差异
        const fileReviews = new Map<string, string>();
        const diffs = new Map<string, string>();
        // 并行收集所有差异 - 15% 进度 (5 initial + 15 = 20 total for setup)
        progress.report({
          message: getMessage("getting.file.changes"),
        });
        const diffPromises = selectedFiles.map(async (filePath) => {
          try {
            const diff = await scmProvider.getDiff([filePath]);
            if (diff) {
              diffs.set(filePath, diff);
            }
            // Individual progress for each file diff is small, overall progress updated after Promise.all
            return { success: true };
          } catch (error) {
            console.error(`Failed to get diff for ${filePath}:`, error);
            return { success: false };
          }
        });

        await Promise.all(diffPromises);
        progress.report({ increment: 15 }); // Report progress after all diffs are collected

        if (diffs.size === 0) {
          await notify.warn(getMessage("no.changes.found"));
          return;
        }

        // 并行审查每个文件 - 70% 进度平均分配 (20 setup + 70 review = 90)
        const progressPerFile = 70 / diffs.size;

        const reviewPromises = Array.from(diffs.entries()).map(
          async ([filePath, diff]) => {
            try {
              progress.report({
                // Report message before starting review for this file
                message: formatMessage("reviewing.file", [
                  path.basename(filePath),
                ]),
              });

              const requestParams = {
                ...configuration.base,
                ...configuration.features.codeAnalysis,
                diff,
                model: selectedModel,
                scm: scmProvider.type ?? "git",
                changeFiles: [filePath],
                additionalContext: currentInput,
              };

              await addSimilarCodeContext(requestParams);

              const reviewResult = await aiProvider?.generateCodeReview?.(
                requestParams
              );

              if (reviewResult?.content) {
                fileReviews.set(filePath, reviewResult.content);
              }

              progress.report({
                // Report increment after this file's review is done
                increment: progressPerFile,
              });

              return { success: true, filePath };
            } catch (error) {
              await notify.warn(
                formatMessage("review.file.failed", [path.basename(filePath)])
              );
              console.error(`Failed to review ${filePath}:`, error);
              progress.report({
                // Still report increment even if failed to keep progress accurate
                increment: progressPerFile,
              });
              return { success: false, filePath };
            }
          }
        );

        await Promise.all(reviewPromises);

        // 显示结果 - 10% 进度 (90 review + 10 results = 100)
        progress.report({
          increment: 10,
          message: getMessage("preparing.results"),
        });

        if (fileReviews.size === 0) {
          await notify.error(getMessage("review.all.failed"));
          return;
        }

        this.showReviewResults(fileReviews);

        await notify.info(
          // Changed to info as it's a success message
          formatMessage("review.complete.count", [fileReviews.size.toString()])
        );

        progress.report({
          increment: 100,
        });
      });
    } catch (error) {
      console.log("ReviewCodeCommand error", error);
      await this.handleError(error, "code.review.failed");
    }
  }

  /**
   * 在WebView面板中显示代码审查结果
   * @param {Map<string, string>} fileReviews - 文件路径到审查结果的映射
   * @returns {Promise<void>}
   */
  private async showReviewResults(fileReviews: Map<string, string>) {
    // 创建webview面板显示审查结果
    const panel = vscode.window.createWebviewPanel(
      "codeReview",
      getMessage("review.results.title"),
      vscode.ViewColumn.One,
      {
        enableScripts: true,
      }
    );

    panel.webview.html = this.getWebviewContent(fileReviews);
  }

  /**
   * 生成审查结果显示的HTML内容
   * @param {Map<string, string>} fileReviews - 文件路径到审查结果的映射
   * @returns {string} 生成的HTML内容字符串
   */
  private getWebviewContent(fileReviews: Map<string, string>): string {
    // 为每个文件生成审查内容HTML片段
    const reviewHtml = Array.from(fileReviews.entries())
      .map(
        ([file, review]) => `
        <div class="review-section">
          <h3 class="file-name">${this.escapeHtml(path.basename(file))}</h3>
          <div class="review-content">${this.escapeHtml(review)}</div>
        </div>
      `
      )
      .join("\n");

    // 返回完整的HTML文档
    return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${getMessage("review.results.title")}</title>
        <style>
          body { padding: 20px; }
          .review-section { margin-bottom: 30px; }
          .file-name { 
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid var(--vscode-textSeparator-foreground);
          }
          .review-content { 
            white-space: pre-wrap;
            font-family: var(--vscode-editor-font-family);
          }
        </style>
      </head>
      <body>${reviewHtml}</body>
    </html>`;
  }

  /**
   * 转义HTML特殊字符,防止XSS攻击
   * @param {string} unsafe - 包含可能不安全HTML字符的字符串
   * @returns {string} 转义后的安全字符串
   */
  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
