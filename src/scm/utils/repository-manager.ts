import * as vscode from "vscode";
import * as path from "path";
import { ImprovedPathUtils } from "./improved-path-utils";
import { SCMLogger } from "./scm-logger";

/**
 * 仓库检测结果接口
 */
export interface RepositoryDetectionResult {
  /** 仓库根路径 */
  repositoryPath: string;
  /** SCM类型 */
  scmType: "git" | "svn";
  /** 检测到的文件列表 */
  detectedFiles?: string[];
}

/**
 * 仓库查找策略接口
 */
export interface RepositoryFindStrategy<T> {
  /**
   * 根据文件路径查找最匹配的仓库
   * @param repositories 可用仓库列表
   * @param filePaths 文件路径数组
   * @param repositoryPath 指定的仓库路径（可选）
   * @returns 匹配的仓库或undefined
   */
  findRepository(
    repositories: T[],
    filePaths?: string[],
    repositoryPath?: string
  ): T | undefined;

  /**
   * 获取仓库的文件系统路径
   * @param repository 仓库实例
   * @returns 仓库路径或undefined
   */
  getRepositoryPath(repository: T): string | undefined;
}

/**
 * 仓库检测和查找选项
 */
export interface RepositoryManagerOptions {
  /** VS Code资源状态 */
  resourceStates?:
    | vscode.SourceControlResourceState
    | vscode.SourceControlResourceState[];
  /** 文件路径列表 */
  files?: string[];
  /** 指定的仓库路径（优先级最高） */
  repositoryPath?: string;
}

/**
 * 路径匹配工具类 - 提取公共的路径处理逻辑
 */
class PathMatchingUtils {
  /**
   * 检查文件路径是否在仓库路径下
   */
  static isFileInRepository(filePath: string, repositoryPath: string): boolean {
    const normalizedFilePath = ImprovedPathUtils.normalizePath(filePath);
    const normalizedRepoPath = ImprovedPathUtils.normalizePath(repositoryPath);
    return normalizedFilePath.startsWith(normalizedRepoPath);
  }

  /**
   * 规范化路径数组
   */
  static normalizePathArray(paths: string[]): string[] {
    return paths
      .filter(
        (path) =>
          path &&
          typeof path === "string" &&
          ImprovedPathUtils.isValidPath(path)
      )
      .map((path) => ImprovedPathUtils.normalizePath(path));
  }

  /**
   * 比较两个路径是否相等
   */
  static pathsEqual(path1: string, path2: string): boolean {
    return (
      ImprovedPathUtils.normalizePath(path1) ===
      ImprovedPathUtils.normalizePath(path2)
    );
  }

  /**
   * 安全规范化路径 - 统一的路径规范化入口
   */
  static safeNormalizePath(inputPath: string | undefined): string | undefined {
    return inputPath ? ImprovedPathUtils.normalizePath(inputPath) : undefined;
  }
}

/**
 * VS Code 工具类 - 提取公共的VS Code API操作
 */
class VSCodeUtils {
  /**
   * 获取当前活动编辑器的文件路径
   */
  static getActiveEditorFilePath(): string | undefined {
    const activeEditor = vscode.window.activeTextEditor;
    return activeEditor?.document.uri.scheme === "file"
      ? activeEditor.document.uri.fsPath
      : undefined;
  }

  /**
   * 将资源状态转换为数组
   */
  static normalizeResourceStates(
    resourceStates?:
      | vscode.SourceControlResourceState
      | vscode.SourceControlResourceState[]
  ): vscode.SourceControlResourceState[] {
    if (!resourceStates) {
      return [];
    }
    return Array.isArray(resourceStates) ? resourceStates : [resourceStates];
  }

  /**
   * 获取最近打开的文件路径列表
   */
  static getRecentFilePaths(limit: number = 5): string[] {
    return vscode.workspace.textDocuments
      .filter((doc) => doc.uri.scheme === "file")
      .map((doc) => doc.uri.fsPath)
      .slice(0, limit);
  }
}

