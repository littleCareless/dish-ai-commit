import * as vscode from "vscode";
import { BaseCommand } from "./BaseCommand";
import { WeeklyReportPanel } from "../webview/WeeklyReportPanel";

export class GenerateWeeklyReportCommand extends BaseCommand {
  async execute(): Promise<void> {
    // 只负责打开WebView面板
    WeeklyReportPanel.createOrShow(this.context.extensionUri, this.context);
  }
}
