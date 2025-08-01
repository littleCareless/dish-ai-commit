import * as vscode from "vscode";
import { BaseCommand } from "./base-command";
import { ConfigurationManager } from "../config/configuration-manager";
import { AIProviderFactory } from "../ai/ai-provider-factory";
import { SCMFactory } from "../scm/scm-provider";
import { notify } from "../utils/notification";
import { getMessage, formatMessage } from "../utils/i18n";
import { ProgressHandler } from "../utils/notification/progress-handler";
import {
  AIRequestParams,
  AIProvider,
  AIModel,
  AIProviders,
  ModelNames,
} from "../ai/types";

export class GeneratePRSummaryCommand extends BaseCommand {
  constructor(context: vscode.ExtensionContext) {
    super(context);
  }

  async execute(): Promise<void> {
    if (!(await this.showConfirmAIProviderToS())) {
      return;
    }

    const configResult = await this.handleConfiguration();
    if (!configResult) {
      return;
    }
    const { provider, model } = configResult;

    try {
      await ProgressHandler.withProgress(
        getMessage("progress.generating.pr.summary"),
        async (progress, token) => {
          if (token.isCancellationRequested) {
            return;
          }
          progress.report({
            increment: 5,
            message: getMessage("detecting.scm.provider"),
          });
          const result = await this.detectSCMProvider();
          if (!result) {
            notify.error("scm.not.detected");
            return;
          }
          const { scmProvider } = result;

          if (scmProvider.type !== "git") {
            notify.error("pr.summary.git.only");
            return;
          }

          // 获取配置信息
          const config = ConfigurationManager.getInstance();
          const configuration = config.getConfiguration();
          let baseBranch =
            configuration.features.prSummary?.baseBranch || "origin/main";
          const headBranch =
            configuration.features.prSummary?.headBranch || "HEAD";

          // 获取所有分支并让用户选择基础分支
          if (
            scmProvider.type === "git" &&
            typeof scmProvider.getBranches === "function"
          ) {
            progress.report({
              increment: 10,
              message: getMessage("fetching.branches"),
            });
            const branches = await scmProvider.getBranches();
            if (branches && branches.length > 0) {
              // 将配置的默认 baseBranch 放在列表首位（如果存在）
              const sortedBranches = [...branches];
              const defaultBaseIndex = sortedBranches.indexOf(baseBranch);
              if (defaultBaseIndex > -1) {
                const defaultBranch = sortedBranches.splice(
                  defaultBaseIndex,
                  1
                )[0];
                sortedBranches.unshift(defaultBranch);
              }

              const selectedBranch = await vscode.window.showQuickPick(
                sortedBranches,
                {
                  placeHolder: formatMessage(
                    "pr.summary.select.base.branch.placeholder",
                    [baseBranch]
                  ), // 新增 i18n key
                  title: getMessage("pr.summary.select.base.branch.title"), // 新增 i18n key
                }
              );

              if (selectedBranch) {
                baseBranch = selectedBranch;
              } else {
                // 用户取消选择，可以中止操作或使用默认值
                notify.info("pr.summary.base.branch.selection.cancelled"); // 新增 i18n key
                return; // 或者继续使用默认 baseBranch
              }
            } else {
              notify.warn("pr.summary.no.branches.found"); // 新增 i18n key
              // 即使没有获取到分支列表，也尝试使用默认配置的分支
            }
          }
          if (token.isCancellationRequested) {
            return;
          }

          progress.report({
            increment: 15,
            message: getMessage("fetching.commit.log"),
          });
          const commitMessages = await scmProvider.getCommitLog(
            baseBranch,
            headBranch
          );

          if (!commitMessages || commitMessages.length === 0) {
            notify.info("pr.summary.no.commits");
            return;
          }
          if (token.isCancellationRequested) {
            return;
          }

          progress.report({
            increment: 5,
            message: getMessage("validating.model"),
          });
          const {
            provider: newProvider,
            model: newModel,
            aiProvider,
            selectedModel,
          } = await this.selectAndUpdateModelConfiguration(provider, model);

          if (!selectedModel || !aiProvider) {
            notify.error("no.model.selected");
            return;
          }

          // 检查AI Provider是否支持生成PR摘要的方法
          if (!aiProvider.generatePRSummary) {
            notify.error(
              formatMessage("provider.does.not.support.feature", [
                newProvider,
                "PR Summary Generation",
              ])
            );
            return;
          }
          if (token.isCancellationRequested) {
            return;
          }

          progress.report({
            increment: 40,
            message: getMessage("analyzing.commits"),
          });
          const requestParams: AIRequestParams = {
            // 这里需要根据aiProvider.generatePRSummary的参数进行调整
            // 目前AIRequestParams没有直接对应PR摘要的字段，可能需要扩展或复用现有字段
            diff: "", // PR摘要通常不需要diff，而是commit列表
            model: selectedModel,
            additionalContext: commitMessages.join("\n"), // 将commit列表作为额外上下文
            language: configuration.base.language,
            // 其他可能需要的参数，例如PR模板等
          };
          // 确保 aiProvider.generatePRSummary 存在
          if (!aiProvider.generatePRSummary) {
            const errorMessage = formatMessage(
              "provider.does.not.support.feature",
              [newProvider, "PR Summary Generation"]
            );
            notify.error(errorMessage);
            throw new Error(errorMessage);
          }

          const prSummary = await aiProvider.generatePRSummary(
            requestParams,
            commitMessages
          );

          if (token.isCancellationRequested) {
            return;
          }

          progress.report({
            increment: 25,
            message: getMessage("preparing.results"),
          });
          if (prSummary && prSummary.content) {
            // 将生成的PR摘要显示给用户，例如在新的编辑器窗口中打开
            const document = await vscode.workspace.openTextDocument({
              content: `# ${getMessage("pr.summary.title")}\n\n${
                prSummary.content
              }`,
              language: "markdown",
            });
            await vscode.window.showTextDocument(document);
            notify.info("pr.summary.generated");
          } else {
            notify.error("pr.summary.generation.failed");
          }
          progress.report({
            increment: 100,
          });
        }
      );
    } catch (error) {
      console.error("Error generating PR summary:", error);
      if (error instanceof Error) {
        notify.error("pr.summary.generation.failed.error", [error.message]);
      }
    }
  }
}
