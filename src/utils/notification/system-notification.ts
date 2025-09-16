import * as vscode from "vscode";
import * as notifier from "node-notifier";
import * as path from "path";
import { getMessage } from "../i18n";

/**
 * Sends a system-level notification.
 * @param title The title of the notification.
 * @param message The message body of the notification.
 */
export function showSystemNotification(title: string, message: string): void {
  try {
    // VSCode extensions run from the 'dist' directory, so we need to go up one level.
    const iconPath = path.join(__dirname, "..", "images", "logo.png");

    notifier.notify({
      title: title,
      message: message,
      icon: iconPath,
      sound: true, // Play a sound
      wait: false, // Do not wait for user action
      timeout: 5, // Set a timeout of 5 seconds
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