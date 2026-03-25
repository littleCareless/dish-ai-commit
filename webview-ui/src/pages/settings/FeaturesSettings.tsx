import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectOption } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { postMessage } from "@/utils/vscode";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import { Code, GitCommit, Shield, Zap } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { routes } from "@/router/routes";

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
  const navigate = useNavigate();
  const hasLoadedRef = useRef(false);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [quickActionMessage, setQuickActionMessage] = useState<string>("");
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
      largePromptAction: "useFallback",
      branchNamePostAction: "createAndCopy",
      branchNameSelectionMode: "autoFirst",
      branchCreationFailureAction: "copyOnly",
      enableEmoji: true,
      enableMergeCommit: false,
      enableBody: true,
      enableLayeredCommit: false,
      enableGlobalContext: true,
      useRecentCommitsAsReference: false,
      enableThirdPartyModelCatalog: true,
      enableAdaptiveInputLimitLearning: true,
      diffTruncationStrategy: "semantic",
      maxInputTokensPerRequest: 0,
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
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (
        message.command === ExtensionResponse.FeaturesSettingsLoaded &&
        message.data
      ) {
        setFeatures((prev: any) => {
          const merged = { ...prev, ...message.data };
          sessionStorage.setItem(
            "featuresSettingsCache",
            JSON.stringify(merged),
          );
          return merged;
        });
      }
      if (message.command === ExtensionResponse.FeaturesCommandExecuted) {
        const action = String(message.data?.action ?? "");
        const actionLabel = t(`quickActions.actions.${action}`);
        setExecutingAction(null);
        if (message.data?.success) {
          setQuickActionMessage(
            t("quickActions.result.success", { action: actionLabel }),
          );
        } else {
          setQuickActionMessage(
            t("quickActions.result.failed", {
              action: actionLabel,
              error: message.data?.error || "unknown",
            }),
          );
        }
      }
    };

    window.addEventListener("message", handleMessage);
    postMessage(UIRequest.FeaturesLoadSettings);
    return () => {
      window.removeEventListener("message", handleMessage);
      hasLoadedRef.current = false;
    };
  }, [t]);

  const handleFeatureToggle = (
    feature: keyof typeof features,
    value: string | boolean | number,
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

  const handleMaxInputTokensChange = (value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      handleFeatureToggle("maxInputTokensPerRequest", 0);
      return;
    }
    handleFeatureToggle("maxInputTokensPerRequest", Math.floor(parsed));
  };

  const handleExecuteCommand = (action: string) => {
    setExecutingAction(action);
    setQuickActionMessage(
      t("quickActions.result.running", {
        action: t(`quickActions.actions.${action}`),
      }),
    );
    postMessage(
      UIRequest.FeaturesExecuteCommand,
      { action, source: "settings-features" },
      { allowDuplicate: true },
    );
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
            <div className="flex items-center justify-between py-2">
              <div className="flex flex-col">
                <Label htmlFor="branch-name-post-action">
                  {t("commitMessageGeneration.branchNamePostAction.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "commitMessageGeneration.branchNamePostAction.description",
                  )}
                </p>
              </div>
              <Select
                value={features.branchNamePostAction}
                onValueChange={(value) =>
                  handleFeatureToggle("branchNamePostAction", value)
                }
                className="w-56"
              >
                <SelectOption value="createAndCopy">
                  {t(
                    "commitMessageGeneration.branchNamePostAction.options.createAndCopy",
                  )}
                </SelectOption>
                <SelectOption value="copyOnly">
                  {t(
                    "commitMessageGeneration.branchNamePostAction.options.copyOnly",
                  )}
                </SelectOption>
                <SelectOption value="ask">
                  {t(
                    "commitMessageGeneration.branchNamePostAction.options.ask",
                  )}
                </SelectOption>
              </Select>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex flex-col">
                <Label htmlFor="branch-name-selection-mode">
                  {t("commitMessageGeneration.branchNameSelectionMode.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "commitMessageGeneration.branchNameSelectionMode.description",
                  )}
                </p>
              </div>
              <Select
                value={features.branchNameSelectionMode}
                onValueChange={(value) =>
                  handleFeatureToggle("branchNameSelectionMode", value)
                }
                className="w-56"
              >
                <SelectOption value="autoFirst">
                  {t(
                    "commitMessageGeneration.branchNameSelectionMode.options.autoFirst",
                  )}
                </SelectOption>
                <SelectOption value="quickPick">
                  {t(
                    "commitMessageGeneration.branchNameSelectionMode.options.quickPick",
                  )}
                </SelectOption>
              </Select>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex flex-col">
                <Label htmlFor="branch-creation-failure-action">
                  {t(
                    "commitMessageGeneration.branchCreationFailureAction.label",
                  )}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "commitMessageGeneration.branchCreationFailureAction.description",
                  )}
                </p>
              </div>
              <Select
                value={features.branchCreationFailureAction}
                onValueChange={(value) =>
                  handleFeatureToggle("branchCreationFailureAction", value)
                }
                className="w-56"
              >
                <SelectOption value="copyOnly">
                  {t(
                    "commitMessageGeneration.branchCreationFailureAction.options.copyOnly",
                  )}
                </SelectOption>
                <SelectOption value="ask">
                  {t(
                    "commitMessageGeneration.branchCreationFailureAction.options.ask",
                  )}
                </SelectOption>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Context Guard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {t("contextGuard.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 divide-y">
            <FeatureSwitch
              id="enable-third-party-model-catalog"
              label={t("contextGuard.enableThirdPartyModelCatalog.label")}
              description={t(
                "contextGuard.enableThirdPartyModelCatalog.description",
              )}
              checked={features.enableThirdPartyModelCatalog}
              onCheckedChange={(enabled) =>
                handleFeatureToggle("enableThirdPartyModelCatalog", enabled)
              }
            />
            <FeatureSwitch
              id="enable-adaptive-input-limit-learning"
              label={t("contextGuard.enableAdaptiveInputLimitLearning.label")}
              description={t(
                "contextGuard.enableAdaptiveInputLimitLearning.description",
              )}
              checked={features.enableAdaptiveInputLimitLearning}
              onCheckedChange={(enabled) =>
                handleFeatureToggle("enableAdaptiveInputLimitLearning", enabled)
              }
            />
            <div className="flex items-center justify-between py-2">
              <div className="flex flex-col">
                <Label htmlFor="diff-truncation-strategy">
                  {t("contextGuard.diffTruncationStrategy.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("contextGuard.diffTruncationStrategy.description")}
                </p>
              </div>
              <Select
                value={features.diffTruncationStrategy}
                onValueChange={(value) =>
                  handleFeatureToggle("diffTruncationStrategy", value)
                }
                className="w-56"
              >
                <SelectOption value="semantic">
                  {t("contextGuard.diffTruncationStrategy.options.semantic")}
                </SelectOption>
                <SelectOption value="direct">
                  {t("contextGuard.diffTruncationStrategy.options.direct")}
                </SelectOption>
              </Select>
            </div>
            <div className="flex items-center justify-between py-2 gap-4">
              <div className="flex flex-col">
                <Label htmlFor="max-input-tokens-per-request">
                  {t("contextGuard.maxInputTokensPerRequest.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("contextGuard.maxInputTokensPerRequest.description")}
                </p>
              </div>
              <Input
                id="max-input-tokens-per-request"
                type="number"
                min={0}
                step={256}
                className="w-56"
                value={features.maxInputTokensPerRequest ?? 0}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  handleMaxInputTokensChange(event.target.value)
                }
              />
            </div>
            <div className="flex items-center justify-between py-2 gap-4">
              <div className="flex flex-col">
                <Label htmlFor="open-model-registry">
                  {t("contextGuard.modelRegistry.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("contextGuard.modelRegistry.description")}
                </p>
              </div>
              <Button
                onClick={() => navigate(routes.modelRegistry)}
                appearance="secondary"
              >
                {t("contextGuard.modelRegistry.button")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              {t("quickActions.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("quickActions.description")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                "generateCommit",
                "reviewCode",
                "generateBranchName",
                "generatePRSummary",
                "generateWeeklyReport",
              ].map((action) => (
                <Button
                  key={action}
                  appearance="secondary"
                  disabled={executingAction !== null}
                  onClick={() => handleExecuteCommand(action)}
                >
                  {executingAction === action
                    ? t("quickActions.buttonRunning")
                    : t(`quickActions.actions.${action}`)}
                </Button>
              ))}
            </div>
            {quickActionMessage && (
              <p className="text-xs text-muted-foreground">
                {quickActionMessage}
              </p>
            )}
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
