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
    if (!(await this.showConfirmAIProviderToS())) {
      return;
    }
    WeeklyReportPanel.createOrShow(this.context.extensionUri, this.context);
  }
}
