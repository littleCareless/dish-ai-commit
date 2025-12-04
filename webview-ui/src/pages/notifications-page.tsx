import { PageHeader, PageLayout } from "@/components/layout/PageLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { postMessage, useMessageHandler } from "@/utils/vscode";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
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
    postMessage(UIRequest.NotificationGetSettings, {});
  };

  // 加载设置
  useEffect(() => {
    loadSettings();
    postMessage(UIRequest.SystemGetOS, {});
  }, []);

  // 处理来自后端的消息
  useMessageHandler((event: MessageEvent) => {
    const { command, data } = event.data;

    if (command === ExtensionResponse.NotificationSettingsLoaded) {
      if (data.success) {
        setSettings({
          textToSpeech: data.settings?.textToSpeech ?? false,
          soundNotifications: data.settings?.soundNotifications ?? false,
          systemNotifications: data.settings?.systemNotifications ?? false,
        });
      }
    } else if (command === ExtensionResponse.SystemOSInfoLoaded) {
      setOs(data.os);
    } else if (command === ExtensionResponse.NotificationSettingsUpdated) {
      if (!data.success) {
        console.error("Failed to save notification settings:", data.error);
      }
    }
  });

  const saveSettings = (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    postMessage(UIRequest.NotificationUpdateSettings, {
      settings: newSettings,
    });
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

  return (
    <PageLayout maxWidth="3xl">
      <PageHeader title={t("title")} description={t("description")} />

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
              <div>
                <div className="font-medium">
                  {t("textToSpeech.enableLabel")}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {t("textToSpeech.enableDescription")}
                </div>
              </div>
              <VSCodeCheckbox
                checked={settings.textToSpeech}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleTextToSpeechChange(
                    (e.target as HTMLInputElement).checked,
                  )
                }
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
              <div>
                <div className="font-medium">
                  {t("soundNotifications.enableLabel")}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {t("soundNotifications.enableDescription")}
                </div>
              </div>
              <VSCodeCheckbox
                checked={settings.soundNotifications}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleSoundNotificationsChange(
                    (e.target as HTMLInputElement).checked,
                  )
                }
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
              <Alert className="mb-4">
                <AlertTitle>
                  <Info className="h-4 w-4" />
                  {t("systemNotifications.macOsAlertTitle")}
                </AlertTitle>
                <AlertDescription>
                  <Trans
                    i18nKey="notifications-page:systemNotifications.macOsAlertDescription"
                    components={{
                      code: (
                        <code className="font-mono bg-muted text-muted-foreground p-1 rounded-sm" />
                      ),
                    }}
                  />
                </AlertDescription>
              </Alert>
            )}
            {os === "linux" && (
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertTitle>
                  {t("systemNotifications.linuxAlertTitle")}
                </AlertTitle>
                <AlertDescription>
                  <Trans
                    i18nKey="systemNotifications.linuxAlertDescription"
                    components={{
                      code: (
                        <code className="font-mono bg-muted text-muted-foreground p-1 rounded-sm" />
                      ),
                    }}
                  />
                </AlertDescription>
              </Alert>
            )}
            {os === "win32" && (
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertTitle>
                  {t("systemNotifications.windowsAlertTitle")}
                </AlertTitle>
                <AlertDescription>
                  {t("systemNotifications.windowsAlertDescription")}
                </AlertDescription>
              </Alert>
            )}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">
                  {t("systemNotifications.enableLabel")}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {t("systemNotifications.enableDescription")}
                </div>
              </div>
              <VSCodeCheckbox
                checked={settings.systemNotifications}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleSystemNotificationsChange(
                    (e.target as HTMLInputElement).checked,
                  )
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};
