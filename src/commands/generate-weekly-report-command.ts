import { WeeklyReportPanel } from "../services/webview/weekly-report-panel";
import { BaseCommand } from "./base-command";

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
    if ((await this.showConfirmAIProviderToS()) === false) {
      this.logger.warn("User did not confirm AI provider ToS.");
      return;
    }
    this.logger.info("Showing Weekly Report Panel.");
    WeeklyReportPanel.createOrShow(this.context.extensionUri, this.context);
  }
}
