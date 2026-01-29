import * as crypto from "crypto";
import { Logger } from "@/utils/logger";
import { GenerationGate } from "./generation-gate";
import { SCMContextCache, SCMContext } from "./scm-context-cache";
import { SCMDetectorService } from "@/services/core/scm-detector-service";
import { ISCMProvider } from "@/scm/scm-provider";

export interface GenerationParams {
  progress: any;
  token: any;
  provider: string;
  model: string;
  scmProvider?: ISCMProvider;
  selectedFiles?: string[];
  resources?: any[];
  repositoryPath?: string;
  providerConfig: any;
  aiProvider?: any;
  selectedModel?: any;
}

export class GenerationOrchestrator {
  private static instance: GenerationOrchestrator;
  private generationGate: GenerationGate;
  private scmCache: SCMContextCache;
  private scmDetector: SCMDetectorService;
  private logger = Logger.getInstance("GenerationOrchestrator");

  private constructor() {
    this.generationGate = GenerationGate.getInstance();
    this.scmCache = SCMContextCache.getInstance();
    this.scmDetector = SCMDetectorService.getInstance();
  }

  static getInstance(): GenerationOrchestrator {
    if (!GenerationOrchestrator.instance) {
      GenerationOrchestrator.instance = new GenerationOrchestrator();
    }
    return GenerationOrchestrator.instance;
  }

  async schedule(
    params: GenerationParams,
    executeGeneration: (params: GenerationParams) => Promise<void>,
  ): Promise<void> {
    const repoPath = params.repositoryPath || "unknown";
    const changeHash = this.computeChangeHash(
      params.selectedFiles,
      params.repositoryPath,
    );
    const transactionKey = GenerationGate.generateKey(
      repoPath,
      "commit",
      changeHash,
    );

    this.logger.info("[GenerationOrchestrator] Starting", {
      data: {
        repoPath,
        changeHash: changeHash.substring(0, 8),
      },
    });

    return this.generationGate.run(transactionKey, async () => {
      let scmContext = this.scmCache.get(repoPath);

      if (!scmContext || !params.scmProvider) {
        this.logger.info(
          "[GenerationOrchestrator] SCM cache miss, detecting...",
        );
        const scmResult = await this.scmDetector.detectSCMProvider(
          params.resources,
        );

        if (!scmResult) {
          this.logger.error("[GenerationOrchestrator] SCM detection failed");
          throw new Error("SCM detection failed");
        }

        scmContext = {
          provider: scmResult.scmProvider,
          repositoryPath: scmResult.repositoryPath || "",
          selectedFiles: scmResult.selectedFiles || [],
          timestamp: Date.now(),
        };

        this.scmCache.set(repoPath, scmContext);
      }

      const enrichedParams: GenerationParams = {
        ...params,
        scmProvider: scmContext.provider,
        repositoryPath: scmContext.repositoryPath,
        selectedFiles: params.selectedFiles || scmContext.selectedFiles,
      };

      await executeGeneration(enrichedParams);
    });
  }

  private computeChangeHash(
    selectedFiles?: string[],
    repositoryPath?: string,
  ): string {
    const input = `${repositoryPath}:${selectedFiles?.join(",") || ""}`;
    return Buffer.from(input).toString("base64").substring(0, 16);
  }
}
