import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Info, MessageSquare, Volume2, VolumeX } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { postMessage, useMessageHandler } from "@/utils/vscode";

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

  const handleTestSystemNotification = () => {
    postMessage("testSystemNotification", {
      title: t("testNotification.title"),
      message: t("testNotification.message"),
    });
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
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertTitle>
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
            <div className="mt-4 flex items-center gap-4">
              <Button variant="outline" onClick={handleTestSystemNotification}>
                {t("systemNotifications.testButton")}
              </Button>
              {settings.systemNotifications && (
                <p className="text-sm text-muted-foreground">
                  {t("systemNotifications.testDescription")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
