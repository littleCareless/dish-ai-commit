import * as vscode from "vscode";
import { WeeklyReportGenerator } from "../services/WeeklyReportGenerator";
import { ModelConfigurationManager } from "../config/ModelConfigurationManager";
import { notify } from "../../utils/notification";

export class WeeklyReportMessageHandler {
  private readonly generator: WeeklyReportGenerator;
  private readonly configManager: ModelConfigurationManager;

  constructor() {
    this.generator = new WeeklyReportGenerator();
    this.configManager = new ModelConfigurationManager();
  }

  public async handleMessage(message: any, webview: vscode.Webview) {
    switch (message.command) {
      case "generate":
        await this.handleGenerateCommand(message, webview);
        break;

      case "notification":
        if (message.text) {
          notify.info(message.text, message.args || []);
        }
        break;
    }
  }

  private async handleGenerateCommand(message: any, webview: vscode.Webview) {
    try {
      const report = await this.generator.generateReport(message.data.period);
      const author = await this.generator.getCurrentAuthor();

      webview.postMessage({
        command: "report",
        data: report,
      });

      const formattedPeriod = this.formatPeriod(message.data.period);
      console.log("formattedPeriod", formattedPeriod);
      notify.info("weeklyReport.generation.success", [formattedPeriod, author]);
    } catch (error: any) {
      notify.error("weeklyReport.generation.failed", [error], {
        timeout: 3000,
      });
    }
  }

  private formatPeriod(period: string): string {
    const now = new Date();
    const weeks = parseInt(period);
    const pastDate = new Date(now.setDate(now.getDate() - weeks * 7));

    const formatDate = (date: Date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy} ${mm} ${dd}`;
    };

    const endDate = formatDate(new Date());
    const startDate = formatDate(pastDate);
    return `${startDate} - ${endDate}`;
  }
}
