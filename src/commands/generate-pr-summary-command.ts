import { AIRequestParams } from "@/ai/types";
import { BaseCommand } from "@/commands/base-command";
import { formatMessage, getMessage } from "@/utils/i18n";
import { notify } from "@/utils/notification";
import { ProgressHandler } from "@/utils/notification/progress-handler";
import * as vscode from "vscode";

export class GeneratePRSummaryCommand extends BaseCommand {
  constructor(context: vscode.ExtensionContext) {
    super(context);
  }

  async execute(arg: any): Promise<void> {
    this.logger.info("Executing GeneratePRSummaryCommand...");

    await ProgressHandler.withProgress(
      getMessage("progress.generating.pr.summary"),
      async (progress, token) => {
        const context = await this.prepare(arg, {
          validateModel: true,
          progress,
        });
        if (!context || token.isCancellationRequested) {
          return;
        }

        const { scmProvider, aiProvider, model, providerConfig } = context;
        const selectedModel: any = { id: model, name: model };

        if (scmProvider.type !== "git") {
          this.logger.error("PR summary generation is only supported for Git.");
          notify.error("pr.summary.git.only");
          return;
        }

        let baseBranch =
          providerConfig.features?.prSummary?.baseBranch || "origin/main";
        const headBranch =
          providerConfig.features?.prSummary?.headBranch || "HEAD";

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
            baseBranch = this.resolveBaseBranch(baseBranch, branches);
            this.logger.info(`Auto selected base branch: ${baseBranch}`);
          } else {
            this.logger.warn("No branches found to select from.");
            notify.warn("pr.summary.no.branches.found");
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

        if (!aiProvider || !aiProvider.generatePRSummary) {
          const errorMessage = formatMessage(
            "provider.does.not.support.feature",
            [context.provider, "PR Summary Generation"]
          );
          this.logger.error(errorMessage);
          notify.error(errorMessage);
          return;
        }

        progress.report({
          increment: 40,
          message: getMessage("analyzing.commits"),
        });
        const params: AIRequestParams = {
          diff: "",
          model: selectedModel,
          additionalContext: commitMessages.join("\n"),
          language: providerConfig.base.language,
          feature: "pr-summary",
        };

        try {
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
        } catch (error) {
          this.logger.logError(error as Error, "生成PR摘要失败");
          if (error instanceof Error) {
            notify.error("pr.summary.generation.failed.error", [error.message]);
          }
        } finally {
          progress.report({ increment: 100 });
        }
      }
    );
  }

  private resolveBaseBranch(configuredBase: string, branches: string[]): string {
    if (branches.includes(configuredBase)) {
      return configuredBase;
    }

    const preferred = ["origin/main", "origin/master", "main", "master"];
    const candidate = preferred.find((branch) => branches.includes(branch));
    if (candidate) {
      return candidate;
    }

    return branches[0];
  }
}
