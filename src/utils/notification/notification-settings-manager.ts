import * as vscode from "vscode";

/**
 * 通知设置管理器
 * 管理通知相关的设置（文本转语音、声音通知、系统通知）
 */
export interface NotificationSettings {
  textToSpeech: boolean;
  soundNotifications: boolean;
  systemNotifications: boolean;
}

export class NotificationSettingsManager {
  private static instance: NotificationSettingsManager | undefined;
  private _settings: NotificationSettings = {
    textToSpeech: false,
    soundNotifications: false,
    systemNotifications: false,
  };
  private _extensionContext: vscode.ExtensionContext | undefined;

  private constructor() {}

  public static getInstance(): NotificationSettingsManager {
    if (!NotificationSettingsManager.instance) {
      NotificationSettingsManager.instance = new NotificationSettingsManager();
    }
    return NotificationSettingsManager.instance;
  }

  /**
   * 初始化设置管理器
   */
  public async initialize(context: vscode.ExtensionContext): Promise<void> {
    this._extensionContext = context;
    await this.loadSettings();
  }

  /**
   * 从 globalState 加载设置
   */
  public async loadSettings(): Promise<void> {
    if (!this._extensionContext) {
      return;
    }

    try {
      const settings = this._extensionContext.globalState.get<NotificationSettings>(
        "notificationSettings"
      );
      if (settings) {
        this._settings = { ...this._settings, ...settings };
      }
    } catch (error) {
      console.error("Failed to load notification settings:", error);
    }
  }

  /**
   * 保存设置到 globalState
   */
  public async saveSettings(settings: NotificationSettings): Promise<void> {
    if (!this._extensionContext) {
      return;
    }

    try {
      this._settings = { ...settings };
      await this._extensionContext.globalState.update(
        "notificationSettings",
        this._settings
      );
    } catch (error) {
      console.error("Failed to save notification settings:", error);
      throw error;
    }
  }

  /**
   * 获取当前设置
   */
  public getSettings(): NotificationSettings {
    return { ...this._settings };
  }

  /**
   * 检查是否启用了文本转语音
   */
  public isTextToSpeechEnabled(): boolean {
    return this._settings.textToSpeech;
  }

  /**
   * 检查是否启用了声音通知
   */
  public isSoundNotificationsEnabled(): boolean {
    return this._settings.soundNotifications;
  }

  /**
   * 检查是否启用了系统通知
   */
  public isSystemNotificationsEnabled(): boolean {
    return this._settings.systemNotifications;
  }

  /**
   * 设置文本转语音
   */
  public setTextToSpeechEnabled(enabled: boolean): void {
    this._settings.textToSpeech = enabled;
    this.saveSettings(this._settings).catch((error) => {
      console.error("Failed to save text-to-speech setting:", error);
    });
  }

  /**
   * 设置声音通知
   */
  public setSoundNotificationsEnabled(enabled: boolean): void {
    this._settings.soundNotifications = enabled;
    this.saveSettings(this._settings).catch((error) => {
      console.error("Failed to save sound notifications setting:", error);
    });
  }

  /**
   * 设置系统通知
   */
  public setSystemNotificationsEnabled(enabled: boolean): void {
    this._settings.systemNotifications = enabled;
    this.saveSettings(this._settings).catch((error) => {
      console.error("Failed to save system notifications setting:", error);
    });
  }
}

