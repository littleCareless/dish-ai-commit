import * as vscode from "vscode";
import { notify } from "../../utils/notification/notification-manager";
import { formatMessage, getMessage } from "../../utils/i18n";

/**
 * SCM统一错误处理工具类
 * 提供所有SCM提供者共享的错误处理功能
 */
export class SCMErrorHandler {
  /**
   * 统一错误处理方法
   * @param scmType SCM类型名称
   * @param operation 操作名称
   * @param error 错误对象
   * @throws {Error} 重新抛出格式化后的错误
   */
  static handleError(scmType: string, operation: string, error: unknown): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${scmType} ${operation}失败:`, errorMessage);
    
    const formattedError = new Error(formatMessage(`scm.${operation.toLowerCase()}.failed`, [scmType, errorMessage]));
    throw formattedError;
  }

  /**
   * 验证SCM提供者
   * @param provider 提供者实例
   * @param scmType SCM类型名称
   * @param operation 操作名称
   * @throws {Error} 当提供者无效时抛出错误
   */
  static validateProvider(provider: any, scmType: string, operation: string = "操作"): void {
    if (!provider) {
      const error = new Error(formatMessage("scm.provider.not.found", [scmType]));
      this.handleError(scmType, operation, error);
    }
  }

  /**
   * 验证仓库
   * @param repository 仓库实例
   * @param scmType SCM类型名称
   * @param operation 操作名称
   * @returns 验证后的仓库
   * @throws {Error} 当未找到仓库时抛出错误
   */
  static validateRepository<T>(repository: T | undefined, scmType: string, operation: string = "操作"): T {
    if (!repository) {
      const error = new Error(formatMessage("scm.repository.not.found", [scmType]));
      this.handleError(scmType, operation, error);
    }
    return repository;
  }

  /**
   * 验证路径
   * @param path 路径
   * @param scmType SCM类型名称
   * @param operation 操作名称
   * @returns 验证后的路径
   * @throws {Error} 当路径无效时抛出错误
   */
  static validatePath(path: string | undefined, scmType: string, operation: string = "操作"): string {
    if (!path || typeof path !== 'string') {
      const error = new Error(formatMessage("scm.path.invalid", [scmType]));
      this.handleError(scmType, operation, error);
    }
    return path;
  }

  /**
   * 处理初始化错误
   * @param scmType SCM类型名称
   * @param error 错误对象
   * @throws {Error} 重新抛出格式化后的错误
   */
  static handleInitError(scmType: string, error: unknown): never {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    const formattedError = new Error(formatMessage("scm.initialization.failed", [scmType, errorMessage]));
    this.handleError(scmType, "初始化", formattedError);
  }

  /**
   * 处理可用性检查错误
   * @param scmType SCM类型名称
   * @param error 错误对象
   * @returns false 表示不可用
   */
  static handleAvailabilityError(scmType: string, error: unknown): boolean {
    console.error(`${scmType} 可用性检查失败:`, error instanceof Error ? error.message : error);
    return false;
  }

  /**
   * 处理命令执行错误
   * @param scmType SCM类型名称
   * @param command 命令
   * @param error 错误对象
   * @throws {Error} 重新抛出格式化后的错误
   */
  static handleCommandError(scmType: string, command: string, error: unknown): never {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    const formattedError = new Error(formatMessage("scm.command.failed", [scmType, command, errorMessage]));
    this.handleError(scmType, "命令执行", formattedError);
  }

  /**
   * 处理差异获取错误
   * @param scmType SCM类型名称
   * @param error 错误对象
   * @returns undefined 表示无差异
   */
  static handleDiffError(scmType: string, error: unknown): undefined {
    console.error(`${scmType} 差异获取失败:`, error instanceof Error ? error.message : error);
    return undefined;
  }

  /**
   * 处理提交错误
   * @param scmType SCM类型名称
   * @param error 错误对象
   * @throws {Error} 重新抛出格式化后的错误
   */
  static handleCommitError(scmType: string, error: unknown): never {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    const formattedError = new Error(formatMessage("scm.commit.failed", [scmType, errorMessage]));
    this.handleError(scmType, "提交", formattedError);
  }

  /**
   * 处理日志获取错误
   * @param scmType SCM类型名称
   * @param error 错误对象
   * @returns 空数组
   */
  static handleLogError(scmType: string, error: unknown): string[] {
    console.warn(`${scmType} 日志获取失败:`, error instanceof Error ? error.message : error);
    return [];
  }

  /**
   * 处理剪贴板操作错误
   * @param content 要复制的内容
   * @param error 错误对象
   */
  static handleClipboardError(content: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    notify.error("commit.message.copy.failed", [errorMessage]);
    // 回退到显示信息对话框
    notify.info("commit.message.manual.copy", [content]);
  }
}
