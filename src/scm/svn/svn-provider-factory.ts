import * as vscode from "vscode";
import { Logger } from "../../utils/logger";
import { ISvnProvider } from "./svn-provider-interface";
import { SvnProvider } from "./svn-provider";
import { SvnCommandProvider } from "./svn-command-provider";
import { CliSvnProvider } from "./cli-svn-provider";

/**
 * SVN提供者工厂类
 * 负责创建和初始化适当的SVN提供者实例，并处理降级策略
 */
export class SvnProviderFactory {
  private static logger: Logger = Logger.getInstance("Dish AI Commit Gen");

  /**
   * 创建适合当前环境的SVN提供者
   * 实现优雅降级策略：
   * 1. 首先尝试使用VS Code SVN API (如果可用)
   * 2. 其次尝试使用标准命令行提供者
   * 3. 最后降级为简单的CLI提供者
   * 
   * @param workspaceRoot 工作区根路径
   * @returns 初始化的SVN提供者实例
   */
  static async createProvider(workspaceRoot: string): Promise<ISvnProvider> {
    // 确保有工作区路径
    if (!workspaceRoot) {
      workspaceRoot = SvnProviderFactory.getWorkspaceRoot();
    }

    // 尝试使用VS Code SVN API提供者
    try {
      const svnProvider = new SvnProvider(workspaceRoot);
      if (await svnProvider.isAvailable()) {
        await svnProvider.init();
        this.logger.info("使用VS Code SVN API提供者");
        return svnProvider;
      }
    } catch (error) {
      this.logger.warn(`VS Code SVN API不可用: ${error}`);
    }

    // 尝试使用标准命令行提供者
    try {
      const commandProvider = new SvnCommandProvider(workspaceRoot);
      if (await commandProvider.isAvailable()) {
        await commandProvider.init();
        this.logger.info("使用标准SVN命令行提供者");
        return commandProvider;
      }
    } catch (error) {
      this.logger.warn(`标准SVN命令行提供者初始化失败: ${error}`);
    }

    // 降级为简单CLI提供者
    try {
      const cliProvider = new CliSvnProvider(workspaceRoot);
      if (await cliProvider.isAvailable()) {
        await cliProvider.init();
        this.logger.info("使用简易SVN CLI提供者（降级模式）");
        return cliProvider;
      }
    } catch (error) {
      this.logger.error(`简易SVN CLI提供者初始化失败: ${error}`);
    }

    // 所有提供者都不可用
    throw new Error("无法创建SVN提供者，所有可能的提供者都不可用。请确认SVN已安装且可访问。");
  }

  /**
   * 获取当前工作区根路径
   * @returns 工作区路径或当前目录
   */
  private static getWorkspaceRoot(): string {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      return vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
    
    // 如果没有工作区，尝试获取活动文件的目录
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.uri.scheme === 'file') {
      const filePath = activeEditor.document.uri.fsPath;
      return filePath.substring(0, filePath.lastIndexOf('/'));
    }
    
    // 如果都没有，返回当前工作目录
    return process.cwd();
  }
}
