import { ExtensionResponse, UIRequest } from "@/types/messages";
import { NotificationSettingsManager } from "@/utils/notification/notification-settings-manager";
import { showSystemNotification } from "@/utils/notification/system-notification";
import { TextToSpeechService } from "@/utils/notification/text-to-speech";
import * as vscode from "vscode";

export class NotificationMessageHandler {
    public async handle(message: any, webview: vscode.Webview): Promise<void> {
        switch (message.command) {
            case UIRequest.NotificationGetSettings: {
                console.log(
                    "[NotificationMessageHandler] Handling getNotificationSettings"
                );
                try {
                    const settingsManager = NotificationSettingsManager.getInstance();
                    await settingsManager.loadSettings();
                    const settings = settingsManager.getSettings();
                    webview.postMessage({
                        command: ExtensionResponse.NotificationSettingsLoaded,
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
                        command: ExtensionResponse.NotificationSettingsLoaded,
                        data: {
                            success: false,
                            error: errorMessage,
                            settings: null,
                        },
                    });
                }
                break;
            }

            case UIRequest.NotificationUpdateSettings: {
                console.log(
                    "[NotificationMessageHandler] Handling setNotificationSettings"
                );
                try {
                    const { settings } = message.data;
                    const settingsManager = NotificationSettingsManager.getInstance();
                    await settingsManager.saveSettings(settings);

                    // Update TTS service status
                    const ttsService = TextToSpeechService.getInstance();
                    ttsService.setEnabled(settings.textToSpeech);

                    webview.postMessage({
                        command: ExtensionResponse.NotificationSettingsUpdated,
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
                        command: ExtensionResponse.NotificationSettingsUpdated,
                        data: {
                            success: false,
                            error: errorMessage,
                        },
                    });
                }
                break;
            }

            case UIRequest.NotificationTest: {
                console.log(
                    "[NotificationMessageHandler] Handling testSystemNotification"
                );
                try {
                    const { title, message: notificationMessage } = message.data;
                    showSystemNotification(title, notificationMessage);
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

