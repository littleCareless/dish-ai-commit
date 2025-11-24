import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Select, SelectOption } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Info } from "lucide-react";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { DEFAULT_USER_PREFERENCES, UserPreferences } from "@/types/settings";

interface PreferencesSettingsProps {
  preferences: UserPreferences;
  onChange: (preferences: UserPreferences) => void;
  className?: string;
  isLoading?: boolean;
}

export const PreferencesSettings: React.FC<PreferencesSettingsProps> = ({
  preferences: userPreferences,
  onChange,
  className = "",
}) => {
  const preferences = { ...DEFAULT_USER_PREFERENCES, ...userPreferences };
  const { t } = useTranslation("preferences-settings");

  const form = useForm<UserPreferences>({
    defaultValues: preferences,
  });

  // 当外部 preferences 变化时更新表单
  useEffect(() => {
    form.reset(preferences);
  }, [preferences, form]);

  // 监听表单值变化并通知父组件
  useEffect(() => {
    const subscription = form.watch((value) => {
      onChange(value as UserPreferences);
    });
    return () => subscription.unsubscribe();
  }, [form, onChange]);

  const getTemperatureDescription = (value: number) => {
    if (value === 0) return t("temperatureLevels.deterministic");
    if (value <= 0.5) return t("temperatureLevels.low");
    if (value <= 1.0) return t("temperatureLevels.balanced");
    if (value <= 1.5) return t("temperatureLevels.high");
    return t("temperatureLevels.max");
  };

  const languageOptions = [
    { value: "Simplified Chinese", labelKey: "languages.simplifiedChinese" },
    { value: "Traditional Chinese", labelKey: "languages.traditionalChinese" },
    { value: "Japanese", labelKey: "languages.japanese" },
    { value: "Korean", labelKey: "languages.korean" },
    { value: "Czech", labelKey: "languages.czech" },
    { value: "German", labelKey: "languages.german" },
    { value: "French", labelKey: "languages.french" },
    { value: "Italian", labelKey: "languages.italian" },
    { value: "Dutch", labelKey: "languages.dutch" },
    { value: "Portuguese", labelKey: "languages.portuguese" },
    { value: "Vietnamese", labelKey: "languages.vietnamese" },
    { value: "English", labelKey: "languages.english" },
    { value: "Spanish", labelKey: "languages.spanish" },
    { value: "Swedish", labelKey: "languages.swedish" },
    { value: "Russian", labelKey: "languages.russian" },
    { value: "Bahasa", labelKey: "languages.bahasa" },
    { value: "Polish", labelKey: "languages.polish" },
    { value: "Turkish", labelKey: "languages.turkish" },
    { value: "Thai", labelKey: "languages.thai" },
  ];

  const renderTemperatureField = (
    name: keyof UserPreferences,
    label: string,
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between">
            <FormLabel>
              {label} ({field.value})
            </FormLabel>
            <Badge variant="outline">
              {getTemperatureDescription(field.value as number)}
            </Badge>
          </div>
          <FormControl>
            <Slider
              min={0}
              max={2}
              step={0.1}
              value={[field.value as number]}
              onValueChange={(value) => field.onChange(value[0])}
              className="w-full"
            />
          </FormControl>
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <div className={`space-y-6 ${className}`}>
        {/* Temperature Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              {t("temperatureSettings")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderTemperatureField(
              "commitTemperature",
              t("commitTemperature"),
            )}
            {renderTemperatureField(
              "reviewTemperature",
              t("reviewTemperature"),
            )}
            {renderTemperatureField(
              "branchNameTemperature",
              t("branchNameTemperature"),
            )}
            {renderTemperatureField(
              "weeklyReportTemperature",
              t("weeklyReportTemperature"),
            )}

            <FormDescription>{t("temperatureDescription")}</FormDescription>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle>{t("language")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("generatedContentLanguage")}</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onChange={(event: React.FormEvent<HTMLElement>) => {
                        const value =
                          (event.target as HTMLSelectElement)?.value || "";
                        field.onChange(value);
                      }}
                    >
                      {languageOptions.map((option) => (
                        <SelectOption key={option.value} value={option.value}>
                          {t(option.labelKey)}
                        </SelectOption>
                      ))}
                    </Select>
                  </FormControl>
                  <FormDescription>
                    {t("generatedContentLanguageDescription")}
                  </FormDescription>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </div>
    </Form>
  );
};
