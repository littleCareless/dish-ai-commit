import { DISH_CONFIG_PREFIX } from "@/config/constants";
import * as vscode from "vscode";

export interface IndexingSettings {
  enabled: boolean;
  provider: string;
  embeddingModel: string;
  qdrantUrl: string;
  qdrantApiKey: string;
  searchScoreThreshold: number;
  maxSearchResults: number;
  /** 最小代码块字符数阈值 (10-500)，小于此值的块将使用回退策略 */
  minBlockChars: number;
  /** 是否启用多仓库独立索引 */
  enableMultiRepoIndexing: boolean;
  providers: {
    [providerId: string]: {
      model?: string;
      baseUrl?: string;
      apiKey?: string;
      modelDimensions?: number;
    };
  };
}

export class IndexingSettingsManager {
  private static instance: IndexingSettingsManager;
  private static readonly STORAGE_KEY = `${DISH_CONFIG_PREFIX}_indexing_settings`;

  private _settings: IndexingSettings = {
    enabled: false,
    provider: "ollama",
    embeddingModel: "nomic-embed-text",
    qdrantUrl: "http://localhost:6333",
    qdrantApiKey: "",
    searchScoreThreshold: 0.7,
    maxSearchResults: 10,
    minBlockChars: 100,
    enableMultiRepoIndexing: true,
    providers: {},
  };

  private constructor(private context: vscode.ExtensionContext) {}

  public static getInstance(
    context: vscode.ExtensionContext
  ): IndexingSettingsManager {
    if (!IndexingSettingsManager.instance) {
      IndexingSettingsManager.instance = new IndexingSettingsManager(context);
    }
    return IndexingSettingsManager.instance;
  }

  public async initialize(): Promise<void> {
    await this.loadSettings();
  }

  public getSettings(): IndexingSettings {
    return { ...this._settings };
  }

  public async updateSettings(
    partialSettings: Partial<IndexingSettings>
  ): Promise<void> {
    this._settings = { ...this._settings, ...partialSettings };
    await this.saveSettings();
  }

  public async updateProviderSetting(
    providerId: string,
    key: "model" | "baseUrl" | "apiKey" | "modelDimensions",
    value: any
  ): Promise<void> {
    if (!this._settings.providers[providerId]) {
      this._settings.providers[providerId] = {};
    }
    this._settings.providers[providerId][key] = value;
    await this.saveSettings();
  }

  private async loadSettings(): Promise<void> {
    // 1. Try to load from Secrets first (New Storage)
    const storedSecrets = await this.context.secrets.get(
      IndexingSettingsManager.STORAGE_KEY
    );

    if (storedSecrets) {
      try {
        const parsedSettings = JSON.parse(storedSecrets);
        this._settings = { ...this._settings, ...parsedSettings };
      } catch (error) {
        console.error("Failed to parse indexing settings from secrets:", error);
      }
    } else {
      // 2. Fallback to GlobalState (Old Storage - Migration)
      const storedSettings = this.context.globalState.get<IndexingSettings>(
        IndexingSettingsManager.STORAGE_KEY
      );

      if (storedSettings) {
        this._settings = { ...this._settings, ...storedSettings };
        // Migrate to Secrets immediately
        await this.saveSettings();
      }
    }

    // Ensure providers object exists
    if (!this._settings.providers) {
      this._settings.providers = {};
    }
  }

  private async saveSettings(): Promise<void> {
    // 1. Save entire object to Secrets
    await this.context.secrets.store(
      IndexingSettingsManager.STORAGE_KEY,
      JSON.stringify(this._settings)
    );

    // 2. Clear from GlobalState (Cleanup)
    await this.context.globalState.update(
      IndexingSettingsManager.STORAGE_KEY,
      undefined
    );
  }
}
