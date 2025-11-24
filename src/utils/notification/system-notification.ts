import * as vscode from "vscode";
import * as notifier from "node-notifier";
import * as path from "path";
import { getMessage } from "@/utils/i18n";
import { NotificationSettingsManager } from "@/utils/notification/notification-settings-manager";

/**
 * Sends a system-level notification.
 * @param title The title of the notification.
 * @param message The message body of the notification.
 * @param options Optional notification options
 */
export function showSystemNotification(
  title: string,
  message: string,
  options?: {
    sound?: boolean;
    wait?: boolean;
    timeout?: number;
  }
): void {
  try {
    // 检查是否启用了系统通知
    const settingsManager = NotificationSettingsManager.getInstance();
    if (!settingsManager.isSystemNotificationsEnabled()) {
      // 如果未启用，只显示 VS Code 内部通知
      vscode.window.showInformationMessage(`${title}: ${message}`);
      return;
    }

    // VSCode extensions run from the 'dist' directory, so we need to go up one level.
    const iconPath = path.join(__dirname, "..", "images", "logo.png");

    // 检查是否启用了声音通知
    const playSound = options?.sound !== false && settingsManager.isSoundNotificationsEnabled();

    notifier.notify({
      title: title,
      message: message,
      icon: iconPath,
      sound: playSound,
      wait: options?.wait ?? false,
      timeout: options?.timeout ?? 5,
    });
  } catch (error) {
    console.error("Failed to send system notification:", error);
    // As a fallback, show a VSCode notification if the system one fails.
    vscode.window.showInformationMessage(`${title}: ${message}`);
  }
}

/**
 * Shows a notification indicating that the AI commit message was generated successfully.
 */
export function showCommitSuccessNotification(): void {
  const title = getMessage("extension.displayName") || "Dish AI Commit";
  const message = getMessage("commit.message.generated.success.system") || "AI commit message generated successfully.";
  showSystemNotification(title, message);
}

/**
 * Shows a notification indicating that the weekly report was generated successfully.
 */
export function showWeeklyReportSuccessNotification(): void {
  const title = getMessage("extension.displayName") || "Dish AI Commit";
  const message = getMessage("weeklyReport.generation.success.system") || "Weekly report has been generated successfully.";
  showSystemNotification(title, message);
}