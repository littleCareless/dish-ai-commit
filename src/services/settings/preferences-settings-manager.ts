import * as vscode from "vscode";

export interface PreferencesSettings {
    language: string;
    commitTemperature: number;
    reviewTemperature: number;
    branchNameTemperature: number;
    weeklyReportTemperature: number;
}

export class PreferencesSettingsManager {
    private static instance: PreferencesSettingsManager;
    private static readonly STORAGE_KEY = "dish.settings.preferences";

    private _settings: PreferencesSettings = {
        language: "Simplified Chinese",
        commitTemperature: 0.3,
        reviewTemperature: 0.6,
        branchNameTemperature: 0.4,
        weeklyReportTemperature: 0.3,
    };

    private constructor(private context: vscode.ExtensionContext) { }

    public static getInstance(
        context?: vscode.ExtensionContext
    ): PreferencesSettingsManager {
        if (!PreferencesSettingsManager.instance) {
            if (!context) {
                throw new Error("PreferencesSettingsManager not initialized and no context provided");
            }
            PreferencesSettingsManager.instance = new PreferencesSettingsManager(context);
        }
        return PreferencesSettingsManager.instance;
    }

    public async initialize(): Promise<void> {
        await this.loadSettings();
    }

    public getSettings(): PreferencesSettings {
        return { ...this._settings };
    }

    public async updateSettings(
        partialSettings: Partial<PreferencesSettings>
    ): Promise<void> {
        this._settings = { ...this._settings, ...partialSettings };
        await this.saveSettings();
    }

    private async loadSettings(): Promise<void> {
        const storedSettings = this.context.globalState.get<PreferencesSettings>(
            PreferencesSettingsManager.STORAGE_KEY
        );

        if (storedSettings) {
            this._settings = { ...this._settings, ...storedSettings };
        }
    }

    private async saveSettings(): Promise<void> {
        await this.context.globalState.update(
            PreferencesSettingsManager.STORAGE_KEY,
            this._settings
        );
    }
}
