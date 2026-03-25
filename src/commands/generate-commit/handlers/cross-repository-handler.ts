import {
  CrossRepositoryItemResult,
  CrossRepositoryResult,
  GenerationResult,
  GenerationSession,
  GenerationTargetContext,
} from "@/commands/generate-commit/types";
import { getMessage } from "@/utils/i18n";
import { Logger } from "@/utils/logger";
import { ProgressHandler } from "@/utils/notification/progress-handler";
import * as path from "path";
import * as vscode from "vscode";

export class CrossRepositoryHandler {
  constructor(private readonly logger: Logger) {}

  async handle(
    session: GenerationSession,
    performGeneration: (
      progress: vscode.Progress<{ message?: string; increment?: number }>,
      token: vscode.CancellationToken,
      target: GenerationTargetContext,
    ) => Promise<GenerationResult>,
  ): Promise<CrossRepositoryResult> {
    if (session.scmContext.mode !== "cross") {
      return {
        requestId: session.requestId,
        total: 0,
        successCount: 0,
        failureCount: 0,
        cancelled: false,
        results: [],
      };
    }

    const targets = session.scmContext.targets;
    const total = targets.length;
    const results: CrossRepositoryItemResult[] = [];
    let cancelled = false;

    await ProgressHandler.withProgress(
      `正在为 ${total} 个仓库生成提交信息...`,
      async (progress, token) => {
        for (let index = 0; index < total; index++) {
          const target = targets[index];
          const repoName = path.basename(target.repositoryPath);

          if (token.isCancellationRequested) {
            cancelled = true;
            results.push({
              repoPath: target.repositoryPath,
              requestId: session.requestId,
              status: "cancelled",
              repositoryPath: target.repositoryPath,
            });
            break;
          }

          progress.report({
            message: `仓库 ${index + 1}/${total}: ${repoName}`,
            increment: (100 / total) * index,
          });

          const startTime = Date.now();

          if (!target.scmProvider || target.detectionError) {
            results.push({
              repoPath: target.repositoryPath,
              requestId: session.requestId,
              status: "failed",
              repositoryPath: target.repositoryPath,
              error:
                target.detectionError ||
                `SCM provider missing for ${target.repositoryPath}`,
            });
            continue;
          }

          try {
            const generationResult = await performGeneration(
              progress,
              token,
              target,
            );
            results.push({
              ...generationResult,
              repoPath: target.repositoryPath,
              repositoryPath: target.repositoryPath,
            });
            this.logger.info(
              `[CrossRepo] Repository processed: ${target.repositoryPath} (${Date.now() - startTime}ms), status=${generationResult.status}`,
            );
          } catch (error) {
            results.push({
              repoPath: target.repositoryPath,
              requestId: session.requestId,
              status: "failed",
              repositoryPath: target.repositoryPath,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        progress.report({ message: getMessage("progress.complete"), increment: 100 });
      },
    );

    const successCount = results.filter(
      (result) => result.status === "success",
    ).length;
    const failureCount = results.filter(
      (result) => result.status === "failed" || result.status === "too_large",
    ).length;

    return {
      requestId: session.requestId,
      total,
      successCount,
      failureCount,
      cancelled,
      results,
    };
  }
}

