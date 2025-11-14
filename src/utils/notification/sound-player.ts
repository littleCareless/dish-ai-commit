import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

/**
 * 音效播放服务
 * 用于播放通知音效
 */
export class SoundPlayerService {
  private static instance: SoundPlayerService | undefined;
  private _enabled: boolean = false;
  private _extensionPath: string | undefined;

  private constructor() {}

  public static getInstance(extensionPath?: string): SoundPlayerService {
    if (!SoundPlayerService.instance) {
      SoundPlayerService.instance = new SoundPlayerService();
      if (extensionPath) {
        SoundPlayerService.instance._extensionPath = extensionPath;
      }
    }
    return SoundPlayerService.instance;
  }

  /**
   * 设置是否启用音效
   */
  public setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  /**
   * 检查是否已启用
   */
  public isEnabled(): boolean {
    return this._enabled;
  }

  /**
   * 播放音效
   * @param soundType 音效类型
   */
  public async playSound(soundType: "success" | "error" | "info" | "warning"): Promise<void> {
    if (!this._enabled) {
      return;
    }

    try {
      // 使用系统默认音效
      await this.playSystemSound(soundType);
    } catch (error) {
      console.error("Sound playback error:", error);
      // 静默失败
    }
  }

  /**
   * 播放系统音效
   */
  private async playSystemSound(soundType: "success" | "error" | "info" | "warning"): Promise<void> {
    const { exec } = require("child_process");
    const { promisify } = require("util");
    const execAsync = promisify(exec);

    const platform = process.platform;

    try {
      if (platform === "darwin") {
        // macOS 使用 `afplay` 播放系统音效
        const soundMap: Record<string, string> = {
          success: "/System/Library/Sounds/Glass.aiff",
          error: "/System/Library/Sounds/Basso.aiff",
          info: "/System/Library/Sounds/Submarine.aiff",
          warning: "/System/Library/Sounds/Ping.aiff",
        };

        const soundPath = soundMap[soundType] || soundMap.info;
        await execAsync(`afplay "${soundPath}"`);
      } else if (platform === "win32") {
        // Windows 使用 PowerShell 播放系统音效
        const soundMap: Record<string, number> = {
          success: 0, // SystemDefault
          error: 16, // SystemExclamation
          info: 64, // SystemAsterisk
          warning: 48, // SystemExclamation
        };

        const soundCode = soundMap[soundType] || soundMap.info;
        await execAsync(
          `powershell -Command "[console]::beep(800, 200)"`
        );
      } else if (platform === "linux") {
        // Linux 使用 `paplay` 或 `aplay` 播放系统音效
        // 尝试使用 paplay（PulseAudio）
        try {
          const soundMap: Record<string, string> = {
            success: "/usr/share/sounds/freedesktop/stereo/message.oga",
            error: "/usr/share/sounds/freedesktop/stereo/dialog-error.oga",
            info: "/usr/share/sounds/freedesktop/stereo/bell.oga",
            warning: "/usr/share/sounds/freedesktop/stereo/dialog-warning.oga",
          };

          const soundPath = soundMap[soundType] || soundMap.info;
          if (fs.existsSync(soundPath)) {
            await execAsync(`paplay "${soundPath}"`);
          } else {
            // 降级到简单的 beep
            await execAsync(`beep`);
          }
        } catch {
          // 如果 paplay 不可用，尝试使用 aplay
          try {
            await execAsync(`aplay /usr/share/sounds/alsa/Front_Left.wav`);
          } catch {
            // 最后尝试 beep
            await execAsync(`beep`);
          }
        }
      }
    } catch (error) {
      console.warn("System sound playback failed:", error);
      // 静默失败
    }
  }
}

