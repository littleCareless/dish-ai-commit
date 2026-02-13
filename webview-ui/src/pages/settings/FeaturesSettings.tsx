import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectOption } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { postMessage } from "@/utils/vscode";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import { Code, GitCommit } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
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
  const hasLoadedRef = useRef(false);
  const [features, setFeatures] = useState(() => {
    const cached = sessionStorage.getItem("featuresSettingsCache");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        sessionStorage.removeItem("featuresSettingsCache");
      }
    }
    return {
      largePromptAction: "ask",
      enableEmoji: true,
      enableMergeCommit: false,
      enableBody: true,
      enableLayeredCommit: false,
      enableGlobalContext: true,
      useRecentCommitsAsReference: false,
      simplifyDiff: false,
      autoDetectStaged: true,
      fallbackToAll: true,
      diffTarget: "auto",
      suppressNonCriticalWarnings: true,
      weeklyReport: true,
      codeReview: true,
      generateBranchName: true,
      generatePRSummary: true,
    };
  });

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    postMessage(UIRequest.FeaturesLoadSettings);

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (
        message.command === ExtensionResponse.FeaturesSettingsLoaded &&
        message.data
      ) {
        setFeatures(message.data);
        sessionStorage.setItem(
          "featuresSettingsCache",
          JSON.stringify(message.data),
        );
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      hasLoadedRef.current = false;
    };
  }, []);

  const handleFeatureToggle = (
    feature: keyof typeof features,
    value: string | boolean,
  ) => {
    setFeatures((prev: any) => {
      const updated = { ...prev, [feature]: value };
      console.log("[FeaturesSettings] Toggling", feature, "to", value);
      console.log("[FeaturesSettings] Previous state:", prev);
      console.log("[FeaturesSettings] Sending to backend:", updated);
      postMessage(UIRequest.FeaturesSaveSettings, updated);
      return updated;
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
            <div className="flex items-center justify-between py-2">
              <div className="flex flex-col">
                <Label htmlFor="large-prompt-action">
                  {t("commitMessageGeneration.largePromptAction.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("commitMessageGeneration.largePromptAction.description")}
                </p>
              </div>
              <Select
                value={features.largePromptAction}
                onValueChange={(value) =>
                  handleFeatureToggle("largePromptAction", value)
                }
                className="w-56"
              >
                <SelectOption value="ask">
                  {t("commitMessageGeneration.largePromptAction.options.ask")}
                </SelectOption>
                <SelectOption value="useFallback">
                  {t(
                    "commitMessageGeneration.largePromptAction.options.useFallback",
                  )}
                </SelectOption>
                <SelectOption value="continue">
                  {t(
                    "commitMessageGeneration.largePromptAction.options.continue",
                  )}
                </SelectOption>
              </Select>
            </div>
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
      </div>
    </div>
  );
};
