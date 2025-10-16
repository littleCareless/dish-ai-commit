import * as vscode from "vscode";
import { SCMFactory, ISCMProvider } from "../scm/scm-provider";
import { notify } from "../utils/notification/notification-manager";
import { getMessage } from "../utils/i18n";
import { multiRepositoryContextManager } from "../scm/multi-repository-context-manager";

/**
 * SCM检测器服务
 * 负责从VS Code环境中检测活动的SCM提供者和相关上下文（如文件、仓库）。
 */
export class SCMDetectorService {
  /**
   * 提取文件路径，优先使用 renameResourceUri（重命名后的文件）
   */
  private static extractFilePath(state: vscode.SourceControlResourceState): string | undefined {
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
      | vscode.SourceControlResourceState[]
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
          .filter((path): path is string => Boolean(path))
      ),
    ];

    return files.length > 0 ? files : undefined;
  }


  /**
   * 检测并获取SCM提供程序
   * @param {vscode.SourceControlResourceState | vscode.SourceControlResourceState[] | string[] | undefined} resourcesOrFiles - 可选的资源状态、文件路径列表或字符串数组
   * @returns SCM提供程序实例和相关信息
   */
  public static async detectSCMProvider(
    resourcesOrFiles?:
      | vscode.SourceControlResourceState
      | vscode.SourceControlResourceState[]
      | string[]
  ): Promise<
    | {
        scmProvider: ISCMProvider;
        selectedFiles: string[] | undefined;
        repositoryPath: string | undefined;
      }
    | undefined
  > {
    let selectedFiles: string[] | undefined;
    let repositoryPath: string | undefined;

    // 判断参数类型并处理
    if (resourcesOrFiles) {
      // 如果是字符串数组，直接作为文件路径使用（保持向后兼容）
      if (
        Array.isArray(resourcesOrFiles) &&
        typeof resourcesOrFiles[0] === "string"
      ) {
        selectedFiles = resourcesOrFiles as string[];
      }
      // 如果是资源状态，提取文件和仓库信息
      else {
        const resources = resourcesOrFiles as
          | vscode.SourceControlResourceState
          | vscode.SourceControlResourceState[];
        selectedFiles = this.getSelectedFiles(resources);
        repositoryPath = await multiRepositoryContextManager.getRepositoryFromResources(
          resources,
          selectedFiles
        );
      }
    }

    const scmProvider = await SCMFactory.detectSCM(
      selectedFiles,
      repositoryPath
    );
    if (!scmProvider) {
      await notify.error(getMessage("scm.not.detected"));
      return;
    }

    return {
      scmProvider,
      selectedFiles,
      repositoryPath,
    };
  }
}
