import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_USER_PREFERENCES, Profile } from "@/types/settings";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

const createNewProfileId = (): string => {
  return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Schema factory function
const createProfileSchema = (t: (key: string) => string) =>
  z.object({
    name: z
      .string()
      .min(2, t("profileEditDialog.validation.nameMin"))
      .max(50, t("profileEditDialog.validation.nameMax")),
    description: z
      .string()
      .max(200, t("profileEditDialog.validation.descriptionMax"))
      .optional()
      .or(z.literal("")),
  });

type ProfileFormData = z.infer<ReturnType<typeof createProfileSchema>>;

interface ProfileEditDialogProps {
  profile: Profile | null;
  open: boolean;
  onClose: () => void;
  onSave: (profile: Profile) => Promise<void>;
}

export const ProfileEditDialog: React.FC<ProfileEditDialogProps> = ({
  profile,
  open,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation("profile-settings");

  const profileSchema = useMemo(() => createProfileSchema(t), [t]);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name,
        description: profile.description || "",
      });
    } else {
      form.reset({
        name: "",
        description: "",
      });
    }
  }, [profile, open, form]);

  const handleSave = async (data: ProfileFormData) => {
    try {
      const now = new Date();
      const isEditing = !!profile;
      const savedProfile: Profile = {
        id: isEditing ? profile!.id : createNewProfileId(),
        name: data.name,
        description: data.description || "",

        providers: profile?.providers || {},
        preferences: profile?.preferences || DEFAULT_USER_PREFERENCES,
        createdAt: profile?.createdAt || now,
        updatedAt: now,
        version: profile?.version || "1.0.0",
      };

      await onSave(savedProfile);
      onClose();
    } catch (error) {
      console.error("Failed to save profile:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>
            {profile
              ? t("profileEditDialog.titleEdit")
              : t("profileEditDialog.titleNew")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <FormField
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("profileEditDialog.nameLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("profileEditDialog.namePlaceholder")}
                      maxLength={50}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("profileEditDialog.descriptionLabel")}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t(
                        "profileEditDialog.descriptionPlaceholder",
                      )}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                {t("common.cancel", { ns: "translation" })}
              </Button>
              <Button
                onClick={() => {
                  form.handleSubmit(handleSave)();
                }}
              >
                {profile
                  ? t("common.saveChanges", { ns: "translation" })
                  : t("profileEditDialog.createButton")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
