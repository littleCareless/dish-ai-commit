import { ExtensionContext, Memento } from 'vscode';

const TOTAL_TOKENS_KEY = 'totalTokens';

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
      throw new Error('TokenStatsService is not initialized.');
    }
    return TokenStatsService.instance;
  }

  public async addTokens(tokens: number): Promise<void> {
    const currentTokens = this.getTotalTokens();
    await this.storage.update(TOTAL_TOKENS_KEY, currentTokens + tokens);
  }

  public getTotalTokens(): number {
    return this.storage.get<number>(TOTAL_TOKENS_KEY, 0);
  }

  public async resetTotalTokens(): Promise<void> {
    await this.storage.update(TOTAL_TOKENS_KEY, 0);
  }
}