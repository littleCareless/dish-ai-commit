import * as vscode from "vscode";

export type NotificationType = "info" | "warn" | "error";

export interface NotificationConfig {
  timeout?: number;
}
