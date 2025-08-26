import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { GitProvider } from "./git-provider";
import { SvnProvider } from "./svn-provider";
import { CliSvnProvider } from "./cli-svn-provider";
import { ImprovedPathUtils } from "./utils/improved-path-utils";
import { RepositoryManager } from "./utils/repository-manager";

/**
 * 最近提交信息
 */
export interface RecentCommitMessages {
  /** 仓库最近提交信息 */
  repository: string[];
  /** 用户最近提交信息 */
  user: string[];
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
  getDiff(files?: string[]): Promise<string | undefined>;

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
   * 将提交信息复制到剪贴板
   * @param message 要复制的提交信息
   */
  copyToClipboard(message: string): Promise<void>;

  /**
   * 设置当前操作的文件列表（可选方法）
   * @param files 文件路径列表
   */
  setCurrentFiles?(files?: string[]): void;
}

/**
 * SCM工厂类
 * 用于创建和管理源代码管理提供者实例
 */
export class SCMFactory {
  /** 当前激活的SCM提供者实例 */
  private static currentProvider: ISCMProvider | undefined;
  /** 缓存的SCM提供者实例，按工作区路径索引 */
  private static providerCache: Map<string, ISCMProvider> = new Map();
  /** 正在进行的检测操作，用于防止并发问题 */
  private static pendingDetections: Map<
    string,
    Promise<ISCMProvider | undefined>
  > = new Map();

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
   * 检测并创建可用的SCM提供者
   * @param {string[] | undefined} selectedFiles - 可选的选定文件路径列表
   * @param {string | undefined} repositoryPath - 可选的仓库路径，如果提供则优先使用此路径
   * @returns {Promise<ISCMProvider | undefined>} 返回可用的SCM提供者实例,如果没有可用的提供者则返回undefined
   */
  static async detectSCM(
    selectedFiles?: string[],
    repositoryPath?: string
  ): Promise<ISCMProvider | undefined> {
    try {
      // 优先使用传入的 repositoryPath，如果没有则使用检测方法获取工作区根目录
      const detectionResult = RepositoryManager.detectRepository({
        files: selectedFiles,
        repositoryPath: repositoryPath,
      });
      const workspaceRoot = detectionResult?.repositoryPath;
      if (!workspaceRoot || !ImprovedPathUtils.isValidPath(workspaceRoot)) {
        return undefined;
      }

      // 规范化工作区根目录路径，用作缓存键
      const normalizedWorkspaceRoot =
        ImprovedPathUtils.normalizePath(workspaceRoot);

      // 检查是否已有正在进行的检测操作
      const pendingDetection = this.pendingDetections.get(
        normalizedWorkspaceRoot
      );
      if (pendingDetection) {
        return pendingDetection;
      }

      // 检查缓存中是否已有该工作区的提供者
      const cachedProvider = this.providerCache.get(normalizedWorkspaceRoot);
      if (cachedProvider) {
        // 验证缓存的提供者是否仍然可用
        try {
          if (await this.withTimeout(cachedProvider.isAvailable())) {
            this.currentProvider = cachedProvider;
            return cachedProvider;
          } else {
            // 如果不可用，从缓存中移除
            this.providerCache.delete(normalizedWorkspaceRoot);
          }
        } catch (error) {
          // 如果检查可用性时出错，从缓存中移除
          this.providerCache.delete(normalizedWorkspaceRoot);
        }
      }

      // 创建新的检测操作
      const detectionPromise = this.performDetection(
        normalizedWorkspaceRoot,
        selectedFiles
      );
      this.pendingDetections.set(normalizedWorkspaceRoot, detectionPromise);

      try {
        const result = await detectionPromise;
        return result;
      } finally {
        // 清理pending状态
        this.pendingDetections.delete(normalizedWorkspaceRoot);
      }
    } catch (error) {
      console.error(
        "SCM detection failed:",
        error instanceof Error ? error.message : error
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
        console.error("Invalid workspace root path:", workspaceRoot);
        return undefined;
      }

      const normalizedWorkspaceRoot =
        ImprovedPathUtils.normalizePath(workspaceRoot);

      // 通过RepositoryDetector检测SCM类型
      const detectionResult = RepositoryManager.detectSCMFromFileSystem(
        normalizedWorkspaceRoot
      );
      const scmType = detectionResult?.scmType;

      const gitExtension = vscode.extensions.getExtension("vscode.git");
      const svnExtension = vscode.extensions.getExtension(
        "littleCareless.svn-scm-ai"
      );

      let provider: ISCMProvider | undefined;

      // 如果检测到Git
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
          console.error("Git provider initialization failed:", error);
          // Continue to try other providers
        }
      }

      // 如果检测到SVN
      if (scmType === "svn") {
        // 先尝试使用SVN插件
        try {
          const svn = svnExtension?.exports
            ? new SvnProvider(svnExtension.exports, normalizedWorkspaceRoot)
            : undefined;
          if (svn) {
            await this.withTimeout(svn.init());
            if (await this.withTimeout(svn.isAvailable())) {
              provider = svn;
            }
          }
        } catch (error) {
          console.error("SVN provider initialization failed:", error);
          // Continue to try CLI SVN
        }

        // 如果没有插件但系统有SVN命令,使用命令行方式
        if (!provider) {
          try {
            if (await this.withTimeout(this.checkSCMCommand("svn"))) {
              const cliSvn = new CliSvnProvider(normalizedWorkspaceRoot);
              await this.withTimeout(cliSvn.init());
              if (await this.withTimeout(cliSvn.isAvailable())) {
                provider = cliSvn;
              }
            }
          } catch (error) {
            console.error("CLI SVN provider initialization failed:", error);
          }
        }
      }

      if (provider) {
        // 缓存提供者实例（使用规范化的路径作为键）
        this.providerCache.set(normalizedWorkspaceRoot, provider);
        this.currentProvider = provider;
        return provider;
      }

      return undefined;
    } catch (error) {
      console.error(
        "SCM detection failed:",
        error instanceof Error ? error.message : error
      );
      return undefined;
    }
  }

  /**
   * 获取当前使用的SCM类型
   * @returns {"git" | "svn" | undefined} 返回当前SCM类型,如果未设置则返回undefined
   */
  static getCurrentSCMType(): "git" | "svn" | undefined {
    return this.currentProvider?.type;
  }
}
