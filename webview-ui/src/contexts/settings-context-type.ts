import { createContext } from "react";
import { Profile, ProviderConfig, UserPreferences } from "@/types/settings";

export interface SettingsContextType {
  // 状态 - 明确区分
  allProviders: ProviderConfig[]; // 所有可用的提供商
  availableProfiles: Profile[]; // 所有可用的配置文件
  activeProfile: Profile | null; // 全局活跃的配置文件（当前应用正在使用）
  editingProfile: Profile | null; // 当前正在编辑的配置文件
  preferences: UserPreferences | null;

  // 操作方法 - 明确职责
  saveProfile: (profile: Profile) => Promise<void>; // 保存配置但不激活
  activateProfile: (profileId: string) => Promise<void>; // 保存并激活配置
  setEditingProfile: (profileId: string) => void; // 切换到指定的编辑中配置
  updateEditingProfile: (profile: Profile) => void; // 直接更新编辑中的配置（用于本地编辑，不保存到磁盘）
  createProfile: (name: string, description?: string) => Promise<Profile>;
  deleteProfile: (profileId: string) => Promise<void>;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;

  // 编辑状态
  hasUnsavedChanges: boolean; // 当前编辑中的配置是否有未保存的更改
  setHasUnsavedChanges: (value: boolean) => void; // 设置未保存更改状态

  // 加载状态
  isLoading: boolean;
  error: string | null;
}

export const SettingsContext = createContext<SettingsContextType | null>(null);
