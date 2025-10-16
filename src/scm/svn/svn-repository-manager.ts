import * as vscode from "vscode";
import { SvnRepository } from "./svn-provider-interface";
import { ImprovedPathUtils } from "../utils/improved-path-utils";
import { Logger } from "../../utils/logger";

/**
 * SVN仓库管理器
 * 负责处理SVN仓库查找和路径相关操作
 */
export class SvnRepositoryManager {
  private repositories: SvnRepository[];
  private readonly repositoryPath?: string;
  private logger: Logger;

  /**
   * 创建SVN仓库管理器实例
   * @param repositories SVN仓库数组
   * @param repositoryPath 可选的指定仓库路径
   */
  constructor(repositories: SvnRepository[], repositoryPath?: string) {
    this.repositories = repositories;
    this.repositoryPath = repositoryPath;
    this.logger = Logger.getInstance("Dish AI Commit Gen");
  }

  /**
   * 根据文件路径或当前上下文找到最匹配的SVN仓库
   * @param filePaths 可选的文件路径数组，用于精确定位仓库
   * @returns 匹配的SVN仓库实例
   */
  public findRepository(filePaths?: string[]): SvnRepository | undefined {
    const { repositories } = this;

    if (!repositories.length) {
      return undefined;
    }

    // 1. 如果在构造时提供了特定的仓库路径，优先使用它
    if (this.repositoryPath) {
      const specificRepo = repositories.find((repo) => {
        const repoFsPath = this.getRepoFsPath(repo);
        if (!repoFsPath) {
          return false;
        }
        const normalizedRepoPath = ImprovedPathUtils.normalizePath(repoFsPath);
        const normalizedTargetPath = ImprovedPathUtils.normalizePath(
          this.repositoryPath!
        );

        // Use the pathsEqual method which handles platform-specific path comparison
        return ImprovedPathUtils.pathsEqual(
          normalizedRepoPath,
          normalizedTargetPath
        );
      });
      return specificRepo;
    }

    // --- Fallback Logic ---
    // 仅在未提供 repositoryPath 时执行以下逻辑

    // 如果只有一个仓库，直接返回
    if (repositories.length === 1) {
      return repositories[0];
    }

    const uris = filePaths?.map((path) => vscode.Uri.file(path));

    // 2. 根据提供的文件路径查找
    if (uris && uris.length > 0) {
      for (const uri of uris) {
        for (const repo of repositories) {
          const repoPath = this.getRepoFsPath(repo);
          if (repoPath) {
            const normalizedRepoPath =
              ImprovedPathUtils.normalizePath(repoPath);
            const normalizedFilePath = ImprovedPathUtils.normalizePath(
              uri.fsPath
            );

            // Use the pathStartsWith helper for platform-aware path prefix checking
            if (
              ImprovedPathUtils.pathStartsWith(
                normalizedFilePath,
                normalizedRepoPath
              )
            ) {
              return repo; // 找到第一个匹配的就返回
            }
          }
        }
      }
    }

    // 3. 根据当前打开的活动编辑器查找
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor?.document.uri.scheme === "file") {
      const activeFileUri = activeEditor.document.uri;
      for (const repo of repositories) {
        const repoPath = this.getRepoFsPath(repo);
        if (repoPath) {
          const normalizedRepoPath = ImprovedPathUtils.normalizePath(repoPath);
          const normalizedFilePath = ImprovedPathUtils.normalizePath(
            activeFileUri.fsPath
          );

          // Use the pathStartsWith helper for platform-aware path prefix checking
          if (
            ImprovedPathUtils.pathStartsWith(
              normalizedFilePath,
              normalizedRepoPath
            )
          ) {
            return repo;
          }
        }
      }
    }

    // 4. 如果上述都找不到，返回第一个仓库作为备选
    return repositories[0];
  }

  /**
   * 查找仓库并获取其文件系统路径
   * @param files 可选的文件路径数组
   * @returns 包含仓库和仓库路径的对象，如果未找到则返回undefined
   */
  public findRepositoryAndPath(
    files?: string[]
  ): { repository: SvnRepository; repositoryPath: string } | undefined {
    const repository = this.findRepository(files);
    if (!repository) {
      return undefined;
    }
    const repositoryPath = this.getRepoFsPath(repository);
    if (!repositoryPath) {
      return undefined;
    }
    return { repository, repositoryPath };
  }

  /**
   * 获取SVN仓库的文件系统路径
   * @param repo SVN仓库实例
   * @returns 仓库的文件系统路径
   */
  public getRepoFsPath(repo: SvnRepository): string | undefined {
    // SVN API中的仓库对象可能有一个非标准的root属性
    return (repo as any).root || repo.rootUri?.fsPath;
  }

  /**
   * 更新存储的仓库列表
   * @param repositories 新的SVN仓库数组
   */
  public updateRepositories(repositories: SvnRepository[]): void {
    this.repositories = repositories;
  }
}
