import * as vscode from "vscode";
import { LocalizationManager } from "./LocalizationManager";

/**
 * 处理 VSCode 通知消息的工具类
 */
export class NotificationHandler {
  /** 默认通知显示时间(毫秒) */
  private static readonly DEFAULT_TIMEOUT = 3000;

  /**
   * 显示指定类型的通知消息
   * @param type 消息类型: "info" | "warn" | "error"
   * @param key 本地化消息的键
   * @param timeout 可选的显示超时时间
   * @param args 格式化消息的参数列表
   */
  private static async showMessage(
    type: "info" | "warn" | "error",
    key: string,
    timeout?: number,
    ...args: any[]
  ): Promise<void> {
    try {
      const message = LocalizationManager.getInstance().format(key, ...args);
      const promise =
        type === "info"
          ? vscode.window.showInformationMessage(message)
          : type === "warn"
          ? vscode.window.showWarningMessage(message)
          : vscode.window.showErrorMessage(message);
    } catch (error) {
      console.error(`Failed to show ${type} message:`, error);
    }
  }

  /**
   * 显示信息类型的通知
   * @param key 本地化消息的键
   * @param timeout 可选的显示超时时间
   * @param args 格式化消息的参数列表
   */
  public static async info(
    key: string,
    timeout?: number,
    ...args: any[]
  ): Promise<void> {
    return this.showMessage("info", key, timeout, ...args);
  }

  /**
   * 显示警告类型的通知
   * @param key 本地化消息的键
   * @param timeout 可选的显示超时时间
   * @param args 格式化消息的参数列表
   */
  public static async warn(
    key: string,
    timeout?: number,
    ...args: any[]
  ): Promise<void> {
    return this.showMessage("warn", key, timeout, ...args);
  }

  /**
   * 显示错误类型的通知
   * @param key 本地化消息的键
   * @param timeout 可选的显示超时时间
   * @param args 格式化消息的参数列表
   */
  public static async error(
    key: string,
    timeout?: number,
    ...args: any[]
  ): Promise<void> {
    return this.showMessage("error", key, timeout, ...args);
  }
}
