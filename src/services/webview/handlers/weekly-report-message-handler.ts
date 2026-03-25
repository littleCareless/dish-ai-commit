import { ModelConfigurationManager } from "@/services/webview/config/model-configuration-manager";
import { WeeklyReportGenerator } from "@/services/webview/services/weekly-report-generator";
import { notify } from "@/utils/notification";
import { showWeeklyReportSuccessNotification } from "@/utils/notification/system-notification";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import * as vscode from "vscode";

export class WeeklyReportMessageHandler {
  private readonly generator: WeeklyReportGenerator;
  private readonly configManager: ModelConfigurationManager;
  private readonly _extensionContext: vscode.ExtensionContext;

  constructor(extensionContext: vscode.ExtensionContext) {
    this._extensionContext = extensionContext;
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
      case UIRequest.WeeklyReportNotification: {
        const payload = message.data || message;
        if (payload?.text) {
          notify.info(payload.text, payload.args || []);
        }
        break;
      }
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
    webview: vscode.Webview,
  ) {
    // 重命名方法
    try {
      const payload = message.data || {};
      if (
        !payload.period?.startDate ||
        !payload.period?.endDate ||
        !Array.isArray(payload.users) ||
        payload.users.length === 0
      ) {
        throw new Error("Invalid weekly report request payload");
      }
      const report = await this.generator.generateTeamReport(
        // 修改调用
        payload.period,
        payload.users, // 传递 users
      );
      // const author = await this.generator.getCurrentAuthor(); // 对于团队报告，可能不需要单个 author

      webview.postMessage({
        command: ExtensionResponse.WeeklyReportGenerated,
        data: report,
      });
      const formattedPeriod = this.formatPeriod(payload.period);
      // 可以考虑修改通知信息，比如指明是为哪些用户生成的报告
      notify.info("weeklyReport.teamGeneration.success", [
        formattedPeriod,
        (payload.users || []).join(", "),
      ]);
      showWeeklyReportSuccessNotification();
    } catch (error: any) {
      notify.error(
        "weeklyReport.teamGeneration.failed",
        [error.message || error],
        {
          timeout: 3000,
        },
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
