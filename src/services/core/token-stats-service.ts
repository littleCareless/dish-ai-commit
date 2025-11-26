import { DISH_CONFIG_PREFIX } from "@/config/constants";
import { ExtensionContext, Memento } from "vscode";

const DETAILED_STATS_KEY = `${DISH_CONFIG_PREFIX}_detailed_token_stats`;

export interface TokenUsageRecord {
  model: string;
  provider: string;
  feature: string;
  tokens: number;
  timestamp: number;
}

export interface DailyUsageStats {
  date: string; // YYYY-MM-DD
  totalTokens: number;
  byModel: Record<string, number>;
  byFeature: Record<string, number>;
}

export class TokenStatsService {
  private static instance: TokenStatsService;
  private storage: Memento;

  private constructor(context: ExtensionContext) {
    this.storage = context.globalState;
  }

  public static initialize(context: ExtensionContext): void {
    if (!TokenStatsService.instance) {
      TokenStatsService.instance = new TokenStatsService(context);
    }
  }

  public static getInstance(): TokenStatsService {
    if (!TokenStatsService.instance) {
      throw new Error("TokenStatsService is not initialized.");
    }
    return TokenStatsService.instance;
  }

  public async addTokens(
    tokens: number,
    model: string = "unknown",
    provider: string = "unknown",
    feature: string = "unknown"
  ): Promise<void> {
    await this.updateDetailedStats(tokens, model, provider, feature);
  }

  private async updateDetailedStats(
    tokens: number,
    model: string,
    provider: string,
    feature: string
  ): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    const stats = this.getDetailedStats();

    let dailyStats = stats.find((s) => s.date === today);
    if (!dailyStats) {
      dailyStats = {
        date: today,
        totalTokens: 0,
        byModel: {},
        byFeature: {},
      };
      stats.push(dailyStats);
    }

    dailyStats.totalTokens += tokens;
    dailyStats.byModel[model] = (dailyStats.byModel[model] || 0) + tokens;
    dailyStats.byFeature[feature] =
      (dailyStats.byFeature[feature] || 0) + tokens;

    // Keep only last 30 days
    if (stats.length > 30) {
      stats.shift();
    }

    await this.storage.update(DETAILED_STATS_KEY, stats);
  }

  public getTotalTokens(): number {
    const stats = this.getDetailedStats();
    return stats.reduce((acc, daily) => acc + daily.totalTokens, 0);
  }

  public getDetailedStats(): DailyUsageStats[] {
    return this.storage.get<DailyUsageStats[]>(DETAILED_STATS_KEY, []);
  }

  public async resetTotalTokens(): Promise<void> {
    await this.storage.update(DETAILED_STATS_KEY, []);
  }
}
