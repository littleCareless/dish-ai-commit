import * as vscode from "vscode";
import { NotificationSettingsManager } from "@/utils/notification/notification-settings-manager";
import { SoundPlayerService } from "@/utils/notification/sound-player";
import { systemNotifier } from "@/utils/notification/system-notification-service";
import { TextToSpeechService } from "@/utils/notification/text-to-speech";

export class NotificationMessageHandler {
    public async handle(message: any, webview: vscode.Webview): Promise<void> {
        switch (message.command) {
            case "getNotificationSettings": {
                console.log(
                    "[NotificationMessageHandler] Handling getNotificationSettings"
                );
                try {
                    const settingsManager = NotificationSettingsManager.getInstance();
                    await settingsManager.loadSettings();
                    const settings = settingsManager.getSettings();
                    webview.postMessage({
                        command: "getNotificationSettingsResponse",
                        data: {
                            success: true,
                            settings,
                        },
                    });
                } catch (error) {
                    console.error(
                        "[NotificationMessageHandler] Error in getNotificationSettings:",
                        error
                    );
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    webview.postMessage({
                        command: "getNotificationSettingsResponse",
                        data: {
                            success: false,
                            error: errorMessage,
                            settings: null,
                        },
                    });
                }
                break;
            }

            case "setNotificationSettings": {
                console.log(
                    "[NotificationMessageHandler] Handling setNotificationSettings"
                );
                try {
                    const { settings } = message.data;
                    const settingsManager = NotificationSettingsManager.getInstance();
                    await settingsManager.saveSettings(settings);

                    // Update TTS and Sound service status
                    const ttsService = TextToSpeechService.getInstance();
                    ttsService.setEnabled(settings.textToSpeech);

                    const soundService = SoundPlayerService.getInstance();
                    soundService.setEnabled(settings.soundNotifications);

                    webview.postMessage({
                        command: "setNotificationSettingsResponse",
                        data: {
                            success: true,
                        },
                    });
                } catch (error) {
                    console.error(
                        "[NotificationMessageHandler] Error in setNotificationSettings:",
                        error
                    );
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    webview.postMessage({
                        command: "setNotificationSettingsResponse",
                        data: {
                            success: false,
                            error: errorMessage,
                        },
                    });
                }
                break;
            }

            case "testSystemNotification": {
                console.log(
                    "[NotificationMessageHandler] Handling testSystemNotification"
                );
                try {
                    const { title, message: notificationMessage } = message.data;
                    systemNotifier.notify({ title, message: notificationMessage });
                } catch (error) {
                    console.error(
                        "[NotificationMessageHandler] Error in testSystemNotification:",
                        error
                    );
                }
                break;
            }
        }
    }
}
