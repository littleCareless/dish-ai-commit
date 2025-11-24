import { useContext } from "react";
import {
  SettingsContext,
  SettingsContextType,
} from "@/contexts/settings-context-type";

/**
 * useSettings Hook - 获取完整的设置 Context
 *
 * 使用示例：
 * ```typescript
 * const {
 *   availableProfiles,    // 所有可用的配置文件
 *   activeProfile,        // 全局活跃的配置文件
 *   editingProfile,       // 当前正在编辑的配置文件
 *   hasUnsavedChanges,    // 是否有未保存的更改
 *   saveProfile,          // 保存配置但不激活
 *   activateProfile,      // 保存并激活配置
 *   setEditingProfile     // 切换到指定的编辑中配置
 * } = useSettings()
 * ```
 *
 * @throws 如果未在 SettingsProvider 内使用
 */
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error(
      "useSettings must be used within SettingsProvider. " +
        "Make sure your component is wrapped with <SettingsProvider> or <App>",
    );
  }

  return context;
};

/**
 * useProfiles Hook - 仅获取 Profile 相关数据和方法
 *
 * 使用示例：
 * ```typescript
 * const { availableProfiles, activeProfile, editingProfile, saveProfile } = useProfiles()
 * ```
 */
export const useProfiles = () => {
  const {
    availableProfiles,
    activeProfile,
    editingProfile,
    hasUnsavedChanges,
    createProfile,
    deleteProfile,
    saveProfile,
    activateProfile,
    setEditingProfile,
    setHasUnsavedChanges,
  } = useSettings();

  return {
    availableProfiles,
    activeProfile,
    editingProfile,
    hasUnsavedChanges,
    createProfile,
    deleteProfile,
    saveProfile,
    activateProfile,
    setEditingProfile,
    setHasUnsavedChanges,
  };
};

/**
 * usePreferences Hook - 仅获取 Preferences 相关数据
 *
 * 使用示例：
 * ```typescript
 * const { preferences, updatePreferences } = usePreferences()
 * ```
 */
export const usePreferences = () => {
  const { preferences, updatePreferences } = useSettings();

  return {
    preferences,
    updatePreferences,
  };
};

/**
 * useSettingsLoading Hook - 获取加载状态
 *
 * 使用示例：
 * ```typescript
 * const { isLoading, error } = useSettingsLoading()
 * ```
 */
export const useSettingsLoading = () => {
  const { isLoading, error } = useSettings();

  return {
    isLoading,
    error,
  };
};

/**
 * useActiveProfile Hook - 仅获取活跃 Profile
 *
 * 使用示例：
 * ```typescript
 * const activeProfile = useActiveProfile()
 * ```
 */
export const useActiveProfile = () => {
  const { activeProfile } = useSettings();

  return activeProfile;
};

/**
 * useEditingProfile Hook - 获取当前正在编辑的 Profile 及相关操作
 *
 * 使用示例：
 * ```typescript
 * const {
 *   profile,              // 当前正在编辑的配置文件
 *   hasUnsavedChanges,    // 是否有未保存的更改
 *   saveProfile,          // 保存配置
 *   setHasChanges         // 标记为有未保存的更改
 * } = useEditingProfile()
 * ```
 */
export const useEditingProfile = () => {
  const {
    editingProfile: profile,
    hasUnsavedChanges,
    saveProfile,
    setHasUnsavedChanges: setHasChanges,
  } = useSettings();

  return {
    profile,
    hasUnsavedChanges,
    saveProfile,
    setHasChanges,
  };
};

/**
 * useProfileManagement Hook - 获取配置文件管理相关操作
 *
 * 使用示例：
 * ```typescript
 * const {
 *   switchProfile,        // 切换到指定的编辑中配置
 *   activateProfile,      // 保存并激活配置
 *   createProfile,        // 创建新配置
 *   deleteProfile         // 删除配置
 * } = useProfileManagement()
 * ```
 */
export const useProfileManagement = () => {
  const {
    setEditingProfile: switchProfile,
    activateProfile,
    createProfile,
    deleteProfile,
  } = useSettings();

  return {
    switchProfile,
    activateProfile,
    createProfile,
    deleteProfile,
  };
};

export default useSettings;
