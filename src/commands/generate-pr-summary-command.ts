import { AIProviderFactory } from "@/ai/ai-provider-factory";
import { AIRequestParams } from "@/ai/types";
import { BaseCommand } from "@/commands/base-command";
import { ProfileManagerService } from "@/services/profile-manager/profile-manager-service";
import { PreferencesSettingsManager } from "@/services/settings/preferences-settings-manager";
import { formatMessage, getMessage } from "@/utils/i18n";
import { notify } from "@/utils/notification";
import { ProgressHandler } from "@/utils/notification/progress-handler";
import * as vscode from "vscode";

export class GeneratePRSummaryCommand extends BaseCommand {
  constructor(
    context: vscode.ExtensionContext,
    private readonly profileManager: ProfileManagerService
  ) {
    super(context);
  }

  async execute(): Promise<void> {
    this.logger.info("Executing GeneratePRSummaryCommand...");
    if ((await this.showConfirmAIProviderToS()) === false) {
      this.logger.warn("User did not confirm AI provider ToS.");
      return;
    }

    const configResult = await this.handleConfiguration();
    if (!configResult) {
      this.logger.warn("Configuration is not valid.");
      return;
    }
    const { provider, model, config } = configResult;
    this.logger.info(
      `Configuration handled. Provider: ${provider}, Model: ${model}, Config: ${JSON.stringify(config)}`
    );

    try {
      await ProgressHandler.withProgress(
        getMessage("progress.generating.pr.summary"),
        async (progress, token) => {
          if (token.isCancellationRequested) {
            this.logger.info("User cancelled PR summary generation.");
            return;
          }
          progress.report({
            increment: 5,
            message: getMessage("detecting.scm.provider"),
          });
          const result = await this.detectSCMProvider();
          if (!result) {
            this.logger.error("SCM provider not detected.");
            notify.error("scm.not.detected");
            return;
          }
          const { scmProvider } = result;
          this.logger.info(`SCM provider detected: ${scmProvider.type}`);

          if (scmProvider.type !== "git") {
            this.logger.error(
              "PR summary generation is only supported for Git."
            );
            notify.error("pr.summary.git.only");
            return;
          }

          // 获取配置信息
          const featureSettings = this.profileManager.getFeatureSettings();
          const preferences =
            PreferencesSettingsManager.getInstance().getSettings();
          const configuration = {
            base: { language: preferences.language },
            features: {
              prSummary: { baseBranch: "origin/main", headBranch: "HEAD" },
            },
          };
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
                this.logger.info(`User selected base branch: ${baseBranch}`);
              } else {
                // 用户取消选择，可以中止操作或使用默认值
                this.logger.info("User cancelled base branch selection.");
                notify.info("pr.summary.base.branch.selection.cancelled"); // 新增 i18n key
                return; // 或者继续使用默认 baseBranch
              }
            } else {
              this.logger.warn("No branches found to select from.");
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
            this.logger.info(
              `No commit messages found between ${baseBranch} and ${headBranch}.`
            );
            notify.info("pr.summary.no.commits");
            return;
          }
          this.logger.info(
            `Found ${commitMessages.length} commit messages between ${baseBranch} and ${headBranch}.`
          );
          if (token.isCancellationRequested) {
            return;
          }

          // Model is already validated by handleConfiguration
          // 🔥 关键修复：传递 config 以确保 API key 等配置被正确传递
          const aiProvider = AIProviderFactory.getProvider(provider, config);
          // 确保设置全局配置（包含 preferences 等）
          if (aiProvider && typeof aiProvider.setGlobalConfig === "function") {
            aiProvider.setGlobalConfig(config);
          }
          const selectedModel: any = { id: model, name: model }; // Simplified, type assertion to bypass strict checking

          if (!aiProvider) {
            this.logger.error("AI provider not found.");
            notify.error("ai.provider.not.found");
            return;
          }
          this.logger.info(`Using AI Provider: ${provider}, Model: ${model}`);

          // 检查AI Provider是否支持生成PR摘要的方法
          if (!aiProvider.generatePRSummary) {
            this.logger.error(
              `Provider ${provider} does not support PR Summary Generation.`
            );
            notify.error(
              formatMessage("provider.does.not.support.feature", [
                provider,
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
          const params: AIRequestParams = {
            diff: "", // PR summary uses commit messages, not diff
            model: selectedModel,
            additionalContext: commitMessages.join("\n"), // 将commit列表作为额外上下文
            language: configuration.base.language,
            feature: "pr-summary",
          };
          // 确保 aiProvider.generatePRSummary 存在
          if (!aiProvider.generatePRSummary) {
            const errorMessage = formatMessage(
              "provider.does.not.support.feature",
              [provider, "PR Summary Generation"]
            );
            this.logger.error(errorMessage);
            notify.error(errorMessage);
            throw new Error(errorMessage);
          }

          const prSummary = await aiProvider.generatePRSummary(
            params,
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
            this.logger.error("PR summary generation failed.");
            notify.error("pr.summary.generation.failed");
          }
          progress.report({
            increment: 100,
          });
        }
      );
    } catch (error) {
      this.logger.logError(error as Error, "生成PR摘要失败");
      if (error instanceof Error) {
        notify.error("pr.summary.generation.failed.error", [error.message]);
      }
    }
  }
}