/**
 * SCM检测工具类 - 提取SCM相关的检测逻辑
 */
class SCMDetectionUtils {
  private static readonly SCM_FOLDERS = [
    { name: ".git", type: "git" as const },
    { name: ".svn", type: "svn" as const },
  ];

  /**
   * 检测目录中的SCM类型
   */
  static detectSCMType(
    directory: string
  ): { scmType: "git" | "svn"; scmPath: string } | undefined {
    for (const { name, type } of this.SCM_FOLDERS) {
      const scmPath = path.join(directory, name);
      if (ImprovedPathUtils.safeExists(scmPath)) {
        return { scmType: type, scmPath };
      }
    }
    return undefined;
  }

  /**
   * 创建仓库检测结果
   */
  static createDetectionResult(
    repositoryPath: string,
    scmType: "git" | "svn",
    detectedFiles?: string[]
  ): RepositoryDetectionResult {
    return {
      repositoryPath,
      scmType,
      detectedFiles,
    };
  }

  /**
   * 向上搜索SCM目录
   */
  static searchSCMUpwards(
    startPath: string,
    workspaceRoot?: string,
    maxIterations: number = 100
  ): RepositoryDetectionResult | undefined {
    const normalizedStartPath = PathMatchingUtils.safeNormalizePath(startPath);
    const normalizedWorkspaceRoot =
      PathMatchingUtils.safeNormalizePath(workspaceRoot);

    if (!normalizedStartPath) {
      return undefined;
    }

    // 确定搜索的起始目录
    let searchDir: string;
    try {
      const stats = require("fs").statSync(normalizedStartPath);
      searchDir = stats.isDirectory()
        ? normalizedStartPath
        : path.dirname(normalizedStartPath);
    } catch {
      searchDir = path.dirname(normalizedStartPath);
    }

    let currentDir = searchDir;
    let iterations = 0;

    while (currentDir && iterations < maxIterations) {
      // 如果设置了工作区根目录，不要超出该范围
      if (
        normalizedWorkspaceRoot &&
        !currentDir.startsWith(normalizedWorkspaceRoot)
      ) {
        break;
      }

      const scmResult = this.detectSCMType(currentDir);
      if (scmResult) {
        return this.createDetectionResult(currentDir, scmResult.scmType, [
          normalizedStartPath,
        ]);
      }

      // 向上一级目录
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break; // 已到达根目录
      }
      currentDir = parentDir;
      iterations++;
    }

    return undefined;
  }
}

/**
 * 参数类型工具类 - 处理联合类型参数的判断
 */
class ParameterTypeUtils {
  /**
   * 判断参数是否为字符串数组
   */
  static isStringArray(param: any): param is string[] {
    return (
      Array.isArray(param) && param.length > 0 && typeof param[0] === "string"
    );
  }

  /**
   * 判断参数是否为资源状态
   */
  static isResourceStates(
    param: any
  ): param is
    | vscode.SourceControlResourceState
    | vscode.SourceControlResourceState[] {
    return param && !this.isStringArray(param);
  }
}

/**
 * 仓库路径查找工具类 - 提取公共的仓库查找逻辑
 */
class RepositoryPathFinder {
  /**
   * 根据指定路径在仓库列表中查找匹配的仓库
   */
  static findBySpecificPath<T>(
    repositories: T[],
    repositoryPath: string,
    getPathFn: (repo: T) => string | undefined
  ): T | undefined {
    return repositories.find((repo) => {
      const repoPath = getPathFn(repo);
      return repoPath && PathMatchingUtils.pathsEqual(repoPath, repositoryPath);
    });
  }

  /**
   * 根据文件路径在仓库列表中查找包含该文件的仓库
   */
  static findByFilePaths<T>(
    repositories: T[],
    filePaths: string[],
    getPathFn: (repo: T) => string | undefined
  ): T | undefined {
    const validPaths = PathMatchingUtils.normalizePathArray(filePaths);

    for (const filePath of validPaths) {
      for (const repo of repositories) {
        const repoPath = getPathFn(repo);
        if (
          repoPath &&
          PathMatchingUtils.isFileInRepository(filePath, repoPath)
        ) {
          return repo;
        }
      }
    }

    return undefined;
  }

