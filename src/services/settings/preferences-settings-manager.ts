import * as vscode from "vscode";

export interface PreferencesSettings {
    language: string;
}

export class PreferencesSettingsManager {
    private static instance: PreferencesSettingsManager;
    private static readonly STORAGE_KEY = "dish.settings.preferences";

    private _settings: PreferencesSettings = {
        language: "Simplified Chinese",
    };

    private constructor(private context: vscode.ExtensionContext) { }

    public static getInstance(
        context: vscode.ExtensionContext
    ): PreferencesSettingsManager {
        if (!PreferencesSettingsManager.instance) {
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
