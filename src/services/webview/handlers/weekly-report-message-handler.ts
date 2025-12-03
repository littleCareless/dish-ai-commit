import { UIRequest, ExtensionResponse } from "@/types/messages";
import * as vscode from "vscode";
import { notify } from "@/utils/notification";
import { showWeeklyReportSuccessNotification } from "@/utils/notification/system-notification";
import { ModelConfigurationManager } from "@/services/webview/config/model-configuration-manager";
import { WeeklyReportGenerator } from "@/services/webview/services/weekly-report-generator";

export class WeeklyReportMessageHandler {
  private readonly generator: WeeklyReportGenerator;
  private readonly configManager: ModelConfigurationManager;

  constructor() {
    this.generator = new WeeklyReportGenerator();
    this.configManager = new ModelConfigurationManager();
  }

  public async handleMessage(message: any, webview: vscode.Webview) {
    switch (message.command) {
      case UIRequest.WeeklyReportGenerateTeam: // 修改 command
        await this.handleGenerateTeamReportCommand(message, webview);
        break;
      case UIRequest.WeeklyReportGetUsers: // 新增 getUsers command
        await this.handleGetUsersCommand(webview);
        break;
      case UIRequest.WeeklyReportNotification:
        if (message.text) {
          notify.info(message.text, message.args || []);
        }
        break;
    }
  }

  private async handleGetUsersCommand(webview: vscode.Webview) {
    try {
      const users = await this.generator.getAllAuthors(); // 假设 generator 中有此方法
      const currentUser = await this.generator.getCurrentAuthor();
      webview.postMessage({
        command: ExtensionResponse.WeeklyReportUsersListLoaded,
        data: { users, currentUser },
      });
    } catch (error: any) {
      notify.error("weeklyReport.getUsers.failed", [error.message || error], {
        timeout: 3000,
      });
      webview.postMessage({
        command: ExtensionResponse.WeeklyReportUsersListLoaded, // 即使失败也发送消息，让UI可以处理空状态
        data: { users: [], currentUser: "" },
      });
    }
  }

  private async handleGenerateTeamReportCommand(
    message: any,
    webview: vscode.Webview
  ) {
    // 重命名方法
    try {
      const report = await this.generator.generateTeamReport(
        // 修改调用
        message.data.period,
        message.data.users // 传递 users
      );
      // const author = await this.generator.getCurrentAuthor(); // 对于团队报告，可能不需要单个 author

      webview.postMessage({
        command: ExtensionResponse.WeeklyReportGenerated,
        data: report,
      });
      const formattedPeriod = this.formatPeriod(message.data.period);
      // 可以考虑修改通知信息，比如指明是为哪些用户生成的报告
      notify.info("weeklyReport.teamGeneration.success", [
        formattedPeriod,
        message.data.users.join(", "),
      ]);
      showWeeklyReportSuccessNotification();
    } catch (error: any) {
      notify.error(
        "weeklyReport.teamGeneration.failed",
        [error.message || error],
        {
          timeout: 3000,
        }
      );
    }
  }

  private formatPeriod(period: { startDate: string; endDate: string }): string {
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy} ${mm} ${dd}`;
    };

    const startDate = formatDate(period.startDate);
    const endDate = formatDate(period.endDate);
    return `${startDate} - ${endDate}`;
  }
}
