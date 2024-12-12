import * as vscode from "vscode";
import { BaseCommand } from "./BaseCommand";
import { NotificationHandler } from "../utils/NotificationHandler";
import { ProgressHandler } from "../utils/ProgressHandler";
import { LocalizationManager } from "../utils/LocalizationManager";
import { WeeklyReportPanel } from "../webview/WeeklyReportPanel";
import { SCMFactory } from "../scm/SCMProvider";
import { AIProviderFactory } from "../ai/AIProviderFactory";
import { exec } from "child_process";
import { ConfigurationManager } from "../config/ConfigurationManager";

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

  async getPeriod(): Promise<string | undefined> {
    const options = ["本周", "上一周", "上两周"];
    const selection = await vscode.window.showQuickPick(options, {
      placeHolder: "选择一个时间段",
    });

    switch (selection) {
      case "本周":
        return "1 week ago";
      case "上一周":
        return "2 weeks ago";
      case "上两周":
        return "3 weeks ago";
      default:
        return undefined;
    }
  }

  async execute(): Promise<void> {
    try {
      const period = await this.getPeriod();
      if (!period) {
        return;
      }

      await ProgressHandler.withProgress(
        LocalizationManager.getInstance().getMessage("weeklyReport.generating"),
        async () => {
          const scmProvider = await SCMFactory.detectSCM();
          if (!scmProvider) {
            await NotificationHandler.error(
              LocalizationManager.getInstance().getMessage("scm.not.detected")
            );
            return;
          }

          const config = ConfigurationManager.getInstance();
          const configuration = config.getConfiguration();

          // 检查是否已配置 AI 提供商和模型
          let provider = configuration.base.provider;
          let model = configuration.base.model;

          const commits = await this.getCommits(period);
          const aiProvider = AIProviderFactory.getProvider("ZHIPUAI");
          const response = await aiProvider.generateWeeklyReport(commits);

          if (response?.content) {
            vscode.window.showInformationMessage("周报生成成功");
            WeeklyReportPanel.createOrShow(this.context.extensionUri);
            WeeklyReportPanel.currentPanel?._panel.webview.postMessage({
              command: "report",
              data: response.content,
            });
          } else {
            vscode.window.showErrorMessage("周报生成失败");
          }
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

  private async getCommits(period: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return reject("没有打开的工作区");
      }

      const command = `git log --since="${period}" --pretty=format:"%h - %an, %ar : %s"`;
      exec(
        command,
        { cwd: workspaceFolders[0].uri.fsPath },
        (error, stdout, stderr) => {
          if (error) {
            reject(`获取commit历史记录失败: ${stderr}`);
          } else {
            resolve(stdout.split("\n"));
          }
        }
      );
    });
  }
}
