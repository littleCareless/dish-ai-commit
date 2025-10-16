import * as vscode from 'vscode';
import { BaseCommand } from './base-command';
import { TokenStatsService } from '../services/token-stats-service';
import { notify } from '../utils/notification/notification-manager';
import { getMessage } from '../utils/i18n';

export class ResetTokenStatsCommand extends BaseCommand {
  constructor(context: vscode.ExtensionContext) {
    super(context);
  }

  public async execute(): Promise<void> {
    try {
      const tokenStatsService = TokenStatsService.getInstance();
      await tokenStatsService.resetTotalTokens();
      notify.info(getMessage('token.stats.resetSuccess'));
    } catch (error) {
      this.handleError(error, getMessage('token.stats.resetError'));
    }
  }
}