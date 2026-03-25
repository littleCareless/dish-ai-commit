import * as vscode from "vscode";
import { multiRepositoryContextManager } from "@/scm/multi-repository-context-manager";
import { ISCMProvider, SCMFactory } from "@/scm/scm-provider";
import { extractResourceFilePathsOrUndefined } from "@/scm/utils/resource-state-utils";
import { getMessage } from "@/utils/i18n";
import { notify } from "@/utils/notification/notification-manager";
import { Logger } from "@/utils/logger";
import { SCMContextCache } from "@/core/scm-context-cache";
import * as path from "path";

export interface ExplicitSCMDetectionContext {
  selectedFiles?: string[];
  repositoryPath?: string;
  scmType?: "git" | "svn";
  suppressNotifications?: boolean;
}

export interface SCMDetectionResult {
  scmProvider: ISCMProvider;
  selectedFiles: string[] | undefined;
  repositoryPath: string | undefined;
}

type SCMDetectionInput =
  | vscode.SourceControlResourceState
  | vscode.SourceControlResourceState[]
  | string[]
  | ExplicitSCMDetectionContext;

/**
 * SCM检测器服务 - 单例模式
 * 负责从VS Code环境中检测活动的SCM提供者和相关上下文（如文件、仓库）。
 *
 * 设计原则：
 * - 单例模式：全局唯一实例
 * - 无状态缓存：避免数据过期（仓库结构相对稳定，但为了一致性也不缓存）
 * - 优化遍历：减少重复的文件系统操作
 */
export class SCMDetectorService {
  private static instance: SCMDetectorService;
  private logger: Logger;
  private scmCache = SCMContextCache.getInstance();

  private constructor() {
    this.logger = Logger.getInstance("SCMDetectorService");
  }

  /**
   * 获取单例实例
   */
  static getInstance(): SCMDetectorService {
    if (!SCMDetectorService.instance) {
      SCMDetectorService.instance = new SCMDetectorService();
    }
    return SCMDetectorService.instance;
  }
  /**
   * 获取用户选中的文件列表
   * @param resourceStates - 源代码管理资源状态
   * @returns 文件路径列表，如果没有选择文件则返回undefined
   */
  public static getSelectedFiles(
    resourceStates?:
      | vscode.SourceControlResourceState
      | vscode.SourceControlResourceState[],
  ): string[] | undefined {
    return extractResourceFilePathsOrUndefined(resourceStates);
  }

