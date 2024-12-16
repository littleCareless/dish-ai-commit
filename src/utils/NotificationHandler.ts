import * as vscode from "vscode";
import { LocalizationManager } from "./LocalizationManager";

export class NotificationHandler {
  private static readonly DEFAULT_TIMEOUT = 3000; // 3 seconds

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

  public static async info(
    key: string,
    timeout?: number,
    ...args: any[]
  ): Promise<void> {
    return this.showMessage("info", key, timeout, ...args);
  }

  public static async warn(
    key: string,
    timeout?: number,
    ...args: any[]
  ): Promise<void> {
    return this.showMessage("warn", key, timeout, ...args);
  }

  public static async error(
    key: string,
    timeout?: number,
    ...args: any[]
  ): Promise<void> {
    return this.showMessage("error", key, timeout, ...args);
  }
}
