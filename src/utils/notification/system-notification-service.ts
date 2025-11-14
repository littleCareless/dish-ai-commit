import * as notifier from "node-notifier";
import * as path from "path";
import * as fs from "fs";

const IS_WINDOWS = process.platform === "win32";
const IS_MACOS = process.platform === "darwin";

// Define the structure for notification options
export interface SystemNotification {
  title: string;
  message: string;
  icon?: string; // Path to the icon
  sound?: boolean; // Play a sound
  wait?: boolean; // Wait for user action
}

class SystemNotifierService {
  private static instance: SystemNotifierService;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  public static getInstance(): SystemNotifierService {
    if (!SystemNotifierService.instance) {
      SystemNotifierService.instance = new SystemNotifierService();
    }
    return SystemNotifierService.instance;
  }

  public notify(notification: SystemNotification): void {
    try {
      const iconPath = path.join(__dirname, "../../../images/icon.svg");

      // node-notifier options
      const options: any = {
        title: notification.title,
        message: notification.message,
        icon: IS_WINDOWS ? iconPath : undefined, // Icon is not consistently supported on all platforms
        sound: notification.sound ?? true, // Play sound by default
        wait: notification.wait ?? false, // Don't wait for user action by default
      };

      if (IS_MACOS) {
        // On macOS, node-notifier can have issues finding its binary when bundled.
        // We can work around this by providing a direct path to terminal-notifier.
        try {
          const notifierVendorPath = path.join(
            path.dirname(require.resolve("node-notifier")),
            "vendor"
          );

          const customPath = path.join(
            notifierVendorPath,
            "mac.noindex/terminal-notifier.app/Contents/MacOS/terminal-notifier"
          );

          if (fs.existsSync(customPath)) {
            const macNotifier = new notifier.NotificationCenter({
              customPath: customPath,
            });
            macNotifier.notify(options, (err) => {
              if (err) {
                console.error("System notification error (macOS):", err);
              }
            });
            return; // Notification sent with custom notifier
          }
        } catch (e) {
          // Fallback to default notifier if path resolution fails
          console.warn(
            "Could not configure custom macOS notifier, falling back to default.",
            e
          );
        }
      }

      notifier.notify(options, (err) => {
        if (err) {
          console.error("System notification error:", err);
        }
        // response is a string on Windows ('activate', 'dismissed', 'timeout')
        // and undefined on other platforms.
      });
    } catch (error) {
      console.error("Failed to send system notification:", error);
    }
  }
}

export const systemNotifier = SystemNotifierService.getInstance();