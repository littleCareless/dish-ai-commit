import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { GitProvider } from "./GitProvider";
import { SvnProvider } from "./SvnProvider";
import { CliSvnProvider } from "./CliSvnProvider";

/**
 * 源代码管理提供者接口
 * 定义了通用的SCM操作方法
 */
export interface ISCMProvider {
  /** SCM类型:"git" 或 "svn" */
  type: "git" | "svn";

  /** 检查SCM系统是否可用 */
  isAvailable(): Promise<boolean>;

  /** 获取文件差异 */
  getDiff(files?: string[]): Promise<string | undefined>;

  /** 提交更改 */
  commit(message: string, files?: string[]): Promise<void>;

  /** 设置提交信息 */
  setCommitInput(message: string): Promise<void>;

  /** 获取当前提交信息 */
  getCommitInput(): Promise<string>;
}

/**
 * SCM工厂类
 * 用于创建和管理源代码管理提供者实例
 */
export class SCMFactory {
  /** 当前激活的SCM提供者实例 */
  private static currentProvider: ISCMProvider | undefined;

  /**
   * 通过项目目录检测SCM类型
   * @param workspaceRoot 工作区根目录
   * @returns {"git" | "svn" | undefined} SCM类型
   */
  private static detectSCMFromDir(
    workspaceRoot: string
  ): "git" | "svn" | undefined {
    try {
      const gitPath = path.join(workspaceRoot, ".git");
      const svnPath = path.join(workspaceRoot, ".svn");

      if (fs.existsSync(gitPath)) {
        return "git";
      }
      if (fs.existsSync(svnPath)) {
        return "svn";
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
   * @returns {Promise<ISCMProvider | undefined>} 返回可用的SCM提供者实例,如果没有可用的提供者则返回undefined
   */
  static async detectSCM(): Promise<ISCMProvider | undefined> {
    try {
      if (this.currentProvider) {
        return this.currentProvider;
      }

      // 获取工作区根目录
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        return undefined;
      }

      // 首先通过目录检测
      const scmType = this.detectSCMFromDir(workspaceRoot);

      const gitExtension = vscode.extensions.getExtension("vscode.git");
      const svnExtension = vscode.extensions.getExtension(
        "littleCareless.svn-scm-ai"
      );

      // 如果检测到Git
      if (scmType === "git") {
        const git = gitExtension?.exports
          ? new GitProvider(gitExtension.exports)
          : undefined;
        if (git && (await git.isAvailable())) {
          this.currentProvider = git;
          return git;
        }
      }

      // 如果检测到SVN
      if (scmType === "svn") {
        // 先尝试使用SVN插件
        const svn = svnExtension?.exports
          ? new SvnProvider(svnExtension.exports)
          : undefined;
        if (svn && (await svn.isAvailable())) {
          this.currentProvider = svn;
          return svn;
        }

        // 如果没有插件但系统有SVN命令,使用命令行方式
        if (await this.checkSCMCommand("svn")) {
          const cliSvn = new CliSvnProvider(workspaceRoot);
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
