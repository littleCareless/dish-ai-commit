import * as vscode from "vscode";
import { LocalizationManager } from "./LocalizationManager";

export class NotificationHandler {
  private static readonly TIMEOUT = 10000; // 10 seconds

  private static async showMessage(
    type: "info" | "warn" | "error",
    key: string,
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

      await Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Notification timeout")),
            this.TIMEOUT
          )
        ),
      ]);
    } catch (error) {
      console.error(`Failed to show ${type} message:`, error);
    }
  }

  public static async info(key: string, ...args: any[]): Promise<void> {
    return this.showMessage("info", key, ...args);
  }

  public static async warn(key: string, ...args: any[]): Promise<void> {
    return this.showMessage("warn", key, ...args);
  }

  public static async error(key: string, ...args: any[]): Promise<void> {
    return this.showMessage("error", key, ...args);
  }
}
