import { ProfileForm } from "@/components/settings/ProfileForm";
import { ProviderConfigForm } from "@/components/settings/ProviderConfigForm";
import { providerRegistry } from "@/config/provider-registry";
import { secureStorage } from "@/services/secure-storage";
import {
  ExtendedProviderConfig,
  ModelMetadata,
  ProviderMetadata,
} from "@/types/provider-metadata";
import { Profile, ProviderConfig } from "@/types/settings";
import { getFieldDefaultValue } from "@/utils/validation-helpers";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";

interface ProvidersSettingsProps {
  profile: Profile | null;
  activeProfile: Profile | null;
  allProfiles: Profile[];
  isLoading?: boolean;

  onChange: (profile: Profile) => void;
  onProfileSelect: (profileId: string) => void;
  onProfileCreate: () => void;
  onProfileEdit: (profileId: string) => void;
  onProfileDelete: (profileId: string) => void;
}

export const ProvidersSettings: React.FC<ProvidersSettingsProps> = ({
  profile: editingProfile,
  activeProfile,
  allProfiles,
  isLoading,
  onChange,
  onProfileSelect,
  onProfileCreate,
  onProfileEdit,
  onProfileDelete,
}) => {
  const { t, i18n } = useTranslation([
    "providers-settings",
    "provider-registry",
  ]);
  const ProviderRegistry = providerRegistry;
  const [selectedProvider, setSelectedProvider] = useState<string>("");

  const currentProviderMetadata = ProviderRegistry[selectedProvider];

  const currentProviderConfig = useMemo(() => {
    const storedConfig = editingProfile?.providers?.[selectedProvider];
    if (storedConfig) return storedConfig as unknown as ExtendedProviderConfig;

    const config: Record<string, unknown> = {
      id: selectedProvider,
      name: currentProviderMetadata?.name || selectedProvider,
      type: currentProviderMetadata?.type || "openai-compatible",
    };

    if (currentProviderMetadata?.fields) {
      currentProviderMetadata.fields.forEach((field) => {
        if (!(field.key in config)) {
          config[field.key] = field.defaultValue ?? getFieldDefaultValue(field);
        }
      });
    }
    return config as unknown as ExtendedProviderConfig;
  }, [editingProfile, selectedProvider, currentProviderMetadata]);

  const handleConfigChange = useCallback(
    async (providerId: string, newConfig: Record<string, unknown>) => {
      if (!editingProfile) return;

      const updatedConfig = {
        ...currentProviderConfig,
        ...newConfig,
      } as ExtendedProviderConfig;

      // 转换 models 从 ModelMetadata 到 ModelConfig
      const providerConfig: ProviderConfig = {
        ...updatedConfig,
        models: (updatedConfig.models || []).map((m: ModelMetadata) => ({
          id: m.id,
          name: m.name,
          provider: providerId,
          maxTokens: { input: m.contextWindow, output: m.maxOutputTokens },
          deprecated: m.deprecated,
          capabilities: {
            streaming: m.capabilities?.includes("streaming"),
            functionCalling: m.capabilities?.includes("function-calling"),
          },
          cost: m.pricing
            ? {
                input: m.pricing.input,
                output: m.pricing.output,
              }
            : undefined,
        })),
      };

      const updatedProfile: Profile = {
        ...editingProfile,
        providers: {
          ...editingProfile.providers,
          [providerId]: providerConfig,
        },
      };
      onChange(updatedProfile);
    },
    [currentProviderConfig, editingProfile, onChange],
  );

  const addProviderToProfile = useCallback(
    (providerId: string) => {
      if (!editingProfile) return;

      const providerMetadata = ProviderRegistry[providerId];
      if (!providerMetadata) return;

      const defaultConfig = {
        id: providerId,
        name: providerMetadata.name,
        type: providerMetadata.type,
        ...providerMetadata.fields.reduce(
          (acc, field) => {
            acc[field.key] = field.defaultValue ?? getFieldDefaultValue(field);
            return acc;
          },
          {} as Record<string, unknown>,
        ),
      } as ProviderConfig;

      const updatedProfile: Profile = {
        ...editingProfile,
        ...editingProfile,
        // activeProviderId: providerId, // Removed as it is not in Profile interface
        providers: {
          ...editingProfile.providers,
          [providerId]: defaultConfig,
        },
      };
      onChange(updatedProfile);
    },
    [editingProfile, onChange, ProviderRegistry],
  );

  const handleProviderSelect = useCallback(
    (providerId: string) => {
      if (!editingProfile) return;
      setSelectedProvider(providerId);
      secureStorage.saveLastSelectedProvider(editingProfile.id, providerId);
    },
    [editingProfile],
  );

  const handleProviderChange = useCallback(
    (providerId: string) => {
      if (!editingProfile) return;

      handleProviderSelect(providerId);

      if (providerId && !editingProfile.providers?.[providerId]) {
        // 如果 provider 不存在,addProviderToProfile 会设置 activeProviderId
        addProviderToProfile(providerId);
      } else if (providerId && editingProfile.providers?.[providerId]) {
        // 如果 provider 已存在,只需要更新 activeProviderId
        const updatedProfile: Profile = {
          ...editingProfile,
          ...editingProfile,
          // activeProviderId: providerId, // Removed as it is not in Profile interface
        };
        onChange(updatedProfile);
      }
    },
    [editingProfile, addProviderToProfile, handleProviderSelect, onChange],
  );

  useEffect(() => {
    if (!editingProfile) {
      if (selectedProvider !== "") {
        // Defer state update to avoid warning during unmount/re-render
        setTimeout(() => setSelectedProvider(""), 0);
      }
      return;
    }

    const providerIdsInProfile = Object.keys(editingProfile.providers || {});

    // Step 1: If the profile has no providers, add the first one and stop.
    // The effect will re-run on the next render to handle selection.
    if (providerIdsInProfile.length === 0) {
      const firstProviderId = Object.keys(ProviderRegistry)[0];
      if (firstProviderId) {
        // Defer this parent state update to avoid cascading render warnings.
        setTimeout(() => addProviderToProfile(firstProviderId), 0);
      }
      return;
    }

    // Step 2: Providers exist. Ensure one is selected.
    const isSelectionValid =
      selectedProvider && providerIdsInProfile.includes(selectedProvider);
    if (!isSelectionValid) {
      secureStorage
        .loadLastSelectedProvider(editingProfile.id)
        .then((lastSelected) => {
          const providerToSelect =
            lastSelected && providerIdsInProfile.includes(lastSelected)
              ? lastSelected
              : providerIdsInProfile[0];
          handleProviderSelect(providerToSelect);
        })
        .catch(() => {
          handleProviderSelect(providerIdsInProfile[0]);
        });
    }
  }, [
    editingProfile,
    selectedProvider,
    addProviderToProfile,
    handleProviderSelect,
    ProviderRegistry,
  ]);

  // if (isLoading) {
  //   return <ProvidersSettingsSkeleton />;
  // }

  return (
    <div className="space-y-6">
      <div>
        <ProfileForm
          profiles={allProfiles}
          selectedProfile={editingProfile?.id ?? ""}
          activeProfile={activeProfile}
          isLoading={isLoading}
          onProfileChange={onProfileSelect}
          onCreateProfile={onProfileCreate}
          onEditProfile={onProfileEdit}
          onDeleteProfile={onProfileDelete}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <label className="text-sm font-medium">{t("apiProviders")}</label>
            {currentProviderMetadata?.website && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  window.open(currentProviderMetadata.website, "_blank")
                }
                className="text-blue-600 hover:text-blue-800"
              >
                {t("providerDocs", { name: t(currentProviderMetadata.name) })}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-2">
            <VSCodeDropdown
              value={selectedProvider}
              onChange={(e: any) => handleProviderChange(e.target.value)}
            >
              {Object.values(ProviderRegistry).map(
                (provider: ProviderMetadata) => (
                  <VSCodeOption key={provider.id} value={provider.id}>
                    {provider.icon} {t(provider.name)}
                  </VSCodeOption>
                ),
              )}
            </VSCodeDropdown>
          </div>
        </CardContent>
      </Card>

      {currentProviderMetadata && (
        <ProviderConfigForm
          key={`${editingProfile?.id}-${selectedProvider}-${i18n.language}`}
          provider={
            currentProviderMetadata as unknown as ExtendedProviderConfig
          }
          config={currentProviderConfig}
          onConfigChange={handleConfigChange}
          onTestProvider={() => {}}
          onOpenSettings={() => {}}
        />
      )}
    </div>
  );
};
