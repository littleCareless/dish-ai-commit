import * as vscode from "vscode";
import { SCMPathHandler } from "./path-handler";
import { formatMessage } from "../../utils/i18n";

/**
 * 统一仓库查找工具类
 * 提供跨SCM类型的仓库查找功能，整合了所有查找器的功能
 */
export class UnifiedRepositoryFinder {
  /**
   * 统一的仓库查找方法
   * @param repositories 仓库列表
   * @param repositoryPath 指定的仓库路径
   * @param files 文件路径数组
   * @param getRepoFsPath 获取仓库路径的函数
   * @param scmType SCM类型名称
   * @returns 匹配的仓库或undefined
   */
  static findRepository<T>(
    repositories: T[],
    repositoryPath: string | undefined,
    files: string[] | undefined,
    getRepoFsPath: (repo: T) => string | undefined,
    scmType: string
  ): T | undefined {
    if (!repositories.length) {
      console.warn(`No ${scmType} repositories found`);
      return undefined;
    }

    // 1. 优先使用指定的仓库路径
    if (repositoryPath) {
      const specificRepo = this.findBySpecificPath(
        repositories, 
        repositoryPath, 
        getRepoFsPath
      );
      if (specificRepo) {
        return specificRepo;
      }
      console.warn(`Specified ${scmType} repository path not found: ${repositoryPath}`);
    }

    // 2. 单仓库情况直接返回
    if (repositories.length === 1) {
      return repositories[0];
    }

    // 3. 根据文件路径查找
    const repoByFiles = this.findByFilePaths(repositories, files, getRepoFsPath);
    if (repoByFiles) {
      return repoByFiles;
    }

    // 4. 根据活动编辑器查找
    const repoByActiveEditor = this.findByActiveEditor(repositories, getRepoFsPath);
    if (repoByActiveEditor) {
      return repoByActiveEditor;
    }

    // 5. 返回第一个仓库作为备选
    console.info(`Using first ${scmType} repository as fallback`);
    return repositories[0];
  }

  /**
   * 根据指定路径查找仓库
   * @private
   */
  private static findBySpecificPath<T>(
    repositories: T[],
    repositoryPath: string,
    getRepoFsPath: (repo: T) => string | undefined
  ): T | undefined {
    return repositories.find((repo) => {
      const repoFsPath = getRepoFsPath(repo);
      if (!repoFsPath) {return false;}
      
      const normalizedRepoPath = SCMPathHandler.normalizePath(repoFsPath);
      const normalizedTargetPath = SCMPathHandler.normalizePath(repositoryPath);
      return normalizedRepoPath === normalizedTargetPath;
    });
  }

  /**
   * 根据文件路径查找仓库
   * @private
   */
  private static findByFilePaths<T>(
    repositories: T[],
    filePaths: string[] | undefined,
    getRepoFsPath: (repo: T) => string | undefined
  ): T | undefined {
    if (!filePaths?.length) {return undefined;}

    const uris = filePaths.map((path) => vscode.Uri.file(path));
    
    for (const uri of uris) {
      for (const repo of repositories) {
        const repoPath = getRepoFsPath(repo);
        if (repoPath && SCMPathHandler.isFileInRepository(uri.fsPath, repoPath)) {
          return repo;
        }
      }
    }
    
    return undefined;
  }

  /**
   * 根据活动编辑器查找仓库
   * @private
   */
  private static findByActiveEditor<T>(
    repositories: T[],
    getRepoFsPath: (repo: T) => string | undefined
  ): T | undefined {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor?.document.uri || activeEditor.document.uri.scheme !== "file") {
      return undefined;
    }

    const activeFilePath = activeEditor.document.uri.fsPath;
    
    for (const repo of repositories) {
      const repoPath = getRepoFsPath(repo);
      if (repoPath && SCMPathHandler.isFileInRepository(activeFilePath, repoPath)) {
        return repo;
      }
    }
    
    return undefined;
  }

  /**
   * 检查文件是否在仓库中
   * @private
   */
  

  /**
   * 验证仓库
   * @param repository 仓库实例
   * @param scmType SCM类型名称
   * @param operation 操作名称（可选）
   * @returns 验证后的仓库
   * @throws {Error} 当未找到仓库时抛出错误
   */
  static validateRepository<T>(
    repository: T | undefined, 
    scmType: string,
    operation: string = "操作"
  ): T {
    if (!repository) {
      throw new Error(formatMessage("scm.repository.not.found", [scmType]) + `，无法执行${operation}`);
    }
    return repository;
  }

  /**
   * 批量验证多个仓库
   * @param repositories 仓库数组
   * @param scmType SCM类型
   * @returns 验证后的仓库数组
   * @throws {Error} 当没有可用仓库时抛出错误
   */
  static validateRepositories<T>(
    repositories: T[],
    scmType: string
  ): T[] {
    if (!repositories.length) {
      throw new Error(`未找到任何 ${scmType} 仓库`);
    }
    return repositories;
  }
}