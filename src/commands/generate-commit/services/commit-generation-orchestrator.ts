import { CommandContext } from "@/commands/base-command";
import {
  GenerationSession,
  GenerationTargetContext,
  NormalizedCommandInput,
} from "@/commands/generate-commit/types";
import { ISCMProvider } from "@/scm/scm-provider";
import {
  GroupedRepositoryState,
  multiRepositoryContextManager,
} from "@/scm/multi-repository-context-manager";
import { SCMDetectorService } from "@/services/core/scm-detector-service";
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

    let groupedRepositories: Map<string, GroupedRepositoryState> | undefined;
    let groupingError: unknown;
    if (input.resourceStates.length > 0) {
      try {
        groupedRepositories =
          await multiRepositoryContextManager.groupResourceStatesByRepository(
            input.resourceStates,
          );
      } catch (error) {
        groupingError = error;
        this.deps.logger.warn(
          `[Chain] [Orchestrator] Failed to group files by repository: ${error}`,
        );
      }
    }

    if (groupingError && input.resourceStates.length > 1) {
      await notify.error("generate.commit.repository.grouping.failed");
      return undefined;
    }

    const groupedRepositoryCount = groupedRepositories?.size ?? 0;
    const hasGroupedRepositories = groupedRepositoryCount > 0;
    const isCrossRepository = groupedRepositoryCount > 1;

    const context = await this.deps.prepare(input.prepareArg, {
      requireSelectedFiles: false,
      validateModel: true,
      skipSCMDetection: hasGroupedRepositories,
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

    if (isCrossRepository && groupedRepositories) {
      const targets =
        await this.buildCrossRepositoryTargets(groupedRepositories);

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

    if (hasGroupedRepositories && groupedRepositoryCount === 1 && groupedRepositories) {
      const singleTarget =
        await this.buildSingleRepositoryTargetFromGrouped(groupedRepositories);
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
    groupedRepositories: Map<string, GroupedRepositoryState>,
  ): Promise<GenerationTargetContext[]> {
    const targets: GenerationTargetContext[] = [];

    for (const [repositoryPath, repositoryState] of groupedRepositories.entries()) {
      targets.push(
        await this.buildTargetForRepository(repositoryPath, repositoryState),
      );
    }

    return targets;
  }

  private async buildSingleRepositoryTargetFromGrouped(
    groupedRepositories: Map<string, GroupedRepositoryState>,
  ): Promise<GenerationTargetContext | undefined> {
    const firstEntry = groupedRepositories.entries().next().value as
      | [string, GroupedRepositoryState]
      | undefined;

    if (!firstEntry) {
      return undefined;
    }

    const [repositoryPath, repositoryState] = firstEntry;
    const target = await this.buildTargetForRepository(
      repositoryPath,
      repositoryState,
    );

    if (!target.scmProvider) {
      await notify.error(getMessage("scm.not.detected"));
      return undefined;
    }

    return target;
  }

  private async buildTargetForRepository(
    repositoryPath: string,
    repositoryState: GroupedRepositoryState,
  ): Promise<GenerationTargetContext> {
    const { files, scmType } = repositoryState;
    let scmProvider: ISCMProvider | undefined;
    let selectedFiles = files;
    let resolvedRepositoryPath = repositoryPath;
    let detectionError: string | undefined;

    try {
      const detectionResult =
        await SCMDetectorService.getInstance().detectSCMProvider({
          selectedFiles: files,
          repositoryPath,
          scmType,
          suppressNotifications: true,
        });
      scmProvider = detectionResult?.scmProvider;
      selectedFiles = detectionResult?.selectedFiles || files;
      resolvedRepositoryPath = detectionResult?.repositoryPath || repositoryPath;
      if (!scmProvider) {
        detectionError = `SCM provider not detected for ${repositoryPath}`;
      }
    } catch (error) {
      detectionError = error instanceof Error ? error.message : String(error);
    }

    return {
      repositoryPath: resolvedRepositoryPath,
      scmProvider,
      selectedFiles,
      repositoryContext: this.createRepositoryContext(
        resolvedRepositoryPath,
        scmProvider,
        selectedFiles,
        scmType,
      ),
      detectionError,
    };
  }

  private createRepositoryContext(
    repositoryPath: string,
    scmProvider: ISCMProvider | undefined,
    selectedFiles?: string[],
    fallbackType?: "git" | "svn",
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
        type: scmProvider?.type || fallbackType || "unknown",
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
