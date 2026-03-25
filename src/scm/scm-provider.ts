import { SvnProvider } from "@/scm/svn-provider";
import { ImprovedPathUtils } from "@/scm/utils/improved-path-utils";
import { Logger } from "@/utils/logger";
import { exec } from "child_process";
import * as path from "path";
import * as vscode from "vscode";
import { GitProvider } from "./git-provider";
import { multiRepositoryContextManager } from "./multi-repository-context-manager";

/**
 */
export interface RecentCommitMessages {
  /** 仓库最近提交信息 */
  repository: string[];
  /** 用户最近提交信息 */
  user: string[];
}

/**
 * SCM文件变更接口
 */
export interface SCMFileChange {
  /** 文件路径 */
  file: string;
  /** 变更类型 */
  type: 'add' | 'modify' | 'delete' | 'rename';
  /** 文件差异内容 */
  diff?: string;
}

/**
 * SCM提交信息接口
 */
export interface SCMCommit {
  /** 提交哈希 */
  hash: string;
  /** 提交信息 */
  message: string;
  /** 提交作者 */
  author?: string;
  /** 提交时间 */
  date?: string;
}

/**
 * 源代码管理提供者接口
 * 定义了通用的SCM操作方法
 */
export interface ISCMProvider {
  /** SCM类型:"git" 或 "svn" */
  type: "git" | "svn";

  /** 检查SCM系统是否可用 */
  isAvailable(): Promise<boolean>;

  /** 初始化Provider */
  init(): Promise<void>;

  /** 获取文件差异 */
  getDiff(
    files?: string[],
    target?: "staged" | "all" | "auto",
  ): Promise<string | undefined>;

  /** 提交更改 */
  commit(message: string, files?: string[]): Promise<void>;

  /** 设置提交信息 */
  setCommitInput(message: string): Promise<void>;

  /** 获取当前提交信息 */
  getCommitInput(): Promise<string>;

  /** 开始流式输入提交信息 */
  startStreamingInput(message: string): Promise<void>;

  /** 获取提交日志 */
  getCommitLog(baseBranch?: string, headBranch?: string): Promise<string[]>;

  /** 获取所有分支的列表 (主要用于 Git) */
  getBranches?: () => Promise<string[]>;

  /**
   * 获取最近的提交信息
   */
  getRecentCommitMessages(): Promise<RecentCommitMessages>;

  /**
   * 获取指定数量的最近提交
   * @param count 要获取的提交数量
   */
  getRecentCommits?(count: number): Promise<SCMCommit[]>;

  /**
   * 获取文件变更列表
   */
  getChanges?(): Promise<SCMFileChange[]>;

  /**
   * 将提交信息复制到剪贴板
   * @param message 要复制的提交信息
   */
  copyToClipboard(message: string): Promise<void>;

  /**
   * 设置当前操作的文件列表（可选方法）
   * @param files 文件路径列表
   */
  setCurrentFiles?(files?: string[]): void;

  /**
   * Get list of staged files from provider
   * @param files Optional file list to limit scope
   */
  getStagedFiles?(files?: string[]): Promise<string[]>;

  /**
   * Get list of all changed files from provider
   * @param files Optional file list to limit scope
   */
  getAllChangedFiles?(files?: string[]): Promise<string[]>;
}

/**
 * SCM工厂类
 * 用于创建和管理源代码管理提供者实例
 */
export class SCMFactory {
  /** 当前激活的SCM提供者实例 */
  private static currentProvider: ISCMProvider | undefined;

  /** 当前使用的仓库路径 */
  private static currentRepositoryPath: string | undefined;
  private static readonly logger = Logger.getInstance("SCMFactory");

  /**
   * 获取当前使用的仓库路径
   * @returns 仓库路径或undefined
   */
  static getCurrentRepositoryPath(): string | undefined {
    return this.currentRepositoryPath;
  }

