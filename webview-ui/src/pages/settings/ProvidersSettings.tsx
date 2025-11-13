import { Skeleton } from "@/components/ui/skeleton";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ProfileForm } from "../../components/settings/ProfileForm";
import { ProviderConfigForm } from "../../components/settings/ProviderConfigForm";
import { ProviderRegistry } from "../../config/provider-registry";
import { secureStorage } from "../../services/secure-storage";
import { ExtendedProviderConfig } from "../../types/provider-metadata";
import { Profile, ProviderConfig } from "../../types/settings";
import { getFieldDefaultValue } from "../../utils/validation-helpers";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const ProvidersSettingsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Skeleton for ProfileForm */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-1/4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Skeleton className="h-10 flex-grow" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-24" />
          </CardContent>
        </Card>
      </div>

      {/* Skeleton for Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>

      {/* Skeleton for Provider Config Form */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-40" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

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
  const { t } = useTranslation("providers-settings");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);

  const currentProviderMetadata = ProviderRegistry[selectedProvider];

  const currentProviderConfig = useMemo(() => {
    const storedConfig = editingProfile?.providers?.[selectedProvider];
    if (storedConfig) return storedConfig as unknown as ExtendedProviderConfig;

    const config: Record<string, unknown> = {
      id: selectedProvider,
      name: currentProviderMetadata?.name || selectedProvider,
      type: currentProviderMetadata?.type || "openai-compatible",
      isActive: true,
      models: [],
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

      const providerConfig: ProviderConfig = {
        ...updatedConfig,
        models: updatedConfig.models.map(
          (model: {
            id: string;
            name: string;
            contextWindow: number;
            maxOutputTokens: number;
            deprecated?: boolean;
            capabilities: string[];
            pricing?: { input: number; output: number };
          }) => ({
            id: model.id,
            name: model.name,
            provider: providerId,
            maxTokens: {
              input: model.contextWindow,
              output: model.maxOutputTokens,
            },
            deprecated: model.deprecated,
            capabilities: {
              streaming: model.capabilities.includes("streaming"),
              functionCalling: model.capabilities.includes("function-calling"),
            },
            cost: model.pricing
              ? { input: model.pricing.input, output: model.pricing.output }
              : undefined,
          }),
        ),
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
        isActive: true,
        models: [],
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
        providers: {
          ...editingProfile.providers,
          [providerId]: defaultConfig,
        },
      };
      onChange(updatedProfile);
    },
    [editingProfile, onChange],
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
        addProviderToProfile(providerId);
      }
    },
    [editingProfile, addProviderToProfile, handleProviderSelect],
  );

  const handleDeleteProfileClick = (profileId: string) => {
    setProfileToDelete(profileId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteProfile = () => {
    if (profileToDelete) {
      onProfileDelete(profileToDelete);
      setShowDeleteConfirm(false);
      setProfileToDelete(null);
    }
  };

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
  ]);

  if (isLoading) {
    return <ProvidersSettingsSkeleton />;
  }

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
          onDeleteProfile={handleDeleteProfileClick}
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
                {t("providerDocs", { name: currentProviderMetadata.name })}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-2">
            <VSCodeDropdown
              value={selectedProvider}
              onChange={(e: Event) =>
                handleProviderChange((e.target as HTMLSelectElement).value)
              }
            >
              {Object.values(ProviderRegistry).map((provider) => (
                <VSCodeOption key={provider.id} value={provider.id}>
                  {provider.icon} {provider.name}
                </VSCodeOption>
              ))}
            </VSCodeDropdown>
          </div>
        </CardContent>
      </Card>

      {currentProviderMetadata && (
        <ProviderConfigForm
          provider={
            currentProviderMetadata as unknown as ExtendedProviderConfig
          }
          config={currentProviderConfig}
          onConfigChange={handleConfigChange}
          onTestProvider={() => {}}
          onOpenSettings={() => {}}
        />
      )}

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogs.confirmDelete.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("dialogs.confirmDelete.description", {
                name: allProfiles.find((p) => p.id === profileToDelete)?.name,
              })}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t("dialogs.confirmDelete.cancel")}
              </Button>
              <Button variant="destructive" onClick={confirmDeleteProfile}>
                {t("dialogs.confirmDelete.delete")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
