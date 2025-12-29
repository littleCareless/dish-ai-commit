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
import { showInformationMessage } from "@/utils/vscode";
import { Settings as SettingsIcon } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FeaturesSettings } from "./FeaturesSettings";
import { ProvidersSettings } from "./ProvidersSettings";

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation("settings-page");
  // Centralized state management
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
        // No profiles found, create a default one
        const defaultProfile = profileManager.createDefaultProfile(
          t("defaultProfileName"),
          t("defaultProfileDescription"),
        );
        console.log("[SettingsPage] Creating default profile:", defaultProfile);
        await profileManager.saveProfile(defaultProfile);
        await profileManager.setActiveProfile(defaultProfile.id);

        // Set state directly instead of reloading
        setAllProfiles([defaultProfile]);
        setActiveProfile(defaultProfile);
        setEditingProfile(defaultProfile);
        console.log("[SettingsPage] Set default profile as editingProfile");
        return; // Early return to prevent state from being overwritten
      }

      setAllProfiles(profiles);
      const active =
        profiles.find((p) => p.id === activeProfileId) || profiles[0];
      console.log("[SettingsPage] Active profile:", active);
      setActiveProfile(active);
      setEditingProfile(active); // Initially, edit the active profile
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
      console.log("[SettingsPage] Saving profile:", editingProfile);
      await profileManager.saveProfile(editingProfile);
      await profileManager.setActiveProfile(editingProfile.id);

      // Update active profile in state directly to reflect changes immediately
      setActiveProfile(editingProfile);
      setEditingProfile(editingProfile);
      setHasUnsavedChanges(false);

      await loadData(); // Refresh data to ensure everything is in sync

      showInformationMessage(
        t("messages.switchedToProfile", { name: editingProfile.name }),
      );
    } catch (err) {
      console.log("[SettingsPage] Error saving profile:", err);
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
      setHasUnsavedChanges(true);
    }
  };

  // Track previous preferences to prevent infinite loops
  const prevPreferencesRef = React.useRef<
    typeof DEFAULT_USER_PREFERENCES | null
  >(null);

  const handlePreferencesChange = (
    preferences: typeof DEFAULT_USER_PREFERENCES,
  ) => {
    const prev = prevPreferencesRef.current;
    const hasChanged =
      !prev || JSON.stringify(prev) !== JSON.stringify(preferences);

    console.log(
      "[SettingsPage] handlePreferencesChange called with:",
      preferences,
      "hasChanged:",
      hasChanged,
    );

    if (hasChanged && editingProfile) {
      prevPreferencesRef.current = preferences;
      const newProfile = { ...editingProfile, preferences };
      console.log("[SettingsPage] New profile:", newProfile);
      setEditingProfile(newProfile);
      setHasUnsavedChanges(true);
    } else if (!editingProfile) {
      console.log("[SettingsPage] No editingProfile available");
    } else {
      console.log("[SettingsPage] No change detected, skipping update");
    }
  };

  if (error) {
    return (
      <div>
        {t("errors.error")}: {error}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b bg-background/95 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-5 h-5" />
            <h1 className="text-xl font-bold">{t("title")}</h1>
          </div>
          <div className="flex gap-2 items-center">
            {hasUnsavedChanges && (
              <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">
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
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6 w-full max-w-5xl mx-auto">
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
                preferences={
                  editingProfile?.preferences || DEFAULT_USER_PREFERENCES
                }
                onChange={handlePreferencesChange}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="features" className="mt-0">
              <FeaturesSettings />
            </TabsContent>

            <TabsContent value="advanced" className="mt-0">
              <AdvancedSettings
                preferences={
                  editingProfile?.preferences || DEFAULT_USER_PREFERENCES
                }
                onChange={handlePreferencesChange}
                isLoading={isLoading}
              />
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
                setHasUnsavedChanges(false);
                if (targetProfileOnSwitch) {
                  setEditingProfile(targetProfileOnSwitch);
                }
              }}
            >
              {t("dialogs.unsavedChanges.dontSave")}
            </Button>
            <Button
              onClick={async () => {
                if (editingProfile) {
                  await profileManager.saveProfile(editingProfile);
                }
                setIsUnsavedChangesDialogOpen(false);
                setHasUnsavedChanges(false);
                if (targetProfileOnSwitch) {
                  setEditingProfile(targetProfileOnSwitch);
                }
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
