import * as vscode from "vscode";
import { BaseCommand } from "./base-command";
import { WeeklyReportPanel } from "../webview/weekly-report-panel";

/**
 * 生成周报命令类
 */
export class GenerateWeeklyReportCommand extends BaseCommand {
  /**
   * 执行周报生成命令
   * 打开周报生成WebView面板
   */
  async execute(): Promise<void> {
    this.logger.info("Executing GenerateWeeklyReportCommand...");
    if (!(await this.showConfirmAIProviderToS())) {
      this.logger.warn("User did not confirm AI provider ToS.");
      return;
    }
    this.logger.info("Showing Weekly Report Panel.");
    WeeklyReportPanel.createOrShow(this.context.extensionUri, this.context);
  }
}