  /**
   * 安全获取仓库路径的通用方法
   */
  static safeGetRepositoryPath(
    repository: any,
    pathExtractor: () => string | undefined
  ): string | undefined {
    try {
      return pathExtractor();
    } catch (error) {
      SCMLogger.warn("Failed to get repository path:", error);
      return undefined;
    }
  }
}

/**
 * 统一的仓库管理器
 * 整合了仓库检测、查找、匹配等功能
 */
export class RepositoryManager {
  /**
   * 从VS Code资源状态中提取文件路径列表
   * @param resourceStates - 源代码管理资源状态
   * @returns 文件路径列表，如果没有选择文件则返回undefined
   */
  public static extractFilesFromResources(
    resourceStates?:
      | vscode.SourceControlResourceState
      | vscode.SourceControlResourceState[]
  ): string[] | undefined {
    const states = VSCodeUtils.normalizeResourceStates(resourceStates);

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
   * 从VS Code资源状态中直接获取仓库路径
   * @param resourceStates - 源代码管理资源状态
   * @returns 仓库路径，如果未找到则返回undefined
   */
  public static extractRepositoryFromResources(
    resourceStates?:
      | vscode.SourceControlResourceState
      | vscode.SourceControlResourceState[]
  ): string | undefined {
    const states = VSCodeUtils.normalizeResourceStates(resourceStates);

    for (const state of states) {
      // 尝试从资源组的源代码管理获取根路径
      const sc = (state as any).resourceGroup?.sourceControl;
      const scPath = PathMatchingUtils.safeNormalizePath(sc?.rootUri?.fsPath);
      if (scPath) {
        return scPath;
      }

      // 尝试从状态本身获取根路径
      const statePath = PathMatchingUtils.safeNormalizePath(
        (state as any)?.rootUri?.fsPath
      );
      if (statePath) {
        return statePath;
      }
    }

    return undefined;
  }

  /**
   * 通过Git扩展API匹配文件所属的仓库
   * @param files - 文件路径列表
   * @returns 匹配的仓库路径，如果未找到则返回undefined
   */
  public static findRepositoryByGitExtension(
    files?: string[]
  ): string | undefined {
    if (!files || files.length === 0) {
      return undefined;
    }

    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (!gitExtension?.isActive) {
      return undefined;
    }

    try {
      const gitApi = gitExtension.exports.getAPI(1);
      const repositories = gitApi.repositories;

      if (repositories.length === 0) {
        return undefined;
      }

      // 遍历文件，找到匹配的仓库
      for (const file of files) {
        for (const repository of repositories) {
          const repoPath = (repository as any).rootUri?.fsPath;
          if (
            repoPath &&
            PathMatchingUtils.isFileInRepository(file, repoPath)
          ) {
            return PathMatchingUtils.safeNormalizePath(repoPath) || repoPath;
          }
        }
      }

      // 如果只有一个Git仓库，返回该仓库路径
      if (repositories.length === 1) {
        const repoPath = (repositories[0] as any).rootUri?.fsPath;
        return PathMatchingUtils.safeNormalizePath(repoPath);
      }
    } catch (error) {
      SCMLogger.warn("Failed to get repository from Git extension:", error);
    }

    return undefined;
  }

  /**
   * 通过VS Code工作区API查找工作区根目录
   * @param files - 文件路径列表（可选）
   * @returns 工作区根目录路径，如果未找到则返回undefined
   */
  public static findWorkspaceRootByVSCode(
    files?: string[]
  ): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return undefined;
    }

    // 如果提供了文件，尝试找到包含该文件的工作区
    if (files && files.length > 0) {
      const fileUri = vscode.Uri.file(files[0]);
      const folder = vscode.workspace.getWorkspaceFolder(fileUri);
      if (folder) {
        return (
          PathMatchingUtils.safeNormalizePath(folder.uri.fsPath) ||
          folder.uri.fsPath
        );
      }
    }

