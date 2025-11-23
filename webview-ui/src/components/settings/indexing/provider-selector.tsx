import React from "react";
import { useTranslation } from "react-i18next";
import { Select, SelectOption } from "../../ui/select";

interface ProviderSelectorProps {
  selectedProvider: string;
  onProviderChange: (provider: string) => void;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  selectedProvider,
  onProviderChange,
}) => {
  const { t } = useTranslation("indexing-settings");

  const providers = [
    { value: "openai", label: t("providers.openai") },
    { value: "ollama", label: t("providers.ollama") },
    { value: "openai-compatible", label: t("providers.openaiCompatible") },
    { value: "gemini", label: t("providers.gemini") },
    { value: "mistral", label: t("providers.mistral") },
    { value: "vercel-ai-gateway", label: t("providers.vercelAIGateway") },
  ];

  return (
    <Select value={selectedProvider} onValueChange={onProviderChange}>
      {providers.map((provider) => (
        <SelectOption key={provider.value} value={provider.value}>
          {provider.label}
        </SelectOption>
      ))}
    </Select>
  );
};
