import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { useCallback, useState } from "react";

// Removed dependencies that don't exist in this project:
// - knuth-shuffle-seeded
// - posthog-js
// - @roo-code/types
// - and various utils that are not present.

// Assuming these are the correct paths based on project structure.
import { ProviderConfigForm } from "@/components/settings/ProviderConfigForm";
import { useVSCodeContext } from "@/contexts/VSCodeContext";
import {
  ExtendedProviderConfig,
  ProviderType,
} from "@/types/provider-metadata";
import { postMessage } from "@/utils/vscode";
import { useTranslation } from "react-i18next";

const WelcomePage = () => {
  const { initialData } = useVSCodeContext();
  const { t } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined,
  );
  const [apiConfiguration, setApiConfiguration] = useState<
    Record<string, unknown>
  >(initialData?.apiConfiguration || {});
  const currentApiConfigName = initialData?.currentApiConfigName || "default";

  const providerConfig: ExtendedProviderConfig = {
    id: (apiConfiguration.id as string) || "custom",
    name: (apiConfiguration.name as string) || "Custom Provider",
    type:
      (apiConfiguration.type as ProviderType) || ProviderType.OPENAI_COMPATIBLE,
    isActive: true,
    models: [],
    ...apiConfiguration,
  };

  const setApiConfigurationField = useCallback(
    (_providerId: string, config: Record<string, unknown>) => {
      setApiConfiguration(config);
    },
    [setApiConfiguration],
  );

  const handleSubmit = useCallback(() => {
    // TODO: Implement local validation if needed.
    setErrorMessage(undefined);
    postMessage("upsertApiConfiguration", {
      text: currentApiConfigName,
      apiConfiguration,
    });
  }, [apiConfiguration, currentApiConfigName]);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-grow flex flex-col gap-4 p-6 overflow-y-auto">
        <h2 className="mt-0 mb-4 text-xl text-center">
          欢迎使用 Dish AI Commit Message Gen
        </h2>

        <div className="text-base text-vscode-foreground py-2 px-2 mb-4">
          <p className="mb-3 leading-relaxed">
            为了开始使用，您需要配置一个 AI 提供商。这通常需要一个 API
            密钥和/或一个特定的 URL。
          </p>
          <p className="mb-0 leading-relaxed">
            请在下方填写您的 AI 提供商信息。
          </p>
        </div>

        <div className="mb-4">
          <p className="text-sm font-medium mt-6 mb-3">自定义 AI 提供商配置</p>
          <ProviderConfigForm
            provider={providerConfig}
            config={apiConfiguration}
            onConfigChange={setApiConfigurationField}
            onTestProvider={() => {}}
            onOpenSettings={() => {}}
          />
        </div>
      </div>
      <div className="sticky bottom-0 bg-vscode-sideBar-background p-4 border-t border-vscode-panel-border">
        <div className="flex flex-col gap-2">
          <div className="flex justify-end">
            <VSCodeLink
              href="#"
              onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                e.preventDefault();
                postMessage("importSettings");
              }}
              className="text-sm"
            >
              {t("welcome:importSettings")}
            </VSCodeLink>
          </div>
          <VSCodeButton onClick={handleSubmit} appearance="primary">
            {t("welcome:start")}
          </VSCodeButton>
          {errorMessage && (
            <div className="text-vscode-errorForeground">{errorMessage}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
