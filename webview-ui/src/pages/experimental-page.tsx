import { PageHeader, PageLayout } from "@/components/layout/PageLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useVSCodeMessage } from "@/hooks/use-vscode-message";
import { routes } from "@/router/routes";
import { postMessage } from "@/utils/vscode";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import {
  AlertTriangle,
  Database,
  FlaskConical,
  LayoutPanelLeft,
  SlidersHorizontal,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface FeatureSettings {
  largePromptAction: "ask" | "useFallback" | "continue";
  enableLayeredCommit: boolean;
  useRecentCommitsAsReference: boolean;
  simplifyDiff: boolean;
  enableMergeCommit: boolean;
  diffTarget: "staged" | "all" | "auto";
  branchNamePostAction: "ask" | "createAndCopy" | "copyOnly";
  branchNameSelectionMode: "autoFirst" | "quickPick";
  branchCreationFailureAction: "ask" | "copyOnly";
  suppressNonCriticalWarnings: boolean;
  weeklyReport: boolean;
  codeReview: boolean;
  generateBranchName: boolean;
  generatePRSummary: boolean;
}

const DEFAULT_SETTINGS: FeatureSettings = {
  largePromptAction: "useFallback",
  enableLayeredCommit: false,
  useRecentCommitsAsReference: false,
  simplifyDiff: false,
  enableMergeCommit: false,
  diffTarget: "auto",
  branchNamePostAction: "createAndCopy",
  branchNameSelectionMode: "autoFirst",
  branchCreationFailureAction: "copyOnly",
  suppressNonCriticalWarnings: true,
  weeklyReport: true,
  codeReview: true,
  generateBranchName: true,
  generatePRSummary: true,
};

const SAFE_PRESET: FeatureSettings = {
  largePromptAction: "ask",
  enableLayeredCommit: false,
  useRecentCommitsAsReference: false,
  simplifyDiff: false,
  enableMergeCommit: false,
  diffTarget: "staged",
  branchNamePostAction: "ask",
  branchNameSelectionMode: "quickPick",
  branchCreationFailureAction: "ask",
  suppressNonCriticalWarnings: false,
  weeklyReport: true,
  codeReview: true,
  generateBranchName: true,
  generatePRSummary: true,
};

const BALANCED_PRESET: FeatureSettings = {
  largePromptAction: "useFallback",
  enableLayeredCommit: false,
  useRecentCommitsAsReference: false,
  simplifyDiff: false,
  enableMergeCommit: false,
  diffTarget: "auto",
  branchNamePostAction: "createAndCopy",
  branchNameSelectionMode: "autoFirst",
  branchCreationFailureAction: "copyOnly",
  suppressNonCriticalWarnings: true,
  weeklyReport: true,
  codeReview: true,
  generateBranchName: true,
  generatePRSummary: true,
};

const AGGRESSIVE_PRESET: FeatureSettings = {
  largePromptAction: "continue",
  enableLayeredCommit: true,
  useRecentCommitsAsReference: true,
  simplifyDiff: true,
  enableMergeCommit: true,
  diffTarget: "all",
  branchNamePostAction: "createAndCopy",
  branchNameSelectionMode: "autoFirst",
  branchCreationFailureAction: "copyOnly",
  suppressNonCriticalWarnings: true,
  weeklyReport: true,
  codeReview: true,
  generateBranchName: true,
  generatePRSummary: true,
};

type PresetId = "safe" | "balanced" | "aggressive" | "custom";
type AutomationPresetId = "guided" | "semiAuto" | "auto";
type CapabilityPresetId = "reviewOnly" | "full" | "minimal";
type SavingPresetId = PresetId | AutomationPresetId | CapabilityPresetId;

const isSamePreset = (a: FeatureSettings, b: FeatureSettings) =>
  a.largePromptAction === b.largePromptAction &&
  a.enableLayeredCommit === b.enableLayeredCommit &&
  a.useRecentCommitsAsReference === b.useRecentCommitsAsReference &&
  a.simplifyDiff === b.simplifyDiff &&
  a.enableMergeCommit === b.enableMergeCommit &&
  a.diffTarget === b.diffTarget &&
  a.branchNamePostAction === b.branchNamePostAction &&
  a.branchNameSelectionMode === b.branchNameSelectionMode &&
  a.branchCreationFailureAction === b.branchCreationFailureAction &&
  a.suppressNonCriticalWarnings === b.suppressNonCriticalWarnings &&
  a.weeklyReport === b.weeklyReport &&
  a.codeReview === b.codeReview &&
  a.generateBranchName === b.generateBranchName &&
  a.generatePRSummary === b.generatePRSummary;

export const ExperimentalPage: React.FC = () => {
  const { t } = useTranslation("experimental-page");
  const navigate = useNavigate();
  const [settings, setSettings] = useState<FeatureSettings>(DEFAULT_SETTINGS);
  const [savingPreset, setSavingPreset] = useState<SavingPresetId | null>(null);

  useEffect(() => {
    postMessage(UIRequest.FeaturesLoadSettings);
  }, []);

  useVSCodeMessage(
    ExtensionResponse.FeaturesSettingsLoaded,
    (payload: { data?: Partial<FeatureSettings> }) => {
      setSavingPreset(null);
      setSettings({ ...DEFAULT_SETTINGS, ...(payload.data || {}) });
    },
  );

  useVSCodeMessage(ExtensionResponse.Error, () => {
    setSavingPreset(null);
  });

  const currentPreset = useMemo<PresetId>(() => {
    if (isSamePreset(settings, SAFE_PRESET)) return "safe";
    if (isSamePreset(settings, BALANCED_PRESET)) return "balanced";
    if (isSamePreset(settings, AGGRESSIVE_PRESET)) return "aggressive";
    return "custom";
  }, [settings]);

  const applyPreset = (presetId: Exclude<PresetId, "custom">) => {
    const map = {
      safe: SAFE_PRESET,
      balanced: BALANCED_PRESET,
      aggressive: AGGRESSIVE_PRESET,
    } as const;
    const nextSettings = map[presetId];
    setSavingPreset(presetId);
    postMessage(UIRequest.FeaturesSaveSettings, nextSettings);
  };

  const applyPartialPreset = (
    presetId: AutomationPresetId | CapabilityPresetId,
    patch: Partial<FeatureSettings>,
  ) => {
    setSavingPreset(presetId);
    postMessage(UIRequest.FeaturesSaveSettings, { ...settings, ...patch });
  };

  return (
    <PageLayout maxWidth="4xl">
      <PageHeader title={t("title")} description={t("description")} />

      <Alert>
        <FlaskConical className="h-4 w-4" />
        <AlertTitle>{t("notice.title")}</AlertTitle>
        <AlertDescription>{t("notice.description")}</AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="h-4 w-4" />
            {t("current.title")}
          </CardTitle>
          <CardDescription>{t("current.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3 flex-wrap">
          <Badge
            variant={currentPreset === "custom" ? "destructive" : "secondary"}
          >
            {t(`preset.${currentPreset}`)}
          </Badge>
          <Button
            appearance="secondary"
            onClick={() => {
              navigate("/settings?tab=features");
            }}
          >
            {t("actions.openFeatures")}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {(["safe", "balanced", "aggressive"] as const).map((preset) => (
          <Card key={preset}>
            <CardHeader>
              <CardTitle className="text-base">
                {t(`preset.${preset}`)}
              </CardTitle>
              <CardDescription>{t(`presetDesc.${preset}`)}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => applyPreset(preset)}
                disabled={savingPreset !== null}
              >
                {savingPreset === preset
                  ? t("actions.applying")
                  : t("actions.apply")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("automation.title")}</CardTitle>
          <CardDescription>{t("automation.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Button
            appearance="secondary"
            disabled={savingPreset !== null}
            onClick={() =>
              applyPartialPreset("guided", {
                branchNamePostAction: "ask",
                branchNameSelectionMode: "quickPick",
                branchCreationFailureAction: "ask",
                suppressNonCriticalWarnings: false,
              })
            }
          >
            {t("automation.guided")}
          </Button>
          <Button
            appearance="secondary"
            disabled={savingPreset !== null}
            onClick={() =>
              applyPartialPreset("semiAuto", {
                branchNamePostAction: "copyOnly",
                branchNameSelectionMode: "quickPick",
                branchCreationFailureAction: "copyOnly",
                suppressNonCriticalWarnings: true,
              })
            }
          >
            {t("automation.semiAuto")}
          </Button>
          <Button
            appearance="secondary"
            disabled={savingPreset !== null}
            onClick={() =>
              applyPartialPreset("auto", {
                branchNamePostAction: "createAndCopy",
                branchNameSelectionMode: "autoFirst",
                branchCreationFailureAction: "copyOnly",
                suppressNonCriticalWarnings: true,
              })
            }
          >
            {t("automation.auto")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("capability.title")}</CardTitle>
          <CardDescription>{t("capability.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Button
            appearance="secondary"
            disabled={savingPreset !== null}
            onClick={() =>
              applyPartialPreset("reviewOnly", {
                weeklyReport: false,
                codeReview: true,
                generateBranchName: false,
                generatePRSummary: false,
              })
            }
          >
            {t("capability.reviewOnly")}
          </Button>
          <Button
            appearance="secondary"
            disabled={savingPreset !== null}
            onClick={() =>
              applyPartialPreset("full", {
                weeklyReport: true,
                codeReview: true,
                generateBranchName: true,
                generatePRSummary: true,
              })
            }
          >
            {t("capability.full")}
          </Button>
          <Button
            appearance="secondary"
            disabled={savingPreset !== null}
            onClick={() =>
              applyPartialPreset("minimal", {
                weeklyReport: false,
                codeReview: false,
                generateBranchName: true,
                generatePRSummary: false,
              })
            }
          >
            {t("capability.minimal")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutPanelLeft className="h-4 w-4" />
            {t("quickNav.title")}
          </CardTitle>
          <CardDescription>{t("quickNav.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Button
            appearance="secondary"
            onClick={() => {
              navigate(routes.context);
            }}
          >
            {t("quickNav.context")}
          </Button>
          <Button
            appearance="secondary"
            onClick={() => {
              navigate(routes.indexing);
            }}
          >
            <Database className="h-4 w-4 mr-1" />
            {t("quickNav.indexing")}
          </Button>
          <Button
            appearance="secondary"
            onClick={() => {
              navigate(routes.usage);
            }}
          >
            {t("quickNav.usage")}
          </Button>
          <Button
            appearance="secondary"
            onClick={() => {
              navigate(routes.prompts);
            }}
          >
            {t("quickNav.prompts")}
          </Button>
        </CardContent>
      </Card>

      <Alert variant="default">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("footer.title")}</AlertTitle>
        <AlertDescription>{t("footer.description")}</AlertDescription>
      </Alert>
    </PageLayout>
  );
};