    // 尝试从当前活动编辑器获取工作区
    const activeFilePath = VSCodeUtils.getActiveEditorFilePath();
    if (activeFilePath) {
      for (const folder of workspaceFolders) {
        const folderPath = folder.uri.fsPath;
        if (PathMatchingUtils.isFileInRepository(activeFilePath, folderPath)) {
          return PathMatchingUtils.safeNormalizePath(folderPath) || folderPath;
        }
      }
    }

    // 回退到第一个工作区
    return (
      PathMatchingUtils.safeNormalizePath(workspaceFolders[0].uri.fsPath) ||
      workspaceFolders[0].uri.fsPath
    );
  }

  /**
   * 通过文件系统检查确定SCM类型和仓库根目录
   * @param startPath - 开始检查的路径（文件或目录）
   * @param workspaceRoot - 工作区根目录（可选，用于限制搜索范围）
   * @returns SCM检测结果，如果未找到则返回undefined
   */
  public static detectSCMFromFileSystem(
    startPath: string,
    workspaceRoot?: string
  ): RepositoryDetectionResult | undefined {
    if (!ImprovedPathUtils.isValidPath(startPath)) {
      return undefined;
    }

    return SCMDetectionUtils.searchSCMUpwards(startPath, workspaceRoot);
  }

  /**
   * 综合检测仓库路径和SCM类型
   * @param options - 检测选项
   * @returns 检测结果，如果未找到则返回undefined
   */
  public static detectRepository(
    options: RepositoryManagerOptions
  ): RepositoryDetectionResult | undefined {
    let detectedFiles: string[] | undefined;
    let repositoryPath: string | undefined;

    // 1. 如果直接指定了仓库路径，优先使用
    if (
      options.repositoryPath &&
      ImprovedPathUtils.isValidPath(options.repositoryPath)
    ) {
      repositoryPath = PathMatchingUtils.safeNormalizePath(
        options.repositoryPath
      );
    }

    // 2. 从资源状态中提取文件和仓库信息
    if (options.resourceStates) {
      detectedFiles = this.extractFilesFromResources(options.resourceStates);

      if (!repositoryPath) {
        repositoryPath = this.extractRepositoryFromResources(
          options.resourceStates
        );
      }
    }

    // 3. 使用提供的文件列表
    if (!detectedFiles && options.files) {
      detectedFiles = PathMatchingUtils.normalizePathArray(options.files);
    }

    // 4. 如果还没有仓库路径，尝试通过Git扩展查找
    if (!repositoryPath && detectedFiles) {
      repositoryPath = this.findRepositoryByGitExtension(detectedFiles);
    }

    // 5. 通过文件系统检测SCM类型和仓库路径
    if (detectedFiles && detectedFiles.length > 0) {
      for (const file of detectedFiles) {
        const result = this.detectSCMFromFileSystem(file, repositoryPath);
        if (result) {
          return {
            ...result,
            detectedFiles: detectedFiles,
          };
        }
      }
    }

    // 6. 如果有仓库路径但没有SCM类型，尝试检测
    if (repositoryPath) {
      const result = this.detectSCMFromFileSystem(repositoryPath);
      if (result) {
        return {
          ...result,
          detectedFiles: detectedFiles,
        };
      }
    }

    // 7. 最后尝试从VS Code工作区查找
    const workspaceRoot = this.findWorkspaceRootByVSCode(detectedFiles);
    if (workspaceRoot) {
      const result = this.detectSCMFromFileSystem(workspaceRoot);
      if (result) {
        return {
          ...result,
          detectedFiles: detectedFiles,
        };
      }
    }

    return undefined;
  }

  /**
   * 简化的仓库路径检测方法（向后兼容）
   * @param resourcesOrFiles - 资源状态或文件路径列表
   * @param repositoryPath - 可选的仓库路径
   * @returns 仓库路径，如果未找到则返回undefined
   */
  public static findRepositoryPath(
    resourcesOrFiles?:
      | vscode.SourceControlResourceState
      | vscode.SourceControlResourceState[]
      | string[],
    repositoryPath?: string
  ): string | undefined {
    let files: string[] | undefined;
    let resourceStates:
      | vscode.SourceControlResourceState
      | vscode.SourceControlResourceState[]
      | undefined;

    // 判断参数类型
    if (resourcesOrFiles) {
      if (ParameterTypeUtils.isStringArray(resourcesOrFiles)) {
        files = resourcesOrFiles as string[];
      } else if (ParameterTypeUtils.isResourceStates(resourcesOrFiles)) {
        resourceStates = resourcesOrFiles as
          | vscode.SourceControlResourceState
          | vscode.SourceControlResourceState[];
      }
    }

    const result = this.detectRepository({
      resourceStates,
      files,
      repositoryPath,
    });

    return result?.repositoryPath;
  }
}

