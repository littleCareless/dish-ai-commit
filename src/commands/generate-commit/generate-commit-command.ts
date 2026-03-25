import { BaseCommand } from "@/commands/base-command";
import { CrossRepositoryHandler } from "@/commands/generate-commit/handlers/cross-repository-handler";
import { CommitGenerationOrchestrator } from "@/commands/generate-commit/services/commit-generation-orchestrator";
import {
  CrossRepositoryResult,
  GenerationResult,
  GenerationSession,
  GenerationTargetContext,
} from "@/commands/generate-commit/types";
import { normalizeGenerateCommitInput } from "@/commands/generate-commit/utils/input-normalizer";
import { StreamingGenerationHelper } from "@/commands/generate-commit/utils/streaming-generation-helper";
import { formatMessage } from "@/utils/i18n";
import { notify } from "@/utils/notification/notification-manager";
import { ProgressHandler } from "@/utils/notification/progress-handler";
import * as path from "path";
import * as vscode from "vscode";

/**
 * 提交信息生成命令类
 * 仅负责：参数归一化、编排器调度、统一错误出口
 */
export class GenerateCommitCommand extends BaseCommand {
  private crossRepoHandler: CrossRepositoryHandler;
  private streamingHelper: StreamingGenerationHelper;
  private orchestrator: CommitGenerationOrchestrator;

  constructor(context: vscode.ExtensionContext) {
    super(context);
    this.crossRepoHandler = new CrossRepositoryHandler(this.logger);
    this.streamingHelper = new StreamingGenerationHelper(this.logger);
    this.orchestrator = new CommitGenerationOrchestrator({
      prepare: (arg, options) => this.prepare(arg, options),
      logger: this.logger,
    });
  }

  async execute(...rawArgs: any[]): Promise<void> {
    this.logger.info("Executing GenerateCommitCommand...");
    const normalizedInput = normalizeGenerateCommitInput(rawArgs);

    try {
      const session = await this.orchestrator.createSession(normalizedInput);
      if (!session) {
        return;
      }

      this.logger.info(
        `[Chain] [CommitGeneration] START - requestId=${session.requestId}, mode=${session.scmContext.mode}`,
      );

      if (session.scmContext.mode === "cross") {
        await this.executeCrossRepositorySession(session);
        return;
      }

      await this.executeSingleRepositorySession(session);
    } catch (error) {
      this.logger.logError(error as Error, "生成提交信息失败");
      if (error instanceof Error) {
        await notify.error("generate.commit.failed", [error.message]);
      }
    }
  }

  private async executeSingleRepositorySession(
    session: GenerationSession,
  ): Promise<void> {
    if (session.scmContext.mode !== "single") {
      return;
    }

    const target = session.scmContext.target;
    if (!target.scmProvider) {
      await notify.error("scm.not.detected");
      return;
    }

    const title = formatMessage("progress.generating.commit", [
      target.scmProvider.type.toUpperCase(),
    ]);

    const result = await ProgressHandler.withProgress(
      title,
      async (progress, token) =>
        this.streamingHelper.performStreamingGeneration(
          progress,
          token,
          session,
          target,
        ),
    );

    await this.handleSingleRepositoryResult(result);
  }

  private async handleSingleRepositoryResult(
    result: GenerationResult,
  ): Promise<void> {
    if (result.status === "failed") {
      await notify.error("generate.commit.failed", [
        result.error || "Unknown generation error.",
      ]);
    }
  }

  private async executeCrossRepositorySession(
    session: GenerationSession,
  ): Promise<void> {
    if (session.scmContext.mode !== "cross") {
      return;
    }

    const result = await this.crossRepoHandler.handle(
      session,
      (
        progress,
        token,
        target: GenerationTargetContext,
      ): Promise<GenerationResult> =>
        this.streamingHelper.performStreamingGeneration(
          progress,
          token,
          session,
          target,
          { suppressSuccessNotification: true },
        ),
    );

    await this.notifyCrossRepositorySummary(result);
  }

  private async notifyCrossRepositorySummary(
    result: CrossRepositoryResult,
  ): Promise<void> {
    const nonSuccessCount = Math.max(result.total - result.successCount, 0);

    if (nonSuccessCount === 0) {
      await notify.info("generate.commit.cross.repository.success", [
        result.successCount,
      ]);
      return;
    }

    await notify.warn("generate.commit.cross.repository.partial", [
      result.successCount,
      nonSuccessCount,
    ]);

    const failedRepoNames = result.results
      .filter((item) => item.status !== "success")
      .map((item) => path.basename(item.repoPath))
      .slice(0, 5)
      .join(", ");

    if (failedRepoNames) {
      await notify.warn("generate.commit.cross.repository.failed.list", [
        failedRepoNames,
      ]);
    }
  }
}
