import * as vscode from 'vscode';
import { BaseCommand } from './base-command';
import { TokenStatsService } from '../services/token-stats-service';
import { notify } from '../utils/notification/notification-manager';
import { getMessage, formatMessage } from '../utils/i18n';

export class ShowTokenStatsCommand extends BaseCommand {
  constructor(context: vscode.ExtensionContext) {
    super(context);
  }

  public async execute(): Promise<void> {
    try {
      const tokenStatsService = TokenStatsService.getInstance();
      const totalTokens = tokenStatsService.getTotalTokens();
      notify.info(formatMessage('token.stats.totalTokens', [totalTokens]));
    } catch (error) {
      this.handleError(error, getMessage('token.stats.showError'));
    }
  }
}