/**
 * 通用仓库查找器（使用策略模式）
 * 提供统一的仓库查找逻辑，适用于Git和SVN
 */
export class RepositoryFinder<T> {
  constructor(private strategy: RepositoryFindStrategy<T>) {}

  /**
   * 查找最匹配的仓库
   * @param repositories 可用仓库列表
   * @param filePaths 文件路径数组（可选）
   * @param repositoryPath 指定的仓库路径（可选）
   * @returns 匹配的仓库或undefined
   */
  findRepository(
    repositories: T[],
    filePaths?: string[],
    repositoryPath?: string
  ): T | undefined {
    try {
      SCMLogger.debug("Finding repository", {
        repositoryCount: repositories.length,
        fileCount: filePaths?.length || 0,
        specifiedPath: repositoryPath,
      });

      if (repositories.length === 0) {
        SCMLogger.warn("No repositories available");
        return undefined;
      }

      return this.strategy.findRepository(
        repositories,
        filePaths,
        repositoryPath
      );
    } catch (error) {
      SCMLogger.error("Error finding repository:", error);
      return undefined;
    }
  }

  /**
   * 根据工作区上下文查找仓库
   * @param repositories 可用仓库列表
   * @param repositoryPath 指定的仓库路径（可选）
   * @returns 匹配的仓库或undefined
   */
  findByWorkspaceContext(
    repositories: T[],
    repositoryPath?: string
  ): T | undefined {
    // 1. 如果指定了仓库路径，优先使用
    if (repositoryPath) {
      const repo = RepositoryPathFinder.findBySpecificPath(
        repositories,
        repositoryPath,
        (repo) => this.strategy.getRepositoryPath(repo)
      );
      if (repo) {
        SCMLogger.debug("Found repository by specific path:", repositoryPath);
        return repo;
      }
      SCMLogger.warn("No repository found for specified path:", repositoryPath);
    }

    // 2. 尝试从当前活动编辑器获取
    const activeFilePath = VSCodeUtils.getActiveEditorFilePath();
    if (activeFilePath) {
      const repoFromActiveFile = this.findRepository(repositories, [
        activeFilePath,
      ]);
      if (repoFromActiveFile) {
        SCMLogger.debug("Found repository from active editor");
        return repoFromActiveFile;
      }
    }

    // 3. 尝试从最近打开的文件获取
    const recentFiles = VSCodeUtils.getRecentFilePaths(5);
    if (recentFiles.length > 0) {
      const repoFromRecentFiles = this.findRepository(
        repositories,
        recentFiles
      );
      if (repoFromRecentFiles) {
        SCMLogger.debug("Found repository from recent files");
        return repoFromRecentFiles;
      }
    }

    // 4. 如果有多个工作区，尝试智能选择
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 1) {
      return this.findByWorkspaceFolders(repositories, workspaceFolders);
    }

    // 5. 回退到第一个仓库
    if (repositories.length > 0) {
      SCMLogger.debug("Using first repository as fallback");
      return repositories[0];
    }

