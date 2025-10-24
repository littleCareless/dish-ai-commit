import * as vscode from "vscode";
import * as path from "path";
import { promisify } from "util";
import * as childProcess from "child_process";
import { Logger } from "../../utils/logger";
import { formatMessage } from "../../utils/i18n";
import { notify } from "../../utils/notification/notification-manager";
import { GitRepositoryHelper, GitRepository } from "./helpers/git-repository-helper";
import { ImprovedPathUtils } from "../utils/improved-path-utils";

const exec = promisify(childProcess.exec);

/**
 * Git 仓库信息
 */
export interface GitRepositoryInfo {
  /** 仓库实例 */
  repository: GitRepository;
  /** 仓库根路径 */
  rootPath: string;
  /** 仓库名称 */
  name: string;
}

/**
 * Git 仓库管理器
 * 负责管理工作区中的多个 Git 仓库
 */
export class GitRepositoryManager {
  private static instance: GitRepositoryManager;
  private logger: Logger;
  private repositoryHelper: GitRepositoryHelper;

  /**
   * 私有构造函数，实现单例模式
   */
  private constructor(private readonly gitExtension: any) {
    this.logger = Logger.getInstance("Dish AI Commit Gen");
    this.repositoryHelper = new GitRepositoryHelper(gitExtension);
  }

  /**
   * 获取仓库管理器实例
   * @param gitExtension VS Code Git 扩展实例
   */
  public static getInstance(gitExtension: any): GitRepositoryManager {
    if (!GitRepositoryManager.instance) {
      GitRepositoryManager.instance = new GitRepositoryManager(gitExtension);
    }
    return GitRepositoryManager.instance;
  }

  /**
   * 发现工作区中的所有 Git 仓库
   * @returns 所有仓库信息的映射表
   */
  public async discoverRepositories(): Promise<Map<string, GitRepositoryInfo>> {
    const repositories = new Map<string, GitRepositoryInfo>();
    
    try {
      // 获取 Git API
      const api = this.repositoryHelper.getGitApi();
      if (api) {
        // 使用 VS Code Git API 发现仓库
        for (const repo of api.repositories) {
          const rootPath = repo.rootUri.fsPath;
          const name = path.basename(rootPath);
          repositories.set(rootPath, {
            repository: repo,
            rootPath,
            name
          });
        }
      } else {
        // 回退到手动发现工作区中的 Git 仓库
        if (vscode.workspace.workspaceFolders?.length) {
          for (const folder of vscode.workspace.workspaceFolders) {
            try {
              const { stdout } = await exec("git rev-parse --show-toplevel", {
                cwd: folder.uri.fsPath,
                timeout: 3000 // 3秒超时
              });
              
              const rootPath = stdout.trim();
              if (rootPath) {
                // 由于无法直接获取 GitRepository 对象，这里创建一个简单的模拟对象
                // 在实际使用中，应该通过 GitProviderFactory 为其创建专用的命令行提供者
                const mockRepo = {
                  rootUri: vscode.Uri.file(rootPath),
                  inputBox: { value: "" },
                  // 以下方法不会被直接调用，仅作为接口实现
                  commit: async () => {},
                  log: async () => [],
                  getConfig: async () => undefined,
                  getGlobalConfig: async () => undefined
                };

                repositories.set(rootPath, {
                  repository: mockRepo as GitRepository,
                  rootPath,
                  name: path.basename(rootPath)
                });
              }
            } catch (error) {
              // 忽略非 Git 仓库的文件夹
              this.logger.debug(`${folder.uri.fsPath} 不是 Git 仓库: ${error}`);
            }
          }
        }
      }

      this.logger.info(`发现了 ${repositories.size} 个 Git 仓库`);
    } catch (error) {
      this.logger.error(`发现仓库失败: ${error}`);
    }
    
    return repositories;
  }

  /**
   * 获取所有仓库信息
   * @returns 所有仓库信息的数组
   */
  public async getAllRepositories(): Promise<GitRepositoryInfo[]> {
    const repositories = await this.discoverRepositories();
    return Array.from(repositories.values());
  }

  /**
   * 根据仓库路径获取仓库信息
   * @param repositoryPath 仓库路径
   * @returns 仓库信息或 undefined
   */
  public async getRepositoryByPath(repositoryPath: string): Promise<GitRepositoryInfo | undefined> {
    const repositories = await this.discoverRepositories();
    const normalizedPath = ImprovedPathUtils.normalizePath(repositoryPath);
    
    // 精确匹配
    if (repositories.has(normalizedPath)) {
      return repositories.get(normalizedPath);
    }

    // 检查是否是子目录
    for (const [rootPath, repoInfo] of repositories.entries()) {
      if (normalizedPath.startsWith(ImprovedPathUtils.normalizePath(rootPath))) {
        return repoInfo;
      }
    }

    return undefined;
  }

