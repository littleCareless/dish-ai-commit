import { ProfileManagerService } from "@/services/profile-manager/profile-manager-service";
import {
  WeeklyReportService,
  type Period,
} from "@/services/reporting/weekly-report";
import { ModelConfigurationManager } from "@/services/webview/config/model-configuration-manager";
import { getMessage } from "@/utils/i18n";
import { ProgressHandler } from "@/utils/notification";

export class WeeklyReportGenerator {
  private readonly weeklyReportService: WeeklyReportService;

  constructor() {
    this.weeklyReportService = new WeeklyReportService();
  }

  public async generateReport(period: Period): Promise<string> {
    await this.weeklyReportService.initialize();

    return await ProgressHandler.withProgress(
      await getMessage("weeklyReport.generating"),
      async () => {
        const workItems = await this.weeklyReportService.generate(
          period as unknown as Period
        );
        const profileManager = ProfileManagerService.getInstance();
        const profile = profileManager.getProfileForMode();
        const featureSettings = profileManager.getFeatureSettings();
        const { aiProvider, selectedModel } =
          await ModelConfigurationManager.getModelAndProvider(
            profile,
            featureSettings
          );

        const response = await aiProvider.generateWeeklyReport(
          workItems.map((item) => item.content),
          period,
          selectedModel
        );

        if (!response?.content) {
          throw new Error(await getMessage("weeklyReport.empty.response"));
        }

        return response.content;
      }
    );
  }

  public async getCurrentAuthor(): Promise<string> {
    await this.weeklyReportService.initialize(); // 确保服务已初始化
    return await this.weeklyReportService.getCurrentAuthor();
  }

  public async getAllAuthors(): Promise<string[]> {
    await this.weeklyReportService.initialize(); // 确保服务已初始化
    return await this.weeklyReportService.getAllAuthors(); // 假设 WeeklyReportService 中有此方法
  }

  public async generateTeamReport(
    period: Period,
    users: string[]
  ): Promise<string> {
    await this.weeklyReportService.initialize();

    return await ProgressHandler.withProgress(
      await getMessage("weeklyReport.generatingTeamReport"), // 可能需要新的国际化key
      async () => {
        // generateForUsers 返回 WorkItem[], 其 content 就是 commit message string
        const workItems = await this.weeklyReportService.generateForUsers(
          period as unknown as Period, // Period 类型在 weeklyReportService 中已定义
          users
        );
        const profileManager = ProfileManagerService.getInstance();
        const profile = profileManager.getProfileForMode();
        const featureSettings = profileManager.getFeatureSettings();
        const { aiProvider, selectedModel } =
          await ModelConfigurationManager.getModelAndProvider(
            profile,
            featureSettings
          );

        // aiProvider.generateWeeklyReport 需要 string[] 类型的 commits
        // workItems已经是 WorkItem[] 类型，我们需要提取其 content 属性
        const commitMessages = workItems.map(
          (item: { content: string }) => item.content
        );

        const response = await aiProvider.generateWeeklyReport(
          commitMessages, // 传递 commit messages 字符串数组
          period as Period, // 确保 period 类型正确
          selectedModel,
          users
        );

        if (!response?.content) {
          throw new Error(await getMessage("weeklyReport.empty.response"));
        }

        return response.content;
      }
    );
  }
}
