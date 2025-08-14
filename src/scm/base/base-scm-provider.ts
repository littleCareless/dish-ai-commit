import * as vscode from "vscode";
import { ISCMProvider, RecentCommitMessages } from "../scm-provider";
import { SCMUtils } from "../utils/scm-utils";
import { SCMLogger } from "../utils/scm-logger";
import { PathUtils } from "../utils/path-utils";

/**
 * SCM Provider 抽象基类
 * 提供通用的 SCM 操作实现，减少子类中的重复代码
 */
export abstract class BaseScmProvider implements ISCMProvider {
  /** SCM类型 */
  abstract readonly type: "git" | "svn";

  /** 仓库路径 */
  protected readonly repositoryPath?: string;

  constructor(repositoryPath?: string) {
    this.repositoryPath = repositoryPath;
  }

  /** 初始化Provider - 子类必须实现 */
  abstract init(): Promise<void>;

  /** 检查SCM是否可用 - 子类必须实现 */
  abstract isAvailable(): Promise<boolean>;

  /** 获取文件差异 - 子类必须实现 */
  abstract getDiff(files?: string[]): Promise<string | undefined>;

  /** 提交更改 - 子类必须实现 */
  abstract commit(message: string, files?: string[]): Promise<void>;

  /** 获取提交日志 - 子类必须实现 */
  abstract getCommitLog(
    baseBranch?: string,
    headBranch?: string
  ): Promise<string[]>;

  /** 获取最近提交信息 - 子类必须实现 */
  abstract getRecentCommitMessages(): Promise<RecentCommitMessages>;

  /**
   * 设置提交信息到输入框或剪贴板
   * 通用实现 - 优先尝试设置到输入框，失败时复制到剪贴板
   */
  async setCommitInput(message: string): Promise<void> {
    try {
      const success = await this.trySetInputBox(message);
      if (!success) {
        await this.copyToClipboard(message);
      }
    } catch (error) {
      SCMLogger.error(`Failed to set commit input for ${this.type}:`, error);
      await this.copyToClipboard(message);
    }
  }

  /**
   * 获取提交输入框内容
   * 默认实现返回空字符串，子类可以重写
   */
  async getCommitInput(): Promise<string> {
    return "";
  }

  /**
   * 开始流式输入
   * 默认实现与setCommitInput相同，子类可以重写以支持真正的流式输入
   */
  async startStreamingInput(message: string): Promise<void> {
    await this.setCommitInput(message);
  }

  /**
   * 复制到剪贴板
   * 通用实现，所有子类共享
   */
  async copyToClipboard(message: string): Promise<void> {
    return SCMUtils.copyToClipboard(message);
  }

  /**
   * 设置当前操作的文件列表（可选）
   * 默认实现为空，子类可以重写
   */
  setCurrentFiles?(files?: string[]): void {
    // 默认实现为空
  }

  /**
   * 尝试设置输入框内容
   * 子类必须实现此方法来处理特定的输入框逻辑
   * @param message 要设置的消息
   * @returns 如果成功设置返回true，否则返回false
   */
  protected abstract trySetInputBox(message: string): Promise<boolean>;

  /**
   * 规范化文件路径
   * 通用路径处理方法
   */
  protected normalizePaths(files?: string[]): string[] {
    if (!files || files.length === 0) {
      return [];
    }
    return files.map((file) => PathUtils.normalizePath(file));
  }

  /**
   * 转义shell路径
   * 通用路径转义方法
   */
  protected escapeShellPaths(files: string[]): string[] {
    return files.map((file) => PathUtils.escapeShellPath(file));
  }

  /**
   * 验证工作区
   * 通用工作区验证方法
   */
  protected validateWorkspace(): void {
    if (!vscode.workspace.workspaceFolders?.length) {
      throw new Error("No workspace found");
    }
  }

  /**
   * 记录日志的便捷方法
   */
  protected logInfo(message: string, ...args: any[]): void {
    SCMLogger.info(`[${this.type.toUpperCase()}] ${message}`, ...args);
  }

  protected logWarn(message: string, ...args: any[]): void {
    SCMLogger.warn(`[${this.type.toUpperCase()}] ${message}`, ...args);
  }

  protected logError(message: string, ...args: any[]): void {
    SCMLogger.error(`[${this.type.toUpperCase()}] ${message}`, ...args);
  }
}
