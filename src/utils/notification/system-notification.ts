import { getMessage } from "@/utils/i18n";
import { NotificationSettingsManager } from "@/utils/notification/notification-settings-manager";
import * as fs from "fs";
import * as notifier from "node-notifier";
import * as path from "path";
import * as vscode from "vscode";

const IS_WINDOWS = process.platform === "win32";
const IS_MACOS = process.platform === "darwin";

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
      // 如果未启用,只显示 VS Code 内部通知
      // vscode.window.showInformationMessage(`${title}: ${message}`);
      return;
    }

    // VSCode extensions run from the 'dist' directory, so we need to go up one level.
    const iconPath = path.join(__dirname, "..", "images", "logo.png");

    // 检查是否启用了声音通知
    const playSound =
      options?.sound !== false && settingsManager.isSoundNotificationsEnabled();

    // node-notifier options
    const notificationOptions: any = {
      title: title,
      message: message,
      icon: IS_WINDOWS ? iconPath : undefined, // Icon is not consistently supported on all platforms
      sound: playSound,
      wait: options?.wait ?? false,
      timeout: options?.timeout ?? 5,
    };

    if (IS_MACOS) {
      // On macOS, node-notifier can have issues finding its binary when bundled.
      // We try multiple paths in order of preference:
      // 1. Bundled terminal-notifier in dist/vendor/mac (packaged with extension)
      // 2. node_modules terminal-notifier (development/user installation)
      // 3. Default notifier (fallback)

      const terminalNotifierPaths = [
        // 1. Try bundled terminal-notifier (packaged with extension) - PRIORITY
        path.join(
          __dirname,
          "vendor",
          "mac",
          "terminal-notifier.app",
          "Contents",
          "MacOS",
          "terminal-notifier"
        ),
        // 2. Try node_modules terminal-notifier (development environment fallback)
        path.join(
          path.dirname(require.resolve("node-notifier")),
          "vendor",
          "mac.noindex",
          "terminal-notifier.app",
          "Contents",
          "MacOS",
          "terminal-notifier"
        ),
      ];

      for (const terminalNotifierPath of terminalNotifierPaths) {
        try {
          if (fs.existsSync(terminalNotifierPath)) {
            const macNotifier = new notifier.NotificationCenter({
              customPath: terminalNotifierPath,
            });
            macNotifier.notify(notificationOptions, (err) => {
              if (err) {
                console.error("System notification error (macOS):", err);
              }
            });
            console.log(
              `[showSystemNotification] Using terminal-notifier from: ${terminalNotifierPath}`
            );
            return; // Notification sent with custom notifier
          }
        } catch (e) {
          console.warn(
            `[showSystemNotification] Failed to use terminal-notifier at ${terminalNotifierPath}:`,
            e
          );
          // Continue to next path
        }
      }

      // If all custom paths failed, log warning and fall through to default notifier
      console.warn(
        "[showSystemNotification] Could not find terminal-notifier in any known location, falling back to default notifier."
      );
    }

    notifier.notify(notificationOptions, (err) => {
      if (err) {
        console.error("System notification error:", err);
      }
      // response is a string on Windows ('activate', 'dismissed', 'timeout')
      // and undefined on other platforms.
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
  const title = getMessage("extension.displayName");
  const message =
    getMessage("commit.message.generated.success.system") ||
    "AI commit message generated successfully.";
  showSystemNotification(title, message);
}

/**
 * Shows a notification indicating that the weekly report was generated successfully.
 */
export function showWeeklyReportSuccessNotification(): void {
  const title = getMessage("extension.displayName");
  const message =
    getMessage("weeklyReport.generation.success.system") ||
    "Weekly report has been generated successfully.";
  showSystemNotification(title, message);
}
