import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { Logger } from "../../../utils/logger";
import { SvnPathHelper } from "./svn-path-helper";
import { ISvnProvider } from "../svn-provider-interface";
import { SvnProvider } from "../svn-provider";
import { SvnCommandProvider } from "../svn-command-provider";
import { CliSvnProvider } from "../cli-svn-provider";

/**
 * SVN测试帮助类
 * 提供用于测试SVN提供者的实用工具
 */
export class SvnTestHelper {
  private static logger: Logger = Logger.getInstance("Dish AI Commit Gen");

  /**
   * 创建测试用的临时SVN仓库
   * @param baseDir 基础目录
   * @returns 临时SVN仓库的路径
   */
  static async createTempSvnRepo(baseDir: string): Promise<string> {
    try {
      const tempDir = path.join(baseDir, `temp-svn-${Date.now()}`);
      
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // 创建SVN仓库
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "正在创建测试SVN仓库...",
        cancellable: false
      }, async () => {
        const svnPath = await SvnPathHelper.getSvnPath();
        const execOptions = SvnPathHelper.createExecOptions(baseDir);
        
        // 创建仓库
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(tempDir));
        
        // 这里需要实际执行SVN命令，但在测试环境中可能需要模拟
        this.logger.info(`已创建测试SVN仓库: ${tempDir}`);
      });
      
      return tempDir;
    } catch (error) {
      this.logger.error(`创建测试SVN仓库失败: ${error}`);
      throw new Error(`创建测试SVN仓库失败: ${error}`);
    }
  }
  
  /**
   * 清理临时SVN仓库
   * @param repoPath 仓库路径
   */
  static async cleanupTempSvnRepo(repoPath: string): Promise<void> {
    try {
      if (fs.existsSync(repoPath)) {
        await vscode.workspace.fs.delete(vscode.Uri.file(repoPath), { recursive: true });
      }
      this.logger.info(`已清理测试SVN仓库: ${repoPath}`);
    } catch (error) {
      this.logger.warn(`清理测试SVN仓库失败: ${error}`);
    }
  }
  
  /**
   * 检测可用的SVN提供者
   * 按优先级尝试不同的提供者
   * @param workspaceRoot 工作区根路径
   * @returns SVN提供者实例，或undefined表示没有可用的提供者
   */
  static async detectAvailableProvider(workspaceRoot: string): Promise<ISvnProvider | undefined> {
    this.logger.info("正在检测可用的SVN提供者...");
    
    // 1. 尝试VS Code SVN扩展
    try {
      const svnExtension = vscode.extensions.getExtension("johnstoncode.svn-scm");
      if (svnExtension?.isActive) {
        const api = svnExtension.exports?.getAPI?.(1);
        if (api?.repositories?.length > 0) {
          const provider = new SvnProvider(svnExtension.exports, workspaceRoot);
          if (await provider.isAvailable()) {
            await provider.init();
            this.logger.info("已检测到VS Code SVN扩展提供者");
            return provider;
          }
        }
      }
    } catch (error) {
      this.logger.warn(`VS Code SVN扩展不可用: ${error}`);
    }
    
    // 2. 尝试命令行提供者
    try {
      const commandProvider = new SvnCommandProvider(workspaceRoot);
      if (await commandProvider.isAvailable()) {
        await commandProvider.init();
        this.logger.info("已检测到命令行SVN提供者");
        return commandProvider;
      }
    } catch (error) {
      this.logger.warn(`命令行SVN提供者不可用: ${error}`);
    }
    
    // 3. 尝试CLI SVN提供者
    try {
      const cliProvider = new CliSvnProvider(workspaceRoot);
      if (await cliProvider.isAvailable()) {
        await cliProvider.init();
        this.logger.info("已检测到CLI SVN提供者");
        return cliProvider;
      }
    } catch (error) {
      this.logger.warn(`CLI SVN提供者不可用: ${error}`);
    }
    
    this.logger.warn("未检测到可用的SVN提供者");
    return undefined;
  }
  
  /**
   * 验证SVN提供者的基本功能
   * @param provider SVN提供者实例
   * @returns 验证是否通过
   */
  static async validateProviderBasics(provider: ISvnProvider): Promise<boolean> {
    try {
      // 1. 检查提供者是否已初始化
      if (!await provider.isAvailable()) {
        return false;
      }
      
      // 2. 尝试获取差异
      const diff = await provider.getDiff();
      this.logger.info(`getDiff结果: ${diff ? "成功" : "无差异"}`);
      
      // 3. 尝试获取最近提交消息
      const messages = await provider.getRecentCommitMessages();
      this.logger.info(`获取到${messages.repository.length}条仓库提交消息`);
      
      return true;
    } catch (error) {
      this.logger.error(`验证SVN提供者失败: ${error}`);
      return false;
    }
  }
  
  /**
   * 模拟SVN差异数据
   * @returns 模拟的SVN差异文本
   */
  static getMockSvnDiff(): string {
    return `Index: src/example.ts
===================================================================
--- src/example.ts	(revision 100)
+++ src/example.ts	(working copy)
@@ -1,5 +1,5 @@
 function greeting() {
-  return 'Hello, world!';
+  return 'Hello, SVN!';
 }
 
 console.log(greeting());`;
  }
}
