import * as vscode from "vscode";
import { SCMFactory, ISCMProvider } from "../scm/scm-provider";
import { notify } from "../utils/notification/notification-manager";
import { getMessage } from "../utils/i18n";

/**
 * SCM检测器服务
 * 负责从VS Code环境中检测活动的SCM提供者和相关上下文（如文件、仓库）。
 */
export class SCMDetectorService {
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
          .map(
            (state) =>
              (state as any)?._resourceUri?.fsPath || state?.resourceUri?.fsPath
          )
          .filter(Boolean)
      ),
    ];

    return files.length > 0 ? files : undefined;
  }

  /**
   * 从resources或文件路径中检测对应的Git仓库路径
   * @param resourceStates - 源代码管理资源状态
   * @param files - 可选的文件路径列表，如果不提供则从resourceStates中提取
   * @returns Git仓库路径，如果未找到则返回undefined
   */
  private static getRepositoryFromResources(
    resourceStates?:
      | vscode.SourceControlResourceState
      | vscode.SourceControlResourceState[],
    files?: string[]
  ): string | undefined {
    // 如果没有提供files，从resourceStates中提取
    if (!files && resourceStates) {
      files = this.getSelectedFiles(resourceStates);
    }

    // 优先尝试通过Git扩展获取仓库路径，以保证对Git的兼容性
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (gitExtension?.isActive) {
      try {
        const gitApi = gitExtension.exports.getAPI(1);
        const repositories = gitApi.repositories;
        if (repositories.length > 0) {
          if (files && files.length > 0) {
            for (const file of files) {
              for (const repository of repositories) {
                const repoPath = (repository as any).rootUri?.fsPath;
                if (repoPath && file.startsWith(repoPath)) {
                  return repoPath;
                }
              }
            }
          }
          // 如果没有文件匹配，但存在Git仓库，返回第一个作为备用
          return (repositories[0] as any).rootUri?.fsPath;
        }
      } catch (error) {
        console.warn("Failed to get repository from Git extension:", error);
      }
    }

    // 尝试通过SVN扩展获取仓库路径
    const svnExtension = vscode.extensions.getExtension("littleCareless.svn-scm-ai");
    if (svnExtension?.isActive) {
      try {
        const svnApi = svnExtension.exports.svnAPI;
        const repositories = svnApi.repositories;
        if (repositories.length > 0) {
          if (files && files.length > 0) {
            for (const file of files) {
              for (const repository of repositories) {
                const repoPath = repository.root;
                if (repoPath && file.startsWith(repoPath)) {
                  return repoPath;
                }
              }
            }
          }
          // 如果没有文件匹配，但存在SVN仓库，返回第一个作为备用
          return repositories[0].root;
        }
      } catch (error) {
        console.warn("Failed to get repository from SVN extension:", error);
      }
    }

    // 尝试从resourceStates直接获取（通用方式）
    if (resourceStates) {
      const states = Array.isArray(resourceStates)
        ? resourceStates
        : [resourceStates];
      for (const state of states) {
        // 检查是否为SVN资源状态
        if ((state as any).type === "svn") {
          // SVN特有的结构
          const svnRoot = (state as any).repository?.root;
          if (svnRoot) {
            return svnRoot;
          }
        }
        
        // 尝试访问 sourceControl.rootUri，这是一个更可靠的属性
        const sc = (state as any).resourceGroup?.sourceControl;
        if (sc?.rootUri?.fsPath) {
          return sc.rootUri.fsPath;
        }
        // 备用方案，直接访问 rootUri
        if ((state as any)?.rootUri?.fsPath) {
          return (state as any)?.rootUri?.fsPath;
        }
      }
    }

    // 回退到使用工作区文件夹（通用方式）
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
      if (files && files.length > 0) {
        const fileUri = vscode.Uri.file(files[0]);
        const folder = vscode.workspace.getWorkspaceFolder(fileUri);
        if (folder) {
          return folder.uri.fsPath;
        }
      }
      if (workspaceFolders.length > 0) {
        return workspaceFolders[0].uri.fsPath;
      }
    }

    return undefined;
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
        repositoryPath = this.getRepositoryFromResources(
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
