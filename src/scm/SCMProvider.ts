import * as vscode from "vscode";
import { GitProvider } from "./GitProvider";
import { SvnProvider } from "./SvnProvider";
import { LocalizationManager } from "../utils/LocalizationManager";

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
   * 检测并创建可用的SCM提供者
   * @returns {Promise<ISCMProvider | undefined>} 返回可用的SCM提供者实例,如果没有可用的提供者则返回undefined
   */
  static async detectSCM(): Promise<ISCMProvider | undefined> {
    try {
      if (this.currentProvider) {
        return this.currentProvider;
      }

      const gitExtension = vscode.extensions.getExtension("vscode.git");
      const svnExtension = vscode.extensions.getExtension(
        "littleCareless.svn-scm-ai"
      );

      // if (!gitExtension && !svnExtension) {
      //   throw new Error(
      //     LocalizationManager.getInstance().getMessage("scm.no.provider")
      //   );
      // }

      const git = gitExtension?.exports
        ? new GitProvider(gitExtension.exports)
        : undefined;
      if (git && (await git.isAvailable())) {
        this.currentProvider = git;
        return git;
      }

      const svn = svnExtension?.exports
        ? new SvnProvider(svnExtension.exports)
        : undefined;
      if (svn && (await svn.isAvailable())) {
        this.currentProvider = svn;
        return svn;
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
