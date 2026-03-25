import { CommandContext } from "@/commands/base-command";
import {
  GenerationSession,
  GenerationTargetContext,
  NormalizedCommandInput,
} from "@/commands/generate-commit/types";
import { ISCMProvider, SCMFactory } from "@/scm/scm-provider";
import { multiRepositoryContextManager } from "@/scm/multi-repository-context-manager";
import { RepositoryContext } from "@/scm/staged-detector-types";
import { getMessage } from "@/utils/i18n";
import { Logger } from "@/utils/logger";
import { notify } from "@/utils/notification/notification-manager";
import * as crypto from "crypto";
import * as path from "path";
import * as vscode from "vscode";

interface PrepareOptions {
  requireSelectedFiles?: boolean;
  validateModel?: boolean;
  skipSCMDetection?: boolean;
  progress?: vscode.Progress<{ message?: string; increment?: number }>;
}

export interface CommitGenerationOrchestratorDeps {
  prepare: (
    arg: any,
    options?: PrepareOptions,
  ) => Promise<CommandContext | undefined>;
  logger: Logger;
}

export class CommitGenerationOrchestrator {
  constructor(private readonly deps: CommitGenerationOrchestratorDeps) {}

  async createSession(
    input: NormalizedCommandInput,
  ): Promise<GenerationSession | undefined> {
    const requestId = crypto.randomUUID();

    let filesByRepository: Map<string, string[]> | undefined;
    if (input.resourceStates.length > 0) {
      try {
        filesByRepository =
          await multiRepositoryContextManager.groupFilesByRepository(
            input.resourceStates,
          );
      } catch (error) {
        this.deps.logger.warn(
          `[Chain] [Orchestrator] Failed to group files by repository: ${error}`,
        );
      }
    }
    const isCrossRepository = (filesByRepository?.size ?? 0) > 1;

    const context = await this.deps.prepare(input.prepareArg, {
      requireSelectedFiles: false,
      validateModel: true,
      skipSCMDetection: isCrossRepository,
    });
    if (!context) {
      return undefined;
    }

    const { provider, model, providerConfig, aiProvider, selectedModel } =
      context;

    if (!aiProvider || !selectedModel) {
      await notify.error(getMessage("model.not.available"), [provider, model]);
      return undefined;
    }

    if (isCrossRepository && filesByRepository) {
      const targets = await this.buildCrossRepositoryTargets(filesByRepository);

      if (targets.length === 0) {
        await notify.error(getMessage("scm.not.detected"));
        return undefined;
      }

      return {
        requestId,
        provider,
        model,
        providerConfig,
        aiProvider,
        selectedModel,
        input,
        scmContext: {
          mode: "cross",
          targets,
        },
      };
    }

    const singleTarget = this.buildSingleRepositoryTarget(context, input);
    if (!singleTarget) {
      return undefined;
    }

    return {
      requestId,
      provider,
      model,
      providerConfig,
      aiProvider,
      selectedModel,
      input,
      scmContext: {
        mode: "single",
        target: singleTarget,
      },
    };
  }

  private buildSingleRepositoryTarget(
    context: CommandContext,
    input: NormalizedCommandInput,
  ): GenerationTargetContext | undefined {
    const { scmProvider, selectedFiles, repositoryPath } = context;
    if (!scmProvider) {
      notify.error(getMessage("scm.not.detected"));
      return undefined;
    }
    if (!repositoryPath) {
      notify.warn("scm.repository.not.found", [scmProvider.type.toUpperCase()]);
      return undefined;
    }

    return {
      repositoryPath,
      scmProvider,
      selectedFiles,
      repositoryContext: this.createRepositoryContext(
        repositoryPath,
        scmProvider,
        selectedFiles,
      ),
    };
  }

  private async buildCrossRepositoryTargets(
    filesByRepository: Map<string, string[]>,
  ): Promise<GenerationTargetContext[]> {
    const targets: GenerationTargetContext[] = [];

    for (const [repositoryPath, files] of filesByRepository.entries()) {
      let scmProvider: ISCMProvider | undefined;
      let detectionError: string | undefined;

      try {
        scmProvider = await SCMFactory.detectSCM(files, repositoryPath);
        if (!scmProvider) {
          detectionError = `SCM provider not detected for ${repositoryPath}`;
        }
      } catch (error) {
        detectionError = error instanceof Error ? error.message : String(error);
      }

      targets.push({
        repositoryPath,
        scmProvider,
        selectedFiles: files,
        repositoryContext: this.createRepositoryContext(
          repositoryPath,
          scmProvider,
          files,
        ),
        detectionError,
      });
    }

    return targets;
  }

  private createRepositoryContext(
    repositoryPath: string,
    scmProvider: ISCMProvider | undefined,
    selectedFiles?: string[],
  ): RepositoryContext {
    const activeFile = vscode.window.activeTextEditor?.document?.fileName;
    const firstFile = selectedFiles?.[0] || activeFile;
    const relative = firstFile
      ? path.relative(repositoryPath, path.dirname(firstFile))
      : "";

    return {
      repository: {
        path: repositoryPath,
        name: path.basename(repositoryPath),
        type: scmProvider?.type || "unknown",
        isActive: false,
      },
      selectedFiles: selectedFiles?.length ? selectedFiles : undefined,
      activeFile,
      workingDirectory:
        relative && !relative.startsWith("..") && !path.isAbsolute(relative)
          ? relative
          : "",
    };
  }
}
