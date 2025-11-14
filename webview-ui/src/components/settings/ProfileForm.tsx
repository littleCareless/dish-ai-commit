import { zodResolver } from "@hookform/resolvers/zod";
import {
  VSCodeButton,
  VSCodeDropdown,
  VSCodeOption,
} from "@vscode/webview-ui-toolkit/react";
import { Edit, Plus, Trash2 } from "lucide-react";
import React, { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Profile } from "../../types/settings";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";

const profileFormSchema = z.object({
  selectedProfile: z.string(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

interface ProfileFormProps {
  profiles: Profile[];
  selectedProfile: string;
  activeProfile: Profile | null;
  isLoading?: boolean;

  onProfileChange: (profileId: string) => void;
  onCreateProfile: () => void;
  onEditProfile: (profileId: string) => void;
  onDeleteProfile: (profileId: string) => void;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
  profiles,
  selectedProfile,
  activeProfile,
  isLoading,
  onProfileChange,
  onCreateProfile,
  onEditProfile,
  onDeleteProfile,
}) => {
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      selectedProfile: selectedProfile,
    },
  });

  useEffect(() => {
    form.reset({
      selectedProfile: selectedProfile,
    });
  }, [selectedProfile, form]);

  const currentProfile = profiles.find((p) => p.id === selectedProfile);
  const isCurrentActive = activeProfile?.id === selectedProfile;

  const handleProfileChange = useCallback(
    (profileId: string) => {
      onProfileChange(profileId);
    },
    [onProfileChange],
  );

  return (
    <Form {...form}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <FormLabel className="text-sm font-medium">选择配置</FormLabel>
          <div className="flex items-center gap-2 text-xs">
            {isLoading ? (
              <span className="text-blue-600 dark:text-blue-500 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950">
                <span className="animate-pulse">●</span> 加载中...
              </span>
            ) : isCurrentActive ? (
              <span className="text-green-600 dark:text-green-500 px-2 py-1 rounded-full bg-green-50 dark:bg-green-950">
                ✓ 编辑中 (当前活跃配置)
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-500 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950">
                ✎ 编辑中 (点击"完成"激活)
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FormField
            name="selectedProfile"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <VSCodeDropdown
                    value={field.value}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      handleProfileChange(e.target.value)
                    }
                    className="w-full"
                  >
                    {profiles.map((profile) => (
                      <VSCodeOption key={profile.id} value={profile.id}>
                        {profile.name}
                        {profile.isDefault ? " (默认)" : ""}
                        {activeProfile?.id === profile.id ? " ★ 当前活跃" : ""}
                        {selectedProfile === profile.id &&
                        activeProfile?.id !== profile.id
                          ? " ✎ 编辑中"
                          : ""}
                      </VSCodeOption>
                    ))}
                  </VSCodeDropdown>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center gap-2">
            <VSCodeButton
              appearance="icon"
              title="新增配置"
              onClick={onCreateProfile}
            >
              <Plus className="w-4 h-4" />
            </VSCodeButton>
            {currentProfile && (
              <>
                <VSCodeButton
                  appearance="icon"
                  title="编辑配置"
                  onClick={() => onEditProfile(currentProfile.id)}
                >
                  <Edit className="w-4 h-4" />
                </VSCodeButton>
                <VSCodeButton
                  appearance="icon"
                  title="删除配置"
                  onClick={() => onDeleteProfile(currentProfile.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </VSCodeButton>
              </>
            )}
          </div>
        </div>
        <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded border text-xs text-muted-foreground space-y-1">
          <div className="font-medium">使用说明:</div>
          <div>
            • 从下拉菜单<strong>选择</strong>要编辑的配置文件
          </div>
          <div>
            • 在修改设置后会<strong>自动保存</strong>到编辑中的配置
          </div>
          <div>
            • 点击顶部"<strong>完成</strong>"按钮将当前编辑的配置设为
            <strong>活跃</strong>配置
          </div>
        </div>

        {currentProfile && (
          <div className="space-y-2 pt-4">
            <h3 className="text-sm font-medium">当前配置信息 (JSON)</h3>
            <pre className="p-2 bg-gray-100 dark:bg-gray-800 rounded border text-xs overflow-auto">
              {JSON.stringify(currentProfile, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Form>
  );
};
