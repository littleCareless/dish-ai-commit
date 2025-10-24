import * as vscode from "vscode";
import { ImprovedPathUtils } from "../../utils/improved-path-utils";
import { Logger } from "../../../utils/logger";

/**
 * Git仓库接口
 */
export interface GitRepository {
  /** 仓库根目录的URI */
  readonly rootUri: vscode.Uri;

  /** 提交信息输入框 */
  inputBox: {
    value: string;
  };

  /**
   * 执行提交操作
   * @param message - 提交信息
   * @param options - 提交选项
   */
  commit(
    message: string,
    options: { all: boolean; files?: string[] }
  ): Promise<void>;

  log(options?: {
    maxEntries?: number;
    author?: string;
  }): Promise<{ message: string }[]>;
  
  getConfig(key: string): Promise<string | undefined>;
  getGlobalConfig(key: string): Promise<string | undefined>;
}

/**
 * Git API 接口
 */
export interface GitAPI {
  /** Git仓库集合 */
  repositories: GitRepository[];

  /**
   * 获取指定版本的Git API
   * @param version - API版本号
   */
  getAPI(version: number): GitAPI;
}

/**
 * Git 仓库帮助类
 * 负责查找和管理仓库实例
 */
export class GitRepositoryHelper {
  private logger: Logger;

  /**
   * 创建 Git 仓库帮助类
   * @param gitExtension Git 扩展实例
   * @param repositoryPath 可选的仓库路径，用于限定仓库范围
   */
  constructor(
    private readonly gitExtension: any,
    private readonly repositoryPath?: string
  ) {
    this.logger = Logger.getInstance("Dish AI Commit Gen");
  }

  /**
   * 获取 Git API 实例
   * @returns Git API 或 undefined
   */
  public getGitApi(): GitAPI | undefined {
    try {
      if (!this.gitExtension.enabled) {
        this.logger.warn("Git extension is not enabled");
        return undefined;
      }
      return this.gitExtension.getAPI(1);
    } catch (error) {
      this.logger.error(`Failed to get Git API: ${error}`);
      return undefined;
    }
  }

  /**
   * 根据文件路径或当前上下文找到最匹配的Git仓库。
   * @param filePaths - 可选的文件路径数组，用于精确定位仓库。
   * @returns 匹配的Git仓库实例。
   */
  public findRepository(filePaths?: string[]): GitRepository | undefined {
    try {
      const api = this.getGitApi();
      if (!api) {
        return undefined;
      }

      const { repositories } = api;

      if (!repositories.length) {
        return undefined;
      }

      // 1. 如果在构造时提供了特定的仓库路径，优先使用它
      if (this.repositoryPath) {
        const specificRepo = repositories.find(
          (repo) =>
            ImprovedPathUtils.normalizePath(repo.rootUri.fsPath) ===
            ImprovedPathUtils.normalizePath(this.repositoryPath!)
        );
        // 如果提供了特定的仓库路径，我们只信任这个路径。
        // 如果找不到，则返回 undefined，让调用者处理错误，
        // 避免错误地回退到其他仓库。
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
            if (
              ImprovedPathUtils.normalizePath(uri.fsPath).startsWith(
                ImprovedPathUtils.normalizePath(repo.rootUri.fsPath)
              )
            ) {
              return repo; // 找到第一个匹配的就返回
            }
          }
        }
      }

      // 3. 根据当前打开的活动编辑器查找
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor?.document.uri.scheme === "file") {
        const activeFileUri = activeEditor.document.uri;
        for (const repo of repositories) {
          if (
            ImprovedPathUtils.normalizePath(activeFileUri.fsPath).startsWith(
              ImprovedPathUtils.normalizePath(repo.rootUri.fsPath)
            )
          ) {
            return repo;
          }
        }
      }

      // 4. 如果上述都找不到，返回第一个仓库作为备选
      // 这种策略在多仓库工作区可能不准确，但提供了一个回退方案
      return repositories[0];
    } catch (error) {
      this.logger.error(`Error finding repository: ${error}`);
      return undefined;
    }
  }
}
