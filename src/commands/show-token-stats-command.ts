import * as vscode from "vscode";
import { TokenStatsService } from "@/services/core/token-stats-service";
import { formatMessage, getMessage } from "@/utils/i18n";
import { notify } from "@/utils/notification/notification-manager";
import { BaseCommand } from "@/commands/base-command";

export class ShowTokenStatsCommand extends BaseCommand {
  constructor(context: vscode.ExtensionContext) {
    super(context);
  }

  public async execute(): Promise<void> {
    try {
      const tokenStatsService = TokenStatsService.getInstance();
      const totalTokens = tokenStatsService.getTotalTokens();
      notify.info(formatMessage("token.stats.totalTokens", [totalTokens]));
    } catch (error) {
      this.handleError(error, getMessage("token.stats.showError"));
    }
  }
}
