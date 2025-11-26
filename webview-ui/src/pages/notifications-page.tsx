import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { postMessage, useMessageHandler } from "@/utils/vscode";
import { Bell, Info, MessageSquare, Volume2, VolumeX } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

interface NotificationSettings {
  textToSpeech: boolean;
  soundNotifications: boolean;
  systemNotifications: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  textToSpeech: false,
  soundNotifications: false,
  systemNotifications: false,
};

export const NotificationsPage: React.FC = () => {
  const { t, i18n } = useTranslation("notifications-page");
  const [settings, setSettings] =
    useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [os, setOs] = useState<string | null>(null);

  const prevLanguageRef = useRef<string | null>(null);
  const prevTitleRef = useRef<string | null>(null);

  console.log("[NotificationsPage] rendered, i18n.language:", i18n.language);

  useEffect(() => {
    const currentLanguage = i18n.language;
    const currentTitle = t("title");

    console.log("[NotificationsPage] useEffect triggered:", {
      currentLanguage,
      prevLanguage: prevLanguageRef.current,
      currentTitle,
      prevTitle: prevTitleRef.current,
      translationKeys: {
        title: t("title"),
        description: t("description"),
        loading: t("loading"),
      },
    });

    if (currentLanguage !== prevLanguageRef.current) {
      console.log(
        "[NotificationsPage] Language changed from",
        prevLanguageRef.current,
        "to",
        currentLanguage,
      );
      prevLanguageRef.current = currentLanguage;
    }

    if (currentTitle !== prevTitleRef.current) {
      console.log(
        "[NotificationsPage] Title changed from",
        prevTitleRef.current,
        "to",
        currentTitle,
      );
      prevTitleRef.current = currentTitle;
    }
  }, [t, i18n.language]);

  const loadSettings = () => {
    postMessage("getNotificationSettings", {});
  };

  // 加载设置
  useEffect(() => {
    loadSettings();
    postMessage("getOS", {});
  }, []);

  // 处理来自后端的消息
  useMessageHandler((event: MessageEvent) => {
    const { command, data } = event.data;

    if (command === "getNotificationSettingsResponse") {
      if (data.success) {
        setSettings({
          textToSpeech: data.settings?.textToSpeech ?? false,
          soundNotifications: data.settings?.soundNotifications ?? false,
          systemNotifications: data.settings?.systemNotifications ?? false,
        });
      }
      setIsLoading(false);
    } else if (command === "getOSResponse") {
      setOs(data.os);
    } else if (command === "setNotificationSettingsResponse") {
      if (!data.success) {
        console.error("Failed to save notification settings:", data.error);
      }
    }
  });

  const saveSettings = (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    postMessage("setNotificationSettings", { settings: newSettings });
  };

  const handleTextToSpeechChange = (checked: boolean) => {
    saveSettings({ ...settings, textToSpeech: checked });
  };

  const handleSoundNotificationsChange = (checked: boolean) => {
    saveSettings({ ...settings, soundNotifications: checked });
  };

  const handleSystemNotificationsChange = (checked: boolean) => {
    saveSettings({ ...settings, systemNotifications: checked });
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-sm text-muted-foreground">{t("loading")}</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("description")}</p>
      </div>

      <div className="space-y-4">
        {/* 文本转语音 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <CardTitle className="text-lg">
                {t("textToSpeech.title")}
              </CardTitle>
            </div>
            <CardDescription>{t("textToSpeech.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="tts-switch" className="flex-1 cursor-pointer">
                <div className="font-medium">
                  {t("textToSpeech.enableLabel")}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {t("textToSpeech.enableDescription")}
                </div>
              </Label>
              <Switch
                checked={settings.textToSpeech}
                onCheckedChange={handleTextToSpeechChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* 声音通知 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {settings.soundNotifications ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
              <CardTitle className="text-lg">
                {t("soundNotifications.title")}
              </CardTitle>
            </div>
            <CardDescription>
              {t("soundNotifications.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="sound-switch" className="flex-1 cursor-pointer">
                <div className="font-medium">
                  {t("soundNotifications.enableLabel")}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {t("soundNotifications.enableDescription")}
                </div>
              </Label>
              <Switch
                checked={settings.soundNotifications}
                onCheckedChange={handleSoundNotificationsChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* 系统弹窗通知 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <CardTitle className="text-lg">
                {t("systemNotifications.title")}
              </CardTitle>
            </div>
            <CardDescription>
              {t("systemNotifications.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {os === "darwin" && (
              <div className="mb-6 overflow-hidden rounded-md border border-[var(--vscode-widget-border)] bg-[var(--vscode-textBlockQuote-background)]">
                <div className="border-l-4 border-[var(--vscode-textLink-activeForeground)] p-4">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--vscode-textLink-activeForeground)]" />
                    <div className="space-y-2">
                      <h5 className="font-semibold leading-none tracking-tight text-[var(--vscode-foreground)]">
                        {t("systemNotifications.macOsAlertTitle")}
                      </h5>
                      <div className="text-sm leading-relaxed text-[var(--vscode-descriptionForeground)]">
                        <Trans
                          i18nKey="notifications-page:systemNotifications.macOsAlertDescription"
                          components={{
                            code: (
                              <code className="mx-1 inline-block rounded-md bg-[var(--vscode-textCodeBlock-background)] px-1.5 py-0.5 font-mono text-[0.9em] text-[var(--vscode-textPreformat-foreground)] border border-[var(--vscode-widget-border)]" />
                            ),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {os === "linux" && (
              <div className="mb-6 overflow-hidden rounded-md border border-[var(--vscode-widget-border)] bg-[var(--vscode-textBlockQuote-background)]">
                <div className="border-l-4 border-[var(--vscode-textLink-activeForeground)] p-4">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--vscode-textLink-activeForeground)]" />
                    <div className="space-y-2">
                      <h5 className="font-semibold leading-none tracking-tight text-[var(--vscode-foreground)]">
                        {t("systemNotifications.linuxAlertTitle")}
                      </h5>
                      <div className="text-sm leading-relaxed text-[var(--vscode-descriptionForeground)]">
                        <Trans
                          i18nKey="systemNotifications.linuxAlertDescription"
                          components={{
                            code: (
                              <code className="mx-1 inline-block rounded-md bg-[var(--vscode-textCodeBlock-background)] px-1.5 py-0.5 font-mono text-[0.9em] text-[var(--vscode-textPreformat-foreground)] border border-[var(--vscode-widget-border)]" />
                            ),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {os === "win32" && (
              <div className="mb-6 overflow-hidden rounded-md border border-[var(--vscode-widget-border)] bg-[var(--vscode-textBlockQuote-background)]">
                <div className="border-l-4 border-[var(--vscode-textLink-activeForeground)] p-4">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--vscode-textLink-activeForeground)]" />
                    <div className="space-y-2">
                      <h5 className="font-semibold leading-none tracking-tight text-[var(--vscode-foreground)]">
                        {t("systemNotifications.windowsAlertTitle")}
                      </h5>
                      <div className="text-sm leading-relaxed text-[var(--vscode-descriptionForeground)]">
                        {t("systemNotifications.windowsAlertDescription")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label htmlFor="system-switch" className="flex-1 cursor-pointer">
                <div className="font-medium">
                  {t("systemNotifications.enableLabel")}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {t("systemNotifications.enableDescription")}
                </div>
              </Label>
              <Switch
                checked={settings.systemNotifications}
                onCheckedChange={handleSystemNotificationsChange}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
