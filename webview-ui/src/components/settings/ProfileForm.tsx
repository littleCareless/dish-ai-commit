import { zodResolver } from "@hookform/resolvers/zod";
import {
  VSCodeButton,
  VSCodeDropdown,
  VSCodeOption,
} from "@vscode/webview-ui-toolkit/react";
import { Edit, Plus, Trash2 } from "lucide-react";
import React, { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Profile } from "@/types/settings";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

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
  const { t } = useTranslation("profile-settings");
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
          <FormLabel className="text-sm font-medium">
            {t("selectProfile")}
          </FormLabel>
          <div className="flex items-center gap-2 text-xs">
            {isLoading ? (
              <span className="text-blue-600 dark:text-blue-500 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950">
                <span className="animate-pulse">●</span> {t("loading")}
              </span>
            ) : isCurrentActive ? (
              <span className="text-green-600 dark:text-green-500 px-2 py-1 rounded-full bg-green-50 dark:bg-green-950">
                {t("editingActive")}
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-500 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950">
                {t("editingInactive")}
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
                    onChange={(e: any) => handleProfileChange(e.target.value)}
                    className="w-full"
                  >
                    {profiles.map((profile) => (
                      <VSCodeOption key={profile.id} value={profile.id}>
                        {profile.name}
                        {activeProfile?.id === profile.id
                          ? t("currentActive")
                          : ""}
                        {selectedProfile === profile.id &&
                        activeProfile?.id !== profile.id
                          ? t("editing")
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
              title={t("addProfile")}
              onClick={onCreateProfile}
            >
              <Plus className="w-4 h-4" />
            </VSCodeButton>
            {currentProfile && (
              <>
                <VSCodeButton
                  appearance="icon"
                  title={t("editProfile")}
                  onClick={() => onEditProfile(currentProfile.id)}
                >
                  <Edit className="w-4 h-4" />
                </VSCodeButton>
                <VSCodeButton
                  appearance="icon"
                  title={t("deleteProfile")}
                  onClick={() => onDeleteProfile(currentProfile.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </VSCodeButton>
              </>
            )}
          </div>
        </div>
        <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded border text-xs text-muted-foreground space-y-1">
          <div className="font-medium">{t("usageInstructions")}</div>
          <div dangerouslySetInnerHTML={{ __html: t("selectToEdit") }} />
          <div dangerouslySetInnerHTML={{ __html: t("autoSave") }} />
          <div dangerouslySetInnerHTML={{ __html: t("clickDone") }} />
        </div>

        {currentProfile && (
          <div className="space-y-2 pt-4">
            <h3 className="text-sm font-medium">{t("currentProfileInfo")}</h3>
            <pre className="p-2 bg-gray-100 dark:bg-gray-800 rounded border text-xs overflow-auto">
              {JSON.stringify(currentProfile, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Form>
  );
};
