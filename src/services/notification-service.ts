import { DISH_CONFIG_PREFIX } from "@/config/constants";
import { getMessage } from "@/utils/i18n";
import { Logger } from "@/utils/logger";
import * as vscode from "vscode";

export const MIGRATION_NOTIFICATION_KEY = `${DISH_CONFIG_PREFIX}_migration_notification_shown`;

/**
 * Service for handling extension notifications
 */
export class NotificationService {
  private static instance: NotificationService;
  private readonly context: vscode.ExtensionContext;
  private readonly logger: Logger;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.logger = Logger.getInstance("NotificationService");
  }

  public static initialize(
    context: vscode.ExtensionContext
  ): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService(context);
    }
    return NotificationService.instance;
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      throw new Error("NotificationService not initialized");
    }
    return NotificationService.instance;
  }

  /**
   * Check if the migration notification should be shown and show it if needed
   */
  public async checkAndShowMigrationNotification(): Promise<void> {
    // Check if notification has been shown
    const hasShown = this.context.workspaceState.get<boolean>(
      MIGRATION_NOTIFICATION_KEY,
      false
    );

    if (hasShown) {
      return;
    }

    try {
      const message = getMessage("notification.settings.migration.message");
      const confirmText = getMessage("notification.settings.migration.confirm");
      const cancelText = getMessage("notification.settings.migration.cancel");

      // Show information message with actions (non-modal)
      const selection = await vscode.window.showInformationMessage(
        message,
        confirmText,
        cancelText
      );

      // Mark as shown regardless of user choice to avoid pestering
      await this.context.workspaceState.update(
        MIGRATION_NOTIFICATION_KEY,
        true
      );

      if (selection === confirmText) {
        // Open the settings view
        await vscode.commands.executeCommand(
          "dish-ai-commit.settingsView.focus"
        );
        this.logger.info(
          "User accepted migration notification and opened settings"
        );
      } else {
        this.logger.info("User dismissed migration notification");
      }
    } catch (error) {
      this.logger.error(`Failed to show migration notification: ${error}`);
    }
  }
}
