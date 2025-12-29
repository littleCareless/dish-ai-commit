import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { postMessage } from "@/utils/vscode";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import {
  BarChart3,
  ClipboardCheck,
  Code,
  GitBranch,
  GitCommit,
  GitPullRequest,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface FeatureSwitchProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (enabled: boolean) => void;
  icon?: React.ReactNode;
}

const FeatureSwitch: React.FC<FeatureSwitchProps> = ({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  icon,
}) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-3">
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <div className="flex flex-col">
        <Label htmlFor={id}>{label}</Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

export const FeaturesSettings: React.FC = () => {
  const { t } = useTranslation("features-settings");
  const [features, setFeatures] = useState({
    // Commit Message Generation
    enableEmoji: true,
    enableMergeCommit: false,
    enableBody: true,
    enableLayeredCommit: false,
    enableGlobalContext: true,
    useRecentCommitsAsReference: false,

    // Code Analysis
    simplifyDiff: false,
    autoDetectStaged: true,
    fallbackToAll: true,

    // Other Features
    weeklyReport: true,
    codeReview: true,
    generateBranchName: true,
    generatePRSummary: true,
  });

  // Load settings from backend on mount
  useEffect(() => {
    postMessage(UIRequest.FeaturesLoadSettings);

    // Listen for settings updates from backend
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (
        message.command === ExtensionResponse.FeaturesSettingsLoaded &&
        message.settings
      ) {
        setFeatures(message.settings);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleFeatureToggle = (
    feature: keyof typeof features,
    enabled: boolean,
  ) => {
    // Update local state immediately for responsive UI
    setFeatures((prev) => ({
      ...prev,
      [feature]: enabled,
    }));

    // Save to backend
    postMessage(UIRequest.FeaturesSaveSettings, {
      ...features,
      [feature]: enabled,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">{t("title")}</h2>
        <p className="text-muted-foreground mb-4">{t("description")}</p>
      </div>

      <div className="grid gap-4">
        {/* Commit Message Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCommit className="w-5 h-5" />
              {t("commitMessageGeneration.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 divide-y">
            <FeatureSwitch
              id="enable-emoji"
              label={t("commitMessageGeneration.enableEmoji.label")}
              description={t("commitMessageGeneration.enableEmoji.description")}
              checked={features.enableEmoji}
              onCheckedChange={(enabled) =>
                handleFeatureToggle("enableEmoji", enabled)
              }
            />
            <FeatureSwitch
              id="enable-merge-commit"
              label={t("commitMessageGeneration.enableMergeCommit.label")}
              description={t(
                "commitMessageGeneration.enableMergeCommit.description",
              )}
              checked={features.enableMergeCommit}
              onCheckedChange={(enabled) =>
                handleFeatureToggle("enableMergeCommit", enabled)
              }
            />
            <FeatureSwitch
              id="enable-body"
              label={t("commitMessageGeneration.enableBody.label")}
              description={t("commitMessageGeneration.enableBody.description")}
              checked={features.enableBody}
              onCheckedChange={(enabled) =>
                handleFeatureToggle("enableBody", enabled)
              }
            />
            <FeatureSwitch
              id="enable-layered-commit"
              label={t("commitMessageGeneration.enableLayeredCommit.label")}
              description={t(
                "commitMessageGeneration.enableLayeredCommit.description",
              )}
              checked={features.enableLayeredCommit}
              onCheckedChange={(enabled) =>
                handleFeatureToggle("enableLayeredCommit", enabled)
              }
            />
            <FeatureSwitch
              id="enable-global-context"
              label={t("commitMessageGeneration.enableGlobalContext.label")}
              description={t(
                "commitMessageGeneration.enableGlobalContext.description",
              )}
              checked={features.enableGlobalContext}
              onCheckedChange={(enabled) =>
                handleFeatureToggle("enableGlobalContext", enabled)
              }
            />
            <FeatureSwitch
              id="use-recent-commits"
              label={t(
                "commitMessageGeneration.useRecentCommitsAsReference.label",
              )}
              description={t(
                "commitMessageGeneration.useRecentCommitsAsReference.description",
              )}
              checked={features.useRecentCommitsAsReference}
              onCheckedChange={(enabled) =>
                handleFeatureToggle("useRecentCommitsAsReference", enabled)
              }
            />
          </CardContent>
        </Card>

        {/* Code Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              {t("codeAnalysis.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 divide-y">
            <FeatureSwitch
              id="simplify-diff"
              label={t("codeAnalysis.simplifyDiff.label")}
              description={t("codeAnalysis.simplifyDiff.description")}
              checked={features.simplifyDiff}
              onCheckedChange={(enabled) =>
                handleFeatureToggle("simplifyDiff", enabled)
              }
            />
            <FeatureSwitch
              id="auto-detect-staged"
              label={t("codeAnalysis.autoDetectStaged.label")}
              description={t("codeAnalysis.autoDetectStaged.description")}
              checked={features.autoDetectStaged}
              onCheckedChange={(enabled) =>
                handleFeatureToggle("autoDetectStaged", enabled)
              }
            />
            <FeatureSwitch
              id="fallback-to-all"
              label={t("codeAnalysis.fallbackToAll.label")}
              description={t("codeAnalysis.fallbackToAll.description")}
              checked={features.fallbackToAll}
              onCheckedChange={(enabled) =>
                handleFeatureToggle("fallbackToAll", enabled)
              }
            />
          </CardContent>
        </Card>

        {/* Other Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t("otherFeatures.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 divide-y">
            <FeatureSwitch
              id="weekly-report"
              label={t("otherFeatures.weeklyReport.label")}
              description={t("otherFeatures.weeklyReport.description")}
              checked={features.weeklyReport}
              onCheckedChange={(enabled) =>
                handleFeatureToggle("weeklyReport", enabled)
              }
              icon={<BarChart3 className="w-5 h-5" />}
            />
            <FeatureSwitch
              id="code-review"
              label={t("otherFeatures.codeReview.label")}
              description={t("otherFeatures.codeReview.description")}
              checked={features.codeReview}
              onCheckedChange={(enabled) =>
                handleFeatureToggle("codeReview", enabled)
              }
              icon={<ClipboardCheck className="w-5 h-5" />}
            />
            <FeatureSwitch
              id="generate-branch-name"
              label={t("otherFeatures.generateBranchName.label")}
              description={t("otherFeatures.generateBranchName.description")}
              checked={features.generateBranchName}
              onCheckedChange={(enabled) =>
                handleFeatureToggle("generateBranchName", enabled)
              }
              icon={<GitBranch className="w-5 h-5" />}
            />
            <FeatureSwitch
              id="generate-pr-summary"
              label={t("otherFeatures.generatePRSummary.label")}
              description={t("otherFeatures.generatePRSummary.description")}
              checked={features.generatePRSummary}
              onCheckedChange={(enabled) =>
                handleFeatureToggle("generatePRSummary", enabled)
              }
              icon={<GitPullRequest className="w-5 h-5" />}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
