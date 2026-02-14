import { AdvancedSettings } from "@/components/settings/AdvancedSettings";
import { PreferencesSettings } from "@/components/settings/PreferencesSettings";
import { ProfileEditDialog } from "@/components/settings/ProfileEditDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { profileManager } from "@/services/webview/profile-manager";
import { DEFAULT_USER_PREFERENCES, Profile } from "@/types/settings";
import { themeStyles } from "@/utils/theme";
import { postMessage, showInformationMessage } from "@/utils/vscode";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import { Settings as SettingsIcon } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { FeaturesSettings } from "./FeaturesSettings";
import { ModelCustomSettings } from "./ModelCustomSettings";
import { ProvidersSettings } from "./ProvidersSettings";

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation("settings-page");
  const location = useLocation();
  // Centralized state management
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileDirty, setProfileDirty] = useState(false);
  const [preferencesDirty, setPreferencesDirty] = useState(false);
  const hasUnsavedChanges = profileDirty || preferencesDirty;
  const [preferences, setPreferences] = useState(DEFAULT_USER_PREFERENCES);
  const [isPreferencesLoading, setIsPreferencesLoading] = useState(true);
  const savedPreferencesRef = useRef(DEFAULT_USER_PREFERENCES);
  const pendingPreferencesPayloadRef = useRef<string | null>(null);
  const pendingPreferencesPromiseRef = useRef<Promise<void> | null>(null);
  const pendingPreferencesResolverRef = useRef<(() => void) | null>(null);

  // Local UI state
  const [selectedTab, setSelectedTab] = useState("providers");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [dialogEditingProfile, setDialogEditingProfile] =
    useState<Profile | null>(null);
  const [isUnsavedChangesDialogOpen, setIsUnsavedChangesDialogOpen] =
    useState(false);
  const [targetProfileOnSwitch, setTargetProfileOnSwitch] =
    useState<Profile | null>(null);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] =
    useState(false);
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);

  const loadData = useCallback(async () => {
    console.log("[SettingsPage] loadData called");
    setIsLoading(true);
    setError(null);
    try {
      const { profiles, activeProfileId } = await profileManager.loadProfiles();
      console.log(
        "[SettingsPage] Loaded profiles:",
        profiles,
        "activeProfileId:",
        activeProfileId,
      );
      if (profiles.length === 0) {
        const defaultProfile = profileManager.createDefaultProfile(
          t("defaultProfileName"),
          t("defaultProfileDescription"),
        );
        console.log("[SettingsPage] Creating default profile:", defaultProfile);
        await profileManager.saveProfile(defaultProfile);
        await profileManager.setActiveProfile(defaultProfile.id);

        setAllProfiles([defaultProfile]);
        setActiveProfile(defaultProfile);
        setEditingProfile(defaultProfile);
        console.log("[SettingsPage] Set default profile as editingProfile");
        return;
      }

      setAllProfiles(profiles);
      const active =
        profiles.find((p) => p.id === activeProfileId) || profiles[0];
      console.log("[SettingsPage] Active profile:", active);
      const normalizedActive = {
        ...active,
        preferences: savedPreferencesRef.current,
      };
      setActiveProfile(normalizedActive);
      setEditingProfile(normalizedActive);
      setProfileDirty(false);
      console.log("[SettingsPage] Set active profile as editingProfile");
    } catch (err) {
      console.log("[SettingsPage] Error loading profiles:", err);
      setError(
        err instanceof Error ? err.message : t("errors.failedToLoadSettings"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get("tab");
    const validTabs = new Set([
      "providers",
      "preferences",
      "features",
      "advanced",
      "model-custom",
    ]);
    if (tab && validTabs.has(tab)) {
      setSelectedTab(tab);
    }
  }, [location.search]);

  const handleProfileCreate = () => {
    setDialogEditingProfile(null);
    setEditDialogOpen(true);
  };

  const handleProfileEdit = (profileId: string) => {
    const profile = allProfiles.find((p) => p.id === profileId);
    setDialogEditingProfile(profile || null);
    setEditDialogOpen(true);
  };

  const handleProfileDelete = async (profileId: string) => {
    const profile = allProfiles.find((p) => p.id === profileId);
    if (!profile) return;

    setProfileToDelete(profile);
    setIsDeleteConfirmationOpen(true);
  };

  const confirmProfileDelete = async () => {
    if (!profileToDelete) return;
    try {
      await profileManager.deleteProfile(profileToDelete.id);
      showInformationMessage(
        t("messages.profileDeleted", { name: profileToDelete.name }),
      );
      await loadData(); // Refresh data
    } catch (err) {
      showInformationMessage(
        t("errors.failedToDelete", {
          message:
            err instanceof Error ? err.message : t("errors.unknownError"),
        }),
      );
    } finally {
      setIsDeleteConfirmationOpen(false);
      setProfileToDelete(null);
    }
  };

  const handleProfileSelect = async (profileId: string) => {
    const targetProfile = allProfiles.find((p) => p.id === profileId);
    if (targetProfile) {
      if (hasUnsavedChanges && editingProfile) {
        setTargetProfileOnSwitch(targetProfile);
        setIsUnsavedChangesDialogOpen(true);
      } else {
        setEditingProfile(targetProfile);
      }
    }
  };

  const handleProfileSave = async (profile: Profile) => {
    console.log("handleProfileSave triggered with profile:", profile);
    try {
      await profileManager.saveProfile(profile);
      setEditDialogOpen(false);
      await loadData(); // Refresh data
      // Set the newly saved profile as the editing profile
      setEditingProfile(profile);
      showInformationMessage(
        t("messages.profileSaved", { name: profile.name }),
      );
    } catch (err) {
      showInformationMessage(
        t("errors.failedToSave", {
          message:
            err instanceof Error ? err.message : t("errors.unknownError"),
        }),
      );
    }
  };

  const requestPreferencesSave = useCallback(
    (next: typeof DEFAULT_USER_PREFERENCES) => {
      const payloadString = JSON.stringify(next);
      if (
        pendingPreferencesPromiseRef.current &&
        pendingPreferencesPayloadRef.current === payloadString
      ) {
        return pendingPreferencesPromiseRef.current;
      }
      pendingPreferencesPayloadRef.current = payloadString;
      const promise = new Promise<void>((resolve) => {
        pendingPreferencesResolverRef.current = resolve;
      });
      pendingPreferencesPromiseRef.current = promise;
      postMessage(UIRequest.PreferencesSaveSettings, next);
      return promise;
    },
    [],
  );

  const persistChanges = useCallback(async () => {
    const operations: Promise<void>[] = [];
    if (profileDirty && editingProfile) {
      operations.push(
        (async () => {
          await profileManager.saveProfile(editingProfile);
          setProfileDirty(false);
        })(),
      );
    }
    if (preferencesDirty) {
      operations.push(requestPreferencesSave(preferences));
    }

    if (operations.length > 0) {
      await Promise.all(operations);
    }
  }, [
    editingProfile,
    preferences,
    preferencesDirty,
    profileDirty,
    requestPreferencesSave,
  ]);

  const handleDone = async () => {
    console.log(
      "[SettingsPage] handleDone triggered with editingProfile:",
      editingProfile,
    );
    if (!editingProfile) {
      console.log("[SettingsPage] No editingProfile, returning");
      return;
    }
    try {
      await persistChanges();
      await profileManager.setActiveProfile(editingProfile.id);
      setActiveProfile(editingProfile);
      setEditingProfile(editingProfile);

      await loadData(); // Refresh data to ensure everything is in sync

      showInformationMessage(
        t("messages.switchedToProfile", { name: editingProfile.name }),
      );
    } catch (err) {
      console.log("[SettingsPage] Error applying settings:", err);
      showInformationMessage(
        t("errors.failedToApplySettings", {
          message:
            err instanceof Error ? err.message : t("errors.unknownError"),
        }),
      );
    }
  };

  const handleProfileChange = (updatedProfile: Profile) => {
    console.log(
      "handleProfileChange triggered with updatedProfile:",
      updatedProfile,
    );
    if (editingProfile && updatedProfile.id === editingProfile.id) {
      setEditingProfile(updatedProfile);
      setProfileDirty(true);
    }
  };

  const handlePreferencesChange = (
    updatedPreferences: typeof DEFAULT_USER_PREFERENCES,
  ) => {
    setPreferences(updatedPreferences);
    const hasChanged =
      JSON.stringify(updatedPreferences) !==
      JSON.stringify(savedPreferencesRef.current);
    setPreferencesDirty(hasChanged);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === ExtensionResponse.PreferencesSettingsUpdated) {
        const incoming = message.settings;
        if (!incoming) {
          return;
        }
        const merged = {
          ...DEFAULT_USER_PREFERENCES,
          ...incoming,
        };
        savedPreferencesRef.current = merged;
        setPreferences(merged);
        setIsPreferencesLoading(false);
        setPreferencesDirty(false);
        setEditingProfile((prev) =>
          prev ? { ...prev, preferences: merged } : prev,
        );
        setActiveProfile((prev) =>
          prev ? { ...prev, preferences: merged } : prev,
        );
        if (
          pendingPreferencesPayloadRef.current &&
          JSON.stringify(merged) === pendingPreferencesPayloadRef.current
        ) {
          pendingPreferencesResolverRef.current?.();
          pendingPreferencesResolverRef.current = null;
          pendingPreferencesPromiseRef.current = null;
          pendingPreferencesPayloadRef.current = null;
        }
      }
    };

    window.addEventListener("message", handleMessage);
    postMessage(UIRequest.PreferencesLoadSettings);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  if (error) {
    return (
      <div>
        {t("errors.error")}: {error}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div
        className="border-b px-6 py-4"
        style={{
          backgroundColor: themeStyles.background(0.95),
          backdropFilter: "blur(8px)",
          borderColor: themeStyles.border("normal"),
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SettingsIcon
              className="w-5 h-5"
              style={{ color: themeStyles.foreground() }}
            />
            <h1
              className="text-xl font-bold"
              style={{ color: themeStyles.foreground() }}
            >
              {t("title")}
            </h1>
          </div>
          <div className="flex gap-2 items-center">
            {hasUnsavedChanges && (
              <span
                className="text-sm font-medium"
                style={{ color: "var(--warning)" }}
              >
                {t("unsavedChanges")}
              </span>
            )}
            <Button
              variant="default"
              onClick={handleDone}
              disabled={!editingProfile}
            >
              {t("done")}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="w-full flex flex-col"
        >
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4 flex-nowrap overflow-x-auto">
            <TabsTrigger value="providers" className="px-2 py-1.5">
              {t("tabs.apiProviders")}
            </TabsTrigger>
            <TabsTrigger value="preferences" className="px-2 py-1.5">
              {t("tabs.preferences")}
            </TabsTrigger>
            <TabsTrigger value="features" className="px-2 py-1.5">
              {t("tabs.features")}
            </TabsTrigger>
            <TabsTrigger value="advanced" className="px-2 py-1.5">
              {t("tabs.advanced")}
            </TabsTrigger>
            <TabsTrigger value="model-custom" className="px-2 py-1.5">
              {t("tabs.modelCustom")}
            </TabsTrigger>
          </TabsList>

          <div
            className="flex-1 overflow-y-auto p-6 w-full max-w-5xl mx-auto"
            style={{
              backgroundColor: themeStyles.background(),
              color: themeStyles.foreground(),
            }}
          >
            <TabsContent value="providers" className="mt-0">
              <ProvidersSettings
                profile={editingProfile}
                activeProfile={activeProfile}
                isLoading={isLoading}
                onChange={handleProfileChange}
                onProfileSelect={handleProfileSelect}
                onProfileCreate={handleProfileCreate}
                onProfileEdit={handleProfileEdit}
                onProfileDelete={handleProfileDelete}
                allProfiles={allProfiles}
              />
            </TabsContent>

            <TabsContent value="preferences" className="mt-0">
              <PreferencesSettings
                preferences={preferences}
                onChange={handlePreferencesChange}
                isLoading={isLoading || isPreferencesLoading}
              />
            </TabsContent>

            <TabsContent value="features" className="mt-0">
              <FeaturesSettings />
            </TabsContent>

            <TabsContent value="advanced" className="mt-0">
              <AdvancedSettings
                preferences={preferences}
                onChange={handlePreferencesChange}
                isLoading={isLoading || isPreferencesLoading}
              />
            </TabsContent>

            <TabsContent value="model-custom" className="mt-0">
              <ModelCustomSettings />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <ProfileEditDialog
        profile={dialogEditingProfile}
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleProfileSave}
      />
      <Dialog
        open={isUnsavedChangesDialogOpen}
        onOpenChange={setIsUnsavedChangesDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogs.unsavedChanges.title")}</DialogTitle>
            <DialogDescription>
              {t("dialogs.unsavedChanges.description", {
                name: editingProfile?.name,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUnsavedChangesDialogOpen(false);
                setProfileDirty(false);
                setPreferences(savedPreferencesRef.current);
                setPreferencesDirty(false);
                if (targetProfileOnSwitch) {
                  setEditingProfile(targetProfileOnSwitch);
                }
                setTargetProfileOnSwitch(null);
              }}
            >
              {t("dialogs.unsavedChanges.dontSave")}
            </Button>
            <Button
              onClick={async () => {
                await persistChanges();
                setIsUnsavedChangesDialogOpen(false);
                if (targetProfileOnSwitch) {
                  setEditingProfile(targetProfileOnSwitch);
                }
                setTargetProfileOnSwitch(null);
              }}
            >
              {t("dialogs.unsavedChanges.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isDeleteConfirmationOpen}
        onOpenChange={setIsDeleteConfirmationOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogs.confirmDeletion.title")}</DialogTitle>
            <DialogDescription>
              {t("dialogs.confirmDeletion.description", {
                name: profileToDelete?.name,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmationOpen(false)}
            >
              {t("dialogs.confirmDeletion.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmProfileDelete}>
              {t("dialogs.confirmDeletion.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
