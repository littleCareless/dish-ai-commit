import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { isDevelopment } from "@/utils/version";
import { Profile } from "@/types/settings";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  VSCodeButton,
  VSCodeDropdown,
  VSCodeOption,
} from "@vscode/webview-ui-toolkit/react";
import { Edit, Plus, Trash2 } from "lucide-react";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

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

  return (
    <Form {...form}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <FormLabel className="text-sm font-medium">
            {t("selectProfile")}
          </FormLabel>
          <div className="flex items-center gap-2 text-xs">
            {isLoading ? (
              <span
                className="px-2 py-1 rounded-full"
                style={{
                  backgroundColor: "hsl(var(--muted))",
                  color: "hsl(var(--foreground))",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                <span className="animate-pulse">●</span> {t("loading")}
              </span>
            ) : isCurrentActive ? (
              <span
                className="px-2 py-1 rounded-full"
                style={{
                  backgroundColor: "hsl(var(--accent))",
                  color: "hsl(var(--accent-foreground))",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                {t("editingActive")}
              </span>
            ) : (
              <span
                className="px-2 py-1 rounded-full"
                style={{
                  backgroundColor: "hsl(var(--secondary))",
                  color: "hsl(var(--secondary-foreground))",
                  border: "1px solid hsl(var(--border))",
                }}
              >
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
                    onChange={(e: { target: unknown }) => {
                      const target = e.target as unknown as { value: string };
                      onProfileChange(target.value);
                    }}
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
        <div
          className="p-2 rounded border text-xs space-y-1"
          style={{
            backgroundColor: "hsl(var(--muted))",
            borderColor: "hsl(var(--border))",
            color: "hsl(var(--muted-foreground))",
          }}
        >
          <div
            className="font-medium"
            style={{ color: "hsl(var(--foreground))" }}
          >
            {t("usageInstructions")}
          </div>
          <div dangerouslySetInnerHTML={{ __html: t("selectToEdit") }} />
          <div dangerouslySetInnerHTML={{ __html: t("autoSave") }} />
          <div dangerouslySetInnerHTML={{ __html: t("clickDone") }} />
        </div>

        {currentProfile && isDevelopment() && (
          <div className="space-y-2 pt-4">
            <h3 className="text-sm font-medium">{t("currentProfileInfo")}</h3>
            <pre
              className="p-2 rounded border text-xs overflow-auto"
              style={{
                backgroundColor: "hsl(var(--muted))",
                borderColor: "hsl(var(--border))",
              }}
            >
              {JSON.stringify(currentProfile, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Form>
  );
};
