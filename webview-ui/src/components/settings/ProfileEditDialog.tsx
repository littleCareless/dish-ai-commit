import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Profile } from "../../types/settings";

const createNewProfileId = (): string => {
  return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const profileSchema = z.object({
  name: z
    .string()
    .min(2, "Profile name must be at least 2 characters")
    .max(50, "Profile name must be less than 50 characters"),
  description: z
    .string()
    .max(200, "Description must be less than 200 characters")
    .optional()
    .or(z.literal("")),
  isDefault: z.boolean(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

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
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      description: "",
      isDefault: false,
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name,
        description: profile.description || "",
        isDefault: profile.isDefault,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        isDefault: false,
      });
    }
  }, [profile, open, form]);

  const handleSave = async (data: ProfileFormData) => {
    try {
      const now = new Date();

      // ✅ 严格区分：新增 vs 编辑
      // - 编辑：profile 不为 null，使用现有 ID
      // - 新增：profile 为 null，生成新 ID
      const isEditing = !!profile;
      const savedProfile: Profile = {
        id: isEditing ? profile!.id : createNewProfileId(),
        name: data.name,
        description: data.description || "",
        isDefault: data.isDefault,
        providers: profile?.providers || {},
        preferences: profile?.preferences || {
          temperature: 0.0,
          verbosity: 0,
          rateLimitSeconds: 5,
          consecutiveMistakeLimit: 3,
          language: "zh",
          maxTokens: 4000,
          timeout: 30000,
          retryAttempts: 3,
        },
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
          <DialogTitle>{profile ? "Edit Profile" : "New Profile"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <FormField
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter profile name..."
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter profile description..."
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description for this profile
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="isDefault"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Set as default profile
                    {!profile && (
                      <span className="text-xs text-muted-foreground ml-1">
                        (First profile will be default)
                      </span>
                    )}
                  </FormLabel>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!profile}
                    />
                    <span className="text-sm text-muted-foreground">
                      Use this profile by default when the extension starts
                    </span>
                  </div>
                  {field.value && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        This profile will be used as the default when the
                        extension starts. Other profiles will be set to
                        non-default.
                      </AlertDescription>
                    </Alert>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  form.handleSubmit(handleSave)();
                }}
              >
                {profile ? "Save Changes" : "Create Profile"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