  /**
   * 根据文件路径获取包含该文件的仓库信息
   * @param filePath 文件路径
   * @returns 仓库信息或 undefined
   */
  public async getRepositoryForFile(filePath: string): Promise<GitRepositoryInfo | undefined> {
    const repositories = await this.discoverRepositories();
    const normalizedFilePath = ImprovedPathUtils.normalizePath(filePath);
    
    // 检查文件是否在某个仓库中
    for (const [rootPath, repoInfo] of repositories.entries()) {
      if (normalizedFilePath.startsWith(ImprovedPathUtils.normalizePath(rootPath))) {
        return repoInfo;
      }
    }

    // 如果找不到匹配的仓库，尝试执行 git 命令获取仓库根路径
    try {
      const fileDir = path.dirname(filePath);
      const { stdout } = await exec("git rev-parse --show-toplevel", {
        cwd: fileDir,
        timeout: 3000
      });
      
      const rootPath = stdout.trim();
      if (rootPath) {
        // 检查是否已经在刚发现的仓库中
        if (repositories.has(rootPath)) {
          return repositories.get(rootPath);
        }
        
        // 创建新的仓库信息
        const mockRepo = {
          rootUri: vscode.Uri.file(rootPath),
          inputBox: { value: "" },
          commit: async () => {},
          log: async () => [],
          getConfig: async () => undefined,
          getGlobalConfig: async () => undefined
        };

        const newRepoInfo = {
          repository: mockRepo as GitRepository,
          rootPath,
          name: path.basename(rootPath)
        };
        
        return newRepoInfo;
      }
    } catch (error) {
      // 忽略错误
      this.logger.debug(`文件 ${filePath} 不在任何 Git 仓库中: ${error}`);
    }

    return undefined;
  }

  /**
   * 根据仓库名称获取仓库信息
   * @param name 仓库名称
   * @returns 仓库信息或 undefined
   */
  public async getRepositoryByName(name: string): Promise<GitRepositoryInfo | undefined> {
    const repositories = await this.discoverRepositories();
    
    for (const repoInfo of repositories.values()) {
      if (repoInfo.name === name) {
        return repoInfo;
      }
    }

    return undefined;
  }

  /**
   * 获取当前活动的仓库
   * 根据当前活动的编辑器或选定的工作区文件夹确定
   * @returns 当前活动的仓库信息或 undefined
   */
  public async getCurrentRepository(): Promise<GitRepositoryInfo | undefined> {
    const repositories = await this.discoverRepositories();
    
    // 1. 检查当前活动的编辑器
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor?.document.uri.scheme === 'file') {
      const repoInfo = await this.getRepositoryForFile(activeEditor.document.uri.fsPath);
      if (repoInfo) {
        return repoInfo;
      }
    }

    // 2. 如果没有活动的编辑器，检查是否只有一个仓库
    if (repositories.size === 1) {
      return Array.from(repositories.values())[0];
    }

    // 3. 如果有多个仓库，但只有一个工作区文件夹，尝试使用该文件夹
    if (vscode.workspace.workspaceFolders?.length === 1) {
      const folder = vscode.workspace.workspaceFolders[0];
      const repoInfo = await this.getRepositoryForFile(folder.uri.fsPath);
      if (repoInfo) {
        return repoInfo;
      }
    }

    // 4. 如果都失败了，返回 undefined 或让用户选择
    return undefined;
  }

  /**
   * 让用户从可用的仓库中选择一个
   * @returns 用户选择的仓库信息或 undefined
   */
  public async selectRepository(): Promise<GitRepositoryInfo | undefined> {
    const repositories = await this.discoverRepositories();

    if (repositories.size === 0) {
      notify.warn(formatMessage("scm.no.repositories.found", ["Git"]));
      return undefined;
    }

    if (repositories.size === 1) {
      return Array.from(repositories.values())[0];
    }

    const repoNames = Array.from(repositories.values()).map(
      repo => `${repo.name} (${repo.rootPath})`
    );

    const selection = await vscode.window.showQuickPick(repoNames, {
      placeHolder: formatMessage("scm.select.repository", ["Git"])
    });

    if (!selection) {
      return undefined;
    }

    const selectedRepoPath = selection.substring(
      selection.lastIndexOf('(') + 1,
      selection.lastIndexOf(')')
    );

    return repositories.get(selectedRepoPath);
  }
}