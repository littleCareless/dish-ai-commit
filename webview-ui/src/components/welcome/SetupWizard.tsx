import { ProviderConfigForm } from "@/components/settings/ProviderConfigForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectionStatusIndicator } from "@/components/welcome/ConnectionStatusIndicator";
import { SelectionCard, TemplateGrid } from "@/components/welcome/TemplateCard";
import { providerRegistry } from "@/config/provider-registry";
import { useOnboarding, type QuickStartTemplate } from "@/hooks/useOnboarding";
import {
  ExtendedProviderConfig,
  ProviderMetadata,
} from "@/types/provider-metadata";
import { getFieldDefaultValue } from "@/utils/validation-helpers";
import { postMessage } from "@/utils/vscode";
import { UIRequest } from "@shared/types/messages";
import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Server,
  Upload,
  Wifi,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface SetupWizardProps {
  initialConfig?: Record<string, unknown>;
  currentApiConfigName?: string;
  onComplete?: () => void;
  isFirstInstall?: boolean;
}

type StepStatus = "pending" | "current" | "completed";

interface Step {
  id: string;
  titleKey: string;
  descriptionKey: string;
}

const stepConfigs: Step[] = [
  {
    id: "template",
    titleKey: "setup.steps.template.title",
    descriptionKey: "setup.steps.template.description",
  },
  {
    id: "provider",
    titleKey: "setup.steps.provider.title",
    descriptionKey: "setup.steps.provider.description",
  },
  {
    id: "confirm",
    titleKey: "setup.steps.confirm.title",
    descriptionKey: "setup.steps.confirm.description",
  },
];

