import { WeeklyReportService, type Period } from "../../services/weekly-report";
import { AIProviderFactory } from "../../ai/ai-provider-factory";
import { ModelConfigurationManager } from "../config/model-configuration-manager";
import { ProgressHandler } from "../../utils/notification";
import { getMessage } from "../../utils/i18n";

export class WeeklyReportGenerator {
  private readonly weeklyReportService: WeeklyReportService;
  private readonly configManager: ModelConfigurationManager;

  constructor() {
    this.weeklyReportService = new WeeklyReportService();
    this.configManager = new ModelConfigurationManager();
  }

  public async generateReport(period: string): Promise<string> {
    await this.weeklyReportService.initialize();

    return await ProgressHandler.withProgress(
      await getMessage("weeklyReport.generating"),
      async () => {
        const workItems = await this.weeklyReportService.generate(
          period as unknown as Period
        );
        const { aiProvider, selectedModel } =
          await this.configManager.getModelAndProvider();

        const response = await aiProvider.generateWeeklyReport(
          workItems.map((item) => item.content),
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
    return await this.weeklyReportService.getCurrentAuthor();
  }
}
