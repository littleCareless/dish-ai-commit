import * as vscode from "vscode";
import { TokenStatsService } from "@/services/core/token-stats-service";

export class UsageMessageHandler {
  constructor(private readonly _extensionContext: vscode.ExtensionContext) { }

  public async handle(message: any, webview: vscode.Webview): Promise<void> {
    const tokenStatsService = TokenStatsService.getInstance();

    switch (message.command) {
      case "getUsageStats": {
        const totalTokens = tokenStatsService.getTotalTokens();
        const detailedStats = tokenStatsService.getDetailedStats();
        await webview.postMessage({
          command: "usageStats",
          data: { totalTokens, detailedStats },
        });
        break;
      }

      case "resetUsageStats": {
        await tokenStatsService.resetTotalTokens();
        await webview.postMessage({
          command: "usageStats",
          data: { totalTokens: 0, detailedStats: [] },
        });
        break;
      }
    }
  }
}
