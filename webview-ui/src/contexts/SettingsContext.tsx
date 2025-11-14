import React, { useCallback, useEffect, useState } from "react";
import { profileManager } from "../services/profile-manager";
import { Profile, ProviderConfig, UserPreferences } from "../types/settings";
import { SettingsContext, SettingsContextType } from "./settings-context-type";

// ==================== Provider 组件 ====================

interface SettingsProviderProps {
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
}) => {
  // 状态定义
  const [allProviders, setAllProviders] = useState<ProviderConfig[]>([]);
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [editingProfile, setEditingProfileState] = useState<Profile | null>(
    null,
  );
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeProfile =
    availableProfiles.find((p) => p.id === activeProfileId) || null;

  // ==================== 数据同步 ====================

  // 统一处理来自后端的配置文件更新
  const handleProfilesUpdate = useCallback(
    (data: { profiles: Profile[]; activeProfileId: string }) => {
      console.log("[SettingsContext] Profiles updated via message:", {
        profileCount: data.profiles.length,
        activeId: data.activeProfileId,
      });

      setAvailableProfiles(data.profiles);
      setActiveProfileId(data.activeProfileId);

      const newActiveProfile =
        data.profiles.find((p) => p.id === data.activeProfileId) || null;

      // 如果当前没有正在编辑的配置，或正在编辑的配置已被删除，则重置为新的活跃配置
      const editingProfileStillExists = data.profiles.some(
        (p) => p.id === editingProfile?.id,
      );

      if (!editingProfileStillExists) {
        console.log(
          "[SettingsContext] Editing profile reset to active profile.",
        );
        setEditingProfileState(
          newActiveProfile ? { ...newActiveProfile } : null,
        );
        setHasUnsavedChanges(false);
      }
    },
    [editingProfile?.id],
  );

  // 加载初始数据
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [initialData, providers] = await Promise.all([
        profileManager.loadProfiles(),
        profileManager.getAllProviders(),
      ]);
      setAllProviders(providers);
      handleProfilesUpdate(initialData);
      console.log("[SettingsContext] Initial data loaded successfully.");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      console.error("[SettingsContext] Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [handleProfilesUpdate]);

  // 监听来自 VS Code 扩展的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === "profilesUpdated") {
        handleProfilesUpdate(
          message.payload as { profiles: Profile[]; activeProfileId: string },
        );
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [handleProfilesUpdate]);

  // 组件挂载时加载数据
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==================== 操作方法 ====================

  const saveProfile = useCallback(
    async (profile: Profile) => {
      try {
        setError(null);
        await profileManager.saveProfile(profile);

        // 乐观更新UI
        setAvailableProfiles((prev) =>
          prev.map((p) => (p.id === profile.id ? { ...profile } : p)),
        );

        if (profile.id === editingProfile?.id) {
          setEditingProfileState({ ...profile });
          setHasUnsavedChanges(false);
        }

        console.log("[SettingsContext] Profile saved:", profile.id);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to save profile";
        setError(errorMsg);
        console.error("[SettingsContext] Failed to save profile:", err);
        throw err;
      }
    },
    [editingProfile?.id],
  );

  const activateProfile = useCallback(
    async (profileId: string) => {
      try {
        setError(null);

        const profileToActivate = availableProfiles.find(
          (p) => p.id === profileId,
        );
        if (!profileToActivate) {
          throw new Error(`Profile not found: ${profileId}`);
        }

        // 如果要激活的是当前正在编辑的配置，且有未保存的更改，先保存
        if (profileId === editingProfile?.id && hasUnsavedChanges) {
          console.log(
            "[SettingsContext] Saving editing profile before activation.",
          );
          await profileManager.saveProfile(editingProfile);
          setHasUnsavedChanges(false);
        }

        await profileManager.setActiveProfile(profileId);
        // 状态更新将由 'profilesUpdated' 消息触发
        console.log(
          "[SettingsContext] Profile activation requested:",
          profileId,
        );
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to activate profile";
        setError(errorMsg);
        console.error("[SettingsContext] Failed to activate profile:", err);
        throw err;
      }
    },
    [availableProfiles, editingProfile, hasUnsavedChanges],
  );

  const setEditingProfile = useCallback(
    (profileId: string) => {
      try {
        const targetProfile = availableProfiles.find((p) => p.id === profileId);
        if (!targetProfile) {
          throw new Error(`Profile not found: ${profileId}`);
        }
        setEditingProfileState({ ...targetProfile });
        setHasUnsavedChanges(false);
        console.log("[SettingsContext] Editing profile set:", profileId);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to set editing profile";
        setError(errorMsg);
        console.error("[SettingsContext] Failed to set editing profile:", err);
      }
    },
    [availableProfiles],
  );

  const updateEditingProfile = useCallback((profile: Profile) => {
    setEditingProfileState({ ...profile });
    // 标记有未保存的更改
    setHasUnsavedChanges(true);
    console.log("[SettingsContext] Editing profile updated locally.");
  }, []);

  const createProfile = useCallback(
    async (name: string, description?: string) => {
      try {
        setError(null);
        const newProfile = profileManager.createDefaultProfile(
          name,
          description,
        );
        await profileManager.saveProfile(newProfile);
        // 状态更新将由 'profilesUpdated' 消息触发
        console.log(
          "[SettingsContext] Profile creation requested:",
          newProfile.id,
        );
        return newProfile;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to create profile";
        setError(errorMsg);
        console.error("[SettingsContext] Failed to create profile:", err);
        throw err;
      }
    },
    [],
  );

  const deleteProfile = useCallback(
    async (profileId: string) => {
      try {
        setError(null);
        const profileToDelete = availableProfiles.find(
          (p) => p.id === profileId,
        );
        if (profileToDelete?.isDefault) {
          throw new Error("Cannot delete default profile");
        }
        await profileManager.deleteProfile(profileId);
        // 状态更新将由 'profilesUpdated' 消息触发
        console.log("[SettingsContext] Profile deletion requested:", profileId);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to delete profile";
        setError(errorMsg);
        console.error("[SettingsContext] Failed to delete profile:", err);
        throw err;
      }
    },
    [availableProfiles],
  );

  const updatePreferencesHandler = useCallback(
    (newPreferences: Partial<UserPreferences>) => {
      setPreferences((prev) => {
        if (!prev) return null;
        const updated = { ...prev, ...newPreferences };
        // Here you might want to persist these preferences
        console.log("[SettingsContext] Preferences updated:", updated);
        return updated;
      });
    },
    [],
  );

  // ==================== Context Value ====================

  const value: SettingsContextType = {
    allProviders,
    availableProfiles,
    activeProfile,
    editingProfile,
    preferences,
    hasUnsavedChanges,
    isLoading,
    error,
    saveProfile,
    activateProfile,
    setEditingProfile,
    updateEditingProfile,
    setHasUnsavedChanges,
    createProfile,
    deleteProfile,
    updatePreferences: updatePreferencesHandler,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsProvider;
