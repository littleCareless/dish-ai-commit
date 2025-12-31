import { PageHeader, PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { routes } from "@/router/routes";
import { Profile } from "@/types/settings";
import { postMessage } from "@/utils/vscode";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileJson,
  Loader2,
  Settings2,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface DetectionResult {
  hasOldConfig: boolean;
  providerCount: number;
  hasPreferences: boolean;
  detectedProviders: string[];
}

interface PreviewResult {
  profile: Profile;
  source: string;
}

export const MigrationPage: React.FC = () => {
  const { t } = useTranslation("migration-page");
  const navigate = useNavigate();
  // const { addMessageListener, removeMessageListener } = useVSCodeContext(); // Removed as it doesn't exist

  const [step, setStep] = useState<
    "detecting" | "preview" | "migrating" | "success" | "no-config"
  >("detecting");
  const [detectionResult, setDetectionResult] =
    useState<DetectionResult | null>(null);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === ExtensionResponse.ProfileSettingsMigrated) {
        if (message.error) {
          setError(message.error);
          setStep("detecting"); // Or error state
          return;
        }

        const { detectResult, previewResult, success } = message.payload;

        if (detectResult) {
          setDetectionResult(detectResult);
          if (detectResult.hasOldConfig) {
            // Auto-fetch preview if config detected
            postMessage(UIRequest.ProfileMigrateSettings, { preview: true });
          } else {
            setStep("no-config");
          }
        } else if (previewResult) {
          setPreviewResult(previewResult);
          setStep("preview");
        } else if (success) {
          setStep("success");
        }
      }
    };

    window.addEventListener("message", handleMessage);

    // Start detection
    postMessage(UIRequest.ProfileMigrateSettings, { detectOnly: true });

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const handleMigrate = () => {
    setStep("migrating");
    postMessage(UIRequest.ProfileMigrateSettings, { execute: true });
  };

  const handleSkip = () => {
    navigate(routes.settings);
  };

  if (step === "no-config") {
    return (
      <PageLayout maxWidth="md" className="flex items-center justify-center">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>{t("noConfig.title")}</CardTitle>
            <CardDescription>{t("noConfig.description")}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={handleSkip}>{t("common.goToSettings")}</Button>
          </CardFooter>
        </Card>
      </PageLayout>
    );
  }

  if (step === "success") {
    return (
      <PageLayout maxWidth="md" className="flex items-center justify-center">
        <Card>
          <CardHeader className="text-center">
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: "hsl(var(--accent))" }}
            >
              <CheckCircle2
                className="h-6 w-6"
                style={{ color: "hsl(var(--accent-foreground))" }}
              />
            </div>
            <CardTitle style={{ color: "hsl(var(--foreground))" }}>
              {t("success.title")}
            </CardTitle>
            <CardDescription style={{ color: "hsl(var(--muted-foreground))" }}>
              {t("success.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>{t("success.manualActivationHint")}</p>
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => navigate(routes.welcome)}>
              {t("common.backToHome")}
            </Button>
            <Button onClick={() => navigate(routes.settings)}>
              {t("common.goToSettings")} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="3xl">
      <PageHeader title={t("page.title")} description={t("page.subtitle")} />

      {error && (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm font-medium">{t("error.title")}</p>
          </div>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              {t("preview.sourceConfig")}
            </CardTitle>
            <CardDescription>{t("preview.sourceDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {t("preview.detectedProviders")}
                </span>
                <span className="text-2xl font-bold">
                  {detectionResult?.providerCount || 0}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {t("preview.details")}
              </p>
              <ScrollArea className="h-[200px] rounded-md border p-4">
                <ul className="space-y-2 text-sm">
                  {detectionResult?.detectedProviders.map((provider) => (
                    <li key={provider} className="flex items-center gap-2">
                      <CheckCircle2
                        className="h-4 w-4"
                        style={{ color: "hsl(var(--success))" }}
                      />
                      <span className="capitalize">{provider}</span>
                    </li>
                  ))}
                  {detectionResult?.hasPreferences && (
                    <li className="flex items-center gap-2">
                      <CheckCircle2
                        className="h-4 w-4"
                        style={{ color: "hsl(var(--success))" }}
                      />
                      <span>{t("preview.userPreferences")}</span>
                    </li>
                  )}
                </ul>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <FileJson className="h-5 w-5" />
              {t("preview.targetProfile")}
            </CardTitle>
            <CardDescription>{t("preview.targetDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-primary/5 p-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  {t("preview.profileName")}
                </p>
                <p className="font-semibold">{previewResult?.profile.name}</p>
              </div>
              <div className="mt-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  {t("preview.providerCount")}
                </p>
                <p className="font-semibold">
                  {Object.keys(previewResult?.profile.providers || {}).length}
                </p>
              </div>
            </div>

            <div
              className="rounded-md p-3 text-xs"
              style={{
                backgroundColor: "hsl(var(--warning) / 0.1)",
                color: "hsl(var(--warning))",
                border: "1px solid hsl(var(--warning) / 0.3)",
              }}
            >
              <p className="font-medium">{t("note.title")}</p>
              <p className="mt-1">{t("note.content")}</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pt-6">
            <Button
              className="w-full"
              size="large"
              onClick={handleMigrate}
              disabled={step === "migrating"}
            >
              {step === "migrating" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.migrating")}
                </>
              ) : (
                t("common.startMigration")
              )}
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleSkip}>
              {t("common.skip")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PageLayout>
  );
};

export default MigrationPage;
