import * as vscode from "vscode";
import { BaseCommand } from "./BaseCommand";
import { NotificationHandler } from "../utils/NotificationHandler";
import { ProgressHandler } from "../utils/ProgressHandler";
import { LocalizationManager } from "../utils/LocalizationManager";
import { WeeklyReportPanel } from "../webview/WeeklyReportPanel";
import { SCMFactory } from "../scm/SCMProvider";

export class GenerateWeeklyReportCommand extends BaseCommand {
  async validateConfig(): Promise<boolean> {
    const scmProvider = await SCMFactory.detectSCM();
    if (!scmProvider) {
      const locManager = LocalizationManager.getInstance();
      await NotificationHandler.error(
        locManager.getMessage("scm.not.detected")
      );
      return false;
    }
    return true;
  }

  async execute(): Promise<void> {
    try {
      if (!(await this.validateConfig())) {
        return;
      }

      await ProgressHandler.withProgress(
        LocalizationManager.getInstance().getMessage("weeklyReport.generating"),
        async () => {
          WeeklyReportPanel.createOrShow(this.context.extensionUri);
        }
      );
    } catch (error) {
      if (error instanceof Error) {
        await NotificationHandler.error(
          LocalizationManager.getInstance().format(
            "weeklyReport.generation.failed",
            error.message
          )
        );
      }
    }
  }
}
