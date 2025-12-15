import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Slider } from "@/components/ui/slider";
import { UserPreferences } from "@/types/settings";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

interface AdvancedSettingsProps {
  preferences: UserPreferences;
  onChange: (preferences: UserPreferences) => void;
  className?: string;
  isLoading?: boolean;
}

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  preferences,
  onChange,
  className = "",
}) => {
  const { t } = useTranslation("advanced-settings");
  const form = useForm<UserPreferences>({
    defaultValues: preferences,
  });

  // 当 preferences prop 变化时同步表单值
  useEffect(() => {
    form.reset(preferences);
  }, [preferences, form]);

  // 监听表单值变化并触发 onChange
  useEffect(() => {
    const subscription = form.watch((value) => {
      onChange(value as UserPreferences);
    });
    return () => subscription.unsubscribe();
  }, [form, onChange]);

  const getVerbosityDescription = (value: number) => {
    switch (value) {
      case 0:
        return t("loggingLevel.minimal");
      case 1:
        return t("loggingLevel.standard");
      case 2:
        return t("loggingLevel.verbose");
      default:
        return t("loggingLevel.unknown");
    }
  };

  return (
    <Form {...form}>
      <div className={`space-y-6 ${className}`}>
        {/* Verbosity Control */}
        <Card>
          <CardHeader>
            <CardTitle>{t("loggingLevel.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="verbosity"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>
                      {t("loggingLevel.verbosity", { value: field.value })}
                    </FormLabel>
                    <Badge variant="outline">
                      {getVerbosityDescription(field.value)}
                    </Badge>
                  </div>
                  <FormControl>
                    <Slider
                      min={0}
                      max={2}
                      step={1}
                      value={[field.value]}
                      onValueChange={(value: number[]) => {
                        field.onChange(value[0]);
                      }}
                      className="w-full"
                    />
                  </FormControl>
                  <FormDescription>
                    {t("loggingLevel.description")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Rate Limiting */}
        <Card>
          <CardHeader>
            <CardTitle>{t("rateLimiting.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="rateLimitSeconds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("rateLimiting.delay", { value: field.value })}
                  </FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={60}
                      step={1}
                      value={[field.value]}
                      onValueChange={(value: number[]) => {
                        field.onChange(value[0]);
                      }}
                      className="w-full"
                    />
                  </FormControl>
                  <FormDescription>
                    {t("rateLimiting.description")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Retry Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>{t("errorHandling.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="consecutiveMistakeLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("errorHandling.maxRetries", { value: field.value })}
                  </FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      value={[field.value]}
                      onValueChange={(value: number[]) => {
                        field.onChange(value[0]);
                      }}
                      className="w-full"
                    />
                  </FormControl>
                  <FormDescription>
                    {t("errorHandling.description")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Advanced Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>{t("advancedConfiguration.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maxTokens"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("advancedConfiguration.maxTokens.label")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder={t(
                          "advancedConfiguration.maxTokens.placeholder",
                        )}
                        {...field}
                        value={field.value?.toString() || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const target = e.target as HTMLInputElement;
                          const numValue = parseInt(target.value, 10);
                          if (!isNaN(numValue) && numValue > 0) {
                            field.onChange(numValue);
                          } else if (target.value === "") {
                            field.onChange(undefined);
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("advancedConfiguration.maxTokens.description")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeout"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("advancedConfiguration.timeout.label")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder={t(
                          "advancedConfiguration.timeout.placeholder",
                        )}
                        {...field}
                        value={field.value?.toString() || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const target = e.target as HTMLInputElement;
                          const numValue = parseInt(target.value, 10);
                          if (!isNaN(numValue) && numValue > 0) {
                            field.onChange(numValue);
                          } else if (target.value === "") {
                            field.onChange(undefined);
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("advancedConfiguration.timeout.description")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="retryAttempts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("advancedConfiguration.retryAttempts.label")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder={t(
                          "advancedConfiguration.retryAttempts.placeholder",
                        )}
                        {...field}
                        value={field.value?.toString() || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const target = e.target as HTMLInputElement;
                          const numValue = parseInt(target.value, 10);
                          if (!isNaN(numValue) && numValue > 0) {
                            field.onChange(numValue);
                          } else if (target.value === "") {
                            field.onChange(undefined);
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("advancedConfiguration.retryAttempts.description")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </Form>
  );
};