  /**
   * 根据选中的文件确定工作区根目录
   * @param selectedFiles 选中的文件路径列表
   * @returns 工作区根目录路径或undefined
   */
  private static findWorkspaceRoot(
    selectedFiles?: string[]
  ): string | undefined {
    // 如果没有提供文件，尝试从当前活动编辑器或窗口状态获取工作区
    if (!selectedFiles || selectedFiles.length === 0) {
      // 1. 尝试从当前活动编辑器获取文件路径
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && activeEditor.document.uri.scheme === "file") {
        const activeFilePath = ImprovedPathUtils.normalizePath(
          activeEditor.document.uri.fsPath
        );
        const workspaceFromActiveFile =
          this.findWorkspaceRootFromFile(activeFilePath);
        if (workspaceFromActiveFile) {
          return workspaceFromActiveFile;
        }
      }

      // 2. 尝试从最近打开的文件获取工作区
      const recentFiles = vscode.workspace.textDocuments
        .filter((doc) => doc.uri.scheme === "file")
        .map((doc) => ImprovedPathUtils.normalizePath(doc.uri.fsPath));

      if (recentFiles.length > 0) {
        const workspaceFromRecentFile = this.findWorkspaceRootFromFile(
          recentFiles[0]
        );
        if (workspaceFromRecentFile) {
          return workspaceFromRecentFile;
        }
      }

      // 3. 如果有多个工作区，尝试根据当前焦点或最近活动确定
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 1) {
        // 检查是否有工作区包含当前活动文件
        if (activeEditor && activeEditor.document.uri.scheme === "file") {
          const activeFilePath = ImprovedPathUtils.normalizePath(
            activeEditor.document.uri.fsPath
          );
          for (const folder of workspaceFolders) {
            const folderPath = ImprovedPathUtils.normalizePath(
              folder.uri.fsPath
            );
            if (activeFilePath.startsWith(folderPath)) {
              return folderPath;
            }
          }
        }

        // 如果无法确定，返回第一个工作区（保持向后兼容）
        this.logger.warn(
          "Multiple workspaces found, using first workspace as fallback"
        );
      }

