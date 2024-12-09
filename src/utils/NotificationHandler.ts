import * as vscode from "vscode";
import { LocalizationManager } from "./LocalizationManager";

export class NotificationHandler {
  public static async info(key: string, ...args: any[]): Promise<void> {
    const message = LocalizationManager.getInstance().format(key, ...args);
    await vscode.window.showInformationMessage(message);
  }

  public static async warn(key: string, ...args: any[]): Promise<void> {
    const message = LocalizationManager.getInstance().format(key, ...args);
    await vscode.window.showWarningMessage(message);
  }

  public static async error(key: string, ...args: any[]): Promise<void> {
    const message = LocalizationManager.getInstance().format(key, ...args);
    await vscode.window.showErrorMessage(message);
  }
}
