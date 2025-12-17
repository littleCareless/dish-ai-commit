import { TokenStatsService } from "@/services/core/token-stats-service";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import * as vscode from "vscode";

export class UsageMessageHandler {
  constructor(private readonly _extensionContext: vscode.ExtensionContext) {}

  public async handle(message: any, webview: vscode.Webview): Promise<void> {
    const tokenStatsService = TokenStatsService.getInstance();

    switch (message.command) {
      case UIRequest.UsageGetStats: {
        const totalTokens = tokenStatsService.getTotalTokens();
        const detailedStats = tokenStatsService.getDetailedStats();
        console.log("[UsageMessageHandler] 获取使用统计数据:", {
          totalTokens,
          detailedStatsCount: detailedStats.length,
          detailedStats,
        });
        await webview.postMessage({
          command: ExtensionResponse.UsageStatsLoaded,
          data: { totalTokens, detailedStats },
        });
        break;
      }

      case UIRequest.UsageResetStats: {
        await tokenStatsService.resetTotalTokens();
        await webview.postMessage({
          command: ExtensionResponse.UsageStatsLoaded,
          data: { totalTokens: 0, detailedStats: [] },
        });
        break;
      }
    }
  }
}