      // 4. 最后回退到第一个工作区
      const firstWorkspace = workspaceFolders?.[0]?.uri.fsPath;
      return firstWorkspace
        ? ImprovedPathUtils.normalizePath(firstWorkspace)
        : undefined;
    }

    // 检查每个文件的目录，寻找.git或.svn文件夹
    for (const file of selectedFiles) {
      if (ImprovedPathUtils.isValidPath(file)) {
        const workspaceRoot = this.findWorkspaceRootFromFile(file);
        if (workspaceRoot) {
          return workspaceRoot;
        }
      }
    }

    // 如果没找到，回退到VS Code工作区
    const fallbackWorkspace =
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    return fallbackWorkspace
      ? ImprovedPathUtils.normalizePath(fallbackWorkspace)
      : undefined;
  }

  /**
   * 从单个文件路径查找工作区根目录
   * @param filePath 文件路径
   * @returns 工作区根目录路径或undefined
   */
  private static findWorkspaceRootFromFile(
    filePath: string
  ): string | undefined {
    if (!ImprovedPathUtils.isValidPath(filePath)) {
      return undefined;
    }

    const normalizedPath = ImprovedPathUtils.normalizePath(filePath);
    const workspaceRoot = ImprovedPathUtils.findWorkspaceRoot(normalizedPath, [
      ".git",
      ".svn",
    ]);

    return workspaceRoot
      ? ImprovedPathUtils.normalizePath(workspaceRoot)
      : undefined;
  }

  /**
   * 通过项目目录检测SCM类型
   * @param workspaceRoot 工作区根目录
   * @param filePaths 选定文件的路径列表（可选）
   * @returns {"git" | "svn" | undefined} SCM类型
   */
  private static detectSCMFromDir(
    workspaceRoot: string,
    filePaths?: string[]
  ): "git" | "svn" | undefined {
    try {
      if (!ImprovedPathUtils.isValidPath(workspaceRoot)) {
        return undefined;
      }

      const normalizedWorkspaceRoot =
        ImprovedPathUtils.normalizePath(workspaceRoot);

      // 首先检查工作区根目录
      const gitPath = path.join(normalizedWorkspaceRoot, ".git");
      const svnPath = path.join(normalizedWorkspaceRoot, ".svn");

      if (ImprovedPathUtils.safeExists(gitPath)) {
        return "git";
      }
      if (ImprovedPathUtils.safeExists(svnPath)) {
        return "svn";
      }

      // 如果提供了文件路径，检查这些文件所在的目录
      if (filePaths && filePaths.length > 0) {
        // 获取所有唯一的目录路径，过滤掉null/undefined值并验证路径有效性
        const dirPaths = [
          ...new Set(
            filePaths
              .filter(
                (file) =>
                  file &&
                  typeof file === "string" &&
                  ImprovedPathUtils.isValidPath(file)
              )
              .map((file) =>
                ImprovedPathUtils.normalizePath(path.dirname(file))
              )
          ),
        ];

        for (const dir of dirPaths) {
          // 从文件所在目录向上查找，直到工作区根目录
          let currentDir = dir;
          while (
            currentDir.startsWith(normalizedWorkspaceRoot) &&
            currentDir !== normalizedWorkspaceRoot
          ) {
            const gitSubPath = path.join(currentDir, ".git");
            const svnSubPath = path.join(currentDir, ".svn");

            if (ImprovedPathUtils.safeExists(gitSubPath)) {
              return "git";
            }
            if (ImprovedPathUtils.safeExists(svnSubPath)) {
              return "svn";
            }

            // 向上一级目录
            const parentDir = path.dirname(currentDir);
            if (parentDir === currentDir) {
              break;
            } // 防止无限循环
            currentDir = parentDir;
          }
        }
      }

      return undefined;
    } catch (error) {
      this.logger.error("Failed to detect SCM from directory", {
        error: error as Error,
      });
      return undefined;
    }
  }

  /**
   * 检测系统是否安装了指定的SCM命令
   * @param cmd 要检测的命令
   * @returns {Promise<boolean>} 命令是否可用
   */
  private static async checkSCMCommand(cmd: string): Promise<boolean> {
    return new Promise((resolve) => {
      exec(`${cmd} --version`, (error) => {
        resolve(!error);
      });
    });
  }

  /**
   * 检测所有可用的 SCM 仓库
   * @returns 仓库信息数组
   */
  private static async detectAllRepositories(): Promise<
    Array<{
      type: "git" | "svn";
      rootUri: vscode.Uri;
      label: string;
    }>
  > {
    const repositories: Array<{
      type: "git" | "svn";
      rootUri: vscode.Uri;
      label: string;
    }> = [];

    // 1. 尝试使用 MultiRepositoryContextManager 获取仓库
    try {
      this.logger.debug(
        "[SCMFactory] Detecting repositories via MultiRepositoryContextManager..."
      );
      const detectedRepos =
        await multiRepositoryContextManager.getAllRepositories();
      this.logger.debug(
        `[SCMFactory] MultiRepositoryContextManager found ${detectedRepos.length} repositories`
      );

      for (const repo of detectedRepos) {
        if (repo.type === "git" || repo.type === "svn") {
          repositories.push({
            type: repo.type,
            rootUri: vscode.Uri.file(repo.path),
            label: repo.name,
          });
        }
      }
    } catch (error) {
      this.logger.error(
        "[SCMFactory] Failed to detect repositories via MultiRepositoryContextManager:",
        { error: error as Error }
      );
    }

    // 如果 MultiRepositoryContextManager 找到了仓库，直接返回
    if (repositories.length > 0) {
      return repositories;
    }

    // 2. 回退到 vscode.scm.sourceControls (在 VS Code 1.90+ 中可用)
    this.logger.debug(
      "[SCMFactory] Falling back to vscode.scm.sourceControls detection..."
    );
    const sourceControls = (vscode.scm as any).sourceControls as
      | readonly vscode.SourceControl[]
      | undefined;

    if (!sourceControls) {
      return repositories;
    }

    for (const sourceControl of sourceControls) {
      if (sourceControl.id === "git" || sourceControl.id === "svn") {
        if (sourceControl.rootUri) {
          // 避免重复添加
          const exists = repositories.some(
            (r) => r.rootUri.fsPath === sourceControl.rootUri?.fsPath
          );
          if (!exists) {
            repositories.push({
              type: sourceControl.id as "git" | "svn",
              rootUri: sourceControl.rootUri,
              label: sourceControl.label,
            });
          }
        }
      }
    }

    return repositories;
  }

  /**
   * 让用户选择仓库
   * @param repositories 可用的仓库列表
   * @returns 用户选择的仓库信息或undefined（用户取消）
   */
  private static async promptUserToSelectRepository(
    repositories: Array<{
      type: "git" | "svn";
      rootUri: vscode.Uri;
      label: string;
    }>
  ): Promise<{ type: "git" | "svn"; rootUri: vscode.Uri } | undefined> {
    // 动态导入 i18n 工具
    const { getMessage, formatMessage } = await import("../utils/i18n");

    const items = repositories.map((repo) => ({
      label: repo.label,
      description: repo.rootUri.fsPath,
      detail: formatMessage("scm.repository.type.label", [
        repo.type.toUpperCase(),
      ]),
      repo,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: getMessage("scm.repository.select.placeholder"),
      ignoreFocusOut: true,
    });

    return selected?.repo;
  }

  /**
   * 在多仓库场景下自动推断目标仓库，尽量减少用户选择
   */
  private static async autoSelectRepository(
    repositories: Array<{
      type: "git" | "svn";
      rootUri: vscode.Uri;
      label: string;
    }>
  ): Promise<{ type: "git" | "svn"; rootUri: vscode.Uri } | undefined> {
    if (repositories.length === 0) {
      return undefined;
    }

    const normalizedRepos = repositories.map((repo) => ({
      repo,
      root: ImprovedPathUtils.normalizePath(repo.rootUri.fsPath),
    }));

    const tryMatchByFilePath = (filePath?: string) => {
      if (!filePath || !ImprovedPathUtils.isValidPath(filePath)) {
        return undefined;
      }

      const normalizedFilePath = ImprovedPathUtils.normalizePath(filePath);
      const matches = normalizedRepos.filter(({ root }) =>
        normalizedFilePath.startsWith(root)
      );

      if (matches.length === 1) {
        return matches[0].repo;
      }

      return undefined;
    };

    const activeFilePath =
      vscode.window.activeTextEditor?.document?.uri.scheme === "file"
        ? vscode.window.activeTextEditor.document.uri.fsPath
        : undefined;
    const fromActiveEditor = tryMatchByFilePath(activeFilePath);
    if (fromActiveEditor) {
      return fromActiveEditor;
    }

    const fromOpenDocument = vscode.workspace.textDocuments
      .filter((doc) => doc.uri.scheme === "file")
      .map((doc) => tryMatchByFilePath(doc.uri.fsPath))
      .find(Boolean);
    if (fromOpenDocument) {
      return fromOpenDocument;
    }

    try {
      const primaryRepo = await multiRepositoryContextManager.getPrimaryRepository();
      if (primaryRepo?.path) {
        const normalizedPrimaryPath = ImprovedPathUtils.normalizePath(
          primaryRepo.path
        );
        const matched = normalizedRepos.find(
          ({ root }) => root === normalizedPrimaryPath
        );
        if (matched) {
          return matched.repo;
        }
      }
    } catch (error) {
      this.logger.warn(
        "[SCMFactory] Failed to infer repository from primary context:",
        { error: error as Error }
      );
    }

    return undefined;
  }

  /**
   * 检测并创建可用的SCM提供者
   * 链路追踪日志：[Chain] [SCM-Detection]
   *
   * @param {string[] | undefined} selectedFiles - 可选的选定文件路径列表
   * @param {string | undefined} repositoryPath - 可选的仓库路径，如果提供则优先使用此路径
   * @returns {Promise<ISCMProvider | undefined>} 返回可用的SCM提供者实例,如果没有可用的提供者则返回undefined
   */
  static async detectSCM(
    selectedFiles?: string[],
    repositoryPath?: string
  ): Promise<ISCMProvider | undefined> {
    const startTime = Date.now();
    this.logger.info(
      `[Chain] [SCM-Detection] [Factory] START - Files: ${selectedFiles?.length || 0}, RepoPath: ${repositoryPath || "auto"}`,
    );

    try {
      // 如果没有提供任何参数，尝试使用 vscode.scm API 检测仓库
      if (!selectedFiles && !repositoryPath) {
        this.logger.debug(
          "[SCMFactory] No args provided, detecting all repositories..."
        );
        const repositories = await this.detectAllRepositories();
        this.logger.debug(
          `[SCMFactory] Detected ${repositories.length} repositories`
        );

        if (repositories.length === 0) {
          this.logger.debug(
            "[SCMFactory] No repositories found, falling back to workspace root detection"
          );
          // 没有检测到任何仓库，回退到原有逻辑
          const workspaceRoot = this.findWorkspaceRoot(selectedFiles);
          if (!workspaceRoot || !ImprovedPathUtils.isValidPath(workspaceRoot)) {
            return undefined;
          }
          const normalizedWorkspaceRoot =
            ImprovedPathUtils.normalizePath(workspaceRoot);
          const provider = await this.performDetection(
            normalizedWorkspaceRoot,
            selectedFiles
          );
          if (provider) {
            this.currentProvider = provider;
            // 确保在这里也设置 currentRepositoryPath
            this.currentRepositoryPath = normalizedWorkspaceRoot;
            this.logger.debug(
              `[SCMFactory] Provider created via fallback, currentRepositoryPath set to: ${this.currentRepositoryPath}`
            );
          }
          return provider;
        } else if (repositories.length === 1) {
          // 只有一个仓库，直接使用
          repositoryPath = repositories[0].rootUri.fsPath;
          this.logger.debug(
            `[SCMFactory] Single repository found: ${repositoryPath}`
          );
        } else {
          // 多个仓库，先自动推断，无法推断再让用户选择
          const autoSelected = await this.autoSelectRepository(repositories);
          const selected =
            autoSelected ||
            (await this.promptUserToSelectRepository(repositories));
          if (!selected) {
            // 用户取消选择
            return undefined;
          }
          repositoryPath = selected.rootUri.fsPath;
          this.logger.debug(
            autoSelected
              ? `[SCMFactory] Auto selected repository: ${repositoryPath}`
              : `[SCMFactory] User selected repository: ${repositoryPath}`
          );
        }
      }

      // 优先使用传入的 repositoryPath，如果没有则使用检测方法获取工作区根目录
      const workspaceRoot =
        repositoryPath || this.findWorkspaceRoot(selectedFiles);

      this.logger.debug(`[SCMFactory] Workspace root determined: ${workspaceRoot}`);

      if (!workspaceRoot || !ImprovedPathUtils.isValidPath(workspaceRoot)) {
        const duration = Date.now() - startTime;
        this.logger.info(
          `[Chain] [SCM-Detection] [Factory] COMPLETE - Duration: ${duration}ms, Result: invalid workspace`,
        );
        return undefined;
      }

      // 规范化工作区根目录路径
      const normalizedWorkspaceRoot =
        ImprovedPathUtils.normalizePath(workspaceRoot);

      // 保存当前使用的仓库路径
      this.currentRepositoryPath = normalizedWorkspaceRoot;
      this.logger.debug(
        `[SCMFactory] Setting currentRepositoryPath to: ${this.currentRepositoryPath}`
      );

      // 直接执行检测，每次都创建新的Provider实例
      const provider = await this.performDetection(
        normalizedWorkspaceRoot,
        selectedFiles
      );

      if (provider) {
        this.currentProvider = provider;
        const duration = Date.now() - startTime;
        this.logger.info(
          `[Chain] [SCM-Detection] [Factory] COMPLETE - Duration: ${duration}ms, Result: ${provider.type}, Path: ${this.currentRepositoryPath}`,
        );
      } else {
        const duration = Date.now() - startTime;
        this.logger.info(
          `[Chain] [SCM-Detection] [Factory] COMPLETE - Duration: ${duration}ms, Result: no provider`,
        );
      }

      return provider;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[Chain] [SCM-Detection] [Factory] FAILED - Duration: ${duration}ms`,
        {
          error:
            error instanceof Error ? error : new Error(String(error)),
        },
      );
      return undefined;
    }
  }

  /**
   * 直接基于已知 SCM 类型创建 provider（避免重复 SCM 检测）。
   *
   * @param repositoryPath 仓库根路径
   * @param scmType 已知的 SCM 类型
   */
  static async createProviderForRepository(
    repositoryPath: string,
    scmType: "git" | "svn",
  ): Promise<ISCMProvider | undefined> {
    const startTime = Date.now();
    this.logger.info(
      `[Chain] [SCM-Detection] [Factory] DIRECT START - Type: ${scmType}, RepoPath: ${repositoryPath}`,
    );

    try {
      if (!repositoryPath || !ImprovedPathUtils.isValidPath(repositoryPath)) {
        const duration = Date.now() - startTime;
        this.logger.info(
          `[Chain] [SCM-Detection] [Factory] DIRECT COMPLETE - Duration: ${duration}ms, Result: invalid workspace`,
        );
        return undefined;
      }

      const normalizedWorkspaceRoot =
        ImprovedPathUtils.normalizePath(repositoryPath);
      this.currentRepositoryPath = normalizedWorkspaceRoot;

      const provider = await this.createProviderByScmType(
        scmType,
        normalizedWorkspaceRoot,
      );
      if (provider) {
        this.currentProvider = provider;
        const duration = Date.now() - startTime;
        this.logger.info(
          `[Chain] [SCM-Detection] [Factory] DIRECT COMPLETE - Duration: ${duration}ms, Result: ${provider.type}, Path: ${this.currentRepositoryPath}`,
        );
        return provider;
      }

      const duration = Date.now() - startTime;
      this.logger.info(
        `[Chain] [SCM-Detection] [Factory] DIRECT COMPLETE - Duration: ${duration}ms, Result: no provider`,
      );
      return undefined;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[Chain] [SCM-Detection] [Factory] DIRECT FAILED - Duration: ${duration}ms`,
        {
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      return undefined;
    }
  }

  /**
   * 执行实际的SCM检测逻辑
   * @param workspaceRoot 工作区根目录
   * @param selectedFiles 选中的文件列表
   * @returns SCM提供者实例或undefined
   */
  /**
   * 创建一个带超时的Promise包装器
   */
  private static withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = 5000
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("Operation timed out")), timeoutMs)
      ),
    ]);
  }

  private static async performDetection(
    workspaceRoot: string,
    selectedFiles?: string[]
  ): Promise<ISCMProvider | undefined> {
    try {
      if (!ImprovedPathUtils.isValidPath(workspaceRoot)) {
        this.logger.error("Invalid workspace root path", {
          data: { workspaceRoot },
        });
        return undefined;
      }

      const normalizedWorkspaceRoot =
        ImprovedPathUtils.normalizePath(workspaceRoot);

      // 通过目录检测，包括选定的文件路径
      const scmType = this.detectSCMFromDir(
        normalizedWorkspaceRoot,
        selectedFiles
      );
      return this.createProviderByScmType(scmType, normalizedWorkspaceRoot);
    } catch (error) {
      this.logger.error(
        "SCM detection failed:",
        {
          error:
            error instanceof Error ? error : new Error(String(error)),
        },
      );
      return undefined;
    }
  }

  private static async createProviderByScmType(
    scmType: "git" | "svn" | undefined,
    normalizedWorkspaceRoot: string,
  ): Promise<ISCMProvider | undefined> {
    if (!scmType) {
      return undefined;
    }

    const gitExtension = vscode.extensions.getExtension("vscode.git");
    const svnExtension = vscode.extensions.getExtension(
      "littleCareless.svn-scm-ai",
    );

    let provider: ISCMProvider | undefined;

    if (scmType === "git") {
      try {
        const git = gitExtension?.exports
          ? new GitProvider(gitExtension.exports, normalizedWorkspaceRoot)
          : undefined;
        if (git) {
          await this.withTimeout(git.init());
          if (await this.withTimeout(git.isAvailable())) {
            provider = git;
          }
        }
      } catch (error) {
        this.logger.error("Git provider initialization failed", {
          error: error as Error,
        });
      }
    }

    if (scmType === "svn") {
      try {
        const svn = new SvnProvider(
          svnExtension?.exports,
          normalizedWorkspaceRoot,
        );
        if (svn) {
          await this.withTimeout(svn.init());
          if (await this.withTimeout(svn.isAvailable())) {
            provider = svn;
          }
        }
      } catch (error) {
        this.logger.error("SVN provider initialization failed", {
          error: error as Error,
        });
      }
    }

    return provider;
  }

  /**
   * 获取当前使用的SCM类型
   * @returns {"git" | "svn" | undefined} 返回当前SCM类型,如果未设置则返回undefined
   */
  static getCurrentSCMType(): "git" | "svn" | undefined {
    return this.currentProvider?.type;
  }
}