  private isFileInsideRepository(
    filePath: string,
    repositoryPath: string,
  ): boolean {
    if (!filePath || !repositoryPath || !path.isAbsolute(filePath)) {
      return true;
    }

    const normalizedRepositoryPath = path.resolve(repositoryPath);
    const normalizedFilePath = path.resolve(filePath);
    const relativePath = path.relative(
      normalizedRepositoryPath,
      normalizedFilePath,
    );

    return (
      relativePath === "" ||
      (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
    );
  }

  private async sanitizeSelectedFilesForRepository(
    selectedFiles: string[] | undefined,
    repositoryPath: string | undefined,
    suppressNotifications = false,
  ): Promise<{
    selectedFiles: string[] | undefined;
    invalidSelection: boolean;
  }> {
    if (!repositoryPath || !selectedFiles || selectedFiles.length === 0) {
      return { selectedFiles, invalidSelection: false };
    }

    const filesWithinRepository = selectedFiles.filter((filePath) =>
      this.isFileInsideRepository(filePath, repositoryPath),
    );
    const excludedCount = selectedFiles.length - filesWithinRepository.length;

    if (excludedCount === 0) {
      return { selectedFiles, invalidSelection: false };
    }

    this.logger.warn("Detected selected files outside repository boundary", {
      data: {
        repositoryPath,
        totalFiles: selectedFiles.length,
        keptFiles: filesWithinRepository.length,
        excludedFiles: excludedCount,
      },
    });

    if (filesWithinRepository.length === 0) {
      if (!suppressNotifications) {
        await notify.error("generate.commit.selected.files.outside.repository", [
          repositoryPath,
        ]);
      }
      return { selectedFiles: undefined, invalidSelection: true };
    }

    if (!suppressNotifications) {
      await notify.warn("generate.commit.selected.files.filtered", [
        excludedCount,
        repositoryPath,
      ]);
    }

    return {
      selectedFiles: filesWithinRepository,
      invalidSelection: false,
    };
  }

  private isExplicitDetectionContext(
    input: SCMDetectionInput | undefined,
  ): input is ExplicitSCMDetectionContext {
    if (!input || Array.isArray(input) || typeof input !== "object") {
      return false;
    }

    return (
      "selectedFiles" in input ||
      "repositoryPath" in input ||
      "scmType" in input ||
      "suppressNotifications" in input
    );
  }

  private async detectFromResolvedContext(
    input: ExplicitSCMDetectionContext,
    startTime: number,
  ): Promise<SCMDetectionResult | undefined> {
    let {
      selectedFiles,
      repositoryPath,
      scmType,
      suppressNotifications = false,
    } = input;

    const initialSanitizedSelection =
      await this.sanitizeSelectedFilesForRepository(
        selectedFiles,
        repositoryPath,
        suppressNotifications,
      );
    if (initialSanitizedSelection.invalidSelection) {
      return undefined;
    }
    selectedFiles = initialSanitizedSelection.selectedFiles;

    const scmProvider =
      scmType && repositoryPath
        ? await SCMFactory.createProviderForRepository(repositoryPath, scmType)
        : await SCMFactory.detectSCM(selectedFiles, repositoryPath);

    if (!scmProvider) {
      const duration = Date.now() - startTime;
      this.logger.error("SCM detection failed", {
        data: { duration: `${duration}ms`, repositoryPath, scmType },
      });
      if (!suppressNotifications) {
        await notify.error(getMessage("scm.not.detected"));
      }
      return undefined;
    }

    if (!repositoryPath) {
      repositoryPath = SCMFactory.getCurrentRepositoryPath();
    }

    const finalSanitizedSelection =
      await this.sanitizeSelectedFilesForRepository(
        selectedFiles,
        repositoryPath,
        suppressNotifications,
      );
    if (finalSanitizedSelection.invalidSelection) {
      return undefined;
    }
    selectedFiles = finalSanitizedSelection.selectedFiles;

    const result: SCMDetectionResult = {
      scmProvider,
      selectedFiles,
      repositoryPath,
    };

    if (repositoryPath) {
      this.scmCache.set(repositoryPath, {
        provider: scmProvider,
        repositoryPath,
        selectedFiles: selectedFiles || [],
        timestamp: Date.now(),
      });
    }

    return result;
  }

  /**
   * 检测并获取SCM提供程序
   * 链路追踪日志：[Chain] [SCM-Detection]
   *
   * @param resourcesOrFiles - 可选的资源状态、文件路径列表、或显式上下文
   * @returns SCM提供程序实例和相关信息
   */
  public async detectSCMProvider(
    resourcesOrFiles?: SCMDetectionInput,
  ): Promise<SCMDetectionResult | undefined> {
    const startTime = Date.now();
    this.logger.info("[SCM-Detection] START", {
      data: {
        inputType: Array.isArray(resourcesOrFiles)
          ? `Array(${resourcesOrFiles.length})`
          : this.isExplicitDetectionContext(resourcesOrFiles)
            ? "ExplicitContext"
            : resourcesOrFiles
              ? "Resources"
              : "None",
      },
    });

    let selectedFiles: string[] | undefined;
    let repositoryPath: string | undefined;
    let scmType: "git" | "svn" | undefined;
    let suppressNotifications = false;

    if (this.isExplicitDetectionContext(resourcesOrFiles)) {
      ({
        selectedFiles,
        repositoryPath,
        scmType,
        suppressNotifications = false,
      } = resourcesOrFiles);
      if (selectedFiles?.length) {
        this.logger.debug("Using explicit selected files", {
          data: { count: selectedFiles.length, repositoryPath, scmType },
        });
      }
    } else if (resourcesOrFiles) {
      if (
        Array.isArray(resourcesOrFiles) &&
        typeof resourcesOrFiles[0] === "string"
      ) {
        selectedFiles = resourcesOrFiles as string[];
        this.logger.debug("Extracted files from string array", {
          data: { count: selectedFiles.length },
        });
      } else {
        const resources =
          resourcesOrFiles as
            | vscode.SourceControlResourceState
            | vscode.SourceControlResourceState[];
        selectedFiles = SCMDetectorService.getSelectedFiles(resources);

        repositoryPath =
          await multiRepositoryContextManager.getRepositoryFromResources(
            resources,
            selectedFiles,
          );

        this.logger.debug("MultiRepo detection result", {
          data: { repositoryPath },
        });
      }
    }

    const result = await this.detectFromResolvedContext(
      {
        selectedFiles,
        repositoryPath,
        scmType,
        suppressNotifications,
      },
      startTime,
    );

    if (!result) {
      return undefined;
    }

    const duration = Date.now() - startTime;
    this.logger.info("SCM-Detection] COMPLETE", {
      data: {
        duration: `${duration}ms`,
        scmType: result.scmProvider.type,
        repositoryPath: result.repositoryPath,
      },
    });

    return result;
  }
}
