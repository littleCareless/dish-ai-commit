import * as vscode from "vscode";
import { multiRepositoryContextManager } from "@/scm/multi-repository-context-manager";
import { ISCMProvider, SCMFactory } from "@/scm/scm-provider";
import { getMessage } from "@/utils/i18n";
import { notify } from "@/utils/notification/notification-manager";
import { Logger } from "@/utils/logger";
import { SCMContextCache } from "@/core/scm-context-cache";

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
   * 提取文件路径，优先使用 renameResourceUri（重命名后的文件）
   */
  private static extractFilePath(
    state: vscode.SourceControlResourceState,
  ): string | undefined {
    const renamedPath = (state as any)?.renameResourceUri?.fsPath;
    if (renamedPath) {
      return renamedPath;
    }
    return (state as any)?._resourceUri?.fsPath || state?.resourceUri?.fsPath;
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
    if (!resourceStates) {
      return undefined;
    }

    const states = Array.isArray(resourceStates)
      ? resourceStates
      : [resourceStates];

    if (states.length === 0) {
      return undefined;
    }

    const files = [
      ...new Set(
        states
          .map((state) => this.extractFilePath(state))
          .filter((path): path is string => Boolean(path)),
      ),
    ];

    return files.length > 0 ? files : undefined;
  }

  /**
   * 检测并获取SCM提供程序
   * 链路追踪日志：[Chain] [SCM-Detection]
   *
   * 优化点：
   * 1. 移除重复检测逻辑（协调器确保只调用一次）
   * 2. 简化参数处理
   * 3. 使用 logger 替代 console.log
   *
   * @param resourcesOrFiles - 可选的资源状态、文件路径列表或字符串数组
   * @returns SCM提供程序实例和相关信息
   */
  public async detectSCMProvider(
    resourcesOrFiles?:
      | vscode.SourceControlResourceState
      | vscode.SourceControlResourceState[]
      | string[],
  ): Promise<
    | {
        scmProvider: ISCMProvider;
        selectedFiles: string[] | undefined;
        repositoryPath: string | undefined;
      }
    | undefined
  > {
    const startTime = Date.now();
    this.logger.info("[SCM-Detection] START", {
      data: {
        inputType: Array.isArray(resourcesOrFiles)
          ? `Array(${resourcesOrFiles.length})`
          : resourcesOrFiles
            ? "Resources"
            : "None",
      },
    });

    let selectedFiles: string[] | undefined;
    let repositoryPath: string | undefined;

    // 1. 提取文件路径
    if (resourcesOrFiles) {
      if (
        Array.isArray(resourcesOrFiles) &&
        typeof resourcesOrFiles[0] === "string"
      ) {
        // 字符串数组，直接使用
        selectedFiles = resourcesOrFiles as string[];
        this.logger.debug("Extracted files from string array", {
          data: { count: selectedFiles.length },
        });
      } else {
        // 资源状态，提取文件和仓库信息
        const resources =
          resourcesOrFiles as vscode.SourceControlResourceState[];
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

    // 2. 检测 SCM Provider
    const scmProvider = await SCMFactory.detectSCM(
      selectedFiles,
      repositoryPath,
    );

    if (!scmProvider) {
      const duration = Date.now() - startTime;
      this.logger.error("SCM detection failed", {
        data: { duration: `${duration}ms` },
      });
      await notify.error(getMessage("scm.not.detected"));
      return undefined;
    }

    // 3. 获取最终仓库路径
    if (!repositoryPath) {
      repositoryPath = SCMFactory.getCurrentRepositoryPath();
    }

    const duration = Date.now() - startTime;
    this.logger.info("SCM-Detection] COMPLETE", {
      data: {
        duration: `${duration}ms`,
        scmType: scmProvider.type,
        repositoryPath,
      },
    });

    const result = {
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
}