const SetupWizard = ({
  initialConfig = {},
  currentApiConfigName = "default",
  onComplete,
  isFirstInstall = false,
}: SetupWizardProps) => {
  const { t } = useTranslation("welcome-page");
  const { t: tProvider } = useTranslation("provider-registry");
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [apiConfiguration, setApiConfiguration] =
    useState<Record<string, unknown>>(initialConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isVisible, setIsVisible] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [useCustomSetup, setUseCustomSetup] = useState(false);

  // Use onboarding hook for environment detection and templates
  const {
    isDetecting,
    templates,
    hasLocalService,
    validationResult,
    isValidating,
    validateConfig,
  } = useOnboarding();

  const steps = useMemo(
    () =>
      stepConfigs.map((step) => ({
        ...step,
        title: t(step.titleKey),
        description: t(step.descriptionKey),
      })),
    [t],
  );

  const popularProviders = useMemo(() => {
    const popularIds = [
      "openai",
      "anthropic",
      "gemini",
      "deepseek",
      "ollama",
      "zhipu",
    ];
    return popularIds
      .map((id) => providerRegistry[id])
      .filter((p): p is ProviderMetadata => !!p);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Handle template selection
  const handleTemplateSelect = useCallback((template: QuickStartTemplate) => {
    setSelectedTemplateId(template.id);
    setSelectedProviderId(template.providerId);
    setApiConfiguration(template.config);
    setUseCustomSetup(false);
  }, []);

  // Handle test connection
  const handleTestConnection = useCallback(() => {
    if (selectedProviderId) {
      const apiKey = apiConfiguration.apiKey as string | undefined;
      const baseUrl = apiConfiguration.baseUrl as string | undefined;
      validateConfig(selectedProviderId, apiKey, baseUrl);
    }
  }, [selectedProviderId, apiConfiguration, validateConfig]);

  // Get connection status for indicator
  const getConnectionStatus = useCallback(() => {
    if (isValidating) return "connecting";
    if (validationResult) {
      return validationResult.isValid ? "success" : "error";
    }
    return "idle";
  }, [isValidating, validationResult]);

  const selectedProviderMeta = selectedProviderId
    ? providerRegistry[selectedProviderId]
    : null;

  const providerConfig: ExtendedProviderConfig | null = useMemo(() => {
    if (!selectedProviderMeta) return null;

    const config: Record<string, unknown> = {
      id: selectedProviderId,
      name: selectedProviderMeta.name,
      type: selectedProviderMeta.type,
      isActive: true,
      models: selectedProviderMeta.models || [],
    };

    selectedProviderMeta.fields.forEach((field) => {
      config[field.key] =
        apiConfiguration[field.key] ?? getFieldDefaultValue(field);
    });

    return config as unknown as ExtendedProviderConfig;
  }, [selectedProviderId, selectedProviderMeta, apiConfiguration]);

  const setApiConfigurationField = useCallback(
    (_providerId: string, config: Record<string, unknown>) => {
      setApiConfiguration((prevConfig) => {
        // 深度比较，避免不必要的状态更新
        const prevStr = JSON.stringify(prevConfig);
        const newStr = JSON.stringify(config);
        if (prevStr === newStr) {
          return prevConfig;
        }
        return config;
      });
      setError(undefined);
    },
    [],
  );

  const handleProviderSelect = useCallback((providerId: string) => {
    setSelectedProviderId(providerId);
    setApiConfiguration({});
    setError(undefined);
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, steps.length]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleSubmit = useCallback(() => {
    setIsLoading(true);
    setError(undefined);

    const finalConfig = {
      ...apiConfiguration,
      id: selectedProviderId,
      name: selectedProviderMeta?.name,
      type: selectedProviderMeta?.type,
    };

    let finished = false;

    // 监听响应并处理
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === "apiConfiguration.upserted") {
        window.removeEventListener("message", handleMessage);
        finished = true;

        if (message.data?.success) {
          console.log("[SetupWizard] API configuration upserted successfully");

          // 如果是首次安装，设置 onboarding 完成状态
          if (isFirstInstall) {
            postMessage("onboarding.setCompleted", {
              completed: true,
              skipped: false,
            });
          }

          setTimeout(() => {
            setIsLoading(false);
            onComplete?.();
          }, 500);
        } else {
          console.error(
            "[SetupWizard] Failed to upsert API configuration:",
            message.data?.error,
          );
          setError(message.data?.error || t("errors.saveConfigFailed"));
          setIsLoading(false);
        }
      }
    };

    window.addEventListener("message", handleMessage);

    postMessage("upsertApiConfiguration", {
      text: currentApiConfigName,
      apiConfiguration: finalConfig,
    });

    // 超时处理
    setTimeout(() => {
      if (finished) {
        return;
      }
      window.removeEventListener("message", handleMessage);
      setError(t("errors.requestTimeout"));
      setIsLoading(false);
    }, 10000);
  }, [
    apiConfiguration,
    currentApiConfigName,
    onComplete,
    selectedProviderId,
    selectedProviderMeta,
    isFirstInstall,
    t,
  ]);

  const handleImport = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    postMessage(UIRequest.ProfileImport);
  }, []);

  const getStepStatus = (index: number): StepStatus => {
    if (index < currentStep) return "completed";
    if (index === currentStep) return "current";
    return "pending";
  };

  const canProceed = () => {
    // Step 0: Template selection - always can proceed (user can skip or select)
    if (currentStep === 0) {
      return selectedTemplateId !== null || useCustomSetup;
    }
    // Step 1: Provider configuration
    if (currentStep === 1) {
      if (!selectedProviderId || !providerConfig) return false;
      const apiKey = apiConfiguration.apiKey as string;
      const needsApiKey = selectedProviderMeta?.fields.some(
        (f) => f.key === "apiKey" && f.required,
      );
      if (needsApiKey && (!apiKey || apiKey.length === 0)) return false;
      return true;
    }
    return true;
  };

  return (
    <div
      className={`py-6 px-2 transition-all duration-500 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {/* Steps indicator */}
      <div className="flex items-center justify-center mb-6">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <StepIndicator
              step={index + 1}
              status={getStepStatus(index)}
              title={step.title}
            />
            {index < steps.length - 1 && (
              <div
                className="w-12 h-0.5 mx-2"
                style={{
                  backgroundColor:
                    index < currentStep
                      ? "var(--vscode-button-background)"
                      : "var(--vscode-panel-border)",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card
        className="mb-4"
        style={{
          borderColor: "var(--vscode-panel-border)",
          backgroundColor: "var(--vscode-editor-background)",
        }}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {steps[currentStep].title}
          </CardTitle>
          <p
            className="text-sm"
            style={{ color: "var(--vscode-descriptionForeground)" }}
          >
            {steps[currentStep].description}
          </p>
        </CardHeader>
        <CardContent>
          {/* Step 0: Template Selection */}
          {currentStep === 0 && (
            <div className="space-y-4">
              {/* Environment Detection Status */}
              {isDetecting ? (
                <div
                  className="flex items-center gap-2 text-sm"
                  style={{ color: "var(--vscode-descriptionForeground)" }}
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("setup.detectingEnvironment")}
                </div>
              ) : hasLocalService ? (
                <div
                  className="flex items-center gap-2 text-sm"
                  style={{ color: "var(--vscode-charts-green)" }}
                >
                  <Wifi className="w-4 h-4" />
                  {t("setup.localServiceDetected")}
                </div>
              ) : null}

              {/* Quick Start Templates */}
              <div className="space-y-3">
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--vscode-foreground)" }}
                >
                  {t("setup.quickStart")}
                </p>
                <TemplateGrid
                  templates={templates}
                  selectedTemplateId={selectedTemplateId}
                  onSelect={handleTemplateSelect}
                />
              </div>

              {/* Custom Setup Option */}
              <div
                className="pt-3 border-t"
                style={{ borderColor: "var(--vscode-panel-border)" }}
              >
                <SelectionCard
                  onClick={() => {
                    setUseCustomSetup(true);
                    setSelectedTemplateId(null);
                  }}
                  isSelected={useCustomSetup}
                >
                  <div className="flex items-center gap-2">
                    <Server
                      className="w-5 h-5"
                      style={{ color: "var(--vscode-textLink-foreground)" }}
                    />
                    <div>
                      <div className="font-medium">
                        {t("setup.customSetup")}
                      </div>
                      <div
                        className="text-sm"
                        style={{ color: "var(--vscode-descriptionForeground)" }}
                      >
                        {t("setup.customSetupDesc")}
                      </div>
                    </div>
                  </div>
                </SelectionCard>
              </div>
            </div>
          )}

          {/* Step 1: Provider Configuration */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {/* Provider Selection */}
              <div className="space-y-3">
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--vscode-foreground)" }}
                >
                  {t("setup.selectProvider")}
                </p>

                {/* Popular Providers */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {popularProviders.map((provider) => (
                    <ProviderCard
                      key={provider.id}
                      provider={provider}
                      isSelected={selectedProviderId === provider.id}
                      onClick={() => handleProviderSelect(provider.id)}
                      t={tProvider}
                    />
                  ))}
                </div>

                {/* More Providers Dropdown */}
                <details className="group">
                  <summary
                    className="cursor-pointer text-sm py-2 flex items-center gap-1"
                    style={{ color: "var(--vscode-textLink-foreground)" }}
                  >
                    {t("setup.moreProviders")}
                  </summary>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.values(providerRegistry)
                      .filter(
                        (p) => !popularProviders.find((pp) => pp.id === p.id),
                      )
                      .map((provider) => (
                        <ProviderCard
                          key={provider.id}
                          provider={provider}
                          isSelected={selectedProviderId === provider.id}
                          onClick={() => handleProviderSelect(provider.id)}
                          t={tProvider}
                        />
                      ))}
                  </div>
                </details>
              </div>

              {/* Provider Config Form */}
              {selectedProviderId && providerConfig && (
                <div
                  className="pt-4 border-t"
                  style={{ borderColor: "var(--vscode-panel-border)" }}
                >
                  <p
                    className="text-sm font-medium mb-3"
                    style={{ color: "var(--vscode-foreground)" }}
                  >
                    {t("setup.configureProvider", {
                      provider: selectedProviderMeta?.name,
                    })}
                  </p>
                  <ProviderConfigForm
                    key={selectedProviderId}
                    provider={providerConfig}
                    config={apiConfiguration}
                    onConfigChange={setApiConfigurationField}
                    onTestProvider={handleTestConnection}
                    onOpenSettings={() => {}}
                  />

                  {/* Connection Status */}
                  <div className="mt-3">
                    <ConnectionStatusIndicator
                      status={
                        getConnectionStatus() as
                          | "idle"
                          | "connecting"
                          | "success"
                          | "error"
                      }
                      errorType={validationResult?.errorType}
                      message={validationResult?.message}
                      duration={validationResult?.duration}
                    />
                  </div>

                  {/* Test Connection Button */}
                  <div className="mt-3 flex justify-end">
                    <VSCodeButton
                      appearance="secondary"
                      onClick={handleTestConnection}
                      disabled={isValidating}
                    >
                      {isValidating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wifi className="w-4 h-4" />
                      )}
                      {t("setup.buttons.testConnection")}
                    </VSCodeButton>
                  </div>
                </div>
              )}

              {/* Import option */}
              <div
                className="flex items-center justify-center pt-2 border-t"
                style={{ borderColor: "var(--vscode-panel-border)" }}
              >
                <VSCodeLink href="#" onClick={handleImport}>
                  <span className="flex items-center gap-1 text-sm">
                    <Upload className="w-3.5 h-3.5" />
                    {t("setup.import")}
                  </span>
                </VSCodeLink>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <ConfigSummary
                providerId={selectedProviderId}
                providerName={selectedProviderMeta?.name || ""}
                config={apiConfiguration}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error message */}
      {error && (
        <div
          className="flex items-center gap-2 p-3 mb-4 rounded-lg text-sm"
          style={{
            backgroundColor: "var(--vscode-inputValidation-errorBackground)",
            borderColor: "var(--vscode-inputValidation-errorBorder)",
            color: "var(--vscode-errorForeground)",
          }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <div>
          {currentStep > 0 && (
            <VSCodeButton
              appearance="secondary"
              onClick={handleBack}
              disabled={isLoading}
            >
              <ChevronLeft className="w-4 h-4" />
              {t("setup.buttons.previous")}
            </VSCodeButton>
          )}
        </div>
        <div>
          {currentStep < steps.length - 1 ? (
            <VSCodeButton
              appearance="primary"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              {t("setup.buttons.next")}
              <ChevronRight className="w-4 h-4" />
            </VSCodeButton>
          ) : (
            <VSCodeButton
              appearance="primary"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("setup.buttons.saving")}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {t("setup.buttons.complete")}
                </>
              )}
            </VSCodeButton>
          )}
        </div>
      </div>
    </div>
  );
};

interface ProviderCardProps {
  provider: ProviderMetadata;
  isSelected: boolean;
  onClick: () => void;
  t: (key: string) => string;
}

const ProviderCard = ({
  provider,
  isSelected,
  onClick,
  t,
}: ProviderCardProps) => {
  return (
    <div
      onClick={onClick}
      className={`w-full h-auto p-3 text-left transition-all duration-200 cursor-pointer ${
        isSelected ? "ring-2" : ""
      }`}
      style={{
        borderColor: isSelected
          ? "var(--vscode-button-background)"
          : "var(--vscode-panel-border)",
        backgroundColor: isSelected
          ? "var(--vscode-list-activeSelectionBackground)"
          : "var(--vscode-editor-background)",
        color: "var(--vscode-foreground)",
        // @ts-expect-error ringColor is a valid CSS variable for Tailwind
        "--tw-ring-color": "var(--vscode-button-background)",
      }}
    >
      <div className="font-medium text-sm truncate">{provider.name}</div>
      <div
        className="text-xs truncate mt-0.5"
        style={{ color: "var(--vscode-descriptionForeground)" }}
      >
        {t(provider.description)}
      </div>
    </div>
  );
};

interface StepIndicatorProps {
  step: number;
  status: StepStatus;
  title: string;
}

const StepIndicator = ({ step, status, title }: StepIndicatorProps) => {
  const getStyles = () => {
    switch (status) {
      case "completed":
        return {
          bg: "var(--vscode-button-background)",
          color: "var(--vscode-button-foreground)",
          border: "transparent",
        };
      case "current":
        return {
          bg: "transparent",
          color: "var(--vscode-button-background)",
          border: "var(--vscode-button-background)",
        };
      default:
        return {
          bg: "transparent",
          color: "var(--vscode-descriptionForeground)",
          border: "var(--vscode-panel-border)",
        };
    }
  };

  const styles = getStyles();

  return (
    <div className="flex flex-col items-center">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300"
        style={{
          backgroundColor: styles.bg,
          color: styles.color,
          border: `2px solid ${styles.border}`,
        }}
      >
        {status === "completed" ? <Check className="w-4 h-4" /> : step}
      </div>
      <span
        className="text-xs mt-1 hidden sm:block"
        style={{
          color:
            status === "current"
              ? "var(--vscode-foreground)"
              : "var(--vscode-descriptionForeground)",
        }}
      >
        {title}
      </span>
    </div>
  );
};

interface ConfigSummaryProps {
  providerId: string;
  providerName: string;
  config: Record<string, unknown>;
}

const ConfigSummary = ({
  providerId,
  providerName,
  config,
}: ConfigSummaryProps) => {
  const { t } = useTranslation("welcome-page");

  const displayItems = [
    {
      label: t("setup.summary.providerType"),
      value: providerName || providerId,
    },
    {
      label: t("setup.summary.apiKey"),
      value: config.apiKey
        ? t("setup.summary.apiKeyHidden")
        : t("setup.summary.notSet"),
    },
    {
      label: t("setup.summary.model"),
      value: config.model || t("setup.summary.default"),
    },
    {
      label: t("setup.summary.baseUrl"),
      value: config.baseUrl || config.apiBaseUrl || t("setup.summary.default"),
    },
  ];

  return (
    <div className="space-y-3">
      <div
        className="p-4 rounded-lg"
        style={{ backgroundColor: "var(--vscode-sideBar-background)" }}
      >
        {displayItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between py-2 border-b last:border-b-0"
            style={{ borderColor: "var(--vscode-panel-border)" }}
          >
            <span
              className="text-sm"
              style={{ color: "var(--vscode-descriptionForeground)" }}
            >
              {item.label}
            </span>
            <span
              className="text-sm font-medium"
              style={{ color: "var(--vscode-foreground)" }}
            >
              {String(item.value)}
            </span>
          </div>
        ))}
      </div>
      <p
        className="text-xs text-center"
        style={{ color: "var(--vscode-descriptionForeground)" }}
      >
        {t("setup.summary.hint")}
      </p>
    </div>
  );
};

export default SetupWizard;
