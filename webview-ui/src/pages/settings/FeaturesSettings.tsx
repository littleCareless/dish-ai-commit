import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectOption } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { postMessage } from "@/utils/vscode";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import { Code, GitCommit, Shield, Zap } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [externalChanges, setExternalChanges] = useState<string[]>([]);
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyFields = useRef<Set<string>>(new Set());
  const [dirtyCount, setDirtyCount] = useState(0);
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
      enableSemanticGrouping: false,
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

  // Ref to track mounted state for safe async callbacks
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
          const { syncResult: _syncResult, ...restData } = message.data;
          const merged = { ...prev, ...restData };
          sessionStorage.setItem(
            "featuresSettingsCache",
            JSON.stringify(merged),
          );
          return merged;
        });
        // Clear dirty state after backend confirms save
        dirtyFields.current.clear();
        setDirtyCount(0);

        // Show save status notification if syncResult is present
        if (message.data.syncResult) {
          const { synced } = message.data.syncResult;
          // Use functional update to read latest syncEnabled
          setSyncEnabled((currentSyncEnabled: boolean) => {
            if (currentSyncEnabled && synced > 0) {
              setSaveStatus(t("saveStatus.savedWithSync", { count: synced }));
            } else {
              setSaveStatus(t("saveStatus.saved"));
            }
            return currentSyncEnabled;
          });
          // Auto-dismiss after 3 seconds
          if (saveStatusTimerRef.current) {
            clearTimeout(saveStatusTimerRef.current);
          }
          saveStatusTimerRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setSaveStatus(null);
            }
            saveStatusTimerRef.current = null;
          }, 3000);
        }
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
      if (message.command === ExtensionResponse.SyncToggleStateLoaded) {
        setSyncEnabled(Boolean(message.data?.enabled));
      }
      if (message.command === ExtensionResponse.ExternalConfigChanged) {
        const changedKeys: string[] = message.data?.changedKeys ?? [];
        if (changedKeys.length > 0) {
          setExternalChanges(changedKeys);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    postMessage(UIRequest.FeaturesLoadSettings);
    postMessage(UIRequest.GetSyncToggleState);
    return () => {
      window.removeEventListener("message", handleMessage);
      hasLoadedRef.current = false;
      if (saveStatusTimerRef.current) {
        clearTimeout(saveStatusTimerRef.current);
        saveStatusTimerRef.current = null;
      }
    };
  }, [t]);

  const handleChange = useCallback(
    (field: string, value: string | boolean | number) => {
      dirtyFields.current.add(field);
      setDirtyCount(dirtyFields.current.size);
      setFeatures((prev: any) => ({ ...prev, [field]: value }));
    },
    // setDirtyCount and setFeatures are stable React setState functions
    // dirtyFields is a ref (stable identity)
    [],
  );

  const handleSyncToggle = useCallback(() => {
    const newState = !syncEnabled;
    setSyncEnabled(newState);
    postMessage(UIRequest.SetSyncToggleState, { enabled: newState });
  }, [syncEnabled]);

  const handleMaxInputTokensChange = useCallback(
    (value: string) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) {
        handleChange("maxInputTokensPerRequest", 0);
        return;
      }
      handleChange("maxInputTokensPerRequest", Math.floor(parsed));
    },
    [handleChange],
  );

  const handleSave = useCallback(() => {
    const dirtyKeys = Array.from(dirtyFields.current);
    postMessage(UIRequest.FeaturesSaveSettings, {
      ...features,
      dirtyKeys,
    });
    // Dirty state cleared in handleMessage after backend confirmation
  }, [features]);

  const handleRefreshExternalChanges = useCallback(() => {
    setExternalChanges([]);
    postMessage(UIRequest.FeaturesLoadSettings);
  }, []);

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

      {dirtyCount > 0 && (
        <div className="flex items-center gap-3 sticky top-0 z-10 bg-background/95 backdrop-blur py-2 px-3 rounded-md border">
          <span className="text-sm text-muted-foreground">
            {t("unsavedChanges", { count: dirtyCount })}
          </span>
          <Button onClick={handleSave}>
            {t("saveChanges", { count: dirtyCount })}
          </Button>
        </div>
      )}

      {saveStatus && (
        <div className="py-2 px-3 rounded-md border bg-green-500/10 border-green-500/30 text-sm text-green-700 dark:text-green-400">
          {saveStatus}
        </div>
      )}

      {externalChanges.length > 0 && (
        <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-md border bg-yellow-500/10 border-yellow-500/30">
          <span className="text-sm text-yellow-700 dark:text-yellow-400">
            {t("externalChanges.banner")}
          </span>
          <Button onClick={handleRefreshExternalChanges} appearance="secondary">
            {t("externalChanges.refreshButton")}
          </Button>
        </div>
      )}

      {/* Sync Toggle Banner */}
      <div className="flex items-center justify-between py-2 px-3 rounded-md border bg-muted/30">
        <div className="flex flex-col">
          <Label htmlFor="sync-toggle">
            {t("syncToggle.label", {
              defaultValue: "Sync feature config to settings.json",
            })}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("syncToggle.description", {
              defaultValue:
                "When enabled, feature settings are written to VS Code settings.json for external access",
            })}
          </p>
        </div>
        <Switch checked={syncEnabled} onCheckedChange={handleSyncToggle} />
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
                handleChange("enableEmoji", enabled)
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
                handleChange("enableMergeCommit", enabled)
              }
            />
            <FeatureSwitch
              id="enable-body"
              label={t("commitMessageGeneration.enableBody.label")}
              description={t("commitMessageGeneration.enableBody.description")}
              checked={features.enableBody}
              onCheckedChange={(enabled) => handleChange("enableBody", enabled)}
            />
            <FeatureSwitch
              id="enable-layered-commit"
              label={t("commitMessageGeneration.enableLayeredCommit.label")}
              description={t(
                "commitMessageGeneration.enableLayeredCommit.description",
              )}
              checked={features.enableLayeredCommit}
              onCheckedChange={(enabled) =>
                handleChange("enableLayeredCommit", enabled)
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
                handleChange("enableGlobalContext", enabled)
              }
            />
            <FeatureSwitch
              id="enable-semantic-grouping"
              label={t("commitMessageGeneration.enableSemanticGrouping.label")}
              description={t(
                "commitMessageGeneration.enableSemanticGrouping.description",
              )}
              checked={features.enableSemanticGrouping}
              onCheckedChange={(enabled) =>
                handleChange("enableSemanticGrouping", enabled)
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
                handleChange("useRecentCommitsAsReference", enabled)
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
                  handleChange("largePromptAction", value)
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
                  handleChange("branchNamePostAction", value)
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
                  handleChange("branchNameSelectionMode", value)
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
                  handleChange("branchCreationFailureAction", value)
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
                handleChange("enableThirdPartyModelCatalog", enabled)
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
                handleChange("enableAdaptiveInputLimitLearning", enabled)
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
                  handleChange("diffTruncationStrategy", value)
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
                handleChange("simplifyDiff", enabled)
              }
            />
            <FeatureSwitch
              id="auto-detect-staged"
              label={t("codeAnalysis.autoDetectStaged.label")}
              description={t("codeAnalysis.autoDetectStaged.description")}
              checked={features.autoDetectStaged}
              onCheckedChange={(enabled) =>
                handleChange("autoDetectStaged", enabled)
              }
            />
            <FeatureSwitch
              id="fallback-to-all"
              label={t("codeAnalysis.fallbackToAll.label")}
              description={t("codeAnalysis.fallbackToAll.description")}
              checked={features.fallbackToAll}
              onCheckedChange={(enabled) =>
                handleChange("fallbackToAll", enabled)
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
