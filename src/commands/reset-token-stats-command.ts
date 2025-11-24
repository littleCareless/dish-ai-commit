import * as vscode from "vscode";
import { TokenStatsService } from "../services/core/token-stats-service";
import { getMessage } from "../utils/i18n";
import { notify } from "../utils/notification/notification-manager";
import { BaseCommand } from "./base-command";

export class ResetTokenStatsCommand extends BaseCommand {
  constructor(context: vscode.ExtensionContext) {
    super(context);
  }

  public async execute(): Promise<void> {
    try {
      const tokenStatsService = TokenStatsService.getInstance();
      await tokenStatsService.resetTotalTokens();
      notify.info(getMessage("token.stats.resetSuccess"));
    } catch (error) {
      this.handleError(error, getMessage("token.stats.resetError"));
    }
  }
}
