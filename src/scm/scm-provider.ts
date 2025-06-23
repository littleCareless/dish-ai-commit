import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { GitProvider } from "./git-provider";
import { SvnProvider } from "./svn-provider";
import { CliSvnProvider } from "./cli-svn-provider";

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
}

/**
 * SCM工厂类
 * 用于创建和管理源代码管理提供者实例
 */
export class SCMFactory {
  /** 当前激活的SCM提供者实例 */
  private static currentProvider: ISCMProvider | undefined;

  /**
   * 根据选中的文件确定工作区根目录
   * @param selectedFiles 选中的文件路径列表
   * @returns 工作区根目录路径或undefined
   */
  private static findWorkspaceRoot(
    selectedFiles?: string[]
  ): string | undefined {
    // 如果没有提供文件，则使用VS Code的第一个工作区
    if (!selectedFiles || selectedFiles.length === 0) {
      return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }

    // 检查每个文件的目录，寻找.git或.svn文件夹
    for (const file of selectedFiles) {
      let currentDir = path.dirname(file);
      // 向上查找直到根目录
      while (currentDir && currentDir !== path.parse(currentDir).root) {
        if (
          fs.existsSync(path.join(currentDir, ".git")) ||
          fs.existsSync(path.join(currentDir, ".svn"))
        ) {
          return currentDir;
        }
        currentDir = path.dirname(currentDir);
      }
    }

    // 如果没找到，回退到VS Code工作区
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
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
      // 首先检查工作区根目录
      const gitPath = path.join(workspaceRoot, ".git");
      const svnPath = path.join(workspaceRoot, ".svn");

      if (fs.existsSync(gitPath)) {
        return "git";
      }
      if (fs.existsSync(svnPath)) {
        return "svn";
      }

      // 如果提供了文件路径，检查这些文件所在的目录
      if (filePaths && filePaths.length > 0) {
        // 获取所有唯一的目录路径
        const dirPaths = [
          ...new Set(filePaths.map((file) => path.dirname(file))),
        ];

        for (const dir of dirPaths) {
          // 从文件所在目录向上查找，直到工作区根目录
          let currentDir = dir;
          while (
            currentDir.startsWith(workspaceRoot) &&
            currentDir !== workspaceRoot
          ) {
            const gitSubPath = path.join(currentDir, ".git");
            const svnSubPath = path.join(currentDir, ".svn");

            if (fs.existsSync(gitSubPath)) {
              return "git";
            }
            if (fs.existsSync(svnSubPath)) {
              return "svn";
            }

            // 向上一级目录
            currentDir = path.dirname(currentDir);
          }
        }
      }

      return undefined;
    } catch (error) {
      console.error("Failed to detect SCM from directory:", error);
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
   * 检测并创建可用的SCM提供者
   * @param {string[] | undefined} selectedFiles - 可选的选定文件路径列表
   * @returns {Promise<ISCMProvider | undefined>} 返回可用的SCM提供者实例,如果没有可用的提供者则返回undefined
   */
  static async detectSCM(
    selectedFiles?: string[]
  ): Promise<ISCMProvider | undefined> {
    try {
      if (this.currentProvider) {
        return this.currentProvider;
      }

      // 使用新方法获取工作区根目录
      const workspaceRoot = this.findWorkspaceRoot(selectedFiles);
      if (!workspaceRoot) {
        return undefined;
      }

      // 通过目录检测，包括选定的文件路径
      const scmType = this.detectSCMFromDir(workspaceRoot, selectedFiles);

      const gitExtension = vscode.extensions.getExtension("vscode.git");
      const svnExtension = vscode.extensions.getExtension(
        "littleCareless.svn-scm-ai"
      );

      // 如果检测到Git
      if (scmType === "git") {
        const git = gitExtension?.exports
          ? new GitProvider(gitExtension.exports, workspaceRoot)
          : undefined;
        if (git) {
          await git.init();
          if (await git.isAvailable()) {
            this.currentProvider = git;
            return git;
          }
        }
      }

      // 如果检测到SVN
      if (scmType === "svn") {
        // 先尝试使用SVN插件
        const svn = svnExtension?.exports
          ? new SvnProvider(svnExtension.exports)
          : undefined;
        if (svn) {
          await svn.init();
          if (await svn.isAvailable()) {
            this.currentProvider = svn;
            return svn;
          }
        }

        // 如果没有插件但系统有SVN命令,使用命令行方式
        if (await this.checkSCMCommand("svn")) {
          const cliSvn = new CliSvnProvider(workspaceRoot);
          await cliSvn.init();
          if (await cliSvn.isAvailable()) {
            this.currentProvider = cliSvn;
            return cliSvn;
          }
        }
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