    return undefined;
  }

  /**
   * 根据工作区文件夹查找仓库
   */
  private findByWorkspaceFolders(
    repositories: T[],
    workspaceFolders: readonly vscode.WorkspaceFolder[]
  ): T | undefined {
    // 尝试找到包含当前活动文件的工作区对应的仓库
    const activeFilePath = VSCodeUtils.getActiveEditorFilePath();
    if (activeFilePath) {
      for (const folder of workspaceFolders) {
        const folderPath = folder.uri.fsPath;
        if (PathMatchingUtils.isFileInRepository(activeFilePath, folderPath)) {
          // 找到包含活动文件的工作区，查找对应的仓库
          const repo = RepositoryPathFinder.findBySpecificPath(
            repositories,
            folderPath,
            (repo) => this.strategy.getRepositoryPath(repo)
          );
          if (repo) {
            SCMLogger.debug("Found repository by workspace folder");
            return repo;
          }
        }
      }
    }

    // 如果没找到，返回第一个仓库
    return repositories[0];
  }
}

/**
 * 基础仓库查找策略 - 提取公共逻辑
 */
abstract class BaseRepositoryFindStrategy
  implements RepositoryFindStrategy<any>
{
  /**
   * 通用的仓库查找逻辑
   */
  findRepository(
    repositories: any[],
    filePaths?: string[],
    repositoryPath?: string
  ): any | undefined {
    if (repositories.length === 0) {
      return undefined;
    }

    // 1. 如果指定了仓库路径，优先匹配
    if (repositoryPath) {
      const specificRepo = this.findBySpecificPath(
        repositories,
        repositoryPath
      );
      if (specificRepo) {
        return specificRepo;
      }
    }

    // 2. 如果只有一个仓库，直接返回
    if (repositories.length === 1) {
      return repositories[0];
    }

    // 3. 根据文件路径匹配
    if (filePaths && filePaths.length > 0) {
      const repoByFiles = this.findByFilePaths(repositories, filePaths);
      if (repoByFiles) {
        return repoByFiles;
      }
    }

    // 4. 根据当前活动编辑器匹配
    const repoByActiveEditor = this.findByActiveEditor(repositories);
    if (repoByActiveEditor) {
      return repoByActiveEditor;
    }

    // 5. 回退到第一个仓库
    return repositories[0];
  }

  /**
   * 根据指定路径查找仓库
   */
  private findBySpecificPath(
    repositories: any[],
    repositoryPath: string
  ): any | undefined {
    return RepositoryPathFinder.findBySpecificPath(
      repositories,
      repositoryPath,
      (repo) => this.getRepositoryPath(repo)
    );
  }

  /**
   * 根据文件路径匹配仓库
   */
  private findByFilePaths(
    repositories: any[],
    filePaths: string[]
  ): any | undefined {
    return RepositoryPathFinder.findByFilePaths(
      repositories,
      filePaths,
      (repo) => this.getRepositoryPath(repo)
    );
  }

  /**
   * 根据当前活动编辑器匹配仓库
   */
  private findByActiveEditor(repositories: any[]): any | undefined {
    const activeFilePath = VSCodeUtils.getActiveEditorFilePath();
    if (activeFilePath) {
      return RepositoryPathFinder.findByFilePaths(
        repositories,
        [activeFilePath],
        (repo) => this.getRepositoryPath(repo)
      );
    }

    return undefined;
  }

  /**
   * 抽象方法：获取仓库路径 - 由子类实现
   */
  abstract getRepositoryPath(repository: any): string | undefined;
}

/**
 * Git仓库查找策略
 */
export class GitRepositoryFindStrategy extends BaseRepositoryFindStrategy {
  getRepositoryPath(repository: any): string | undefined {
    return RepositoryPathFinder.safeGetRepositoryPath(
      repository,
      () => repository?.rootUri?.fsPath
    );
  }
}

/**
 * SVN仓库查找策略
 */
export class SvnRepositoryFindStrategy extends BaseRepositoryFindStrategy {
  getRepositoryPath(repository: any): string | undefined {
    return RepositoryPathFinder.safeGetRepositoryPath(
      repository,
      () =>
        // SVN仓库的路径可能存储在不同的属性中
        repository?.root || repository?.rootUri?.fsPath
    );
  }
}
